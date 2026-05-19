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
