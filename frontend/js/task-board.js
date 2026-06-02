// ── State ──────────────────────────────────────────────────────────────────
let projectMembers = {};          // cache: memberId → name (single-project mode)
let activeModalProjectId = null;  // which project the modal was opened for
let isMultiProjectMode = false;

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get("id");

    setupPriorityPicker();
    setupModalClose();

    if (projectId) {
        // Single-project mode (e.g. opened from project-detail)
        isMultiProjectMode = false;
        const singleView = document.getElementById("singleProjectView");
        const multiView = document.getElementById("multiProjectBoards");
        if (singleView) singleView.style.display = "";
        if (multiView) multiView.style.display = "none";

        setupSingleProjectModal(projectId);
        setupTaskForm(projectId);
        loadSingleProject(projectId);
    } else {
        // Multi-project grouped mode
        isMultiProjectMode = true;
        const singleView = document.getElementById("singleProjectView");
        if (singleView) singleView.style.display = "none";

        setupTaskForm(null);
        loadAllProjectBoards();
    }
});

// ── Single-project mode ────────────────────────────────────────────────────

function setupSingleProjectModal(projectId) {
    const openBtns = document.querySelectorAll("[data-open-task-modal]");
    const panel = document.querySelector("[data-task-modal]");
    if (!panel) return;

    openBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            activeModalProjectId = projectId;
            panel.classList.add("show");
            panel.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });
}

async function loadSingleProject(projectId) {
    const columns = document.querySelectorAll("[data-task-column]");
    columns.forEach(col => {
        const addBtn = col.querySelector(".add-task-card-btn");
        col.innerHTML = "";
        if (addBtn) col.appendChild(addBtn);
    });

    try {
        const project = await fetchAPI(`/projects/${projectId}`);
        const titleEl = document.getElementById("taskBoardTitle");
        const nameEl = document.getElementById("taskBoardProjectName");
        if (titleEl) titleEl.textContent = project.name;
        if (nameEl) nameEl.textContent = `Status: ${project.status.toUpperCase()}`;

        const members = await fetchAPI(`/projects/${projectId}/members`);
        members.forEach(m => { projectMembers[m.id] = m.full_name || m.email; });

        const tasks = await fetchAPI(`/projects/${projectId}/tasks`);
        tasks.forEach(task => addTaskToColumn(task, projectMembers));

        ["todo", "progress", "review"].forEach(updateColumnCount);
    } catch (err) {
        console.error("Failed to load tasks:", err);
    }
}

function addTaskToColumn(taskData, memberMap) {
    let colStatus = taskData.status || "todo";
    if (colStatus === "in_progress") colStatus = "progress";
    else if (colStatus === "done") colStatus = "review";

    const column = document.querySelector(`[data-task-column="${colStatus}"]`);
    if (!column) return;

    const addBtn = column.querySelector(".add-task-card-btn");
    const card = buildTaskCard(taskData, memberMap);
    if (addBtn) column.insertBefore(card, addBtn);
    else column.appendChild(card);

    updateColumnCount(colStatus);
}

function updateColumnCount(colName) {
    const col = document.querySelector(`[data-task-column="${colName}"]`);
    if (!col) return;
    const count = col.querySelectorAll("[data-task-card]").length;
    const badge = col.closest(".task-column")?.querySelector(".task-column-title span");
    if (badge) badge.textContent = count;
}

// ── Multi-project grouped mode ─────────────────────────────────────────────

async function loadAllProjectBoards() {
    const container = document.getElementById("multiProjectBoards");
    if (!container) return;

    container.innerHTML = '<p class="multi-boards-loading">Loading your projects...</p>';

    try {
        // Resolve current user (from cache or API)
        let currentUser = null;
        try {
            const stored = localStorage.getItem("collabraCurrentUser");
            if (stored) currentUser = JSON.parse(stored);
        } catch (_) {}
        if (!currentUser || !currentUser.id) {
            currentUser = await fetchAPI("/users/me");
            if (currentUser) localStorage.setItem("collabraCurrentUser", JSON.stringify(currentUser));
        }

        const projects = await fetchAPI("/projects");

        if (!projects || projects.length === 0) {
            container.innerHTML = `
                <div class="multi-boards-empty">
                    <h2>No projects yet</h2>
                    <p>Create or join a project to see tasks here.</p>
                    <a href="project-list.html" class="btn btn-primary" style="margin-top:20px;">Go to Projects</a>
                </div>`;
            return;
        }

        container.innerHTML = "";

        // Load each project's board in sequence to avoid request flood
        for (const project of projects) {
            const isManager = project.owner_id === currentUser.id;

            const [tasks, members] = await Promise.all([
                fetchAPI(`/projects/${project.id}/tasks`),
                fetchAPI(`/projects/${project.id}/members`)
            ]);

            const memberMap = {};
            members.forEach(m => { memberMap[m.id] = m.full_name || m.email; });

            // Filter: manager sees all, member sees only assigned
            const visible = isManager
                ? tasks
                : tasks.filter(t => t.assignee_id === currentUser.id);

            renderProjectKanban(project, visible, isManager, memberMap, container);
        }

        // Attach create-task button listeners after all boards are rendered
        container.addEventListener("click", e => {
            const btn = e.target.closest("[data-kanban-project-id]");
            if (!btn) return;
            const pid = btn.dataset.kanbanProjectId;
            const pname = btn.dataset.kanbanProjectName;
            openModalForProject(pid, pname);
        });

        // Make task cards clickable
        container.addEventListener("click", e => {
            const card = e.target.closest("[data-task-card]");
            if (card && !e.target.closest("[data-kanban-project-id]")) {
                window.location.href = `update-task-progress.html?task_id=${card.dataset.taskCard}`;
            }
        });

    } catch (err) {
        console.error("Failed to load boards:", err);
        container.innerHTML = `<p style="color:var(--danger);padding:24px;">Error loading projects: ${err.message}</p>`;
    }
}

function renderProjectKanban(project, tasks, isManager, memberMap, container) {
    const todo       = tasks.filter(t => t.status === "todo");
    const inProgress = tasks.filter(t => t.status === "in_progress");
    const done       = tasks.filter(t => t.status === "done");

    const section = document.createElement("section");
    section.className = "project-kanban-section";
    section.dataset.projectId = project.id;

    section.innerHTML = `
        <div class="project-kanban-header">
            <div class="project-kanban-title">
                <h2>${escapeHtml(project.name)}</h2>
                <span class="project-kanban-role ${isManager ? "manager" : "member"}">
                    ${isManager ? "★ Project Manager" : "◎ Team Member"}
                </span>
            </div>
            <div class="project-kanban-actions">
                ${isManager ? `
                    <button type="button" class="btn btn-primary kanban-new-btn"
                        data-kanban-project-id="${project.id}"
                        data-kanban-project-name="${escapeHtml(project.name)}">
                        <span>＋</span> New Task
                    </button>` : ""}
                <a href="project-detail.html?id=${project.id}" class="btn btn-soft">View Project ›</a>
            </div>
        </div>

        <div class="project-kanban-board">
            ${buildKanbanColumn("To Do",      todo,       project.id, isManager, memberMap)}
            ${buildKanbanColumn("In Progress", inProgress, project.id, false,     memberMap)}
            ${buildKanbanColumn("Done",        done,       project.id, false,     memberMap)}
        </div>
    `;

    container.appendChild(section);
}

function buildKanbanColumn(label, tasks, projectId, showAdd, memberMap) {
    const cards = tasks.map(t => buildTaskCard(t, memberMap).outerHTML).join("");
    const addBtn = showAdd ? `
        <button type="button" class="add-task-card-btn kanban-new-btn"
            data-kanban-project-id="${projectId}"
            data-kanban-project-name="">
            ＋ Add Task
        </button>` : "";

    return `
        <div class="task-column">
            <div class="task-column-header">
                <div class="task-column-title">
                    <h2>${label}</h2>
                    <span>${tasks.length}</span>
                </div>
            </div>
            <div class="task-column-body">
                ${cards}
                ${addBtn}
            </div>
        </div>`;
}

// ── Shared helpers ─────────────────────────────────────────────────────────

function buildTaskCard(taskData, memberMap) {
    const card = document.createElement("article");
    card.className = "task-card";
    card.dataset.taskCard = taskData.id;

    const dueDateText = taskData.deadline ? formatDate(taskData.deadline) : "No deadline";
    const assigneeName = taskData.assignee_id
        ? (memberMap[taskData.assignee_id] || "Assignee")
        : "Unassigned";
    const initials = getInitials(assigneeName);

    card.innerHTML = `
        <div class="task-card-top">
            <span class="priority-chip medium">Task</span>
        </div>
        <h3>${escapeHtml(taskData.title)}</h3>
        <div class="task-card-divider"></div>
        <div class="task-card-bottom">
            <span class="task-date">◔ ${dueDateText}</span>
            <div class="task-mini-avatars">
                <span title="${escapeHtml(assigneeName)}">${initials}</span>
            </div>
        </div>
    `;

    // Single-project mode: click navigates
    if (!isMultiProjectMode) {
        card.style.cursor = "pointer";
        card.addEventListener("click", () => {
            window.location.href = `update-task-progress.html?task_id=${taskData.id}`;
        });
    }

    return card;
}

function openModalForProject(projectId, projectName) {
    activeModalProjectId = projectId;

    const modal = document.querySelector("[data-task-modal]");
    const label = document.getElementById("taskModalProjectLabel");
    const projectSelect = document.getElementById("relatedProject");

    if (label) label.textContent = `Project: ${projectName || projectId}`;
    if (projectSelect) {
        projectSelect.value = projectId;
        projectSelect.disabled = true;
    }

    loadAssigneesForProject(projectId);

    if (modal) {
        modal.classList.add("show");
        modal.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

async function loadAssigneesForProject(projectId) {
    const assigneeSelect = document.getElementById("taskAssignee");
    if (!assigneeSelect) return;

    assigneeSelect.innerHTML = '<option value="" disabled selected>Loading...</option>';
    try {
        let currentUser = null;
        try { currentUser = JSON.parse(localStorage.getItem("collabraCurrentUser") || "{}"); } catch (_) {}

        const members = await fetchAPI(`/projects/${projectId}/members`);
        assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
        members.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = (m.full_name || m.email) + (currentUser && m.id === currentUser.id ? " (me)" : "");
            assigneeSelect.appendChild(opt);
        });
    } catch (err) {
        assigneeSelect.innerHTML = '<option value="" disabled>Failed to load members</option>';
    }
}

// ── Form setup ─────────────────────────────────────────────────────────────

async function setupTaskForm(fixedProjectId) {
    const form = document.querySelector("[data-task-form]");
    if (!form) return;

    const projectSelect = document.getElementById("relatedProject");

    // Populate project dropdown
    try {
        const projects = await fetchAPI("/projects");
        if (projectSelect) {
            projectSelect.innerHTML = '<option value="" disabled selected>Select Project...</option>';
            projects.forEach(p => {
                const opt = document.createElement("option");
                opt.value = p.id;
                opt.textContent = p.name;
                projectSelect.appendChild(opt);
            });
        }

        if (fixedProjectId) {
            if (projectSelect) { projectSelect.value = fixedProjectId; projectSelect.disabled = true; }
            await loadAssigneesForProject(fixedProjectId);
        } else if (projectSelect) {
            projectSelect.addEventListener("change", async e => {
                if (e.target.value) await loadAssigneesForProject(e.target.value);
            });
        }
    } catch (err) {
        console.error("Failed to load projects:", err);
    }

    form.addEventListener("submit", async e => {
        e.preventDefault();
        if (!validateTaskForm(form)) return;

        const formData = Object.fromEntries(new FormData(form).entries());
        const selectedProjectId = fixedProjectId || activeModalProjectId || (projectSelect ? projectSelect.value : null);

        if (!selectedProjectId) { alert("Please select a project."); return; }

        const taskData = {
            title: formData.task_title,
            description: formData.task_description,
            deadline: formData.task_due_date || null,
            status: "todo",
            assignee_id: formData.task_assignee ? parseInt(formData.task_assignee) : null
        };

        try {
            const newTask = await fetchAPI(`/projects/${selectedProjectId}/tasks`, {
                method: "POST",
                body: taskData
            });

            form.reset();
            resetPriorityPicker();

            const modal = document.querySelector("[data-task-modal]");
            if (modal) modal.classList.remove("show");

            const label = document.getElementById("taskModalProjectLabel");
            if (label) label.textContent = "Assign to a team member.";

            const projectSelectEl = document.getElementById("relatedProject");
            if (projectSelectEl && isMultiProjectMode) {
                projectSelectEl.disabled = false;
                projectSelectEl.value = "";
            }

            if (!isMultiProjectMode) {
                // Single-project: add card to board live
                addTaskToColumn(newTask, projectMembers);
            } else {
                // Multi-project: re-render that project's board
                const section = document.querySelector(`[data-project-id="${selectedProjectId}"]`);
                if (section) section.remove();
                // Reload just this project's section
                reloadProjectSection(selectedProjectId);
            }
        } catch (err) {
            alert(`Failed to create task: ${err.message}`);
        }
    });
}

async function reloadProjectSection(projectId) {
    try {
        let currentUser = null;
        try { currentUser = JSON.parse(localStorage.getItem("collabraCurrentUser") || "{}"); } catch (_) {}

        const [project, tasks, members] = await Promise.all([
            fetchAPI(`/projects/${projectId}`),
            fetchAPI(`/projects/${projectId}/tasks`),
            fetchAPI(`/projects/${projectId}/members`)
        ]);

        const isManager = project.owner_id === currentUser.id;
        const memberMap = {};
        members.forEach(m => { memberMap[m.id] = m.full_name || m.email; });

        const visible = isManager ? tasks : tasks.filter(t => t.assignee_id === currentUser.id);

        const container = document.getElementById("multiProjectBoards");
        if (!container) return;

        renderProjectKanban(project, visible, isManager, memberMap, container);
    } catch (err) {
        console.error("Failed to reload project section:", err);
    }
}

// ── Modal close ────────────────────────────────────────────────────────────

function setupModalClose() {
    document.querySelectorAll("[data-close-task-modal]").forEach(btn => {
        btn.addEventListener("click", () => {
            const modal = document.querySelector("[data-task-modal]");
            if (modal) modal.classList.remove("show");

            const label = document.getElementById("taskModalProjectLabel");
            if (label) label.textContent = "Assign to a team member.";

            const projectSelect = document.getElementById("relatedProject");
            if (projectSelect && isMultiProjectMode) {
                projectSelect.disabled = false;
                projectSelect.value = "";
            }
        });
    });
}

// ── Priority picker ────────────────────────────────────────────────────────

function setupPriorityPicker() {
    document.querySelectorAll(".task-priority-picker label").forEach(label => {
        label.addEventListener("click", () => {
            document.querySelectorAll(".task-priority-picker label").forEach(l => l.classList.remove("active"));
            label.classList.add("active");
            const radio = label.querySelector("input[type='radio']");
            if (radio) radio.checked = true;
        });
    });
}

function resetPriorityPicker() {
    const labels = document.querySelectorAll(".task-priority-picker label");
    labels.forEach(l => l.classList.remove("active"));
    const med = document.querySelector('.task-priority-picker label input[value="medium"]')?.closest("label");
    if (med) { med.classList.add("active"); const r = med.querySelector("input"); if (r) r.checked = true; }
}

// ── Form validation ────────────────────────────────────────────────────────

function validateTaskForm(form) {
    let valid = true;
    form.querySelectorAll("input[required], textarea[required], select[required]").forEach(field => {
        clearError(field);
        if (!field.value.trim()) { showError(field, "This field is required."); valid = false; }
    });
    return valid;
}

function showError(input, message) {
    input.classList.add("error");
    const err = input.closest(".form-group")?.querySelector(".error-message");
    if (err) err.textContent = message;
}

function clearError(input) {
    input.classList.remove("error");
    const err = input.closest(".form-group")?.querySelector(".error-message");
    if (err) err.textContent = "";
}

// ── Utils ──────────────────────────────────────────────────────────────────

function formatDate(dateString) {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function getInitials(name) {
    if (!name) return "NA";
    return name.split(" ").map(p => p.charAt(0).toUpperCase()).slice(0, 2).join("");
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
