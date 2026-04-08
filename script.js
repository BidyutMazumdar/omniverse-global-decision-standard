// OMNIVERSE™ Global Script — Ultimate Production Version

// ===============================
// FADE ANIMATION SYSTEM
// ===============================

const elements = document.querySelectorAll(".fade");

function revealOnScroll() {
    const windowHeight = window.innerHeight;

    elements.forEach(el => {
        const elementTop = el.getBoundingClientRect().top;

        if (elementTop < windowHeight - 100) {
            el.classList.add("show");
        }
    });
}

// Scroll trigger
window.addEventListener("scroll", revealOnScroll);

// Load trigger (important)
window.addEventListener("load", revealOnScroll);


// ===============================
// SMOOTH SCROLL SYSTEM
// ===============================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function(e) {
        e.preventDefault();

        const target = document.querySelector(this.getAttribute("href"));

        if (target) {
            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });
});


// ===============================
// GLOBAL UI ENHANCEMENT
// ===============================

// Navbar active link highlight
const links = document.querySelectorAll(".nav a");
const currentPage = window.location.pathname.split("/").pop();

links.forEach(link => {
    if (link.getAttribute("href") === currentPage) {
        link.style.color = "#7f5cff";
        link.style.fontWeight = "bold";
    }
});


// ===============================
// PERFORMANCE OPTIMIZATION
// ===============================

// Throttle scroll events (smooth + efficient)
let ticking = false;

window.addEventListener("scroll", () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            revealOnScroll();
            ticking = false;
        });
        ticking = true;
    }
});


// ===============================
// SAFE INIT (FOR ALL PAGES)
// ===============================

document.addEventListener("DOMContentLoaded", () => {
    revealOnScroll();
});
