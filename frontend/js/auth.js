document.addEventListener("DOMContentLoaded", () => {
    setupPasswordToggle();
    setupRoleSelection();
    setupFormValidation();
});

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

            alert("Form sudah valid. Nanti bisa disambungkan ke backend.");
        });
    });
}

function validateForm(form) {
    let isValid = true;

    const requiredFields = form.querySelectorAll("input[required], textarea[required]");

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