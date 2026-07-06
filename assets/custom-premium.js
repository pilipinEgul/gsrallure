/* ============================================================
   GSR Allure — Premium interactions
   Scroll reveals · wishlist · sticky add-to-cart ·
   recently viewed · free-shipping progress · exit-intent.
   All features are defensive: absent elements = no-op.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HEART_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.5-9.5-9C1 8 2.5 4.5 6 4.5c2.2 0 3.4 1.3 4 2.3.6-1 1.8-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 15.5 12 20 12 20z"/></svg>';

  /* ---------- helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function on(el, ev, fn, opts) { if (el) el.addEventListener(ev, fn, opts || false); }

  /* ============================================================
     1. Scroll reveal
     ============================================================ */
  var REVEAL_SELECTORS = [
    '.banner__content', '.banner__box',
    '.title-wrapper-with-link',
    '.collection-list__item',
    '.grid__item',
    '.multicolumn-list__item',
    '.rich-text__wrapper',
    '.newsletter__wrapper',
    '.collage__item',
    '.footer__content-top',
    '.gsr-recent'
  ];

  function initReveal(root) {
    var scope = root || document;
    var targets = [];
    REVEAL_SELECTORS.forEach(function (sel) {
      $all(sel, scope).forEach(function (el) {
        if (!el.classList.contains('gsr-reveal')) targets.push(el);
      });
    });
    if (!targets.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('gsr-reveal', 'gsr-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('gsr-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function (el, i) {
      el.classList.add('gsr-reveal');
      // stagger siblings gently
      var group = el.parentElement ? $all('.gsr-reveal', el.parentElement).indexOf(el) : 0;
      el.style.transitionDelay = (Math.min(group < 0 ? 0 : group, 5) * 55) + 'ms';
      io.observe(el);
    });
  }

  /* ============================================================
     2. Wishlist (localStorage) + slide-in panel
     ============================================================ */
  var WISH_KEY = 'gsr_wishlist_v1';

  function wishRead() {
    try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; }
    catch (e) { return []; }
  }
  function wishWrite(items) {
    try { localStorage.setItem(WISH_KEY, JSON.stringify(items)); } catch (e) {}
  }
  function wishHas(handle) { return wishRead().some(function (i) { return i.handle === handle; }); }

  function wishToggle(item) {
    var items = wishRead();
    var idx = -1;
    items.forEach(function (i, n) { if (i.handle === item.handle) idx = n; });
    if (idx > -1) { items.splice(idx, 1); } else { items.unshift(item); }
    wishWrite(items);
    syncWishUI();
    return idx === -1; // true if now added
  }

  function syncWishUI() {
    var items = wishRead();
    var count = items.length;
    $all('[data-gsr-wish-count]').forEach(function (el) {
      el.textContent = count;
      el.classList.toggle('is-visible', count > 0);
    });
    $all('[data-gsr-wish]').forEach(function (btn) {
      btn.classList.toggle('is-active', wishHas(btn.getAttribute('data-handle')));
    });
    renderWishPanel();
  }

  function bindWishButtons(root) {
    $all('[data-gsr-wish]', root || document).forEach(function (btn) {
      if (btn.dataset.gsrBound) return;
      btn.dataset.gsrBound = '1';
      btn.classList.toggle('is-active', wishHas(btn.getAttribute('data-handle')));
      on(btn, 'click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var added = wishToggle({
          handle: btn.getAttribute('data-handle'),
          url: btn.getAttribute('data-url'),
          title: btn.getAttribute('data-title'),
          image: btn.getAttribute('data-image'),
          price: btn.getAttribute('data-price')
        });
        btn.classList.toggle('is-active', added);
      });
    });
  }

  var wishPanel;
  function buildWishPanel() {
    if (wishPanel) return wishPanel;
    wishPanel = document.createElement('div');
    wishPanel.className = 'gsr-wish-panel';
    wishPanel.innerHTML =
      '<div class="gsr-wish-panel__scrim" data-gsr-wish-close></div>' +
      '<aside class="gsr-wish-panel__sheet" role="dialog" aria-label="Wishlist" aria-modal="true">' +
      '<div class="gsr-wish-panel__head"><h2>Wishlist</h2>' +
      '<button class="gsr-wish-panel__close" data-gsr-wish-close aria-label="Close wishlist">&times;</button></div>' +
      '<div class="gsr-wish-panel__list"></div></aside>';
    document.body.appendChild(wishPanel);
    $all('[data-gsr-wish-close]', wishPanel).forEach(function (el) {
      on(el, 'click', closeWishPanel);
    });
    on(document, 'keydown', function (e) { if (e.key === 'Escape') closeWishPanel(); });
    return wishPanel;
  }

  function renderWishPanel() {
    if (!wishPanel) return;
    var list = $('.gsr-wish-panel__list', wishPanel);
    var items = wishRead();
    if (!items.length) {
      list.innerHTML = '<p class="gsr-wish-empty">Your wishlist is empty.<br>Tap the heart on any product to save it here.</p>';
      return;
    }
    list.innerHTML = items.map(function (i) {
      return '<div class="gsr-wish-item">' +
        (i.image ? '<img src="' + i.image + '" alt="" loading="lazy">' : '') +
        '<div style="flex:1;min-width:0"><a href="' + i.url + '">' + i.title + '</a>' +
        '<div style="color:var(--gsr-muted);font-size:1.3rem">' + (i.price || '') + '</div></div>' +
        '<button class="gsr-wish-panel__close" data-gsr-wish-remove="' + i.handle + '" aria-label="Remove">&times;</button>' +
        '</div>';
    }).join('');
    $all('[data-gsr-wish-remove]', list).forEach(function (btn) {
      on(btn, 'click', function () {
        wishToggle({ handle: btn.getAttribute('data-gsr-wish-remove') });
      });
    });
  }

  function openWishPanel(e) {
    if (e) e.preventDefault();
    buildWishPanel();
    renderWishPanel();
    requestAnimationFrame(function () { wishPanel.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
  }
  function closeWishPanel() {
    if (!wishPanel) return;
    wishPanel.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function bindWishOpeners() {
    $all('[data-gsr-wish-open]').forEach(function (el) {
      if (el.dataset.gsrBound) return;
      el.dataset.gsrBound = '1';
      on(el, 'click', openWishPanel);
    });
  }

  /* ============================================================
     3. Recently viewed
     ============================================================ */
  var RECENT_KEY = 'gsr_recent_v1';
  var RECENT_MAX = 8;

  function recentRead() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
    catch (e) { return []; }
  }

  function recentTrack() {
    var meta = $('[data-gsr-product]');
    if (!meta) return;
    var item = {
      handle: meta.getAttribute('data-handle'),
      url: meta.getAttribute('data-url'),
      title: meta.getAttribute('data-title'),
      image: meta.getAttribute('data-image'),
      price: meta.getAttribute('data-price')
    };
    if (!item.handle) return;
    var items = recentRead().filter(function (i) { return i.handle !== item.handle; });
    items.unshift(item);
    items = items.slice(0, RECENT_MAX + 1);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(items)); } catch (e) {}
  }

  function recentRender() {
    var host = $('[data-gsr-recent]');
    if (!host) return;
    var currentHandle = host.getAttribute('data-current') || '';
    var items = recentRead().filter(function (i) { return i.handle !== currentHandle; }).slice(0, 5);
    if (items.length < 2) return; // not worth showing
    host.innerHTML =
      '<div class="page-width gsr-recent">' +
      '<div class="title-wrapper-with-link"><h2 class="title h2">Recently viewed</h2></div>' +
      '<ul class="grid grid--4-col-desktop grid--2-col-tablet-down product-grid" style="list-style:none;padding:0;">' +
      items.map(function (i) {
        return '<li class="grid__item"><div class="card-wrapper product-card-wrapper">' +
          '<div class="card card--standard card--media"><div class="card__inner ratio" style="--ratio-percent:100%">' +
          '<div class="card__media"><div class="media media--transparent media--hover-effect">' +
          (i.image ? '<a href="' + i.url + '"><img src="' + i.image + '" alt="" loading="lazy" width="400" height="400"></a>' : '') +
          '</div></div></div>' +
          '<div class="card__content"><div class="card__information">' +
          '<h3 class="card__heading h5"><a class="full-unstyled-link" href="' + i.url + '">' + i.title + '</a></h3>' +
          '<div class="card-information"><span class="price">' + (i.price || '') + '</span></div>' +
          '</div></div></div></div></li>';
      }).join('') +
      '</ul>';
    initReveal(host);
  }

  /* ============================================================
     4. Sticky add-to-cart (product pages)
     ============================================================ */
  function initStickyATC() {
    var mainBtn = $('.product-form__submit') || $('product-form button[name="add"]');
    var titleEl = $('.product__title');
    if (!mainBtn || !titleEl) return;

    var title = titleEl.textContent.trim();
    var priceEl = $('.price__sale .price-item--sale') || $('.price .price-item--regular') || $('.price .price-item');
    var price = priceEl ? priceEl.textContent.trim() : '';
    var imgEl = $('.product__media img, .product__media-item img');
    var imgSrc = imgEl ? imgEl.currentSrc || imgEl.src : '';

    var bar = document.createElement('div');
    bar.className = 'gsr-sticky-atc';
    bar.innerHTML =
      '<div class="gsr-sticky-atc__inner">' +
      '<div class="gsr-sticky-atc__info">' +
      (imgSrc ? '<img class="gsr-sticky-atc__thumb" src="' + imgSrc + '" alt="">' : '') +
      '<div style="min-width:0"><div class="gsr-sticky-atc__title">' + title + '</div>' +
      '<div class="gsr-sticky-atc__price">' + price + '</div></div></div>' +
      '<button type="button" class="gsr-sticky-atc__btn">' + (mainBtn.textContent.trim() || 'Add to cart') + '</button>' +
      '</div>';
    document.body.appendChild(bar);

    var stickyBtn = $('.gsr-sticky-atc__btn', bar);
    on(stickyBtn, 'click', function () { mainBtn.click(); });

    // keep the sticky button label/state in sync with the real one
    var syncBtn = function () {
      stickyBtn.textContent = mainBtn.querySelector('span') ? mainBtn.querySelector('span').textContent.trim() : mainBtn.textContent.trim();
      stickyBtn.disabled = mainBtn.disabled;
      stickyBtn.style.opacity = mainBtn.disabled ? '0.5' : '1';
    };

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          // show bar once the real button is scrolled out of view
          bar.classList.toggle('is-visible', !e.isIntersecting && e.boundingClientRect.top < 0);
        });
      }, { threshold: 0 });
      io.observe(mainBtn);
    }
    if ('MutationObserver' in window) {
      new MutationObserver(syncBtn).observe(mainBtn, { attributes: true, childList: true, subtree: true });
    }
    syncBtn();
  }

  /* ============================================================
     5. Free-shipping progress bar (cart drawer)
     ============================================================ */
  var FREE_SHIP_THRESHOLD = window.GSR_FREE_SHIP_THRESHOLD || 7500; // cents

  function money(cents) {
    var amt = (cents / 100);
    var code = (window.Shopify && Shopify.currency && Shopify.currency.active) || '';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: code || 'USD' }).format(amt);
    } catch (e) {
      return '$' + amt.toFixed(2);
    }
  }

  function renderShipBar(total) {
    var header = $('.cart-drawer .drawer__header');
    var mount = header || $('.cart-drawer .drawer__inner');
    if (!mount) return;
    if (total <= 0) { var e = $('#gsr-ship-bar'); if (e) e.remove(); return; }
    var bar = $('#gsr-ship-bar');
    var remaining = FREE_SHIP_THRESHOLD - total;
    var pct = Math.max(0, Math.min(100, (total / FREE_SHIP_THRESHOLD) * 100));
    var msg = remaining > 0
      ? 'You’re <b>' + money(remaining) + '</b> away from complimentary shipping.'
      : '✓ You’ve unlocked <b>complimentary shipping.</b>';
    var html = '<div class="gsr-ship-bar" id="gsr-ship-bar">' + msg +
      '<div class="gsr-ship-track"><div class="gsr-ship-fill" style="width:' + pct + '%"></div></div></div>';
    if (bar) {
      bar.outerHTML = html;
    } else if (header) {
      header.insertAdjacentHTML('afterend', html);
    } else {
      mount.insertAdjacentHTML('afterbegin', html);
    }
  }

  function refreshShipBar() {
    if (!$('.cart-drawer')) return;
    fetch(window.routes ? window.routes.cart_url + '.js' : '/cart.js', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (cart) { if (cart && typeof cart.total_price === 'number') renderShipBar(cart.total_price); })
      .catch(function () {});
  }

  function watchCartDrawer() {
    var drawer = $('cart-drawer, .cart-drawer');
    if (!drawer || !('MutationObserver' in window)) return;
    new MutationObserver(function () {
      if (drawer.classList.contains('active') || drawer.classList.contains('animate')) refreshShipBar();
    }).observe(drawer, { attributes: true, attributeFilter: ['class'] });
    // also refresh shortly after any add-to-cart network settle
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[name="add"], .quick-add__submit')) {
        setTimeout(refreshShipBar, 900);
      }
    });
  }

  /* ============================================================
     6. Exit-intent newsletter (desktop, once per session)
     ============================================================ */
  function initExitIntent() {
    if (window.innerWidth < 1000) return;
    try { if (sessionStorage.getItem('gsr_exit_seen')) return; } catch (e) { return; }

    var shown = false;
    function show() {
      if (shown) return;
      shown = true;
      try { sessionStorage.setItem('gsr_exit_seen', '1'); } catch (e) {}
      var modal = document.createElement('div');
      modal.className = 'gsr-wish-panel is-open';
      modal.style.zIndex = '70';
      modal.innerHTML =
        '<div class="gsr-wish-panel__scrim" data-x style="opacity:1"></div>' +
        '<div role="dialog" aria-modal="true" aria-label="Newsletter" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(46rem,92%);background:rgb(var(--color-background));border-radius:var(--gsr-radius-lg);padding:4rem 3.2rem;text-align:center;box-shadow:var(--gsr-shadow-md)">' +
        '<button data-x aria-label="Close" style="position:absolute;top:1.4rem;right:1.6rem;background:none;border:0;font-size:2.4rem;line-height:1;cursor:pointer;color:rgb(var(--color-foreground))">&times;</button>' +
        '<p class="caption-with-letter-spacing" style="margin:0 0 1rem">Before you go</p>' +
        '<h2 class="h2" style="margin:0 0 1rem">10% off your first order</h2>' +
        '<p style="color:var(--gsr-muted);margin:0 0 2.2rem">Join the list for early access to new arrivals and private sales.</p>' +
        '<form method="post" action="/contact#gsr-exit" accept-charset="UTF-8" style="display:flex;gap:.8rem;flex-wrap:wrap;justify-content:center">' +
        '<input type="hidden" name="form_type" value="customer"><input type="hidden" name="utf8" value="✓">' +
        '<input type="hidden" name="contact[tags]" value="newsletter">' +
        '<input type="email" name="contact[email]" required placeholder="Email address" aria-label="Email address" style="flex:1;min-width:22rem;padding:1.4rem 1.8rem;border:1px solid var(--gsr-hairline-strong);border-radius:100px;background:transparent;color:rgb(var(--color-foreground))">' +
        '<button type="submit" class="button button--primary">Subscribe</button>' +
        '</form></div>';
      document.body.appendChild(modal);
      $all('[data-x]', modal).forEach(function (el) {
        on(el, 'click', function () { modal.remove(); });
      });
    }
    on(document, 'mouseout', function (e) {
      if (!e.relatedTarget && e.clientY <= 0) show();
    });
  }

  /* ============================================================
     Init
     ============================================================ */
  function init() {
    initReveal();
    bindWishButtons();
    bindWishOpeners();
    syncWishUI();
    recentTrack();
    recentRender();
    initStickyATC();
    watchCartDrawer();
    refreshShipBar();
    initExitIntent();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-bind on Shopify theme-editor section reloads
  document.addEventListener('shopify:section:load', function (e) {
    initReveal(e.target);
    bindWishButtons(e.target);
    bindWishOpeners();
    syncWishUI();
    if (e.target.querySelector && e.target.querySelector('.product-form__submit')) initStickyATC();
  });

  window.GSR = { openWishlist: openWishPanel, refreshShipBar: refreshShipBar };
})();
