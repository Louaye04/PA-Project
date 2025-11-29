import axios from "axios";

// API Configuration
// Use environment variable when provided; default to 127.0.0.1:5000 to avoid IPv6 localhost (::1) issues on Windows.
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.timeout = 10000; // 10 seconds timeout
axios.defaults.headers.common["Content-Type"] = "application/json";

// Add request interceptor for debugging
axios.interceptors.request.use(
  (config) => {
    console.log(`Making request to: ${config.url}`);
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
axios.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout - server took too long to respond");
    } else if (error.code === "ERR_NETWORK") {
      console.error(
        "Network error - cannot reach server. Is it running on port 5000?"
      );
    } else if (!error.response) {
      console.error("No response from server - connection failed");
    }
    return Promise.reject(error);
  }
);

export default API_BASE_URL;
