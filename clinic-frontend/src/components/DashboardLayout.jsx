// src/components/DashboardLayout.jsx
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // -----------------------------
  // Role-based menu items
  // -----------------------------
  const menuItems = {
    ADMIN: [
      { label: "Users", path: "/dashboard/users" },
      { label: "Doctors", path: "/dashboard/doctors" },
      { label: "Patients", path: "/dashboard/patients" },
      { label: "Appointments", path: "/dashboard/appointments" },
    ],
    DOCTOR: [
      { label: "My Appointments", path: "/dashboard/appointments" },
      { label: "Medical Records", path: "/dashboard/records" },
    ],
    PATIENT: [
      { label: "My Profile", path: "/dashboard/profile" },
      { label: "My Appointments", path: "/dashboard/appointments" },
      { label: "Medical History", path: "/dashboard/records" },
    ],
    NURSE: [
      { label: "Appointments", path: "/dashboard/appointments" },
      { label: "Medical Records", path: "/dashboard/records" },
    ],
    RECEPTIONIST: [
      { label: "Appointments", path: "/dashboard/appointments" },
      { label: "Patients", path: "/dashboard/patients" },
    ],
    PHARMACIST: [
      { label: "Prescriptions", path: "/dashboard/prescriptions" },
      { label: "Inventory", path: "/dashboard/inventory" },
    ],
    LAB: [
      { label: "Lab Tests", path: "/dashboard/lab-tests" },
      { label: "Reports", path: "/dashboard/reports" },
    ],
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Navbar */}
      <header className="flex items-center justify-between bg-white border-b shadow-sm px-6 py-3">
        <div className="flex items-center space-x-6">
          <h1
            className="text-xl font-bold text-blue-700 cursor-pointer"
            onClick={() => navigate("/")}
          >
            AfyaCare
          </h1>

          {/* Role-specific menu */}
          <nav className="flex space-x-4">
            {(menuItems[user?.role] || []).map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="text-gray-700 hover:text-blue-600 transition"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-gray-600 text-sm">
            {user?.username} ({user?.role})
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
