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

function renderSavedProjects() {
  const projectGrid = document.querySelector(".project-grid, .projects-grid, [data-project-list]");

  if (!projectGrid || typeof getProjects !== "function") return;

  const savedProjects = getProjects();

  savedProjects.forEach((project) => {
    const role = getUserRoleInProject(project);
    const roleClass = role === "Project Manager"
      ? "manager"
      : role === "Team Member"
        ? "member"
        : "no-role";

    const card = document.createElement("article");
    card.className = "project-card";

    card.innerHTML = `
      <div class="project-card-header">
        <h3>${project.name}</h3>
        <span class="project-role-badge ${roleClass}">Your role: ${role}</span>
      </div>

      <p>${project.description || "No description provided."}</p>

      <div class="project-meta">
        <span>Deadline: ${project.deadline || "Not set"}</span>
        <span>Status: ${project.status || "Drafting"}</span>
      </div>

      <a href="project-detail.html" class="btn btn-secondary">Open Project</a>
    `;

    projectGrid.prepend(card);
  });
}