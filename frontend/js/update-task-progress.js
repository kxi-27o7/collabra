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

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const note = form.querySelector("#progressNote");

        clearError(note);

        if (!note.value.trim()) {
            showError(note, "Progress note is required.");
            return;
        }

        const formData = Object.fromEntries(new FormData(form).entries());

        const checkedChecklist = Array.from(
            form.querySelectorAll('input[name="checklist[]"]:checked')
        ).map((item) => item.value);

        console.log("Update task progress ready for backend:", {
            ...formData,
            checklist: checkedChecklist
        });

        alert("Progress task sudah valid. Nanti bagian ini bisa disambungkan ke backend.");
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