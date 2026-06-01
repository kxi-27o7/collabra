document.addEventListener("DOMContentLoaded", () => {
    setupInvitationCodeFormat();
    setupJoinProjectForm();
});

function setupInvitationCodeFormat() {
    const codeInput = document.querySelector("[data-invitation-code]");

    if (!codeInput) return;

    codeInput.addEventListener("input", () => {
        let value = codeInput.value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");

        value = value.slice(0, 10);

        let formatted = value;

        if (value.length > 2) {
            formatted = value.slice(0, 2) + "-" + value.slice(2);
        }

        if (value.length > 6) {
            formatted = value.slice(0, 2) + "-" + value.slice(2, 6) + "-" + value.slice(6);
        }

        codeInput.value = formatted;
    });
}

function setupJoinProjectForm() {
    const form = document.querySelector("[data-join-project-form]");

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const codeInput = form.querySelector("[data-invitation-code]");
        const codeValue = codeInput.value.trim();

        clearError(codeInput);

        if (!codeValue) {
            showError(codeInput, "Invitation code is required.");
            return;
        }

        if (!isValidInvitationCode(codeValue)) {
            showError(codeInput, "Use format SA-XXXX-XXXX.");
            return;
        }

        // We can extract a project ID from the digits of the invitation code
        // e.g. SA-0002-3456 -> digits "00023456" -> project ID 2 (parsed int)
        const digits = codeValue.replace(/[^0-9]/g, "");
        const projectId = parseInt(digits, 10) || 1; // Fallback to 1 if no digits

        try {
            await fetchAPI(`/projects/${projectId}/join`, {
                method: "POST"
            });

            alert("Successfully joined the project!");
            window.location.href = "project-list.html";
        } catch (error) {
            alert(`Failed to join project: ${error.message}`);
        }
    });
}

function isValidInvitationCode(code) {
    return /^SA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
}

function showError(input, message) {
    input.classList.add("error");

    const fieldWrapper = input.closest(".join-code-field");
    if (fieldWrapper) {
        fieldWrapper.classList.add("error");
    }

    const formGroup = input.closest(".form-group");
    const errorMessage = formGroup?.querySelector(".error-message");

    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

function clearError(input) {
    input.classList.remove("error");

    const fieldWrapper = input.closest(".join-code-field");
    if (fieldWrapper) {
        fieldWrapper.classList.remove("error");
    }

    const formGroup = input.closest(".form-group");
    const errorMessage = formGroup?.querySelector(".error-message");

    if (errorMessage) {
        errorMessage.textContent = "";
    }
}

function joinProjectAsTeamMember(projectId) {
  const currentUser = getCurrentUser();
  const projects = getProjects();

  const project = projects.find((item) => String(item.id) === String(projectId));

  if (!project) {
    alert("Project not found.");
    return;
  }

  const alreadyJoined = project.teamMembers.some((member) => {
    return member.email === currentUser.email;
  });

  if (!alreadyJoined) {
    project.teamMembers.push({
      id: currentUser.id,
      name: currentUser.fullName,
      email: currentUser.email,
      role: "Team Member"
    });
  }

  saveProjects(projects);

  alert("You have joined this project as a Team Member.");
  window.location.href = "project-list.html";
}