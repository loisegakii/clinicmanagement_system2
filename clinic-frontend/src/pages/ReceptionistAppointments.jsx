// src/pages/ReceptionistAppointments.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";

function ReceptionistAppointments() {
  const location = useLocation();
  const patientId = location.state?.patientId || "";

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newAppointment, setNewAppointment] = useState({
    patient: patientId || "",
    doctor: "",
    date: "",
    time: "",
  });

  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Fetch appointments
  const fetchAppointments = async () => {
    try {
      const res = await API.get("/appointments/");
      setAppointments(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      setError("❌ Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch patients
  const fetchPatients = async () => {
    try {
      const res = await API.get("/patients/");
      setPatients(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error("❌ Failed to fetch patients:", err.message);
    }
  };

  // Fetch doctors
  const fetchDoctors = async () => {
    try {
      const res = await API.get("/doctors/");
      setDoctors(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error("❌ Failed to fetch doctors:", err.message);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchDoctors();
  }, []);

  // Handle booking
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        patient: newAppointment.patient,
        doctor: newAppointment.doctor,
        date: newAppointment.date,
        time: newAppointment.time,
      };
      await API.post("/appointments/", payload);
      alert("✅ Appointment booked successfully!");
      fetchAppointments();
      setNewAppointment({ patient: patientId || "", doctor: "", date: "", time: "" });
    } catch (err) {
      alert("❌ Failed to book appointment.");
    }
  };

  if (loading) {
    return <p className="text-center py-6">Loading...</p>;
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-green-900 text-white flex flex-col p-6">
        <h2 className="text-2xl font-bold mb-10 text-red-500">AfyaCare</h2>
        <nav className="flex-1">
          <ul className="space-y-4">
            <li>
              <Link to="/dashboard" className="flex items-center space-x-2 hover:text-green-400">
                <LayoutDashboard size={20} /> <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link to="/patients" className="flex items-center space-x-2 hover:text-green-400">
                <Users size={20} /> <span>Patients</span>
              </Link>
            </li>
            <li>
              <Link to="/appointments" className="flex items-center space-x-2 text-red-400">
                <Calendar size={20} /> <span>Appointments</span>
              </Link>
            </li>
            <li>
              <Link to="/billing" className="flex items-center space-x-2 hover:text-green-400">
                <FileText size={20} /> <span>Billing</span>
              </Link>
            </li>
            <li>
              <Link to="/settings" className="flex items-center space-x-2 hover:text-green-400">
                <Settings size={20} /> <span>Settings</span>
              </Link>
            </li>
          </ul>
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 mt-10 hover:text-red-400"
        >
          <LogOut size={20} /> <span>Logout</span>
        </button>
      </aside>

      {/* Main Section */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="bg-green-950 shadow px-6 py-4 flex justify-between items-center">
          <motion.div
            className="text-xl font-semibold text-red-500"
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Receptionist Panel — Manage Appointments
          </motion.div>
          <div className="flex items-center space-x-4">
            <img
              src="https://via.placeholder.com/40"
              alt="Profile"
              className="w-10 h-10 rounded-full border-2 border-red-500"
            />
          </div>
        </header>

        {/* Content */}
        <main className="p-6 overflow-y-auto">
          {/* Book Appointment Form */}
          <div className="bg-green-950 shadow-lg rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-green-300">➕ Book New Appointment</h2>
            <form onSubmit={handleBookAppointment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Patient dropdown */}
              <select
                value={newAppointment.patient}
                onChange={(e) => setNewAppointment({ ...newAppointment, patient: e.target.value })}
                className="border p-3 rounded-lg text-black"
                required
                disabled={!!patientId} // lock field if patient was preselected
              >
                <option value="">Select Patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} ({p.username})
                  </option>
                ))}
              </select>

              {/* Doctor dropdown */}
              <select
                value={newAppointment.doctor}
                onChange={(e) => setNewAppointment({ ...newAppointment, doctor: e.target.value })}
                className="border p-3 rounded-lg text-black"
                required
              >
                <option value="">Select Doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.first_name} {d.last_name} — {d.specialization || "General"}
                  </option>
                ))}
              </select>

              {/* Date input */}
              <input
                type="date"
                value={newAppointment.date}
                onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                className="border p-3 rounded-lg text-black"
                required
              />

              {/* Time input */}
              <input
                type="time"
                value={newAppointment.time}
                onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                className="border p-3 rounded-lg text-black"
                required
              />

              <button
                type="submit"
                className="col-span-1 md:col-span-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium"
              >
                Book Appointment
              </button>
            </form>
          </div>

          {/* Appointment List */}
          <div className="bg-green-950 shadow-lg rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-green-300">📋 Appointments</h2>
            {appointments.length === 0 ? (
              <p className="text-gray-400">No appointments found.</p>
            ) : (
              <div className="space-y-4">
                {appointments.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 border border-green-700 rounded-lg shadow flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-red-400">{a.patient_name}</p>
                      <p className="text-sm text-green-300">
                        Doctor: Dr. {a.doctor_name} ({a.doctor_specialty || "General"})
                      </p>
                      <p className="text-sm text-gray-300">
                        Date: {a.date} — Time: {a.time}
                      </p>
                      <p className="text-sm text-gray-400">Status: {a.status}</p>
                    </div>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ReceptionistAppointments;
