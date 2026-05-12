document.addEventListener("DOMContentLoaded", () => {
    setupReportSearch();
    setupExportReport();
});

function setupReportSearch() {
    const searchInput = document.querySelector("[data-report-search]");
    const reportCards = document.querySelectorAll("[data-report-card]");

    if (!searchInput || !reportCards.length) return;

    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase().trim();

        reportCards.forEach((card) => {
            const text = card.textContent.toLowerCase();
            const isMatch = text.includes(keyword);

            card.style.display = isMatch || keyword === "" ? "" : "none";
        });
    });
}

function setupExportReport() {
    const exportButton = document.querySelector("[data-export-report]");

    if (!exportButton) return;

    exportButton.addEventListener("click", () => {
        window.print();
    });
}