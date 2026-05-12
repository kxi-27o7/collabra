document.addEventListener("DOMContentLoaded", () => {
    setupMobileMenu();
});

function setupMobileMenu() {
    const menuButton = document.querySelector("[data-menu-toggle]");
    const navLinks = document.getElementById("navLinks");

    if (!menuButton || !navLinks) return;

    menuButton.addEventListener("click", () => {
        navLinks.classList.toggle("show");
    });
}