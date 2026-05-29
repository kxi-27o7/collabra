document.addEventListener("DOMContentLoaded", () => {
    setupCommentSearch();
    setupCommentForm();
    setupSaveDraft();
    setupReplyButtons();
    loadComments();
});

async function loadComments() {
    const feed = document.querySelector("[data-comment-feed]");
    if (!feed) return;

    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('task_id');

    if (!taskId) return;

    try {
        const comments = await fetchAPI(`/tasks/${taskId}/comments`);
        feed.innerHTML = ""; // clear dummy comments
        comments.forEach(comment => {
            // we don't have full names from this endpoint easily without expanding it in backend, so fallback to "User"
            addNewComment(feed, comment.content, "User", new Date(comment.created_at).toLocaleString());
        });
    } catch (error) {
        console.error("Failed to load comments:", error);
    }
}

function setupCommentSearch() {
    const searchInput = document.querySelector("[data-comment-search]");
    const commentItems = document.querySelectorAll("[data-comment-item]");

    if (!searchInput || !commentItems.length) return;

    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase().trim();

        commentItems.forEach((item) => {
            const text = item.textContent.toLowerCase();
            const isMatch = text.includes(keyword);

            item.style.display = isMatch || keyword === "" ? "" : "none";
        });
    });
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
        const taskId = urlParams.get('task_id');

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
                <div>
                    <strong>${authorName}</strong>
                </div>
                <time>${timeStr}</time>
            </div>

            <div class="comment-bubble">
                ${formatCommentText(commentText)}
            </div>
        </div>
    `;

    feed.appendChild(article);
}

function setupSaveDraft() {
    const draftButton = document.querySelector("[data-save-draft]");
    const textarea = document.querySelector("#commentMessage");

    if (!draftButton || !textarea) return;

    const savedDraft = localStorage.getItem("commentDraft");

    if (savedDraft) {
        textarea.value = savedDraft;
    }

    draftButton.addEventListener("click", () => {
        localStorage.setItem("commentDraft", textarea.value);
        alert("Draft comment berhasil disimpan di browser.");
    });
}

function setupReplyButtons() {
    const replyButtons = document.querySelectorAll("[data-reply-button]");
    const textarea = document.querySelector("#commentMessage");

    if (!replyButtons.length || !textarea) return;

    replyButtons.forEach((button) => {
        button.addEventListener("click", () => {
            textarea.focus();
            textarea.value = "@Sarah Jenkins ";
        });
    });
}

function formatCommentText(text) {
    const escaped = escapeHtml(text);

    return escaped
        .replace(/@([a-zA-Z\s]+)/g, '<a href="#">@$1</a>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
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

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}