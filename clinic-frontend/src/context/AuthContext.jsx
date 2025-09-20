// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios.js";

const AuthContext = createContext();

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
  // Normalize user role safely
  // -----------------------------
  const mapUserRole = (data) => ({
    ...data,
    role: data.role ? data.role.toUpperCase() : null,
  });

  // -----------------------------
  // Login
  // -----------------------------
  const login = async (username, password) => {
  try {
    // 🔄 Always reset storage & axios headers before login
    localStorage.clear();
    delete API.defaults.headers.common["Authorization"];

    const res = await API.post("auth/token/", { username, password });
    const access = res.data.access;
    const refresh = res.data.refresh;

    setToken(access);
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);

    API.defaults.headers.common["Authorization"] = `Bearer ${access}`;

    const me = await API.get("me/");
    const normalized = mapUserRole(me.data);

    setUser(normalized);
    localStorage.setItem("user", JSON.stringify(normalized));

    // 🚀 Redirect based on role
    switch (normalized.role) {
      case "ADMIN":
        navigate("/admin-dashboard");
        break;
      case "DOCTOR":
        navigate("/doctor-dashboard");
        break;
      case "RECEPTIONIST":
        navigate("/receptionist-dashboard");
        break;
      case "PHARMACIST":
        navigate("/pharmacist-dashboard");
        break;
      case "LAB":
        navigate("/lab-dashboard");
        break;
      case "PATIENT":
        navigate("/patient-dashboard");
        break;
      default:
        navigate("/login");
    }

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
    localStorage.clear(); // ✅ clear everything
    navigate("/login");
  };

  // -----------------------------
  // Auto-load user on refresh
  // -----------------------------
  useEffect(() => {
    const fetchUser = async () => {
      if (token && !user) {
        try {
          const me = await API.get("me/", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const normalized = mapUserRole(me.data);
          setUser(normalized);
          localStorage.setItem("user", JSON.stringify(normalized));
        } catch (err) {
          console.warn("⚠️ Invalid/expired token, logging out");
          logout();
        }
      }
    };
    fetchUser();
  }, [token, user]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// -----------------------------
// Hook
// -----------------------------
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
