document.addEventListener("DOMContentLoaded", () => {
    setupProjectSearch();
    setupProjectTabs();
});

function setupProjectSearch() {
    const searchInput = document.querySelector("[data-project-search]");
    const projectCards = document.querySelectorAll("[data-project-card]");

    if (!searchInput || !projectCards.length) return;

    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase().trim();

        projectCards.forEach((card) => {
            const text = card.textContent.toLowerCase();
            const isMatch = text.includes(keyword);

            card.style.display = isMatch || keyword === "" ? "" : "none";
        });
    });
}

function setupProjectTabs() {
    const tabContainer = document.querySelector("[data-project-tabs]");
    const tabs = document.querySelectorAll("[data-filter]");
    const projectCards = document.querySelectorAll("[data-project-card]");

    if (!tabContainer || !tabs.length || !projectCards.length) return;

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const selectedFilter = tab.dataset.filter;

            tabs.forEach((item) => item.classList.remove("active"));
            tab.classList.add("active");

            projectCards.forEach((card) => {
                const projectStatus = card.dataset.status;

                const shouldShow =
                    selectedFilter === "all" ||
                    selectedFilter === projectStatus;

                card.style.display = shouldShow ? "" : "none";
            });
        });
    });
}