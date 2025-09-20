import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function Signup() {
  const navigate = useNavigate();

  // --------------------------------------------------------
  // Local state to store form inputs (username, email, etc.)
  // --------------------------------------------------------
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "PATIENT", // Default role → Only patients should self-register
  });

  // Handle input changes dynamically
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // --------------------------------------------------------
  // Submit form:
  // - Send data to backend (POST /users/ or custom /signup/)
  // - On success → navigate to login page
  // --------------------------------------------------------
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post("users/", form); // Might change if we create `/signup/` endpoint
      alert("Account created! Please login.");
      navigate("/login");
    } catch (err) {
      alert(
        "Signup failed: " +
          (err.response?.data?.detail || JSON.stringify(err.response?.data))
      );
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-green-100 to-blue-100">
      {/* Signup card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md"
      >
        {/* Heading */}
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Create an Account
        </h2>

        {/* Username */}
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Username
        </label>
        <input
          type="text"
          name="username"
          placeholder="Enter username"
          value={form.username}
          onChange={handleChange}
          className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        {/* Email */}
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          name="email"
          placeholder="Enter email"
          value={form.email}
          onChange={handleChange}
          className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        {/* Password */}
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          type="password"
          name="password"
          placeholder="Enter password"
          value={form.password}
          onChange={handleChange}
          className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        {/* Role selector (only show PATIENT in open signup) */}
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Role
        </label>
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          className="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <option value="PATIENT">Patient</option>
          {/* 👇 Keep staff roles admin-only, so hide them here */}
        </select>

        {/* Submit button */}
        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors"
        >
          Sign Up
        </button>

        {/* Link to login */}
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-green-600 font-medium hover:underline"
          >
            Login
          </a>
        </p>
      </form>
    </div>
  );
}
