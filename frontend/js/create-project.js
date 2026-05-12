document.addEventListener("DOMContentLoaded", () => {
    setupStatusPicker();
    setupMemberChips();
    setupCreateProjectForm();
    setupLivePreview();
});

function setupStatusPicker() {
    const statusLabels = document.querySelectorAll(".status-picker label");

    statusLabels.forEach((label) => {
        label.addEventListener("click", () => {
            statusLabels.forEach((item) => item.classList.remove("active"));
            label.classList.add("active");

            const radio = label.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });
}

function setupMemberChips() {
    const selectedMembers = document.querySelector("[data-selected-members]");
    const addMemberButton = document.querySelector("[data-add-member]");
    const memberSearch = document.querySelector("[data-member-search]");

    if (!selectedMembers) return;

    selectedMembers.addEventListener("click", (event) => {
        const removeButton = event.target.closest(".member-chip button");

        if (!removeButton) return;

        removeButton.closest(".member-chip").remove();
    });

    if (addMemberButton && memberSearch) {
        addMemberButton.addEventListener("click", () => {
            const memberName = memberSearch.value.trim();

            if (!memberName) {
                alert("Isi nama member dulu di kolom search.");
                return;
            }

            const chip = document.createElement("span");
            chip.className = "member-chip";
            chip.innerHTML = `
                <span class="member-avatar">${memberName.charAt(0).toUpperCase()}</span>
                ${memberName}
                <button type="button" aria-label="Remove member">×</button>
            `;

            selectedMembers.insertBefore(chip, addMemberButton);
            memberSearch.value = "";
        });
    }
}

function setupCreateProjectForm() {
    const form = document.querySelector("[data-create-project-form]");

    if (!form) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const isValid = validateCreateProjectForm(form);
        if (!isValid) return;

        const formData = Object.fromEntries(new FormData(form).entries());

        const members = Array.from(document.querySelectorAll(".member-chip"))
            .map((chip) => chip.textContent.replace("×", "").trim());

        console.log("Create project ready for backend:", {
            ...formData,
            members
        });

        alert("Project sudah valid. Nanti bagian ini bisa disambungkan ke backend.");
    });
}

function validateCreateProjectForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll("input[required], textarea[required]");

    requiredFields.forEach((field) => {
        clearError(field);

        if (!field.value.trim()) {
            showError(field, "This field is required.");
            isValid = false;
        }
    });

    return isValid;
}

function setupLivePreview() {
    const titleInput = document.querySelector("[data-project-title-source]");
    const descriptionInput = document.querySelector("[data-project-description-source]");
    const deadlineInput = document.querySelector("[data-project-deadline-source]");
    const previewText = document.querySelector(".preview-visual p");

    if (!titleInput || !descriptionInput || !deadlineInput || !previewText) return;

    const updatePreview = () => {
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        const deadline = deadlineInput.value;

        if (!title && !description && !deadline) {
            previewText.innerHTML = "Live Node Preview<br>Will Generate Upon Creation";
            return;
        }

        previewText.innerHTML = `
            ${title || "Untitled Project"}<br>
            ${deadline ? `Deadline: ${formatDate(deadline)}` : "Deadline not set"}
        `;
    };

    titleInput.addEventListener("input", updatePreview);
    descriptionInput.addEventListener("input", updatePreview);
    deadlineInput.addEventListener("change", updatePreview);
}

function showError(input, message) {
    input.classList.add("error");

    const formGroup = input.closest(".form-group");
    const errorMessage = formGroup?.querySelector(".error-message");

    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

function clearError(input) {
    input.classList.remove("error");

    const formGroup = input.closest(".form-group");
    const errorMessage = formGroup?.querySelector(".error-message");

    if (errorMessage) {
        errorMessage.textContent = "";
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric"
    });
}