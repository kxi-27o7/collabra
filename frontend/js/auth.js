document.addEventListener("DOMContentLoaded", () => {
  setupPasswordToggle();
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

function setupFormValidation() {
  const forms = document.querySelectorAll("form[data-form]");

  forms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const isValid = validateForm(form);
      if (!isValid) return;

      const formData = Object.fromEntries(new FormData(form).entries());

      if (form.dataset.form === "register") {
        try {
          const payload = {
            email: formData.email,
            password: formData.password,
            full_name: formData.fullName || formData.name || "Collabra User"
          };
          
          await fetchAPI("/auth/register", {
            method: "POST",
            body: payload
          });

          alert("Account created successfully. Please log in.");
          window.location.href = "login.html";
        } catch (error) {
          alert(`Registration failed: ${error.message}`);
        }
        return;
      }

      if (form.dataset.form === "login") {
        try {
          // OAuth2 requires form data (URLSearchParams)
          const params = new URLSearchParams();
          params.append("username", formData.email);
          params.append("password", formData.password);

          const data = await fetchAPI("/auth/login", {
            method: "POST",
            body: params
          });

          if (data && data.access_token) {
            localStorage.setItem("collabra_access_token", data.access_token);
            
            // Fetch user profile to store user data
            const user = await fetchAPI("/users/me");
            localStorage.setItem("collabraCurrentUser", JSON.stringify(user));

            window.location.href = "project-list.html";
          }
        } catch (error) {
          alert(`Login failed: ${error.message}`);
        }
        return;
      }

      console.log("Form ready for backend:", {
        formType: form.dataset.form,
        data: formData
      });
    });
  });
}

function validateForm(form) {
  let isValid = true;
  const requiredFields = form.querySelectorAll("input[required], textarea[required], select[required]");

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