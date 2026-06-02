// Apply saved theme immediately to avoid flash on load
(function () {
    const saved = localStorage.getItem("collabra_theme");
    if (saved === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
    }
})();

document.addEventListener("DOMContentLoaded", () => {
    applyThemeIcon();
    setupThemeToggle();
    setupTopbarAvatar();
});

function applyThemeIcon() {
    const icon = document.querySelector(".theme-icon");
    if (!icon) return;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    icon.textContent = isDark ? "☽" : "☀";
}

function setupThemeToggle() {
    const btn = document.getElementById("themeToggle");
    if (!btn) return;

    btn.addEventListener("click", () => {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const next = isDark ? "light" : "dark";

        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("collabra_theme", next);

        const icon = btn.querySelector(".theme-icon");
        if (icon) icon.textContent = next === "dark" ? "☽" : "☀";
    });
}

function setupTopbarAvatar() {
    const el = document.getElementById("topbarAvatarInitials");
    if (!el) return;

    try {
        const user = JSON.parse(localStorage.getItem("collabraCurrentUser") || "{}");
        const name = user.full_name || user.email || "";
        if (name) {
            const initials = name.trim().split(/\s+/).map(p => p[0].toUpperCase()).slice(0, 2).join("");
            el.textContent = initials || "◎";
        }
    } catch (e) {}
}
