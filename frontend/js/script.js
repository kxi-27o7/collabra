document.addEventListener("DOMContentLoaded", () => {
    setupMobileMenu();
    setupPasswordToggle();
    setupRoleSelection();
    setupFormValidation();
    setupDashboardSearch();
});

function setupMobileMenu() {
    const menuButton = document.querySelector("[data-menu-toggle]");
    const navLinks = document.getElementById("navLinks");

    if (!menuButton || !navLinks) return;

    menuButton.addEventListener("click", () => {
        navLinks.classList.toggle("show");
    });
}

function setupPasswordToggle() {
    const toggleButtons = document.querySelectorAll("[data-toggle-password]");

    toggleButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const passwordField = button.closest(".password-field");
            const input = passwordField?.querySelector("input");

            if (!input) return;

            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
            button.textContent = isPassword ? "◎" : "◉";
            button.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
        });
    });
}

function setupRoleSelection() {
    const roleCards = document.querySelectorAll(".role-card");

    roleCards.forEach((card) => {
        card.addEventListener("click", () => {
            roleCards.forEach((item) => item.classList.remove("active"));
            card.classList.add("active");

            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });
}

function setupFormValidation() {
    const forms = document.querySelectorAll("form[data-form]");

    forms.forEach((form) => {
        form.addEventListener("submit", (event) => {
            event.preventDefault();

            const isValid = validateForm(form);

            if (!isValid) return;

            const formData = Object.fromEntries(new FormData(form).entries());

            console.log("Form ready for backend:", {
                formType: form.dataset.form,
                data: formData
            });

            /*
                Untuk backend nanti:
                1. Ganti action="#" di HTML menjadi endpoint backend.
                   Contoh:
                   action="/login"
                   action="/register"

                2. Kalau pakai Laravel, backend bisa ambil name dari input:
                   email
                   password
                   full_name
                   role
                   remember
                   terms

                3. Kalau sudah tersambung backend, bagian event.preventDefault()
                   bisa dihapus agar form submit normal.
            */

            alert("Form sudah valid. Nanti bagian ini bisa disambungkan ke backend.");
        });
    });
}

function validateForm(form) {
    let isValid = true;

    const requiredFields = form.querySelectorAll("input[required]");

    requiredFields.forEach((input) => {
        clearError(input);

        if (input.type === "checkbox" && !input.checked) {
            showError(input, "This field is required.");
            isValid = false;
            return;
        }

        if (!input.value.trim()) {
            showError(input, "This field is required.");
            isValid = false;
            return;
        }

        if (input.type === "email" && !isValidEmail(input.value)) {
            showError(input, "Please enter a valid email address.");
            isValid = false;
            return;
        }

        if (input.name === "password" && input.value.length < 8) {
            showError(input, "Password must be at least 8 characters.");
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
        return;
    }

    const checkboxRow = input.closest(".checkbox-row");
    if (checkboxRow) {
        checkboxRow.classList.add("error");
    }
}

function clearError(input) {
    input.classList.remove("error");

    const formGroup = input.closest(".form-group");
    const errorMessage = formGroup?.querySelector(".error-message");

    if (errorMessage) {
        errorMessage.textContent = "";
    }

    const checkboxRow = input.closest(".checkbox-row");
    if (checkboxRow) {
        checkboxRow.classList.remove("error");
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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