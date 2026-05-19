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

// Global DOM patching for brand consistency & redirects
document.addEventListener("DOMContentLoaded", () => {
    // 1. Check title
    if (document.title) {
        document.title = document.title
            .replace(/Scholarly Architect/g, "Collabra")
            .replace(/Research Lab/g, "Collabra")
            .replace(/Academic Management/g, "Project Management");
    }

    // 2. Perform DOM text node replacement
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    let node;
    while ((node = walker.nextNode())) {
        if (node.nodeValue) {
            node.nodeValue = node.nodeValue
                .replace(/Scholarly Architect/gi, "Collabra")
                .replace(/Research Lab/gi, "Collabra")
                .replace(/Academic Management/gi, "Project Management")
                .replace(/Academic Portfolio/gi, "Project Portfolio");
        }
    }

    // 3. Fix Logo Brand Links (index.html -> dashboard.html if logged in)
    const isLoggedIn = !!localStorage.getItem("collabra_access_token");
    const brandLinks = document.querySelectorAll(
        "a[href='index.html'], a.join-brand, a.create-brand, a.comment-brand, a.update-brand"
    );
    brandLinks.forEach(link => {
        if (isLoggedIn) {
            link.href = "dashboard.html";
        }
        if (
            link.textContent.includes("Scholarly Architect") ||
            link.textContent.includes("Research Lab")
        ) {
            link.textContent = "Collabra";
        }
    });

    // 4. Overwrite non-English place-holders in form placeholders or text where appropriate
    const searchInputs = document.querySelectorAll("input[placeholder*='research']");
    searchInputs.forEach(input => {
        input.placeholder = input.placeholder.replace(/research/gi, "project");
    });
});
