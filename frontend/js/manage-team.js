document.addEventListener("DOMContentLoaded", () => {
    setupTeamSearch();
    setupDeleteMember();
    setupInviteModal();
    setupInviteForm();
    setupGenerateInviteLink();
});

function setupTeamSearch() {
    const searchInput = document.querySelector("[data-team-search]");
    const members = document.querySelectorAll("[data-team-member]");

    if (!searchInput || !members.length) return;

    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase().trim();

        members.forEach((member) => {
            const text = member.textContent.toLowerCase();
            const isMatch = text.includes(keyword);

            member.style.display = isMatch || keyword === "" ? "" : "none";
        });
    });
}

function setupDeleteMember() {
    const table = document.querySelector(".personnel-table");

    if (!table) return;

    table.addEventListener("click", (event) => {
        const deleteButton = event.target.closest(".delete-member-btn");

        if (!deleteButton) return;

        const row = deleteButton.closest("[data-team-member]");
        const memberName = row?.querySelector("h3")?.textContent || "this member";

        const confirmed = confirm(`Remove ${memberName} from the team?`);

        if (confirmed && row) {
            row.remove();
        }
    });
}

function setupInviteModal() {
    const modal = document.querySelector("[data-invite-modal]");
    const openButton = document.querySelector("[data-open-invite-modal]");
    const closeButton = document.querySelector("[data-close-invite-modal]");

    if (!modal || !openButton || !closeButton) return;

    openButton.addEventListener("click", () => {
        modal.classList.add("show");
    });

    closeButton.addEventListener("click", () => {
        modal.classList.remove("show");
    });

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.classList.remove("show");
        }
    });
}

function setupInviteForm() {
    const form = document.querySelector("[data-invite-form]");

    if (!form) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const isValid = validateInviteForm(form);
        if (!isValid) return;

        const formData = Object.fromEntries(new FormData(form).entries());

        console.log("Invite member ready for backend:", formData);

        alert("Invite sudah valid. Nanti bagian ini bisa disambungkan ke backend.");

        form.reset();

        const modal = document.querySelector("[data-invite-modal]");
        if (modal) modal.classList.remove("show");
    });
}

function setupGenerateInviteLink() {
    const button = document.querySelector("[data-generate-invite]");

    if (!button) return;

    button.addEventListener("click", async () => {
        const inviteLink = "https://scholarly-architect.test/invite/research-lab-temp-access";

        try {
            await navigator.clipboard.writeText(inviteLink);
            alert("Invite link berhasil dicopy ke clipboard.");
        } catch {
            alert(`Invite link: ${inviteLink}`);
        }
    });
}

function validateInviteForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll("input[required], select[required]");

    requiredFields.forEach((field) => {
        clearError(field);

        if (!field.value.trim()) {
            showError(field, "This field is required.");
            isValid = false;
            return;
        }

        if (field.type === "email" && !isValidEmail(field.value)) {
            showError(field, "Please enter a valid email address.");
            isValid = false;
        }
    });

    return isValid;
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

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}