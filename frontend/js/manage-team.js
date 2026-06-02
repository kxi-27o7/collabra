document.addEventListener("DOMContentLoaded", () => {
    setupTeamSearch();
    setupDeleteMember();
    setupInviteModal();
    setupInviteForm();
    setupGenerateInviteLink();
    loadProjectMembers();
});

function setupTeamSearch() {
    const searchInput = document.querySelector("[data-team-search]");
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase().trim();
        const members = document.querySelectorAll("[data-team-member]");

        members.forEach((member) => {
            const text = member.textContent.toLowerCase();
            const isMatch = text.includes(keyword);
            member.style.display = isMatch || keyword === "" ? "" : "none";
        });
    });
}

async function loadProjectMembers() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get("id");
    if (!projectId) return;

    try {
        const [project, members, tasks, userProjects] = await Promise.all([
            fetchAPI(`/projects/${projectId}`),
            fetchAPI(`/projects/${projectId}/members`),
            fetchAPI(`/projects/${projectId}/tasks`),
            fetchAPI("/projects"),
        ]);

        renderProjectMemberRows(project, members);
        renderTeamStats(members, tasks, userProjects);
    } catch (error) {
        console.error("Failed to load team members:", error.message);
    }
}

function renderTeamStats(members, tasks, userProjects) {
    const totalMembersEl = document.getElementById("statTotalMembers");
    const activeProjectsEl = document.getElementById("statActiveProjects");
    const peerReviewsEl = document.getElementById("statPeerReviews");

    if (totalMembersEl) {
        totalMembersEl.textContent = String(members.length);
    }

    if (activeProjectsEl) {
        const activeProjectsCount = Array.isArray(userProjects)
            ? userProjects.filter((project) => project.status === "active").length
            : 0;
        activeProjectsEl.textContent = String(activeProjectsCount);
    }

    if (peerReviewsEl) {
        const peerReviewCount = Array.isArray(tasks)
            ? tasks.filter((task) => task.status === "done").length
            : 0;
        peerReviewsEl.textContent = String(peerReviewCount);
    }
}

function renderProjectMemberRows(project, members) {
    const table = document.querySelector(".personnel-table");
    if (!table) return;

    const headerHtml = `
        <div class="personnel-table-head">
            <span>Name</span>
            <span>Role</span>
            <span>Joined Date</span>
            <span>Workload</span>
            <span>Actions</span>
        </div>
    `;

    if (!members.length) {
        table.innerHTML = `${headerHtml}<div class="empty-note" style="padding:24px;">No team members found for this project.</div>`;
    } else {
        const rowsHtml = members.map(member => {
            const name = member.full_name || member.email || "Unknown";
            const email = member.email || "No email";
            const initials = getInitials(name);
            const role = member.id === project.owner_id ? "PM" : "Member";
            return `
                <article class="personnel-row" data-team-member>
                    <div class="member-info">
                        <span class="team-avatar dark">${initials}</span>
                        <div>
                            <h3>${escapeHtml(name)}</h3>
                            <p>${escapeHtml(email)}</p>
                        </div>
                    </div>

                    <span class="role-pill">${role}</span>

                    <span class="joined-date">Recent</span>

                    <div class="workload-cell">
                        <span>—</span>
                        <div class="workload-bar">
                            <span style="width: 0%;"></span>
                        </div>
                    </div>

                    <button type="button" class="delete-member-btn" aria-label="Delete member">
                        ♲
                    </button>
                </article>
            `;
        }).join("");

        table.innerHTML = headerHtml + rowsHtml;
    }

    const footerCount = document.querySelector(".personnel-footer p");
    if (footerCount) {
        footerCount.textContent = `Showing ${members.length} of ${members.length} team members`;
    }
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

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const isValid = validateInviteForm(form);
        if (!isValid) return;

        const formData = Object.fromEntries(new FormData(form).entries());
        const email = formData.invite_email || formData.email;
        const role = formData.role;

        // Get project ID from URL (e.g. manage-team.html?id=1)
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id');

        if (!projectId) {
            alert("Error: No project ID found in URL.");
            return;
        }

        try {
            await fetchAPI(`/projects/${projectId}/members?user_email=${encodeURIComponent(email)}`, {
                method: "POST"
            });

            alert(`${email} has been successfully invited!`);
            
            form.reset();
            const modal = document.querySelector("[data-invite-modal]");
            if (modal) modal.classList.remove("show");
            
            // Reload page to show new member in the list
            window.location.reload();
        } catch (error) {
            alert(`Failed to invite member: ${error.message}`);
        }
    });
}

function setupGenerateInviteLink() {
    const button = document.querySelector("[data-generate-invite]");

    if (!button) return;

    button.addEventListener("click", async () => {
        // Get project ID from URL (e.g manage-team.html?id=1)
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id');

        if (!projectId) {
            alert("Error: No project ID found in URL.");
            return;
        }

        try {
            const response = await fetchAPI(`/projects/${projectId}/invite-code`, {
                method: "GET"
            });

            const inviteCode = response.invite_code;

            // Copy to clipboard
            try {
                await navigator.clipboard.writeText(inviteCode);
                alert(`Invite code copied to clipboard: ${inviteCode}`);
            } catch {
                alert(`Invite code: ${inviteCode}`);
            }
        } catch (error) {
            alert(`Failed to get invite code: ${error.message}`);
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

function getInitials(name) {
    if (!name) return "NA";
    return name
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join("");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
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