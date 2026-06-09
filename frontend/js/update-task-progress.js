document.addEventListener("DOMContentLoaded", () => {
    setupProgressRange();
    setupChecklistStatus();
    setupUpdateTaskForm();
    loadTaskDetails();
    setupCommentForm();
    setupSaveDraft();
    loadComments();
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

async function loadComments() {
    const feed = document.querySelector("[data-comment-feed]");
    if (!feed) return;

    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get("task_id");
    if (!taskId) return;

    try {
        const comments = await fetchAPI(`/tasks/${taskId}/comments`);
        feed.innerHTML = "";
        comments.forEach(comment => {
            addNewComment(feed, comment.content, "User", new Date(comment.created_at).toLocaleString());
        });
        updateCommentCount(comments.length);
    } catch (error) {
        console.error("Failed to load comments:", error);
    }
}

function setupCommentForm() {
    const form = document.querySelector("[data-comment-form]");
    const feed = document.querySelector("[data-comment-feed]");

    if (!form || !feed) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const textarea = form.querySelector("textarea");
        clearError(textarea);

        if (!textarea.value.trim()) {
            showError(textarea, "Comment is required.");
            return;
        }

        const commentText = textarea.value.trim();

        const urlParams = new URLSearchParams(window.location.search);
        const taskId = urlParams.get("task_id");

        if (!taskId) {
            alert("Error: No task ID found in URL.");
            return;
        }

        try {
            await fetchAPI(`/tasks/${taskId}/comments`, {
                method: "POST",
                body: { content: commentText }
            });

            addNewComment(feed, commentText, "You", "Just now");
            textarea.value = "";
            localStorage.removeItem("commentDraft");

            const countEl = document.querySelector("[data-comment-count]");
            if (countEl) {
                const current = parseInt(countEl.dataset.count || "0") + 1;
                countEl.dataset.count = current;
                countEl.textContent = `${current} ${current === 1 ? "Comment" : "Comments"}`;
            }
        } catch (error) {
            alert(`Failed to post comment: ${error.message}`);
        }
    });
}

function addNewComment(feed, commentText, authorName = "User", timeStr = "Just now") {
    const article = document.createElement("article");
    article.className = "comment-thread";
    article.setAttribute("data-comment-item", "");

    const initials = authorName.substring(0, 2).toUpperCase();

    article.innerHTML = `
        <div class="comment-avatar initials-avatar">${initials}</div>
        <div class="comment-content">
            <div class="comment-meta">
                <div><strong>${escapeHtml(authorName)}</strong></div>
                <time>${timeStr}</time>
            </div>
            <div class="comment-bubble">${formatCommentText(commentText)}</div>
        </div>
    `;

    feed.appendChild(article);
}

function setupSaveDraft() {
    const draftButton = document.querySelector("[data-save-draft]");
    const textarea = document.querySelector("#commentMessage");

    if (!draftButton || !textarea) return;

    const savedDraft = localStorage.getItem("commentDraft");
    if (savedDraft) textarea.value = savedDraft;

    draftButton.addEventListener("click", () => {
        localStorage.setItem("commentDraft", textarea.value);
        draftButton.textContent = "Saved!";
        setTimeout(() => { draftButton.textContent = "Save Draft"; }, 1500);
    });
}

function updateCommentCount(count) {
    const countEl = document.querySelector("[data-comment-count]");
    if (!countEl) return;
    countEl.dataset.count = count;
    countEl.textContent = `${count} ${count === 1 ? "Comment" : "Comments"}`;
}

function formatCommentText(text) {
    const escaped = escapeHtml(text);
    return escaped
        .replace(/@([a-zA-Z\s]+)/g, '<a href="#">@$1</a>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}