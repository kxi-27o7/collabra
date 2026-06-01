document.addEventListener("DOMContentLoaded", () => {
    setupDetailTabs();
    setupDetailSearch();
    loadProjectDetails();
});

async function loadProjectDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        alert("No project selected. Redirecting to project list.");
        window.location.href = "project-list.html";
        return;
    }

    // Immediately set quick action buttons to correct project ID links
    const tasksBtn = document.getElementById("projectDetailTasksBtn");
    const teamBtn = document.getElementById("projectDetailTeamBtn");
    if (tasksBtn) tasksBtn.href = `task-board.html?id=${projectId}`;
    if (teamBtn) teamBtn.href = `manage-team.html?id=${projectId}`;

    // Target dynamic placeholders on DOM
    const nameEl = document.getElementById("projectDetailName");
    const descEl = document.getElementById("projectDetailDesc");
    const memberListContainer = document.querySelector(".research-member-list");
    const tasksTabPanel = document.querySelector('[data-tab-panel="tasks"]');
    const teamTabPanel = document.querySelector('[data-tab-panel="team"]');
    
    const statsCompletionVal = document.getElementById("detailCompletionRate");
    const statsCompletedCount = document.getElementById("detailCompletedCount");
    const statsActiveTasks = document.getElementById("detailActiveTasks");
    const statsTotalTasks = document.getElementById("detailTotalTasks");
    const projectStatusEl = document.getElementById("detailProjectStatus");
    const timelineContainer = document.getElementById("detailTimelineLine");

    if (nameEl) nameEl.textContent = "Loading project...";
    if (descEl) descEl.textContent = "";

    try {
        // 1. Load project info
        const project = await fetchAPI(`/projects/${projectId}`);
        if (nameEl) nameEl.textContent = project.name;
        if (descEl) descEl.textContent = project.description || "No description provided.";
        if (projectStatusEl) {
            projectStatusEl.textContent = `Status: ${project.status.toUpperCase()}`;
        }

        // 2. Load tasks for metrics & dynamic list
        const tasks = await fetchAPI(`/projects/${projectId}/tasks`);
        const totalTasks = tasks.length;
        const doneTasks = tasks.filter(t => t.status === "done").length;
        const activeTasks = tasks.filter(t => t.status === "in_progress").length;
        const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        if (statsCompletionVal) statsCompletionVal.textContent = `${completionRate}%`;
        if (statsCompletedCount) statsCompletedCount.textContent = `${doneTasks} / ${totalTasks}`;
        if (statsActiveTasks) statsActiveTasks.textContent = activeTasks;
        if (statsTotalTasks) statsTotalTasks.textContent = totalTasks;

        // Render dynamic timeline steps
        if (timelineContainer) {
            if (totalTasks === 0) {
                timelineContainer.innerHTML = "<p>No tasks created yet. Go to Tasks tab to create one.</p>";
            } else {
                timelineContainer.innerHTML = "";
                // Display the first 4 tasks as progress milestones
                tasks.slice(0, 4).forEach(task => {
                    const step = document.createElement("article");
                    const isCompleted = task.status === "done";
                    const isActive = task.status === "in_progress";
                    
                    step.className = `timeline-step ${isCompleted ? "completed" : isActive ? "active" : ""}`;
                    
                    const marker = isCompleted ? "✓" : isActive ? "◎" : "◔";
                    const statusDesc = isCompleted ? "Completed" : isActive ? "In Progress" : "To Do";
                    
                    step.innerHTML = `
                        <span>${marker}</span>
                        <h3>${escapeHtml(task.title)}</h3>
                        <p>${statusDesc}</p>
                    `;
                    timelineContainer.appendChild(step);
                });
            }
        }

        // Render dynamic tasks tab list
        if (tasksTabPanel) {
            if (totalTasks === 0) {
                tasksTabPanel.innerHTML = `
                    <div style="padding: 24px; text-align: center;">
                        <h2>Tasks</h2>
                        <p>No tasks created yet for this project.</p>
                        <a href="task-board.html?id=${projectId}" class="btn btn-primary" style="margin-top: 16px;">＋ Create New Task</a>
                    </div>
                `;
            } else {
                let tasksHtml = `
                    <div style="padding: 24px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <h2>Project Tasks (${totalTasks})</h2>
                            <a href="task-board.html?id=${projectId}" class="btn btn-primary">Go to Kanban Board ›</a>
                        </div>
                        <div class="tasks-table-list" style="display: flex; flex-direction: column; gap: 12px;">
                `;

                tasks.forEach(task => {
                    const statusText = task.status === "done" ? "Done" : task.status === "in_progress" ? "In Progress" : "To Do";
                    const statusClass = task.status === "done" ? "success" : task.status === "in_progress" ? "progress" : "todo";
                    tasksHtml += `
                        <div class="task-row" style="cursor: pointer; padding: 16px; background: #f5f7fc; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;" onclick="window.location.href='update-task-progress.html?task_id=${task.id}'">
                            <div>
                                <h3 style="margin: 0; font-size: 1.1rem; color: var(--text);">${escapeHtml(task.title)}</h3>
                                <p style="margin: 4px 0 0 0; font-size: 0.9rem; color: #596273;">${escapeHtml(task.description || "No description provided.")}</p>
                            </div>
                            <span class="status-pill ${statusClass}">${statusText}</span>
                        </div>
                    `;
                });

                tasksHtml += `</div></div>`;
                tasksTabPanel.innerHTML = tasksHtml;
            }
        }

        // 3. Load dynamic members
        const members = await fetchAPI(`/projects/${projectId}/members`);
        
        // Populate side overview member list
        if (memberListContainer) {
            memberListContainer.innerHTML = "";
            members.forEach(member => {
                const initials = getInitials(member.full_name || member.username || "NA");
                const role = member.id === project.owner_id ? "Project Manager" : "Team Member";
                
                const memberCard = document.createElement("article");
                memberCard.className = "research-member";
                memberCard.innerHTML = `
                    <span class="research-avatar initials-avatar">${initials}</span>
                    <div>
                        <h3>${escapeHtml(member.full_name || member.username)}</h3>
                        <p>${role}</p>
                    </div>
                `;
                memberListContainer.appendChild(memberCard);
            });
        }

        // Populate team tab list
        if (teamTabPanel) {
            let teamHtml = `
                <div style="padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2>Research Team Members (${members.length})</h2>
                        <a href="manage-team.html?id=${projectId}" class="btn btn-primary">☷ Manage Team</a>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
            `;

            members.forEach(member => {
                const initials = getInitials(member.full_name || member.username || "NA");
                const role = member.id === project.owner_id ? "Project Manager" : "Team Member";
                teamHtml += `
                    <div style="padding: 16px; background: #f5f7fc; border-radius: 8px; display: flex; align-items: center; gap: 16px;">
                        <span class="research-avatar initials-avatar" style="width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #eef3fb; font-weight: bold; color: var(--primary);">${initials}</span>
                        <div>
                            <h3 style="margin: 0; font-size: 1.1rem; color: var(--text);">${escapeHtml(member.full_name || member.username)}</h3>
                            <p style="margin: 4px 0 0 0; font-size: 0.9rem; color: #596273;">${escapeHtml(member.email)} • <strong>${role}</strong></p>
                        </div>
                    </div>
                `;
            });

            teamHtml += `</div></div>`;
            teamTabPanel.innerHTML = teamHtml;
        }

    } catch (error) {
        console.error("Failed to load project details:", error);
        if (nameEl) nameEl.textContent = "Error loading project";
        if (descEl) descEl.textContent = `Could not fetch project data: ${error.message}`;
    }
}

function setupDetailTabs() {
    const tabs = document.querySelectorAll("[data-tab]");
    const panels = document.querySelectorAll("[data-tab-panel]");

    if (!tabs.length || !panels.length) return;

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const selectedTab = tab.dataset.tab;

            tabs.forEach((item) => item.classList.remove("active"));
            tab.classList.add("active");

            panels.forEach((panel) => {
                const panelName = panel.dataset.tabPanel;
                panel.classList.toggle("active", panelName === selectedTab);
            });
        });
    });
}

function setupDetailSearch() {
    const searchInput = document.querySelector("[data-detail-search]");

    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase().trim();

        const searchableItems = document.querySelectorAll(
            ".detail-stat-card, .timeline-step, .research-member, .file-item, .project-insight-card, .task-row"
        );

        searchableItems.forEach((item) => {
            const text = item.textContent.toLowerCase();
            const isMatch = text.includes(keyword);

            item.style.display = isMatch || keyword === "" ? "" : "none";
        });
    });
}

function getInitials(name) {
    if (!name) return "NA";
    return name
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join("");
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}