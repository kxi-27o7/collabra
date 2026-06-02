document.addEventListener("DOMContentLoaded", async () => {
  setupSettingsTabs();
  setupAvatarPreview();
  setupDiscardSettings();
  setupSettingsFormValidation();
  setupLogout();
  await renderCachedProfile();
  await loadProfile();
});

function renderCachedProfile() {
    const cached = localStorage.getItem("collabraCurrentUser");
    if (!cached) return;

    let user = {};
    try {
        user = JSON.parse(cached);
    } catch (_) {
        return;
    }

    if (!user || !user.email) return;

    const fullNameInput = document.getElementById("settingsFullName");
    const emailInput = document.getElementById("settingsEmail");
    const bioInput = document.getElementById("researchBio");

    if (fullNameInput) fullNameInput.value = user.full_name || "";
    if (emailInput) emailInput.value = user.email || "";
    if (bioInput && user.research_bio) bioInput.value = user.research_bio;
}

async function loadProfile() {
    const fullNameInput = document.getElementById("settingsFullName");
    const emailInput = document.getElementById("settingsEmail");

    if (!fullNameInput || !emailInput) return;

    try {
        const user = await fetchAPI("/users/me");
        fullNameInput.value = user.full_name || "";
        emailInput.value = user.email || "";
    } catch (error) {
        console.error("Failed to load profile details:", error);
    }
}

function setupSettingsTabs() {
    const tabs = document.querySelectorAll("[data-settings-tab]");
    const panels = document.querySelectorAll("[data-settings-panel]");

    if (!tabs.length || !panels.length) return;

    function activateTab(selectedTab) {
        tabs.forEach((item) => item.classList.remove("active"));
        const activeTab = document.querySelector(`[data-settings-tab="${selectedTab}"]`);
        if (activeTab) activeTab.classList.add("active");

        panels.forEach((panel) => {
            panel.style.display = panel.dataset.settingsPanel === selectedTab ? "" : "none";
        });
    }

    // Hide non-profile panels on load
    activateTab("profile");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => activateTab(tab.dataset.settingsTab));
    });
}

function setupAvatarPreview() {
    const avatarInput = document.getElementById("avatarUpload");
    const avatarPreview = document.querySelector(".profile-photo-preview");
    const removeButton = document.querySelector("[data-remove-avatar]");

    if (!avatarInput || !avatarPreview) return;

    avatarInput.addEventListener("change", () => {
        const file = avatarInput.files[0];

        if (!file) return;

        const imageUrl = URL.createObjectURL(file);

        avatarPreview.innerHTML = "";
        avatarPreview.style.background = `url("${imageUrl}") center/cover no-repeat`;
    });

    if (removeButton) {
        removeButton.addEventListener("click", () => {
            avatarInput.value = "";
            avatarPreview.innerHTML = "<span>👨‍🎓</span>";
            avatarPreview.style.background = "";
        });
    }
}

function setupDiscardSettings() {
    const discardButton = document.querySelector("[data-discard-settings]");
    const settingsForm = document.querySelector('form[data-form="settings"]');

    if (!discardButton || !settingsForm) return;

    discardButton.addEventListener("click", async () => {
        await loadProfile();

        const avatarPreview = document.querySelector(".profile-photo-preview");

        if (avatarPreview) {
            avatarPreview.innerHTML = "<span>👨‍🎓</span>";
            avatarPreview.style.background = "";
        }
    });
}

function setupSettingsFormValidation() {
    const form = document.querySelector('form[data-form="settings"]');

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        let isValid = true;
        const requiredFields = form.querySelectorAll("input[required], textarea[required]");

        requiredFields.forEach((input) => {
            clearError(input);

            if (!input.value.trim()) {
                showError(input, "This field is required.");
                isValid = false;
                return;
            }

            if (input.type === "email" && !isValidEmail(input.value)) {
                showError(input, "Please enter a valid email address.");
                isValid = false;
            }
        });

        if (!isValid) return;

        const fullName = document.getElementById("settingsFullName").value.trim();
        const email = document.getElementById("settingsEmail").value.trim();

        try {
            const updatedUser = await fetchAPI("/users/me", {
                method: "PUT",
                body: {
                    full_name: fullName,
                    email: email
                }
            });

            // Update current user cache
            localStorage.setItem("collabraCurrentUser", JSON.stringify(updatedUser));
            alert("Profile settings have been saved successfully!");
        } catch (error) {
            alert(`Failed to save settings: ${error.message}`);
        }
    });
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

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", () => {
    const confirmLogout = confirm("Are you sure you want to log out?");

    if (!confirmLogout) return;

    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    sessionStorage.clear();

    window.location.href = "login.html";
  });
}