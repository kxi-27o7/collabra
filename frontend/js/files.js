document.addEventListener("DOMContentLoaded", () => {
    setupFileSearch();
    setupFileUpload();
    setupFileDelete();
});

function setupFileSearch() {
    const searchInput = document.querySelector("[data-file-search]");
    const fileRows = document.querySelectorAll("[data-file-row]");

    if (!searchInput || !fileRows.length) return;

    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase().trim();

        fileRows.forEach((row) => {
            const text = row.textContent.toLowerCase();
            const isMatch = text.includes(keyword);

            row.style.display = isMatch || keyword === "" ? "" : "none";
        });
    });
}

function setupFileUpload() {
    const dropzone = document.querySelector("[data-dropzone]");
    const fileInput = document.querySelector("[data-file-input]");
    const uploadTrigger = document.querySelector("[data-upload-trigger]");

    if (!dropzone || !fileInput || !uploadTrigger) return;

    uploadTrigger.addEventListener("click", () => {
        fileInput.click();
    });

    dropzone.addEventListener("click", (event) => {
        const clickedButton = event.target.closest("button");
        if (clickedButton) return;

        fileInput.click();
    });

    dropzone.addEventListener("dragover", (event) => {
        event.preventDefault();
        dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (event) => {
        event.preventDefault();
        dropzone.classList.remove("dragover");

        const files = Array.from(event.dataTransfer.files);
        handleSelectedFiles(files);
    });

    fileInput.addEventListener("change", () => {
        const files = Array.from(fileInput.files);
        handleSelectedFiles(files);
    });
}

function handleSelectedFiles(files) {
    if (!files.length) return;

    const table = document.querySelector(".files-table");

    if (!table) return;

    files.forEach((file) => {
        const fileRow = document.createElement("article");
        fileRow.className = "file-row";
        fileRow.setAttribute("data-file-row", "");

        const extension = getFileExtension(file.name);
        const iconClass = getIconClass(extension);
        const today = new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric"
        });

        fileRow.innerHTML = `
            <div class="file-name-cell">
                <span class="document-icon ${iconClass}">${extension.toUpperCase()}</span>
                <div>
                    <h3>${escapeHtml(file.name)}</h3>
                    <span class="file-status processing">Processing</span>
                </div>
            </div>

            <div class="uploader-cell">
                <span class="uploader-avatar dark">A</span>
                <p>Dr. Aris Thorne</p>
            </div>

            <span class="file-date">${today}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>

            <div class="file-action-cell">
                <button type="button" aria-label="Download file">↓</button>
                <button type="button" class="delete-file-btn" aria-label="Delete file">♲</button>
            </div>
        `;

        table.appendChild(fileRow);
    });

    alert("File successfully added to the preview grid. This upload feature will be integrated with the backend shortly.");
}

function setupFileDelete() {
    const table = document.querySelector(".files-table");

    if (!table) return;

    table.addEventListener("click", (event) => {
        const deleteButton = event.target.closest(".delete-file-btn");

        if (!deleteButton) return;

        const row = deleteButton.closest("[data-file-row]");
        const fileName = row?.querySelector("h3")?.textContent || "this file";

        const confirmed = confirm(`Delete ${fileName}?`);

        if (confirmed && row) {
            row.remove();
        }
    });
}

function getFileExtension(fileName) {
    const extension = fileName.split(".").pop();

    if (!extension || extension === fileName) return "FILE";

    return extension.slice(0, 4);
}

function getIconClass(extension) {
    const ext = extension.toLowerCase();

    if (ext === "pdf") return "pdf";
    if (ext === "csv" || ext === "xlsx" || ext === "xls") return "csv";

    return "doc";
}

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;

    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;

    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}