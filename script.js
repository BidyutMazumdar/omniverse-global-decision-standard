// OMNIVERSE™ Global Script — 100% LOCK FINAL Edition
// Production-safe • Performance-optimized • Accessible • GitHub Pages compatible

(() => {
  "use strict";

  // ==========================================
  // CONFIG
  // ==========================================
  const REVEAL_OFFSET = 100;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ==========================================
  // FADE / REVEAL SYSTEM
  // ==========================================
  function getFadeElements() {
    return document.querySelectorAll(".fade:not(.show)");
  }

  function revealOnScroll() {
    const elements = getFadeElements();
    if (!elements.length) return true;

    const windowHeight = window.innerHeight;

    elements.forEach((el) => {
      const elementTop = el.getBoundingClientRect().top;

      if (elementTop < windowHeight - REVEAL_OFFSET) {
        el.classList.add("show");
      }
    });

    return getFadeElements().length === 0;
  }

  function revealAllImmediately() {
    document.querySelectorAll(".fade").forEach((el) => {
      el.classList.add("show");
    });
  }

  // ==========================================
  // SMOOTH SCROLL SYSTEM
  // ==========================================
  function initSmoothScroll() {
    const anchors = document.querySelectorAll('a[href^="#"]');

    anchors.forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        const targetSelector = this.getAttribute("href");

        // Ignore empty or plain "#" links
        if (!targetSelector || targetSelector === "#") return;

        const target = document.querySelector(targetSelector);

        if (target) {
          e.preventDefault();
          target.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "start",
          });
        }
      });
    });
  }

  // ==========================================
  // ACTIVE NAV LINK SYSTEM
  // ==========================================
  function normalizePage(path) {
    if (!path || path === "/" || path === "./") return "index.html";

    const cleanPath = path.split("#")[0].split("?")[0];
    const page = cleanPath.split("/").pop();

    return !page ? "index.html" : page;
  }

  function initActiveNavLink() {
    const links = document.querySelectorAll(".nav a");
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
  // THROTTLED SCROLL HANDLER
  // ==========================================
  let ticking = false;
  let scrollBound = false;

  function onScroll() {
    if (prefersReducedMotion) return;

    if (!ticking) {
      window.requestAnimationFrame(() => {
        const done = revealOnScroll();

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

    const done = revealOnScroll();

    if (!done) {
      window.addEventListener("scroll", onScroll, { passive: true });
      scrollBound = true;
    }

    // Extra paint-safe pass after layout settles
    window.requestAnimationFrame(() => {
      const finished = revealOnScroll();

      if (finished && scrollBound) {
        window.removeEventListener("scroll", onScroll);
        scrollBound = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
