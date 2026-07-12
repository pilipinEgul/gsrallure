/*
 * Plays muted inline videos only while they are on screen, and pauses them
 * when scrolled out of view. Avoids the jank/lag of a video decoding
 * constantly in the background (especially on mobile). Also defers loading
 * the file until the video is about to be seen (preload="none").
 *
 * Target: <video data-gsr-inview ...>
 */
(function () {
  'use strict';

  function playSafely(video) {
    if (video.preload === 'none') video.preload = 'auto';
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  function setup(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var videos = scope.querySelectorAll('video[data-gsr-inview]:not([data-gsr-inview-ready])');
    if (!videos.length) return;

    if (!('IntersectionObserver' in window)) {
      videos.forEach(function (v) {
        v.setAttribute('data-gsr-inview-ready', '1');
        playSafely(v);
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target;
          if (entry.isIntersecting) {
            playSafely(v);
          } else if (!v.paused) {
            v.pause();
          }
        });
      },
      { threshold: 0.2 }
    );

    videos.forEach(function (v) {
      v.setAttribute('data-gsr-inview-ready', '1');
      observer.observe(v);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setup(document); });
  } else {
    setup(document);
  }

  // Re-scan when the theme editor injects/reloads a section.
  document.addEventListener('shopify:section:load', function (e) { setup(e.target); });
})();
