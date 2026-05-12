document.addEventListener("DOMContentLoaded", () => {
    setupDetailTabs();
    setupDetailSearch();
});

function setupDetailTabs() {
    const tabs = document.querySelectorAll("[data-tab]");
    const panels = document.querySelectorAll("[data-tab-panel]");

    if (!tabs.length || !panels.length) return;

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const selectedTab = tab.dataset.tab;

            tabs.forEach((item) => item.classList.remove("active"));
            tab.classList.add("active");

            panels.forEach((panel) => {
                const panelName = panel.dataset.tabPanel;
                panel.classList.toggle("active", panelName === selectedTab);
            });
        });
    });
}

function setupDetailSearch() {
    const searchInput = document.querySelector("[data-detail-search]");

    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase().trim();

        const searchableItems = document.querySelectorAll(
            ".detail-stat-card, .timeline-step, .research-member, .file-item, .project-insight-card"
        );

        searchableItems.forEach((item) => {
            const text = item.textContent.toLowerCase();
            const isMatch = text.includes(keyword);

            item.style.display = isMatch || keyword === "" ? "" : "none";
        });
    });
}