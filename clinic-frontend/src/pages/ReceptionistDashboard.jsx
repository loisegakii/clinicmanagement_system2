// src/pages/ReceptionistDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import { toast } from "react-hot-toast";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";

function ReceptionistDashboard() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [profilePic, setProfilePic] = useState(null);

  const [newPatient, setNewPatient] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    gender: "M",
    date_of_birth: "",
    next_of_kin_name: "",
    next_of_kin_phone: "",
  });

  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // ==========================
  // Fetch patients
  // ==========================
  const fetchPatients = async () => {
    try {
      const res = await API.get("/patients/");
      setPatients(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      setError("Failed to load patients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // ==========================
  // Add patient
  // ==========================
  const handleAddPatient = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const payload = { ...newPatient };
      const res = await API.post("/patients/", payload);
      setPatients((prev) => [res.data, ...prev]);

      setNewPatient({
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        password: "",
        phone: "",
        address: "",
        gender: "M",
        date_of_birth: "",
        next_of_kin_name: "",
        next_of_kin_phone: "",
      });

      toast.success("✅ Patient added successfully!");
    } catch (err) {
      toast.error("❌ Failed to create patient.");
    }
  };

  // ==========================
  // Handle profile picture upload
  // ==========================
  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(URL.createObjectURL(file));
    }
  };

  // ==========================
  // Render
  // ==========================
  if (loading) {
    return <p className="text-center py-6">Loading...</p>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ==========================
          Sidebar
      ========================== */}
      <aside className="w-64 bg-black text-white flex flex-col p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-10 text-green-500">AfyaCare</h2>
        <nav className="flex-1">
          <ul className="space-y-4">
            <li>
              <Link
                to="/dashboard"
                className="flex items-center space-x-2 hover:text-green-400"
              >
                <LayoutDashboard size={20} /> <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link
                to="/patients"
                className="flex items-center space-x-2 hover:text-green-400"
              >
                <Users size={20} /> <span>Patients</span>
              </Link>
            </li>
            <li>
              <Link
                to="/appointments"
                className="flex items-center space-x-2 hover:text-green-400"
              >
                <Calendar size={20} /> <span>Appointments</span>
              </Link>
            </li>
            <li>
              <Link
                to="/billing"
                className="flex items-center space-x-2 hover:text-green-400"
              >
                <FileText size={20} /> <span>Billing</span>
              </Link>
            </li>
            <li>
              <Link
                to="/settings"
                className="flex items-center space-x-2 hover:text-green-400"
              >
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

      {/* ==========================
          Main Section
      ========================== */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <motion.div
            className="text-xl font-semibold text-green-600"
            animate={{ x: ["0%", "100%", "0%"] }}
            transition={{ duration: 10, repeat: Infinity }}
          >
            AfyaCare Hospital — Your Health, Our Priority
          </motion.div>
          <div className="flex items-center space-x-4">
            {/* Settings icon */}
            <button
              onClick={() => navigate("/settings")}
              className="p-2 rounded-full hover:bg-gray-200"
              title="Settings"
            >
              <Settings size={22} className="text-gray-700" />
            </button>

            {/* Profile picture (clickable) */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePicChange}
              />
              <img
                src={profilePic || "https://via.placeholder.com/40"}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-green-500"
              />
            </label>
          </div>
        </header>

        {/* ==========================
            Content
        ========================== */}
        <main className="p-6 overflow-y-auto">
          {/* Add Patient Form */}
          <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-black">
              ➕ Add New Patient
            </h2>
            <form
              onSubmit={handleAddPatient}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <input
                type="text"
                placeholder="First Name"
                value={newPatient.first_name}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, first_name: e.target.value })
                }
                className="border p-3 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={newPatient.last_name}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, last_name: e.target.value })
                }
                className="border p-3 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
              <input
                type="text"
                placeholder="Username"
                value={newPatient.username}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, username: e.target.value })
                }
                className="border p-3 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={newPatient.email}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, email: e.target.value })
                }
                className="border p-3 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={newPatient.password}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, password: e.target.value })
                }
                className="border p-3 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={newPatient.phone}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, phone: e.target.value })
                }
                className="border p-3 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <input
                type="text"
                placeholder="Address"
                value={newPatient.address}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, address: e.target.value })
                }
                className="border p-3 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <select
                value={newPatient.gender}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, gender: e.target.value })
                }
                className="border p-3 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
              <input
                type="date"
                placeholder="Date of Birth"
                value={newPatient.date_of_birth}
                onChange={(e) =>
                  setNewPatient({
                    ...newPatient,
                    date_of_birth: e.target.value,
                  })
                }
                className="border p-3 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
              <input
                type="text"
                placeholder="Next of Kin Name"
                value={newPatient.next_of_kin_name}
                onChange={(e) =>
                  setNewPatient({
                    ...newPatient,
                    next_of_kin_name: e.target.value,
                  })
                }
                className="border p-3 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <input
                type="tel"
                placeholder="Next of Kin Phone"
                value={newPatient.next_of_kin_phone}
                onChange={(e) =>
                  setNewPatient({
                    ...newPatient,
                    next_of_kin_phone: e.target.value,
                  })
                }
                className="border p-3 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                className="col-span-1 md:col-span-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium"
              >
                Add Patient
              </button>
            </form>
          </div>

          {/* Patient List */}
          <div className="bg-white shadow-lg rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">📋 Patients</h2>
            {patients.length === 0 ? (
              <p className="text-gray-500">No patients found.</p>
            ) : (
              <div className="space-y-4">
                {patients.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 border rounded-lg shadow flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-black">
                        {p.first_name} {p.last_name}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Username:</span> {p.username}
                      </p>
                      <p className="text-gray-600">{p.email}</p>
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Date Added:</span>{" "}
                        {p.date_joined
                          ? new Date(p.date_joined).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>

                    <div className="space-x-2">
                      <button
                        onClick={() => navigate(`/patients/${p.id}`)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                      >
                        View
                      </button>
                      <button
                        onClick={() =>
                          navigate("/appointments", { state: { patientId: p.id } })
                        }
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                      >
                        Book Appointment
                      </button>
                    </div>
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

export default ReceptionistDashboard;
