document.addEventListener("DOMContentLoaded", () => {
    setupProjectSearch();
    setupProjectTabs();
});

function setupProjectSearch() {
    const searchInput = document.querySelector("[data-project-search]");
    const projectCards = document.querySelectorAll("[data-project-card]");

    if (!searchInput || !projectCards.length) return;

    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase().trim();

        projectCards.forEach((card) => {
            const text = card.textContent.toLowerCase();
            const isMatch = text.includes(keyword);

            card.style.display = isMatch || keyword === "" ? "" : "none";
        });
    });
}

function setupProjectTabs() {
    const tabContainer = document.querySelector("[data-project-tabs]");
    const tabs = document.querySelectorAll("[data-filter]");
    const projectCards = document.querySelectorAll("[data-project-card]");

    if (!tabContainer || !tabs.length || !projectCards.length) return;

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const selectedFilter = tab.dataset.filter;

            tabs.forEach((item) => item.classList.remove("active"));
            tab.classList.add("active");

            projectCards.forEach((card) => {
                const projectStatus = card.dataset.status;

                const shouldShow =
                    selectedFilter === "all" ||
                    selectedFilter === projectStatus;

                card.style.display = shouldShow ? "" : "none";
            });
        });
    });
}
document.addEventListener("DOMContentLoaded", () => {
  renderSavedProjects();
});

async function renderSavedProjects() {
  const projectGrid = document.querySelector(".project-list-grid, .project-grid, .projects-grid, [data-project-list]");

  if (!projectGrid) return;

  projectGrid.innerHTML = "<p>Loading projects...</p>";

  try {
    const projects = await fetchAPI("/projects");
    if (!projects || projects.length === 0) {
      projectGrid.innerHTML = "<p>No projects found. Create one to get started!</p>";
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem("collabraCurrentUser") || "{}");

    // Clear loading states or dummy HTML
    projectGrid.innerHTML = "";

    projects.forEach((project) => {
      // If the user is the owner, they are the Manager, else Team Member
      const role = project.owner_id === currentUser.id ? "Project Manager" : "Team Member";
      const roleClass = role === "Project Manager" ? "manager" : "member";

      const card = document.createElement("article");
      card.className = "project-card";
      card.dataset.projectCard = "";
      card.dataset.status = project.status.toLowerCase();

      const statusDotClass = project.status === "active" ? "healthy" : project.status === "finished" ? "healthy" : "risk";
      const statusLabel = project.status.charAt(0).toUpperCase() + project.status.slice(1);

      card.innerHTML = `
        <div class="project-card-top compact">
          <span class="project-status ${statusDotClass}"></span>
          <span class="status-text">${statusLabel}</span>
        </div>

        <div class="project-card-header">
          <h2>${project.name}</h2>
          <span class="project-role-badge ${roleClass}">Your role: ${role}</span>
        </div>

        <p class="project-description" style="margin-top: 10px;">${project.description || "No description provided."}</p>

        <div class="project-card-actions">
          <a href="project-detail.html?id=${project.id}" class="btn btn-primary open-project-btn">Open Project ›</a>
          <a href="manage-team.html?id=${project.id}" class="btn btn-secondary team-action-btn">☷ Team</a>
        </div>
      `;

      projectGrid.appendChild(card);
    });

    // Re-setup search and tabs after rendering
    setupProjectSearch();
    setupProjectTabs();
  } catch (error) {
    projectGrid.innerHTML = `<p style="color: red;">Error loading projects: ${error.message}</p>`;
  }
}