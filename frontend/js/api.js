const API_BASE_URL = "http://localhost:8000/api";

async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem("collabra_access_token");
    
    const headers = {
        ...options.headers,
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // If body is an object and not FormData, convert to JSON
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
        options.body = JSON.stringify(options.body);
        headers["Content-Type"] = "application/json";
    }

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        if (response.status === 401 && endpoint !== "/auth/login") {
            // Unauthorized - token likely expired
            localStorage.removeItem("collabra_access_token");
            window.location.href = "login.html";
            return null;
        }

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(data?.detail || response.statusText || "API Error");
        }

        return data;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

// Minimal DOM tweaks: redirect brand links when logged-in and normalize common placeholders.
document.addEventListener("DOMContentLoaded", () => {
    // Redirect brand links to dashboard when user is logged in
    const isLoggedIn = !!localStorage.getItem("collabra_access_token");
    const brandLinks = document.querySelectorAll(
        "a[href='index.html'], a.join-brand, a.create-brand, a.comment-brand, a.update-brand"
    );
    brandLinks.forEach(link => {
        if (isLoggedIn) {
            link.href = "dashboard.html";
        }
        // Ensure brand text is consistent
        link.textContent = "Collabra";
    });

    // Normalize form placeholders mentioning 'research' -> 'project'
    const searchInputs = document.querySelectorAll("input[placeholder*='research']");
    searchInputs.forEach(input => {
        input.placeholder = input.placeholder.replace(/research/gi, "project");
    });
});
