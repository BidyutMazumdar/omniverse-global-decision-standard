// OMNIVERSE™ Global Script — 100% LOCK FINAL Edition (HARDENED)
// Production-grade • Accessible • Performance-optimized • GitHub Pages safe

(() => {
  "use strict";

  // ==========================================
  // CONFIG
  // ==========================================
  const REVEAL_OFFSET = 100;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ==========================================
  // SAFE QUERY HELPERS
  // ==========================================
  const $$ = (selector, scope = document) => scope.querySelectorAll(selector);
  const $ = (selector, scope = document) => scope.querySelector(selector);

  // ==========================================
  // FADE / REVEAL SYSTEM (WITH OBSERVER)
  // ==========================================
  let observer = null;

  function revealElement(el) {
    if (!el || el.classList.contains("show")) return;
    el.classList.add("show");
  }

  function initRevealObserver() {
    if (!("IntersectionObserver" in window)) return false;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealElement(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: `0px 0px -${REVEAL_OFFSET}px 0px`,
        threshold: 0.1,
      }
    );

    $$(".fade").forEach((el) => observer.observe(el));
    return true;
  }

  function revealOnScrollFallback() {
    const elements = $$(".fade:not(.show)");
    if (!elements.length) return true;

    const windowHeight = window.innerHeight;

    elements.forEach((el) => {
      const elementTop = el.getBoundingClientRect().top;
      if (elementTop < windowHeight - REVEAL_OFFSET) {
        revealElement(el);
      }
    });

    return $$(".fade:not(.show)").length === 0;
  }

  function revealAllImmediately() {
    $$(".fade").forEach(revealElement);
  }

  // ==========================================
  // SMOOTH SCROLL SYSTEM (SAFE)
  // ==========================================
  function initSmoothScroll() {
    $$( 'a[href^="#"]' ).forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        const targetSelector = this.getAttribute("href");

        if (!targetSelector || targetSelector === "#") return;

        const target = $(targetSelector);
        if (!target) return;

        e.preventDefault();

        target.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
      });
    });
  }

  // ==========================================
  // ACTIVE NAV LINK SYSTEM (ROBUST)
  // ==========================================
  function normalizePage(path) {
    if (!path || path === "/" || path === "./") return "index.html";

    const clean = path.split("#")[0].split("?")[0];
    const page = clean.split("/").pop();

    return page || "index.html";
  }

  function initActiveNavLink() {
    const links = $$(".nav a");
    if (!links.length) return;

    const currentPage = normalizePage(window.location.pathname);

    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const normalizedHref = normalizePage(href);

      if (normalizedHref === currentPage) {
        link.classList.add("active-link");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  // ==========================================
  // SCROLL FALLBACK (THROTTLED)
  // ==========================================
  let ticking = false;
  let scrollBound = false;

  function onScroll() {
    if (prefersReducedMotion) return;

    if (!ticking) {
      window.requestAnimationFrame(() => {
        const done = revealOnScrollFallback();

        if (done && scrollBound) {
          window.removeEventListener("scroll", onScroll);
          scrollBound = false;
        }

        ticking = false;
      });

      ticking = true;
    }
  }

  // ==========================================
  // INIT
  // ==========================================
  function init() {
    initSmoothScroll();
    initActiveNavLink();

    if (prefersReducedMotion) {
      revealAllImmediately();
      return;
    }

    // Try modern observer first
    const observerActive = initRevealObserver();

    if (!observerActive) {
      const done = revealOnScrollFallback();

      if (!done) {
        window.addEventListener("scroll", onScroll, { passive: true });
        scrollBound = true;
      }

      // Extra layout-safe pass
      window.requestAnimationFrame(() => {
        const finished = revealOnScrollFallback();

        if (finished && scrollBound) {
          window.removeEventListener("scroll", onScroll);
          scrollBound = false;
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  // ==========================================
  // CLEANUP (SAFETY)
  // ==========================================
  window.addEventListener("beforeunload", () => {
    if (observer) observer.disconnect();
    window.removeEventListener("scroll", onScroll);
  });
})();
