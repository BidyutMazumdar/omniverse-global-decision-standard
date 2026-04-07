// OMNIVERSE™ Global Script — Final Version

// Select all fade elements
const elements = document.querySelectorAll(".fade");

// Reveal function
function revealOnScroll() {
    elements.forEach(el => {
        const elementTop = el.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;

        if (elementTop < windowHeight - 100) {
            el.classList.add("show");
        }
    });
}

// Run on scroll
window.addEventListener("scroll", revealOnScroll);

// Run on page load (ensures first section appears)
window.addEventListener("load", revealOnScroll);

// Optional: Smooth scroll for internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
            target.scrollIntoView({
                behavior: "smooth"
            });
        }
    });
});
