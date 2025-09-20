// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute
 * - Wraps any route that requires authentication.
 * - If the user is NOT logged in → redirect to "/".
 * - If `role` is provided → only allow that role.
 * - If logged in but wrong role → redirect to their dashboard.
 */
const ProtectedRoute = ({ children, role }) => {
  const { user } = useAuth();

  if (!user) {
    // ❌ Not authenticated → redirect to login page
    return <Navigate to="/" replace />;
  }

  if (role && user.role !== role) {
    // ⚠️ Authenticated but wrong role → redirect to correct dashboard
    switch (user.role) {
      case "ADMIN":
        return <Navigate to="/admin-dashboard" replace />;
      case "DOCTOR":
        return <Navigate to="/doctor-dashboard" replace />;
      case "PATIENT":
        return <Navigate to="/patient-dashboard" replace />;
      case "RECEPTIONIST":
        return <Navigate to="/receptionist-dashboard" replace />;
      case "PHARMACIST":
        return <Navigate to="/pharmacist-dashboard" replace />;
      case "LAB":
        return <Navigate to="/lab-dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  // Authenticated AND authorized
  return children;
};

export default ProtectedRoute;
