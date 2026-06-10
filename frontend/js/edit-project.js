document.addEventListener("DOMContentLoaded", () => {
  setupStatusPicker();
  setupMemberChips();
  initEditProjectPage();
});

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
        alert("Enter a member email first.");
        return;
      }

      if (!isValidEmail(memberInput)) {
        alert("Please enter a valid email address to invite.");
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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

async function initEditProjectPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");

  if (!projectId) {
    alert("No project selected. Redirecting to project list.");
    window.location.href = "project-list.html";
    return;
  }

  document.querySelectorAll("[data-cancel-link]").forEach((link) => {
    link.href = `project-detail.html?id=${projectId}`;
  });

  const form = document.querySelector("[data-edit-project-form]");
  const deleteBtn = document.querySelector("[data-delete-project-btn]");

  let project;
  try {
    project = await fetchAPI(`/projects/${projectId}`);
  } catch (error) {
    alert(`Failed to load project: ${error.message}`);
    window.location.href = "project-list.html";
    return;
  }

  document.getElementById("editProjectName").value = project.name || "";
  document.getElementById("editProjectDescription").value = project.description || "";
  document.getElementById("editProjectDeadline").value = project.deadline || "";

  document.querySelectorAll(".status-picker label").forEach((label) => {
    const radio = label.querySelector('input[type="radio"]');
    const isMatch = radio?.value === project.status;
    label.classList.toggle("active", isMatch);
    if (radio) radio.checked = isMatch;
  });

  const currentUser = getCurrentUser();
  const isOwner = currentUser?.id === project.owner_id;

  const roleInfoText = document.querySelector(".project-role-info p");
  if (roleInfoText && !isOwner) {
    roleInfoText.innerHTML = "You are a <strong>Team Member</strong> on this project.";
  }

  if (!isOwner) {
    form?.querySelectorAll("input, textarea, button").forEach((el) => {
      el.disabled = true;
    });
    document.querySelectorAll(".status-picker label").forEach((label) => {
      label.style.pointerEvents = "none";
    });
    if (deleteBtn) deleteBtn.style.display = "none";

    const notice = document.createElement("p");
    notice.className = "edit-readonly-notice";
    notice.textContent = "Only the Project Manager can change project details.";
    form?.querySelector(".create-project-left")?.prepend(notice);
    return;
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!validateEditProjectForm(form)) return;

      const formData = Object.fromEntries(new FormData(form).entries());

      const newMembers = Array.from(document.querySelectorAll(".member-chip"))
        .map((chip) => chip.dataset.member?.trim())
        .filter(Boolean);

      if (newMembers.some((value) => !isValidEmail(value))) {
        alert("Please remove invalid email invites before saving.");
        return;
      }

      try {
        await fetchAPI(`/projects/${projectId}`, {
          method: "PUT",
          body: {
            name: formData.project_name,
            description: formData.project_description,
            status: formData.project_status,
            deadline: formData.project_deadline || null,
          },
        });

        for (const email of newMembers) {
          try {
            await fetchAPI(`/projects/${projectId}/members?user_email=${encodeURIComponent(email)}`, {
              method: "POST",
            });
          } catch (inviteError) {
            console.warn(`Could not invite ${email}:`, inviteError.message);
          }
        }

        alert("Project details updated successfully.");
        window.location.href = `project-detail.html?id=${projectId}`;
      } catch (error) {
        alert(`Failed to update project: ${error.message}`);
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const confirmed = confirm(
        `Are you sure you want to delete "${project.name}"? This will permanently delete all of its tasks, comments, and files. This action cannot be undone.`
      );
      if (!confirmed) return;

      try {
        await fetchAPI(`/projects/${projectId}`, { method: "DELETE" });
        alert("Project deleted successfully.");
        window.location.href = "project-list.html";
      } catch (error) {
        alert(`Failed to delete project: ${error.message}`);
      }
    });
  }
}

function validateEditProjectForm(form) {
  let isValid = true;
  const requiredFields = form.querySelectorAll("input[required], textarea[required]");

  requiredFields.forEach((field) => {
    field.classList.remove("error");
    const formGroup = field.closest(".form-group");
    const errorMessage = formGroup?.querySelector(".error-message");
    if (errorMessage) errorMessage.textContent = "";

    if (!field.value.trim()) {
      field.classList.add("error");
      if (errorMessage) errorMessage.textContent = "This field is required.";
      isValid = false;
    }
  });

  return isValid;
}
