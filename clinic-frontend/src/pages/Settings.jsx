import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";   // ✅ Import for navigation
import axios from "axios";
import { FaUser, FaLock, FaEnvelope, FaSave, FaArrowLeft } from "react-icons/fa";
import { MdEvent, MdOutlineNotificationsActive } from "react-icons/md";
import { BsPalette } from "react-icons/bs";

const Settings = () => {
  const navigate = useNavigate();  // ✅ Initialize navigate

  const [settings, setSettings] = useState({
    name: "",
    email: "",
    password: "",
    default_appointment_duration: 30,
    notify_email: true,
    notify_sms: false,
    auto_generate_patient_id: true,
    theme: "light",
    layout_preference: "detailed",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Fetch current settings
  useEffect(() => {
    axios
      .get("/api/receptionist-settings/1/") // adjust ID if needed
      .then((res) => setSettings(res.data))
      .catch((err) => console.error("Error fetching settings:", err));
  }, []);

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Save settings
  const handleSave = () => {
    setLoading(true);
    axios
      .put("/api/receptionist-settings/1/", settings) // adjust ID if needed
      .then(() => {
        setMessage("✅ Settings updated successfully!");
        setLoading(false);
      })
      .catch(() => {
        setMessage("❌ Failed to update settings.");
        setLoading(false);
      });
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Back Button */}
      <button
        onClick={() => navigate("/dashboard")}  // ✅ Navigate back to dashboard
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
      >
        <FaArrowLeft />
        Back to Dashboard
      </button>

      <h2 className="text-3xl font-bold mb-8 text-center flex items-center justify-center gap-2">
        ⚙️ Settings
      </h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Info */}
        <div className="bg-white p-6 rounded-2xl shadow-md border hover:shadow-lg transition">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FaUser className="text-blue-600" /> Profile Info
          </h3>
          <input
            type="text"
            name="name"
            value={settings.name}
            onChange={handleChange}
            placeholder="Full Name"
            className="w-full border p-2 rounded mb-3 focus:ring-2 focus:ring-blue-400"
          />
          <div className="flex items-center border rounded mb-3">
            <FaEnvelope className="ml-2 text-gray-500" />
            <input
              type="email"
              name="email"
              value={settings.email}
              onChange={handleChange}
              placeholder="Email"
              className="w-full p-2 rounded focus:outline-none"
            />
          </div>
          <div className="flex items-center border rounded">
            <FaLock className="ml-2 text-gray-500" />
            <input
              type="password"
              name="password"
              value={settings.password}
              onChange={handleChange}
              placeholder="New Password"
              className="w-full p-2 rounded focus:outline-none"
            />
          </div>
        </div>

        {/* Appointment Settings */}
        <div className="bg-white p-6 rounded-2xl shadow-md border hover:shadow-lg transition">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MdEvent className="text-green-600" /> Appointment Settings
          </h3>
          <label className="block mb-3">
            Default Duration (minutes):
            <input
              type="number"
              name="default_appointment_duration"
              value={settings.default_appointment_duration}
              onChange={handleChange}
              className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-green-400"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="auto_generate_patient_id"
              checked={settings.auto_generate_patient_id}
              onChange={handleChange}
              className="h-4 w-4"
            />
            Auto-generate Patient IDs
          </label>
        </div>

        {/* Notifications */}
        <div className="bg-white p-6 rounded-2xl shadow-md border hover:shadow-lg transition">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MdOutlineNotificationsActive className="text-yellow-500" /> Notifications
          </h3>
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              name="notify_email"
              checked={settings.notify_email}
              onChange={handleChange}
              className="h-4 w-4"
            />
            Email Notifications
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="notify_sms"
              checked={settings.notify_sms}
              onChange={handleChange}
              className="h-4 w-4"
            />
            SMS Notifications
          </label>
        </div>

        {/* Display Settings */}
        <div className="bg-white p-6 rounded-2xl shadow-md border hover:shadow-lg transition">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BsPalette className="text-purple-600" /> Display Settings
          </h3>
          <label className="block mb-3">
            Theme:
            <select
              name="theme"
              value={settings.theme}
              onChange={handleChange}
              className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-purple-400"
            >
              <option value="light">🌞 Light</option>
              <option value="dark">🌙 Dark</option>
            </select>
          </label>
          <label className="block">
            Layout:
            <select
              name="layout_preference"
              value={settings.layout_preference}
              onChange={handleChange}
              className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-purple-400"
            >
              <option value="detailed">Detailed View</option>
              <option value="compact">Compact View</option>
            </select>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 text-center">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
        >
          <FaSave />
          {loading ? "Saving..." : "Save Changes"}
        </button>
        {message && <p className="mt-4 text-center text-sm">{message}</p>}
      </div>
    </div>
  );
};

export default Settings;
