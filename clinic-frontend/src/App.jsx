// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

// Dashboards
import AdminDashboard from "./pages/AdminDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import NurseDashboard from "./pages/NurseDashboard";
import ReceptionistDashboard from "./pages/ReceptionistDashboard";
import PharmacistDashboard from "./pages/PharmacistDashboard";
import LabTechnicianDashboard from "./pages/LabTechnicianDashboard";

// Receptionist-specific
import ReceptionistAppointments from "./pages/ReceptionistAppointments";
import PatientDetails from "./pages/PatientDetails";
import ReceptionistBilling from "./pages/Billing";
import Settings from "./pages/Settings";

// Only Admin can register users
import Register from "./pages/Register";

/**
 * HomeRedirect
 * - Redirect logged-in users to their correct dashboard
 * - If NOT logged in → redirect to /login (changed from rendering <Login />)
 */
function HomeRedirect() {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />; // ✅ changed

  switch (user.role) {
    case "ADMIN":
      return <Navigate to="/admin-dashboard" replace />;
    case "DOCTOR":
      return <Navigate to="/doctor-dashboard" replace />;
    case "NURSE":
      return <Navigate to="/nurse-dashboard" replace />;
    case "PATIENT":
      return <Navigate to="/patient-dashboard" replace />;
    case "RECEPTIONIST":
      return <Navigate to="/receptionist-dashboard" replace />;
    case "PHARMACIST":
      return <Navigate to="/pharmacist-dashboard" replace />;
    case "LAB":
      return <Navigate to="/lab-dashboard" replace />;
    default:
      return <Navigate to="/login" replace />; // ✅ changed
  }
}

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} /> {/* ✅ added dedicated /login route */}

          {/* Role-based dashboards */}
          <Route path="/admin-dashboard" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/doctor-dashboard" element={<ProtectedRoute role="DOCTOR"><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/nurse-dashboard/*" element={<ProtectedRoute role="NURSE"><NurseDashboard /></ProtectedRoute>} />
          <Route path="/patient-dashboard" element={<ProtectedRoute role="PATIENT"><PatientDashboard /></ProtectedRoute>} />
          <Route path="/receptionist-dashboard" element={<ProtectedRoute role="RECEPTIONIST"><ReceptionistDashboard /></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute role="RECEPTIONIST"><ReceptionistBilling /></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute role="RECEPTIONIST"><ReceptionistAppointments /></ProtectedRoute>} />
          <Route path="/patients/:id" element={<ProtectedRoute role="RECEPTIONIST"><PatientDetails /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute role="RECEPTIONIST"><Settings /></ProtectedRoute>} />

          <Route path="/pharmacist-dashboard" element={<ProtectedRoute role="PHARMACIST"><PharmacistDashboard /></ProtectedRoute>} />
          <Route path="/lab-dashboard" element={<ProtectedRoute role="LAB"><LabTechnicianDashboard /></ProtectedRoute>} />

          {/* Admin-only */}
          <Route path="/register" element={<ProtectedRoute role="ADMIN"><Register /></ProtectedRoute>} />

          {/* Catch-all → redirect to login (changed from "/") */}
          <Route path="*" element={<Navigate to="/login" replace />} /> {/* ✅ changed */}
        </Routes>
      </main>
    </div>
  );
}

export default App;
