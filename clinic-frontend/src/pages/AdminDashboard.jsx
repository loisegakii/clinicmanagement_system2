import React, { useEffect, useState } from "react";
import API from "../api/axios";
import toast, { Toaster } from "react-hot-toast";
import { FaUsers, FaUserMd, FaPills, FaVials, FaSignOutAlt } from "react-icons/fa";

const roles = ["ADMIN", "RECEPTIONIST", "NURSE", "DOCTOR", "PHARMACIST", "LAB"];
const doctorSpecializations = [
  "General Practitioner",
  "Pediatrician",
  "Surgeon",
  "Cardiologist",
  "Neurologist",
  "Dermatologist",
  "Orthopedic",
  "Psychiatrist",
  "ENT",
  "Ophthalmologist",
  "Gynecologist",
  "Urologist",
  "Endocrinologist",
];

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "RECEPTIONIST",
    specialization: "",
  });

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingRole, setEditingRole] = useState("");
  const [editingSpecialization, setEditingSpecialization] = useState("");

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await API.get("users/");
      const userList = res.data.results ? res.data.results : res.data;
      setUsers(userList);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to load users");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Input handling
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "role" && value !== "DOCTOR") updated.specialization = "";
      return updated;
    });
  };

  // Add User
  const handleAddUser = async (e) => {
    e.preventDefault();

    if (newUser.role === "DOCTOR" && !newUser.specialization) {
      toast.error("Specialization is required for doctors");
      return;
    }

    try {
      const res = await API.post("users/", newUser);
      toast.success(res.data.message || "User added successfully!");
      setUsers((prev) => [...prev, res.data.user || res.data]);
      setNewUser({ username: "", email: "", password: "", role: "RECEPTIONIST", specialization: "" });
    } catch (err) {
      console.error("Error adding user:", err);
      toast.error("Failed to add user");
    }
  };

  // Delete User
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await API.delete(`users/${userId}/`);
      toast.success("User deleted successfully!");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error("Error deleting user:", err);
      toast.error("Failed to delete user");
    }
  };

  // Edit User
  const startEditUser = (user) => {
    setEditingUserId(user.id);
    setEditingRole(user.role);
    setEditingSpecialization(user.role === "DOCTOR" ? user.specialization || "" : "");
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditingRole("");
    setEditingSpecialization("");
  };

  const saveEditUser = async () => {
    const payload = { role: editingRole };
    if (editingRole === "DOCTOR") {
      if (!editingSpecialization) {
        toast.error("Specialization is required for doctors");
        return;
      }
      payload.specialization = editingSpecialization;
    }

    try {
      const res = await API.patch(`users/${editingUserId}/`, payload);
      toast.success(res.data.message || "User updated successfully!");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUserId ? { ...u, role: res.data.user.role, specialization: res.data.user.specialization } : u
        )
      );
      cancelEdit();
    } catch (err) {
      console.error("Error updating user:", err);
      toast.error("Failed to update user");
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Filter users
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <aside className="w-64 bg-white/60 backdrop-blur-xl p-6 flex flex-col">
        <h2 className="text-2xl font-bold mb-8 text-blue-700"> AfyaCare Admin</h2>
        <nav className="space-y-4 text-gray-700">
          <a href="#users" className="flex items-center gap-2 hover:text-blue-600 transition">
            <FaUsers /> Users
          </a>
          <a href="#doctors" className="flex items-center gap-2 hover:text-blue-600 transition">
            <FaUserMd /> Doctors
          </a>
          <a href="#pharmacists" className="flex items-center gap-2 hover:text-blue-600 transition">
            <FaPills /> Pharmacists
          </a>
          <a href="#lab" className="flex items-center gap-2 hover:text-blue-600 transition">
            <FaVials /> Lab Technicians
          </a>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Top Nav */}
        <header className="flex justify-between items-center bg-white/50 backdrop-blur-lg px-6 py-4">
          <div className="text-xl font-bold text-gray-700">Administrator</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500/90 text-white px-4 py-2 rounded-full hover:bg-red-600 transition"
          >
            <FaSignOutAlt /> Logout
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto space-y-8">
          {/* Add User */}
          <section className="bg-white/70 backdrop-blur-lg p-6 rounded-2xl">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Add New User</h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleAddUser}>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={newUser.username}
                onChange={handleInputChange}
                required
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={newUser.email}
                onChange={handleInputChange}
                required
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={newUser.password}
                onChange={handleInputChange}
                required
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400"
              />
              <select
                name="role"
                value={newUser.role}
                onChange={handleInputChange}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {newUser.role === "DOCTOR" && (
                <select
                  name="specialization"
                  value={newUser.specialization}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Select Specialization</option>
                  {doctorSpecializations.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              )}
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
                >
                  Add User
                </button>
              </div>
            </form>
          </section>

          {/* Search */}
          <section>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-400"
            />
          </section>

          {/* Users Table */}
          <section id="users" className="bg-white/70 backdrop-blur-lg p-6 rounded-2xl">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">User List</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-gray-600">
                      <th className="p-3">Username</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Specialization</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/70 transition">
                        <td className="p-3">{user.username}</td>
                        <td className="p-3">{user.email}</td>
                        <td className="p-3">
                          {editingUserId === user.id ? (
                            <select
                              value={editingRole}
                              onChange={(e) => {
                                const value = e.target.value;
                                setEditingRole(value);
                                if (value !== "DOCTOR") setEditingSpecialization("");
                              }}
                              className="p-2 rounded border border-gray-300"
                            >
                              {roles.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="px-2 py-1 text-sm rounded bg-blue-100 text-blue-700">
                              {user.role}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {editingUserId === user.id && editingRole === "DOCTOR" ? (
                            <select
                              value={editingSpecialization}
                              onChange={(e) => setEditingSpecialization(e.target.value)}
                              className="p-2 rounded border border-gray-300"
                            >
                              <option value="">Select Specialization</option>
                              {doctorSpecializations.map((spec) => (
                                <option key={spec} value={spec}>
                                  {spec}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-700">
                              {user.role === "DOCTOR" ? user.specialization || "-" : "-"}
                            </span>
                          )}
                        </td>
                        <td className="p-3 space-x-2">
                          {editingUserId === user.id ? (
                            <>
                              <button
                                onClick={saveEditUser}
                                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditUser(user)}
                                className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-3 text-center text-gray-500">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
