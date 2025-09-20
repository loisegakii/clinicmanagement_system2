// src/pages/PatientDashboard.jsx
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

function PatientDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);

  // Fetch appointments + records on load
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch appointments for this patient
        const apptRes = await axios.get(
          `http://127.0.0.1:8000/api/appointments/?patient=${user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAppointments(apptRes.data);

        // Fetch medical records for this patient
        const recordRes = await axios.get(
          `http://127.0.0.1:8000/api/patients/${user.id}/medical-records/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMedicalRecords(recordRes.data);
      } catch (err) {
        console.error("Error fetching patient data:", err);
      }
    };

    fetchData();
  }, [user, token]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-700 text-white flex flex-col">
        <div className="h-16 flex items-center justify-center font-bold text-xl border-b border-blue-500">
          ✚ Patient Panel
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button className="w-full text-left px-3 py-2 rounded hover:bg-blue-600">
            Dashboard
          </button>
          <button className="w-full text-left px-3 py-2 rounded hover:bg-blue-600">
            Appointments
          </button>
          <button className="w-full text-left px-3 py-2 rounded hover:bg-blue-600">
            Medical Records
          </button>
        </nav>
        <div className="p-4 border-t border-blue-500">
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-700">Welcome, {user?.username}</h1>
          <div className="text-sm text-gray-600">
            Role: <span className="font-semibold">{user?.role}</span>
          </div>
        </div>

        {/* Profile Section */}
        <div className="bg-white shadow rounded p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">My Profile</h2>
          <p className="text-gray-600">
            <strong>Full Name:</strong> {user?.name || "N/A"}
          </p>
          <p className="text-gray-600">
            <strong>Email:</strong> {user?.email || "N/A"}
          </p>
          <p className="text-gray-600">
            <strong>Phone:</strong> {user?.phone || "N/A"}
          </p>
        </div>

        {/* Appointments */}
        <div className="bg-white shadow rounded p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">My Appointments</h2>
          {appointments.length > 0 ? (
            <ul className="space-y-3">
              {appointments.map((appt) => (
                <li key={appt.id} className="p-3 border rounded bg-gray-50">
                  <p>
                    <strong>Date:</strong> {appt.date}
                  </p>
                  <p>
                    <strong>Doctor:</strong> {appt.doctor_name}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        appt.status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {appt.status}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No appointments found.</p>
          )}
        </div>

        {/* Medical Records */}
        <div className="bg-white shadow rounded p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">My Medical Records</h2>
          {medicalRecords.length > 0 ? (
            <ul className="space-y-3">
              {medicalRecords.map((rec) => (
                <li key={rec.id} className="p-3 border rounded bg-gray-50">
                  <p>
                    <strong>Diagnosis:</strong> {rec.diagnosis}
                  </p>
                  <p>
                    <strong>Treatment:</strong> {rec.treatment}
                  </p>
                  <p>
                    <strong>Date:</strong> {rec.created_at}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No medical records available.</p>
          )}
        </div>
      </main>
    </div>
  );
}

export default PatientDashboard;
