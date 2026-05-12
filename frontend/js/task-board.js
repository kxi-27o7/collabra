document.addEventListener("DOMContentLoaded", () => {
    setupTaskModal();
    setupPriorityPicker();
    setupTaskForm();
});

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

function setupTaskForm() {
    const form = document.querySelector("[data-task-form]");

    if (!form) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const isValid = validateTaskForm(form);
        if (!isValid) return;

        const formData = Object.fromEntries(new FormData(form).entries());

        addTaskToBoard(formData);
        form.reset();
        resetPriorityPicker();

        const modalPanel = document.querySelector("[data-task-modal]");
        if (modalPanel) {
            modalPanel.classList.remove("show");
        }

        alert("Task berhasil dibuat. Nanti bisa langsung dihubungkan ke backend.");
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
    const todoColumn = document.querySelector('[data-task-column="todo"]');

    if (!todoColumn) return;

    const addTaskButton = todoColumn.querySelector(".add-task-card-btn");
    const taskCard = document.createElement("article");
    taskCard.className = "task-card";
    taskCard.setAttribute("data-task-card", "");

    const priorityClass = getPriorityClass(taskData.task_priority);
    const dueDateText = formatDate(taskData.task_due_date);
    const initials = getInitials(taskData.task_assignee);

    taskCard.innerHTML = `
        <div class="task-card-top">
            <span class="priority-chip ${priorityClass}">${capitalize(taskData.task_priority)}</span>
        </div>

        <h3>${escapeHtml(taskData.task_title)}</h3>

        <div class="task-card-divider"></div>

        <div class="task-card-bottom">
            <span class="task-date">◔ ${dueDateText}</span>
            <div class="task-mini-avatars">
                <span>${initials}</span>
            </div>
        </div>
    `;

    if (addTaskButton) {
        todoColumn.insertBefore(taskCard, addTaskButton);
    } else {
        todoColumn.appendChild(taskCard);
    }

    updateColumnCount("todo");
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