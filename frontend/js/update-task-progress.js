document.addEventListener("DOMContentLoaded", () => {
    setupProgressRange();
    setupChecklistStatus();
    setupUpdateTaskForm();
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
        const taskId = urlParams.get('id');

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
            // Optionally redirect back to the task board or project detail
            window.history.back();
        } catch (error) {
            alert(`Failed to update progress: ${error.message}`);
        }
    });
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