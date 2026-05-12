document.addEventListener("DOMContentLoaded", () => {
    setupDashboardSearch();
    setupQuickActionButtons();
});

function setupDashboardSearch() {
    const searchInput = document.querySelector("[data-search-input]");

    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase().trim();

        const searchableItems = document.querySelectorAll(
            ".project-progress-item, .team-card, .task-row, .activity-item, .member-activity-item, .deadline-item"
        );

        searchableItems.forEach((item) => {
            const text = item.textContent.toLowerCase();
            const isMatch = text.includes(keyword);

            item.style.display = isMatch || keyword === "" ? "" : "none";
        });
    });
}

function setupQuickActionButtons() {
    const quickActionButtons = document.querySelectorAll(".quick-action-list button");

    quickActionButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const actionText = button.textContent.toLowerCase();

            if (actionText.includes("create project")) {
                window.location.href = "create-project.html";
                return;
            }

            if (actionText.includes("create task")) {
                window.location.href = "task-board.html";
                return;
            }

            if (actionText.includes("invite team")) {
                window.location.href = "manage-team.html";
            }
        });
    });
}