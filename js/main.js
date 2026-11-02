/* NextGen STEM small interaction layer. No dependencies. */

(function () {
  'use strict';

  /* Mobile navigation ---------------------------------------------------- */
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('nav');

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
      document.body.style.overflow = !open ? 'hidden' : '';
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        burger.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
        document.body.style.overflow = '';
      }
    });

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        burger.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
        document.body.style.overflow = '';
        burger.focus();
      }
    });
  }

  /* Hairline under the masthead once the page scrolls -------------------- */
  var masthead = document.querySelector('.masthead');
  if (masthead) {
    var onScroll = function () {
      masthead.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Reveal on first view -------------------------------------------------- */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = null;

  if (!reduced && 'IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = Number(el.dataset.delay || 0);
        setTimeout(function () { el.classList.add('in'); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  }

  /* Called again by content.js once it has drawn anything from /data, so
     admin-added sections fade in the same way the built-in ones do. */
  function watchReveals() {
    var targets = document.querySelectorAll('.rv:not(.in):not([data-watched])');
    Array.prototype.forEach.call(targets, function (el) {
      el.setAttribute('data-watched', '');
      if (io) io.observe(el);
      else el.classList.add('in');
    });
  }

  watchReveals();

  window.NGS = window.NGS || {};
  window.NGS.watchReveals = watchReveals;
})();
