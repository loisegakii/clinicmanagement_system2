// src/pages/Dashboard.jsx
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    // If no user, redirect to login
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-base-200 flex">
      {/* Sidebar */}
      <div className="w-64 bg-base-100 shadow-lg p-4">
        <h2 className="text-xl font-bold mb-6 text-primary">Clinic Portal</h2>

        {/* Navigation by role */}
        <ul className="menu menu-vertical">
          {user.role === "Admin" && (
            <>
              <li>
                <a>Manage Users</a>
              </li>
              <li>
                <a>System Settings</a>
              </li>
            </>
          )}

          {user.role === "Doctor" && (
            <>
              <li>
                <a>Patient Records</a>
              </li>
              <li>
                <a>Appointments</a>
              </li>
            </>
          )}

          {user.role === "Patient" && (
            <>
              <li>
                <a>My Appointments</a>
              </li>
              <li>
                <a>My Prescriptions</a>
              </li>
            </>
          )}

          <li className="mt-6">
            <button className="btn btn-error w-full" onClick={logout}>
              Logout
            </button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold">
          Welcome, <span className="text-primary">{user.username}</span>
        </h1>
        <p className="text-sm mt-2">Role: {user.role}</p>

        <div className="mt-6 p-6 bg-base-100 shadow rounded-xl">
          <h2 className="text-lg font-semibold">Dashboard Content</h2>
          <p className="text-sm text-gray-500">
            This area will load role-specific pages (CRUD pages).
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
