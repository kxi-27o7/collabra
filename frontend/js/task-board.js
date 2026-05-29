document.addEventListener("DOMContentLoaded", () => {
    setupTaskModal();
    setupPriorityPicker();
    setupTaskForm();
    loadTasks();
});

let projectMembers = {};

async function loadTasks() {
    // Clear static placeholder cards first, regardless of project ID
    const columns = document.querySelectorAll("[data-task-column]");
    columns.forEach(col => {
        const addBtn = col.querySelector(".add-task-card-btn");
        col.innerHTML = "";
        if (addBtn) {
            col.appendChild(addBtn);
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        // No project selected — show a helpful message in the first column
        const todoCol = document.querySelector('[data-task-column="todo"]');
        if (todoCol) {
            const msg = document.createElement("p");
            msg.style.cssText = "padding: 24px 16px; color: #596273; text-align: center; font-size: 0.95rem;";
            msg.innerHTML = 'No project selected. <a href="project-list.html" style="color: var(--primary); text-decoration: underline;">Go to Projects</a> and open a project to view its task board.';
            todoCol.prepend(msg);
        }
        return;
    }

    try {
        // Fetch project members and populate projectMembers cache
        try {
            const members = await fetchAPI(`/projects/${projectId}/members`);
            members.forEach(m => {
                projectMembers[m.id] = m.full_name || m.email;
            });
        } catch (memError) {
            console.error("Failed to load project members for lookup:", memError);
        }

        const tasks = await fetchAPI(`/projects/${projectId}/tasks`);
        tasks.forEach(task => {
            addTaskToBoard(task);
        });

        // Initialize header counts
        ["todo", "progress", "review"].forEach(status => {
            updateColumnCount(status);
        });
    } catch (error) {
        console.error("Failed to load tasks:", error);
    }
}

function setupTaskModal() {
    const modalPanel = document.querySelector("[data-task-modal]");
    const openButtons = document.querySelectorAll("[data-open-task-modal]");
    const closeButtons = document.querySelectorAll("[data-close-task-modal]");

    if (!modalPanel) return;

    openButtons.forEach((button) => {
        button.addEventListener("click", () => {
            modalPanel.classList.add("show");
            modalPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    closeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            modalPanel.classList.remove("show");
        });
    });
}

function setupPriorityPicker() {
    const priorityLabels = document.querySelectorAll(".task-priority-picker label");

    priorityLabels.forEach((label) => {
        label.addEventListener("click", () => {
            priorityLabels.forEach((item) => item.classList.remove("active"));
            label.classList.add("active");

            const radio = label.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });
}

async function setupTaskForm() {
    const form = document.querySelector("[data-task-form]");
    if (!form) return;

    const projectSelect = form.querySelector("#relatedProject");
    const assigneeSelect = form.querySelector("#taskAssignee");

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    let currentUser = null;
    try {
        currentUser = await fetchAPI("/users/me");
    } catch (e) {
        console.error("Failed to load current user details:", e);
    }

    // Helper to load members for a specific project
    async function loadMembersForProject(projId) {
        if (!assigneeSelect) return;
        assigneeSelect.innerHTML = '<option value="" disabled selected>Loading members...</option>';
        try {
            const members = await fetchAPI(`/projects/${projId}/members`);
            assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
            members.forEach(m => {
                projectMembers[m.id] = m.full_name || m.email;

                const opt = document.createElement("option");
                opt.value = m.id;
                
                let displayName = m.full_name || m.email;
                if (currentUser && m.id === currentUser.id) {
                    displayName += " (me)";
                }
                opt.textContent = displayName;
                assigneeSelect.appendChild(opt);
            });
        } catch (error) {
            console.error("Failed to load members for project:", projId, error);
            assigneeSelect.innerHTML = '<option value="" disabled>Failed to load members</option>';
        }
    }

    // Load projects list to populate relatedProject dropdown
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

        if (projectId) {
            // Automatically select and lock/disable selection if created under project board
            if (projectSelect) {
                projectSelect.value = projectId;
                projectSelect.disabled = true;
            }
            await loadMembersForProject(projectId);
        } else {
            // Setup dynamic change listener if opened from general view
            if (projectSelect) {
                projectSelect.addEventListener("change", async (e) => {
                    const selectedProjId = e.target.value;
                    if (selectedProjId) {
                        await loadMembersForProject(selectedProjId);
                    } else {
                        assigneeSelect.innerHTML = '<option value="" disabled selected>Select Project first...</option>';
                    }
                });
            }
        }
    } catch (error) {
        console.error("Failed to load projects list:", error);
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const isValid = validateTaskForm(form);
        if (!isValid) return;

        const formData = Object.fromEntries(new FormData(form).entries());
        const selectedProjectId = projectId || (projectSelect ? projectSelect.value : null);

        if (!selectedProjectId) {
            alert("Error: Please select a related project.");
            return;
        }

        const taskData = {
            title: formData.task_title,
            description: formData.task_description,
            deadline: formData.task_due_date || null,
            status: "todo",
            assignee_id: formData.task_assignee ? parseInt(formData.task_assignee) : null
        };

        try {
            // Enable the select temporarily so it serializes or just use selectedProjectId
            const newTask = await fetchAPI(`/projects/${selectedProjectId}/tasks`, {
                method: "POST",
                body: taskData
            });

            if (projectId) {
                addTaskToBoard(newTask);
                form.reset();
                resetPriorityPicker();
                
                // Re-lock the project dropdown and reload its members
                if (projectSelect) {
                    projectSelect.value = projectId;
                }
                await loadMembersForProject(projectId);

                const modalPanel = document.querySelector("[data-task-modal]");
                if (modalPanel) {
                    modalPanel.classList.remove("show");
                }
            } else {
                // If created from general window, redirect directly to the task board of the related project
                window.location.href = `task-board.html?id=${selectedProjectId}`;
            }
        } catch (error) {
            alert(`Failed to create task: ${error.message}`);
        }
    });
}

function validateTaskForm(form) {
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

function addTaskToBoard(taskData) {
    let columnStatus = taskData.status || "todo";
    if (columnStatus === "in_progress") {
        columnStatus = "progress";
    } else if (columnStatus === "done") {
        columnStatus = "review";
    }
    const column = document.querySelector(`[data-task-column="${columnStatus}"]`);

    if (!column) return;

    const addTaskButton = column.querySelector(".add-task-card-btn");
    const taskCard = document.createElement("article");
    taskCard.className = "task-card";
    taskCard.setAttribute("data-task-card", taskData.id);
    taskCard.style.cursor = "pointer";
    taskCard.addEventListener("click", () => {
        window.location.href = `update-task-progress.html?task_id=${taskData.id}`;
    });

    const priorityClass = "medium"; // Priority isn't on backend model yet, default to medium
    const dueDateText = taskData.deadline ? formatDate(taskData.deadline) : "No deadline";
    const assigneeName = taskData.assignee_id ? (projectMembers[taskData.assignee_id] || "Assignee") : "NA";
    const initials = getInitials(assigneeName);

    taskCard.innerHTML = `
        <div class="task-card-top">
            <span class="priority-chip ${priorityClass}">Medium</span>
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

    if (addTaskButton) {
        column.insertBefore(taskCard, addTaskButton);
    } else {
        column.appendChild(taskCard);
    }

    updateColumnCount(columnStatus);
}

function updateColumnCount(columnName) {
    const column = document.querySelector(`[data-task-column="${columnName}"]`);
    if (!column) return;

    const count = column.querySelectorAll("[data-task-card]").length;
    const headerCount = column.closest(".task-column")?.querySelector(".task-column-title span");

    if (headerCount) {
        headerCount.textContent = count;
    }
}

function resetPriorityPicker() {
    const labels = document.querySelectorAll(".task-priority-picker label");
    labels.forEach((label) => label.classList.remove("active"));

    const defaultLabel = document.querySelector('.task-priority-picker label input[value="medium"]')?.closest("label");
    if (defaultLabel) {
        defaultLabel.classList.add("active");

        const radio = defaultLabel.querySelector("input");
        if (radio) radio.checked = true;
    }
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

function getPriorityClass(priority) {
    if (priority === "high") return "high";
    if (priority === "low") return "low";
    return "medium";
}

function capitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit"
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
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}