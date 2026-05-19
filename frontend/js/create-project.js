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
      const memberInput = memberSearch.value.trim();

      if (!memberInput) {
        alert("Enter a member name or email first.");
        return;
      }

      const chip = document.createElement("span");
      chip.className = "member-chip";
      chip.dataset.member = memberInput;

      chip.innerHTML = `
        ${memberInput.charAt(0).toUpperCase()}
        ${memberInput}
        <small>Team Member</small>
        <button type="button">×</button>
      `;

      selectedMembers.insertBefore(chip, addMemberButton);
      memberSearch.value = "";
    });
  }
}

function setupCreateProjectForm() {
  const form = document.querySelector("[data-create-project-form]");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const isValid = validateCreateProjectForm(form);
    if (!isValid) return;

    const formData = Object.fromEntries(new FormData(form).entries());

    const members = Array.from(document.querySelectorAll(".member-chip"))
      .map((chip) => {
        const value = chip.dataset.member || chip.textContent.replace("×", "").replace("Team Member", "").trim();
        return value.includes("@") ? value : null; // We only want emails for the backend
      }).filter(Boolean);

    try {
      const projectData = {
        name: formData.projectName || formData.name || "Untitled Project",
        description: formData.description || formData.projectDescription || "",
        status: formData.status || "active" // Defaulting to "active" as per backend model
      };

      // 1. Create the project
      const newProject = await fetchAPI("/projects", {
        method: "POST",
        body: projectData
      });

      // 2. Invite members by email
      for (const email of members) {
        try {
          await fetchAPI(`/projects/${newProject.id}/members?user_email=${encodeURIComponent(email)}`, {
            method: "POST"
          });
        } catch (inviteError) {
          console.warn(`Could not invite ${email}:`, inviteError.message);
        }
      }

      alert("Project created successfully. You are assigned as Project Manager.");
      window.location.href = "project-list.html";
    } catch (error) {
      alert(`Failed to create project: ${error.message}`);
    }
  });
}

function validateCreateProjectForm(form) {
  let isValid = true;
  const requiredFields = form.querySelectorAll("input[required], textarea[required], select[required]");

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
    const deadline = deadlineInput.value;

    if (!title && !deadline) {
      previewText.innerHTML = `
        Live Project Preview<br>
        Will Generate Upon Creation
      `;
      return;
    }

    previewText.innerHTML = `
      ${title || "Untitled Project"}<br>
      ${deadline ? `Deadline: ${formatDate(deadline)}` : "Deadline not set"}<br>
      Your role: Project Manager
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