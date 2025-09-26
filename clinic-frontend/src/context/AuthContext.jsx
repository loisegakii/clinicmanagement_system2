// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("access_token") || null);

  const navigate = useNavigate();

  // -----------------------------
  // Safe navigate to avoid repeated redirects
  // -----------------------------
  const safeNavigate = (path) => {
    if (window.location.pathname !== path) {
      navigate(path);
    }
  };

  // -----------------------------
  // Normalize user role safely
  // -----------------------------
  const mapUserRole = (data) => ({
    ...data,
    role: data.role ? data.role.toUpperCase() : null,
  });

  // -----------------------------
  // Refresh access token helper
  // -----------------------------
  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) throw new Error("No refresh token");

      const res = await API.post("auth/token/refresh/", { refresh: refreshToken });
      const newAccess = res.data.access;

      if (!newAccess) throw new Error("No access token returned");

      localStorage.setItem("access_token", newAccess);
      setToken(newAccess);
      API.defaults.headers.common["Authorization"] = `Bearer ${newAccess}`;

      return newAccess;
    } catch (err) {
      console.error("❌ Token refresh failed:", err.response?.data || err.message);
      logout();
      return null;
    }
  };

  // -----------------------------
  // Login
  // -----------------------------
  const login = async (username, password) => {
    try {
      // Reset storage and headers
      localStorage.clear();
      delete API.defaults.headers.common["Authorization"];

      const res = await API.post("auth/token/", { username, password });
      const { access, refresh } = res.data;

      setToken(access);
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      API.defaults.headers.common["Authorization"] = `Bearer ${access}`;

      // Fetch user profile
      const me = await API.get("me/");
      const normalized = mapUserRole(me.data);

      setUser(normalized);
      localStorage.setItem("user", JSON.stringify(normalized));

      // Navigate safely
      navigateBasedOnRole(normalized.role);

      return normalized;
    } catch (err) {
      console.error("❌ Login failed:", err.response?.data || err.message);
      throw new Error(
        err.response?.data?.detail || "Login failed. Check credentials or server connection."
      );
    }
  };

  // -----------------------------
  // Logout
  // -----------------------------
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.clear();
    delete API.defaults.headers.common["Authorization"];
    safeNavigate("/login"); // ✅ safe navigate
  };

  // -----------------------------
  // Navigate based on role
  // -----------------------------
  const navigateBasedOnRole = (role) => {
    switch (role) {
      case "ADMIN":
        safeNavigate("/admin-dashboard");
        break;
      case "DOCTOR":
        safeNavigate("/doctor-dashboard");
        break;
      case "NURSE":
        safeNavigate("/nurse-dashboard");
        break;
      case "RECEPTIONIST":
        safeNavigate("/receptionist-dashboard");
        break;
      case "PHARMACIST":
        safeNavigate("/pharmacist-dashboard");
        break;
      case "LAB":
        safeNavigate("/lab-dashboard");
        break;
      case "PATIENT":
        safeNavigate("/patient-dashboard");
        break;
      default:
        safeNavigate("/login");
    }
  };

  // -----------------------------
  // Auto-load user on refresh
  // -----------------------------
  useEffect(() => {
    const fetchUser = async () => {
      if (token && !user) {
        try {
          API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          const me = await API.get("me/");
          const normalized = mapUserRole(me.data);
          setUser(normalized);
          localStorage.setItem("user", JSON.stringify(normalized));
        } catch {
          const newToken = await refreshAccessToken();
          if (newToken) {
            const me = await API.get("me/");
            const normalized = mapUserRole(me.data);
            setUser(normalized);
            localStorage.setItem("user", JSON.stringify(normalized));
          }
        }
      }
    };
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = useMemo(() => ({ user, token, login, logout }), [user, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// -----------------------------
// Hook
// -----------------------------
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
