import React, { useEffect, useState } from "react";
import API from "../api/axios";
import toast, { Toaster } from "react-hot-toast";
import { 
  FaUsers, 
  FaUserMd, 
  FaPills, 
  FaVials, 
  FaSignOutAlt, 
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaUserPlus,
  FaChartLine,
  FaBell,
  FaEye,
  FaFilter
} from "react-icons/fa";

const roles = ["ADMIN", "RECEPTIONIST", "NURSE", "DOCTOR", "PHARMACIST", "LAB"];
const doctorSpecializations = [
  "General Practitioner", 
  "Neurosurgeon", "Pediatrician", 
  "Cardiologist", 
  "Dermatologist", 
  "Other"
  ];

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterRole, setFilterRole] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "RECEPTIONIST",
    specialization: "",
    first_name: "",
    last_name: "",
  });

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingRole, setEditingRole] = useState("");
  const [editingSpecialization, setEditingSpecialization] = useState("");

  // Fetch users with proper authentication
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get token from localStorage
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error("Authentication token missing. Please login again.");
        handleLogout();
        return;
      }

      // Make API call with authentication header
      const res = await API.get("users/", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const userList = res.data.results ? res.data.results : res.data;
      setUsers(userList);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching users:", err);
      
      if (err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        handleLogout();
      } else {
        toast.error("Failed to load users");
      }
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


    // Build payload correctly
const payload = {
  username: newUser.username,
  email: newUser.email,
  password: newUser.password,
  first_name: newUser.first_name,
  last_name: newUser.last_name,
  role: newUser.role,  // keep uppercase
  ...(newUser.role === "DOCTOR" && { specialization: newUser.specialization }),
};

    try {
      const token = localStorage.getItem('access_token');
      const res = await API.post("users/", payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      toast.success(res.data.message || "User added successfully!");
      setUsers((prev) => [...prev, res.data.user || res.data]);

      // Reset form
      setNewUser({
        username: "",
        email: "",
        password: "",
        role: "RECEPTIONIST",
        specialization: "",
        first_name: "",
        last_name: "",
      });
      setShowAddForm(false);
    } catch (err) {
      console.error("Error adding user:", err.response ? err.response.data : err.message);
      toast.error(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to add user"
      );
    }
  };

  // Delete User
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const token = localStorage.getItem('access_token');
      await API.delete(`users/${userId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
      const token = localStorage.getItem('access_token');
      const res = await API.patch(`users/${editingUserId}/`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      toast.success(res.data.message || "User updated successfully!");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUserId ? { 
            ...u, 
            role: res.data.user.role, 
            specialization: res.data.user.specialization 
          } : u
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
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === "" || u.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  // Stats calculations
  const totalUsers = users.length;
  const doctorCount = users.filter(u => u.role === "DOCTOR").length;
  const nurseCount = users.filter(u => u.role === "NURSE").length;
  const activeUsers = users.filter(u => u.is_active).length;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <aside className="w-72 bg-white/80 backdrop-blur-xl shadow-2xl border-r border-indigo-100">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <FaUserMd className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">AfyaCare</h2>
              <p className="text-sm text-gray-500">Admin Panel</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="space-y-4 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Users</p>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                </div>
                <FaUsers className="text-blue-200 text-2xl" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Doctors</p>
                  <p className="text-2xl font-bold">{doctorCount}</p>
                </div>
                <FaUserMd className="text-green-200 text-2xl" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Active</p>
                  <p className="text-2xl font-bold">{activeUsers}</p>
                </div>
                <FaBell className="text-purple-200 text-2xl" />
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <a href="#users" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-100 text-indigo-700 font-medium transition-all hover:bg-indigo-200">
              <FaUsers /> Users
            </a>
            <a href="#doctors" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition-all">
              <FaUserMd /> Doctors
            </a>
            <a href="#analytics" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition-all">
              <FaChartLine /> Analytics
            </a>
            <a href="#settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition-all">
              <FaVials /> Settings
            </a>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <header className="bg-white/70 backdrop-blur-lg shadow-sm border-b border-gray-200">
          <div className="flex justify-between items-center px-8 py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
              <p className="text-gray-500">Manage system users and permissions</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                <FaUserPlus /> Add User
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
              >
                <FaSignOutAlt /> Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-auto">
          {/* Add User Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800">Add New User</h3>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="first_name"
                      placeholder="First Name"
                      value={newUser.first_name}
                      onChange={handleInputChange}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      name="last_name"
                      placeholder="Last Name"
                      value={newUser.last_name}
                      onChange={handleInputChange}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      name="username"
                      placeholder="Username"
                      value={newUser.username}
                      onChange={handleInputChange}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={newUser.email}
                      onChange={handleInputChange}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <input
                      type="password"
                      name="password"
                      placeholder="Password"
                      value={newUser.password}
                      onChange={handleInputChange}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <select
                      name="role"
                      value={newUser.role}
                      onChange={handleInputChange}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  
                  {newUser.role === "DOCTOR" && (
                    <select
                      name="specialization"
                      value={newUser.specialization}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select Specialization</option>
                      {doctorSpecializations.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  )}

                  
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleAddUser}
                      className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-3 rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all font-medium"
                    >
                      Add User
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-all font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="bg-white/70 backdrop-blur-lg p-6 rounded-2xl shadow-lg mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, username, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              <div className="relative">
                <FaFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="pl-12 pr-8 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white min-w-[150px]"
                >
                  <option value="">All Roles</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                User Directory ({filteredUsers.length} users)
              </h2>
            </div>
            
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">User</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Contact</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Role</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Specialization</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <tr key={user.id} className={`border-t border-gray-100 hover:bg-indigo-50/30 transition-all ${index % 2 === 0 ? 'bg-white/20' : 'bg-gray-50/20'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {user.first_name?.charAt(0) || user.username?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">
                                {user.first_name && user.last_name 
                                  ? `${user.first_name} ${user.last_name}` 
                                  : user.username}
                              </p>
                              <p className="text-sm text-gray-500">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-800">{user.email}</p>
                          <p className="text-sm text-gray-500">
                            Joined{" "}
                            {user.date_joined
                                  ? new Date(user.date_joined).toLocaleDateString()
                                  : "N/A"}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {editingUserId === user.id ? (
                            <select
                              value={editingRole}
                              onChange={(e) => {
                                const value = e.target.value;
                                setEditingRole(value);
                                if (value !== "DOCTOR") setEditingSpecialization("");
                              }}
                              className="p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                            >
                              {roles.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                              user.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                              user.role === 'DOCTOR' ? 'bg-blue-100 text-blue-700' :
                              user.role === 'NURSE' ? 'bg-green-100 text-green-700' :
                              user.role === 'RECEPTIONIST' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {user.role}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingUserId === user.id && editingRole === "DOCTOR" ? (
                            <select
                              value={editingSpecialization}
                              onChange={(e) => setEditingSpecialization(e.target.value)}
                              className="p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">Select Specialization</option>
                              {doctorSpecializations.map((spec) => (
                                <option key={spec} value={spec}>{spec}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-gray-600">
                              {user.role === "DOCTOR" ? user.specialization || "-" : "-"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                            user.is_active 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {editingUserId === user.id ? (
                              <>
                                <button
                                  onClick={saveEditUser}
                                  className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                                  title="Save"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="p-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-all"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditUser(user)}
                                  className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all"
                                  title="Edit"
                                >
                                  <FaEdit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                                  title="Delete"
                                >
                                  <FaTrash className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                          <FaUsers className="mx-auto text-4xl text-gray-300 mb-4" />
                          <p className="text-lg font-medium">No users found</p>
                          <p className="text-sm">Try adjusting your search or filter criteria</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )};

  export default AdminDashboard;