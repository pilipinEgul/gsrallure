/*
 * Skeleton loading for all rendered images.
 * Adds a shimmering placeholder to every <img> until it finishes loading,
 * then reveals the image. Also watches for images added later (predictive
 * search, quick-add modals, cart, infinite scroll, etc.).
 */
(function () {
  'use strict';

  function markLoaded(img) {
    img.classList.add('gsr-loaded');
  }

  function initImg(img) {
    // Only process each image once.
    if (img.dataset.gsrSkeleton) return;
    img.dataset.gsrSkeleton = '1';

    // Allow opting out with class="no-skeleton".
    if (img.classList.contains('no-skeleton')) return;

    img.classList.add('gsr-skeleton');

    // Already loaded (cached / above the fold and decoded)?
    if (img.complete && img.naturalWidth > 0) {
      markLoaded(img);
      return;
    }

    img.addEventListener('load', function () { markLoaded(img); }, { once: true });
    // Don't leave a broken image shimmering forever.
    img.addEventListener('error', function () { markLoaded(img); }, { once: true });
  }

  function initVideo(video) {
    if (video.dataset.gsrSkeleton) return;
    video.dataset.gsrSkeleton = '1';
    if (video.classList.contains('no-skeleton')) return;

    video.classList.add('gsr-skeleton');

    // readyState >= 2 (HAVE_CURRENT_DATA) means it already has a frame.
    if (video.readyState >= 2) {
      markLoaded(video);
      return;
    }

    video.addEventListener('loadeddata', function () { markLoaded(video); }, { once: true });
    video.addEventListener('error', function () { markLoaded(video); }, { once: true });
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('img').forEach(initImg);
    root.querySelectorAll('video[data-gsr-inview]').forEach(initVideo);
  }

  function start() {
    scan(document);

    if (!('MutationObserver' in window)) return;

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType !== 1) continue;
          if (node.tagName === 'IMG') {
            initImg(node);
          } else if (node.tagName === 'VIDEO' && node.hasAttribute('data-gsr-inview')) {
            initVideo(node);
          } else {
            scan(node);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
