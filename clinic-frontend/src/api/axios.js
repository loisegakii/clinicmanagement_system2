// src/api/axios.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api/", // Django backend
});

// -----------------------------
// Attach fresh token on every request
// -----------------------------
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization; //  avoid stale token
  }
  return config;
});

// -----------------------------
// Refresh token on 401
// -----------------------------
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
          console.warn("⚠️ No refresh token available → logging out");
          localStorage.clear();
          delete API.defaults.headers.common["Authorization"];
          window.location.href = "/login";
          return Promise.reject(error);
        }

        // Request a new access token
        const res = await axios.post("http://127.0.0.1:8000/api/token/refresh/", {
          refresh: refreshToken,
        });

        const newAccessToken = res.data.access;
        if (!newAccessToken) {
          throw new Error("No access token returned from refresh");
        }

        // Save and apply token globally
        localStorage.setItem("access_token", newAccessToken);
        API.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Retry the failed request
        return API(originalRequest);
      } catch (err) {
        console.error("❌ Token refresh failed:", err.response?.data || err.message);
        localStorage.clear();
        delete API.defaults.headers.common["Authorization"];
        window.location.href = "/login";
        return Promise.reject(err);
      }
    }

    return Promise.reject(error); // always propagate error
  }
);

export default API;
