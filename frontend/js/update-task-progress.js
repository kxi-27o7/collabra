document.addEventListener("DOMContentLoaded", () => {
    setupProgressRange();
    setupChecklistStatus();
    setupUpdateTaskForm();
    loadTaskDetails();
});

function setupProgressRange() {
    const range = document.querySelector("[data-progress-range]");
    const output = document.querySelector("[data-progress-value]");

    if (!range || !output) return;

    const updateRange = () => {
        const value = range.value;
        output.textContent = `${value}%`;
        range.style.background = `linear-gradient(to right, var(--primary) 0 ${value}%, #dfe7f7 ${value}% 100%)`;
    };

    range.addEventListener("input", updateRange);
    updateRange();
}

function setupChecklistStatus() {
    const checklistItems = document.querySelectorAll(".checklist-item");

    checklistItems.forEach((item) => {
        const checkbox = item.querySelector('input[type="checkbox"]');

        if (!checkbox) return;

        checkbox.addEventListener("change", () => {
            item.classList.toggle("completed", checkbox.checked);
        });
    });
}

async function loadTaskDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('task_id');

    if (!taskId) return;

    try {
        const task = await fetchAPI(`/tasks/${taskId}`);

        // Populate title
        const titleEl = document.querySelector("[data-task-title]");
        if (titleEl) titleEl.textContent = task.title || "Untitled Task";

        // Populate project label
        const projectLabelEl = document.querySelector("[data-project-label]");
        if (projectLabelEl && task.project_id) {
            try {
                const project = await fetchAPI(`/projects/${task.project_id}`);
                projectLabelEl.textContent = `Project: ${project.name}`;
            } catch {
                projectLabelEl.textContent = `Project #${task.project_id}`;
            }
        }

        // Populate task ID badge
        const taskIdBadgeEl = document.querySelector("[data-task-id-badge]");
        if (taskIdBadgeEl) taskIdBadgeEl.textContent = `Task ID: #${task.id}`;

        // Populate due date badge
        const dueBadgeEl = document.querySelector("[data-due-badge]");
        if (dueBadgeEl) {
            dueBadgeEl.textContent = task.deadline
                ? `Due: ${formatDate(task.deadline)}`
                : "No deadline";
        }

        // Set status dropdown
        const statusSelect = document.querySelector("#taskStatus");
        if (statusSelect && task.status) {
            // Map backend status to dropdown values
            const statusMap = { todo: "todo", in_progress: "in_progress", done: "completed" };
            const mappedStatus = statusMap[task.status] || task.status;
            statusSelect.value = mappedStatus;
        }

        // Set progress slider based on status
        const range = document.querySelector("[data-progress-range]");
        if (range) {
            let progressVal = 0;
            if (task.status === "in_progress") progressVal = 50;
            else if (task.status === "done") progressVal = 100;
            range.value = progressVal;
            range.dispatchEvent(new Event("input"));
        }

        // Update discussion link to carry the task_id forward
        const discussionLink = document.querySelector(".discussion-link-dynamic");
        if (discussionLink) {
            discussionLink.href = `comment-interface.html?task_id=${taskId}`;
        }

    } catch (error) {
        console.error("Failed to load task details:", error);
    }
}

function setupUpdateTaskForm() {
    const form = document.querySelector("[data-update-task-form]");

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const note = form.querySelector("#progressNote");

        clearError(note);

        if (!note.value.trim()) {
            showError(note, "Progress note is required.");
            return;
        }

        const formData = Object.fromEntries(new FormData(form).entries());
        
        // Map progress percentage to status
        const progressVal = parseInt(formData.progress || 0);
        let newStatus = "todo";
        if (progressVal > 0 && progressVal < 100) newStatus = "in_progress";
        else if (progressVal === 100) newStatus = "done";

        const urlParams = new URLSearchParams(window.location.search);
        const taskId = urlParams.get('task_id');

        if (!taskId) {
            alert("Error: No task ID found in URL.");
            return;
        }

        try {
            await fetchAPI(`/tasks/${taskId}/progress`, {
                method: "PUT",
                body: { status: newStatus }
            });

            // If there is a note, we can also add it as a comment!
            await fetchAPI(`/tasks/${taskId}/comments`, {
                method: "POST",
                body: { content: note.value.trim() }
            });

            alert("Progress updated successfully!");
            // Redirect back to the task board or project detail
            window.history.back();
        } catch (error) {
            alert(`Failed to update progress: ${error.message}`);
        }
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
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