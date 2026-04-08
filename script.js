// OMNIVERSE™ Global Script — 100% LOCK Edition
// Production-safe, performance-aware, GitHub Pages compatible

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
    return document.querySelectorAll(".fade");
  }

  function revealOnScroll() {
    const elements = getFadeElements();
    const windowHeight = window.innerHeight;

    elements.forEach((el) => {
      const elementTop = el.getBoundingClientRect().top;

      if (elementTop < windowHeight - REVEAL_OFFSET) {
        el.classList.add("show");
      }
    });
  }

  function revealAllImmediately() {
    const elements = getFadeElements();
    elements.forEach((el) => el.classList.add("show"));
  }

  // ==========================================
  // SMOOTH SCROLL SYSTEM
  // ==========================================
  function initSmoothScroll() {
    const anchors = document.querySelectorAll('a[href^="#"]');

    anchors.forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        const targetSelector = this.getAttribute("href");

        // Ignore plain "#" links
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
  function normalizePage(pathname) {
    const page = pathname.split("/").pop() || "index.html";
    return page === "" ? "index.html" : page;
  }

  function initActiveNavLink() {
    const links = document.querySelectorAll(".nav a");
    if (!links.length) return;

    const currentPage = normalizePage(window.location.pathname);

    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (href === currentPage) {
        link.classList.add("active-link");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  // ==========================================
  // THROTTLED SCROLL HANDLER
  // ==========================================
  let ticking = false;

  function onScroll() {
    if (prefersReducedMotion) return;

    if (!ticking) {
      window.requestAnimationFrame(() => {
        revealOnScroll();
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
    } else {
      revealOnScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("load", revealOnScroll);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
