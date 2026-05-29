document.addEventListener("DOMContentLoaded", () => {
    setupDashboardSearch();
    setupQuickActionButtons();
    loadDashboardData();
});

async function loadDashboardData() {
    const totalProjectsEl = document.getElementById("totalProjects");
    const activeTasksEl = document.getElementById("activeTasks");
    const upcomingDeadlinesEl = document.getElementById("upcomingDeadlines");
    const completedTasksEl = document.getElementById("completedTasks");
    const projectListContainer = document.querySelector(".project-list");
    const taskListContainer = document.querySelector(".task-list");

    if (!projectListContainer || !taskListContainer) return;

    // Immediately clear all static mock/garbage elements and set numbers to loading state
    projectListContainer.innerHTML = "<p>Loading projects...</p>";
    taskListContainer.innerHTML = "<p>Loading tasks...</p>";
    if (totalProjectsEl) totalProjectsEl.textContent = "...";
    if (activeTasksEl) activeTasksEl.textContent = "...";
    if (completedTasksEl) completedTasksEl.textContent = "...";
    if (upcomingDeadlinesEl) upcomingDeadlinesEl.textContent = "...";

    try {
        // 1. Fetch dashboard summaries
        const summaries = await fetchAPI("/tasks/dashboard");

        if (!summaries) {
            projectListContainer.innerHTML = "<p>Failed to load dashboard data. Please log in again.</p>";
            taskListContainer.innerHTML = "";
            return;
        }

        let totalProjects = summaries.length;
        let totalActive = 0;
        let totalCompleted = 0;

        projectListContainer.innerHTML = ""; // Clear loading state

        if (totalProjects === 0) {
            projectListContainer.innerHTML = "<p>No projects found. Create one to get started!</p>";
        }

        summaries.forEach((item) => {
            const p = item.project;
            const t = item.task_summary;

            totalActive += t.in_progress;
            totalCompleted += t.done;

            const progressPercent = t.total > 0 ? Math.round((t.done / t.total) * 100) : 0;
            const role = p.is_owner ? "Project Manager" : "Team Member";
            const roleClass = p.is_owner ? "manager" : "member";
            const iconChar = p.name.charAt(0).toUpperCase();

            const projectHtml = `
              <div class="project-item" style="cursor: pointer;" onclick="window.location.href='project-detail.html?id=${p.id}'">
                <div class="project-info">
                  <div class="project-icon">${iconChar}</div>
                  <div>
                    <h3>${p.name}</h3>
                    <p>Status: <strong style="text-transform: capitalize;">${p.status}</strong></p>
                  </div>
                </div>

                <div class="project-side">
                  <span class="role-pill ${roleClass}">${role}</span>
                  <strong>${progressPercent}%</strong>
                </div>

                <div class="progress-bar">
                  <span style="width: ${progressPercent}%;"></span>
                </div>

                <div class="project-footer">
                  <p>Tasks: ${t.total} total (${t.todo} todo, ${t.in_progress} active, ${t.done} done)</p>
                </div>
              </div>
            `;
            projectListContainer.insertAdjacentHTML("beforeend", projectHtml);
        });

        // Update metrics
        if (totalProjectsEl) totalProjectsEl.textContent = totalProjects;
        if (activeTasksEl) activeTasksEl.textContent = totalActive;
        if (completedTasksEl) completedTasksEl.textContent = totalCompleted;
        if (upcomingDeadlinesEl) upcomingDeadlinesEl.textContent = "0"; // Default or calculated if needed

        // 2. Fetch tasks for each project to populate Task Snapshot
        taskListContainer.innerHTML = ""; // Clear mockup tasks
        
        let fetchedTasks = [];
        for (const summary of summaries) {
            try {
                const tasks = await fetchAPI(`/projects/${summary.project.id}/tasks`);
                tasks.forEach(task => {
                    fetchedTasks.push({
                        ...task,
                        projectName: summary.project.name
                    });
                });
            } catch (err) {
                console.warn(`Could not load tasks for project ${summary.project.id}:`, err.message);
            }
        }

        // Filter and display up to 5 tasks that are not completed
        const activeTasks = fetchedTasks.filter(t => t.status !== "done").slice(0, 5);

        if (activeTasks.length === 0) {
            taskListContainer.innerHTML = "<p>No active tasks found.</p>";
        } else {
            activeTasks.forEach(task => {
                const statusLabels = {
                    "todo": { text: "To Do", class: "todo" },
                    "in_progress": { text: "In Progress", class: "progress" },
                    "done": { text: "Done", class: "success" }
                };
                const statusMeta = statusLabels[task.status] || { text: task.status, class: "todo" };

                const taskHtml = `
                  <div class="task-row" style="cursor: pointer;" onclick="window.location.href='task-board.html?id=${task.project_id}'">
                    <div>
                      <h3>${task.title}</h3>
                      <p>${task.projectName}</p>
                    </div>
                    <span class="status-pill ${statusMeta.class}">${statusMeta.text}</span>
                  </div>
                `;
                taskListContainer.insertAdjacentHTML("beforeend", taskHtml);
            });
        }

    } catch (error) {
        console.error("Failed to load dashboard data:", error);
    }
}

function setupDashboardSearch() {
    const searchInput = document.querySelector("[data-search-input]");

    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase().trim();

        const searchableItems = document.querySelectorAll(
            ".project-item, .task-row, .activity-item, .member-activity-item, .deadline-item"
        );

        searchableItems.forEach((item) => {
            const text = item.textContent.toLowerCase();
            const isMatch = text.includes(keyword);

            item.style.display = isMatch || keyword === "" ? "" : "none";
        });
    });
}

function setupQuickActionButtons() {
    const quickActionButtons = document.querySelectorAll(".quick-action-list button");

    quickActionButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const actionText = button.textContent.toLowerCase();

            if (actionText.includes("create project")) {
                window.location.href = "create-project.html";
                return;
            }

            if (actionText.includes("create task")) {
                window.location.href = "task-board.html";
                return;
            }

            if (actionText.includes("invite team")) {
                window.location.href = "manage-team.html";
            }
        });
    });
}