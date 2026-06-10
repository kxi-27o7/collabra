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

    const tasksBtn = document.getElementById("projectDetailTasksBtn");
    const teamBtn = document.getElementById("projectDetailTeamBtn");
    const editDetailsBtn = document.getElementById("changeProjectDetailsBtn");
    if (tasksBtn) tasksBtn.href = `files.html?tab=tasks&id=${projectId}`;
    if (teamBtn) teamBtn.href = `manage-team.html?id=${projectId}`;
    if (editDetailsBtn) editDetailsBtn.href = `edit-project.html?id=${projectId}`;

    const overviewInviteBtn = document.getElementById("overviewInviteBtn");
    if (overviewInviteBtn) {
        overviewInviteBtn.addEventListener("click", () => {
            window.location.href = `manage-team.html?id=${projectId}`;
        });
    }

    const viewAllTeamBtn = document.getElementById("viewAllTeamBtn");
    if (viewAllTeamBtn) {
        viewAllTeamBtn.addEventListener("click", () => {
            document.querySelector('[data-tab="team"]')?.click();
        });
    }

    const nameEl = document.getElementById("projectDetailName");
    const descEl = document.getElementById("projectDetailDesc");
    const memberListContainer = document.getElementById("memberListContainer");
    const tasksTabPanel = document.querySelector('[data-tab-panel="tasks"]');
    const teamTabPanel = document.querySelector('[data-tab-panel="team"]');
    const filesTabPanel = document.querySelector('[data-tab-panel="files"]');
    const reportsTabPanel = document.querySelector('[data-tab-panel="reports"]');

    const statsCompletionVal = document.getElementById("detailCompletionRate");
    const statsCompletedCount = document.getElementById("detailCompletedCount");
    const statsActiveTasks = document.getElementById("detailActiveTasks");
    const statsTotalTasks = document.getElementById("detailTotalTasks");
    const deadlineEl = document.getElementById("detailDeadline");
    const deadlineLabelEl = document.getElementById("detailDeadlineLabel");
    const projectStatusEl = document.getElementById("detailProjectStatus");
    const timelineContainer = document.getElementById("detailTimelineLine");
    const featuredFilesList = document.getElementById("featuredFilesList");

    if (nameEl) nameEl.textContent = "Loading project...";
    if (descEl) descEl.textContent = "";

    try {
        const [project, tasks, members] = await Promise.all([
            fetchAPI(`/projects/${projectId}`),
            fetchAPI(`/projects/${projectId}/tasks`),
            fetchAPI(`/projects/${projectId}/members`),
        ]);

        // ── Project info ────────────────────────────────────────────────────
        if (nameEl) nameEl.textContent = project.name;
        if (descEl) descEl.textContent = project.description || "No description provided.";
        if (projectStatusEl) {
            projectStatusEl.textContent = `Status: ${project.status.toUpperCase()}`;
        }

        // ── Task metrics ────────────────────────────────────────────────────
        const totalTasks = tasks.length;
        const doneTasks = tasks.filter(t => t.status === "done").length;
        const activeTasks = tasks.filter(t => t.status === "in_progress").length;
        const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        if (statsCompletionVal) statsCompletionVal.textContent = `${completionRate}%`;
        if (statsCompletedCount) statsCompletedCount.textContent = `${doneTasks} / ${totalTasks}`;
        if (statsActiveTasks) statsActiveTasks.textContent = activeTasks;
        if (statsTotalTasks) statsTotalTasks.textContent = totalTasks;

        // ── Next deadline ───────────────────────────────────────────────────
        const upcomingDeadlines = tasks
            .filter(t => t.deadline)
            .map(t => ({ title: t.title, date: new Date(t.deadline) }))
            .sort((a, b) => a.date - b.date);

        if (deadlineEl) {
            if (upcomingDeadlines.length > 0) {
                const next = upcomingDeadlines[0];
                const now = new Date();
                const isPast = next.date < now;
                deadlineEl.textContent = next.date.toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric"
                });
                if (deadlineLabelEl) {
                    deadlineLabelEl.textContent = isPast ? "Overdue" : "Upcoming";
                    deadlineLabelEl.className = isPast ? "red-text" : "orange-text";
                }
            } else {
                deadlineEl.textContent = "—";
                if (deadlineLabelEl) deadlineLabelEl.textContent = "Not set";
            }
        }

        // ── Timeline ────────────────────────────────────────────────────────
        if (timelineContainer) {
            if (totalTasks === 0) {
                timelineContainer.innerHTML = "<p>No tasks created yet. Go to Tasks tab to create one.</p>";
            } else {
                timelineContainer.innerHTML = "";
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

        // ── Tasks tab ───────────────────────────────────────────────────────
        if (tasksTabPanel) {
            if (totalTasks === 0) {
                tasksTabPanel.innerHTML = `
                    <div style="padding: 24px; text-align: center;">
                        <h2>Tasks</h2>
                        <p>No tasks created yet for this project.</p>
                        <a href="files.html?tab=tasks&id=${projectId}" class="btn btn-primary" style="margin-top: 16px;">＋ Create New Task</a>
                    </div>
                `;
            } else {
                let tasksHtml = `
                    <div style="padding: 24px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <h2>Project Tasks (${totalTasks})</h2>
                            <a href="files.html?tab=tasks&id=${projectId}" class="btn btn-primary">Go to Kanban Board ›</a>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                `;
                tasks.forEach(task => {
                    const statusText = task.status === "done" ? "Done" : task.status === "in_progress" ? "In Progress" : "To Do";
                    const statusClass = task.status === "done" ? "success" : task.status === "in_progress" ? "progress" : "todo";
                    const deadlineStr = task.deadline
                        ? new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "No deadline";
                    tasksHtml += `
                        <div class="task-row" style="cursor: pointer; padding: 16px; background: #f5f7fc; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;" onclick="window.location.href='update-task-progress.html?task_id=${task.id}'">
                            <div>
                                <h3 style="margin: 0; font-size: 1.1rem; color: var(--text);">${escapeHtml(task.title)}</h3>
                                <p style="margin: 4px 0 0 0; font-size: 0.9rem; color: #596273;">Deadline: ${deadlineStr}</p>
                            </div>
                            <span class="status-pill ${statusClass}">${statusText}</span>
                        </div>
                    `;
                });
                tasksHtml += `</div></div>`;
                tasksTabPanel.innerHTML = tasksHtml;
            }
        }

        // ── Team (overview side card) ────────────────────────────────────────
        if (memberListContainer) {
            memberListContainer.innerHTML = "";
            if (members.length === 0) {
                memberListContainer.innerHTML = `<p class="empty-note">No members yet. Invite someone to collaborate.</p>`;
            } else {
                members.slice(0, 3).forEach(member => {
                    const initials = getInitials(member.full_name || member.username || "NA");
                    const role = member.id === project.owner_id ? "Project Manager" : "Team Member";
                    const card = document.createElement("article");
                    card.className = "research-member";
                    card.innerHTML = `
                        <span class="research-avatar initials-avatar">${initials}</span>
                        <div>
                            <h3>${escapeHtml(member.full_name || member.username)}</h3>
                            <p>${role}</p>
                        </div>
                    `;
                    memberListContainer.appendChild(card);
                });
            }
        }

        // ── Team tab ────────────────────────────────────────────────────────
        if (teamTabPanel) {
            if (members.length === 0) {
                teamTabPanel.innerHTML = `
                    <div style="padding: 24px; text-align: center;">
                        <h2>Team</h2>
                        <p>No members yet.</p>
                        <a href="manage-team.html?id=${projectId}" class="btn btn-primary" style="margin-top: 16px;">☷ Invite Member</a>
                    </div>
                `;
            } else {
                let teamHtml = `
                    <div style="padding: 24px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <h2>Team Members (${members.length})</h2>
                            <a href="manage-team.html?id=${projectId}" class="btn btn-primary">☷ Manage Team</a>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                `;
                members.forEach(member => {
                    const initials = getInitials(member.full_name || member.username || "NA");
                    const role = member.id === project.owner_id ? "Project Manager" : "Team Member";
                    teamHtml += `
                        <div style="padding: 16px; background: #f5f7fc; border-radius: 8px; display: flex; align-items: center; gap: 16px;">
                            <span class="research-avatar initials-avatar">${initials}</span>
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
        }

        // ── Featured files (from task attachments) ──────────────────────────
        if (featuredFilesList) {
            try {
                const tasksWithDeadlines = tasks.slice(0, 5);
                const attachmentResults = await Promise.all(
                    tasksWithDeadlines.map(t =>
                        fetchAPI(`/tasks/${t.id}/attachments`).then(a => a.map(att => ({ ...att, taskTitle: t.title }))).catch(() => [])
                    )
                );
                const allAttachments = attachmentResults.flat().slice(0, 3);

                if (allAttachments.length === 0) {
                    featuredFilesList.innerHTML = `<p class="empty-note">No files uploaded to project tasks yet.</p>`;
                } else {
                    featuredFilesList.innerHTML = allAttachments.map(att => {
                        const filename = att.file_url.split(/[\\/]/).pop();
                        const ext = filename.split('.').pop().toLowerCase();
                        const iconClass = ["pdf", "doc", "docx"].includes(ext) ? "red" : "blue";
                        return `
                            <article class="file-item">
                                <span class="file-icon ${iconClass}">▤</span>
                                <div>
                                    <h3>${escapeHtml(filename)}</h3>
                                    <p>From task: ${escapeHtml(att.taskTitle)}</p>
                                </div>
                            </article>
                        `;
                    }).join("");
                }
            } catch {
                featuredFilesList.innerHTML = `<p class="empty-note">No files uploaded to project tasks yet.</p>`;
            }
        }

        // ── Files tab ───────────────────────────────────────────────────────
        if (filesTabPanel) {
            try {
                const attachmentResults = await Promise.all(
                    tasks.map(t =>
                        fetchAPI(`/tasks/${t.id}/attachments`).then(a => a.map(att => ({ ...att, taskTitle: t.title }))).catch(() => [])
                    )
                );
                const allFiles = attachmentResults.flat();

                if (allFiles.length === 0) {
                    filesTabPanel.innerHTML = `
                        <div style="padding: 24px;">
                            <h2>Files</h2>
                            <p style="margin-top: 8px; color: #596273;">No files yet. Files are uploaded per task — go to a task to attach files.</p>
                            <a href="files.html?tab=tasks&id=${projectId}" class="btn btn-soft" style="margin-top: 16px;">Go to Tasks</a>
                        </div>
                    `;
                } else {
                    let filesHtml = `
                        <div style="padding: 24px;">
                            <h2>Project Files (${allFiles.length})</h2>
                            <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px;">
                    `;
                    allFiles.forEach(att => {
                        const filename = att.file_url.split(/[\\/]/).pop();
                        const ext = filename.split('.').pop().toLowerCase();
                        const iconClass = ["pdf", "doc", "docx"].includes(ext) ? "red" : "blue";
                        filesHtml += `
                            <article class="file-item" style="background: #f5f7fc; padding: 16px;">
                                <span class="file-icon ${iconClass}">▤</span>
                                <div>
                                    <h3>${escapeHtml(filename)}</h3>
                                    <p>Task: ${escapeHtml(att.taskTitle)}</p>
                                </div>
                            </article>
                        `;
                    });
                    filesHtml += `</div></div>`;
                    filesTabPanel.innerHTML = filesHtml;
                }
            } catch {
                filesTabPanel.innerHTML = `<div style="padding: 24px;"><h2>Files</h2><p>Could not load files.</p></div>`;
            }
        }

        // ── Reports tab ─────────────────────────────────────────────────────
        if (reportsTabPanel) {
            const todoTasks = tasks.filter(t => t.status === "todo").length;
            reportsTabPanel.innerHTML = `
                <div style="padding: 24px;">
                    <h2 style="margin-bottom: 24px;">Project Reports</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 20px; margin-bottom: 32px;">
                        <div style="background: #f5f7fc; padding: 24px; border-radius: 12px;">
                            <p style="color: #596273; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800;">Completion</p>
                            <h2 style="font-size: 36px; color: var(--text); margin-top: 8px;">${completionRate}%</h2>
                        </div>
                        <div style="background: #f5f7fc; padding: 24px; border-radius: 12px;">
                            <p style="color: #596273; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800;">Done</p>
                            <h2 style="font-size: 36px; color: #0b966f; margin-top: 8px;">${doneTasks}</h2>
                        </div>
                        <div style="background: #f5f7fc; padding: 24px; border-radius: 12px;">
                            <p style="color: #596273; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800;">In Progress</p>
                            <h2 style="font-size: 36px; color: #c86a00; margin-top: 8px;">${activeTasks}</h2>
                        </div>
                        <div style="background: #f5f7fc; padding: 24px; border-radius: 12px;">
                            <p style="color: #596273; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800;">To Do</p>
                            <h2 style="font-size: 36px; color: var(--text); margin-top: 8px;">${todoTasks}</h2>
                        </div>
                    </div>
                    <div style="background: #f5f7fc; padding: 24px; border-radius: 12px;">
                        <h3 style="color: var(--text); margin-bottom: 12px;">Status: ${project.status.toUpperCase()}</h3>
                        <p style="color: #596273; font-size: 15px;">${totalTasks === 0 ? "No tasks have been created for this project yet." : `${doneTasks} of ${totalTasks} tasks completed.${upcomingDeadlines.length > 0 ? ` Next deadline: ${upcomingDeadlines[0].date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.` : ""}`}</p>
                    </div>
                </div>
            `;
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
                panel.classList.toggle("active", panel.dataset.tabPanel === selectedTab);
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
            ".detail-stat-card, .timeline-step, .research-member, .file-item, .task-row"
        );
        searchableItems.forEach((item) => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(keyword) || keyword === "" ? "" : "none";
        });
    });
}

function getInitials(name) {
    if (!name) return "NA";
    return name.split(" ").map((p) => p.charAt(0).toUpperCase()).slice(0, 2).join("");
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
