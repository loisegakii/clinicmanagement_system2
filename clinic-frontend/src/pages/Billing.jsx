// src/pages/Billing.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Download,
  CheckCircle,
  PlusCircle,
  Search,
  Filter,
} from "lucide-react";

// ✅ Toastify
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [newInvoice, setNewInvoice] = useState({
    patient: "",
    doctor: "",
    appointment: "",
    amount: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Fetch invoices
  const fetchInvoices = async () => {
    try {
      const res = await API.get("/billing/invoices/");
      setInvoices(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error("❌ Failed to fetch invoices:", err.response?.data || err.message);
      setError("Failed to load invoices.");
      toast.error("❌ Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  // Fetch dropdown data
  const fetchDropdownData = async () => {
    try {
      const [pRes, dRes, aRes] = await Promise.all([
        API.get("/patients/"),
        API.get("/doctors/"),
        API.get("/appointments/"),
      ]);

      setPatients(Array.isArray(pRes.data) ? pRes.data : pRes.data.results || []);
      setDoctors(Array.isArray(dRes.data) ? dRes.data : dRes.data.results || []);
      setAppointments(Array.isArray(aRes.data) ? aRes.data : aRes.data.results || []);
    } catch (err) {
      console.error("❌ Failed to fetch dropdown data:", err.response?.data || err.message);
      toast.error("❌ Failed to load dropdown data");
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchDropdownData();
  }, []);

  // Mark invoice as paid
  const handleMarkPaid = async (id) => {
    try {
      await API.post(`/billing/invoices/${id}/mark_as_paid/`);
      toast.success("✅ Invoice marked as paid!");
      fetchInvoices();
    } catch (err) {
      console.error("❌ Error marking invoice as paid:", err.response?.data || err.message);
      toast.error("❌ Failed to update invoice");
    }
  };

  // Download invoice PDF
  const handleDownload = async (id) => {
    try {
      const res = await API.get(`/billing/invoices/${id}/download/`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.info("⬇️ Invoice downloaded");
    } catch (err) {
      console.error("❌ Error downloading invoice:", err.response?.data || err.message);
      toast.error("❌ Failed to download invoice");
    }
  };

  // Create new invoice
  // Create new invoice
const handleCreateInvoice = async (e) => {
  e.preventDefault();

  // Prepare payload: remove empty doctor/appointment
  const payload = { ...newInvoice };
  if (!payload.doctor) delete payload.doctor;
  if (!payload.appointment) delete payload.appointment;

  try {
    await API.post("/billing/invoices/", payload);
    toast.success("✅ Invoice created successfully!");
    setNewInvoice({
      patient: "",
      doctor: "",
      appointment: "",
      amount: "",
      description: "",
    });
    fetchInvoices();
  } catch (err) {
    console.error("❌ Error creating invoice:", err.response?.data || err.message);
    toast.error("❌ Failed to create invoice");
  }
};

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      (inv.doctor_name?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ? true : inv.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <p className="text-center py-6">Loading invoices...</p>;
  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-green-900 text-white flex flex-col p-6">
        <h2 className="text-2xl font-bold mb-10 text-red-500">AfyaCare</h2>
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
                className="flex items-center space-x-2 text-red-400"
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

      {/* Main Section */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="bg-green-950 shadow px-6 py-4 flex justify-between items-center">
          <motion.div
            className="text-xl font-semibold text-red-500"
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Billing — Manage Invoices
          </motion.div>
        </header>

        {/* Content */}
        <main className="p-6 overflow-y-auto space-y-6">
          {/* Create Invoice Form */}
          <div className="bg-green-950 shadow-lg rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-green-300 flex items-center space-x-2">
              <PlusCircle size={20} /> <span>Create New Invoice</span>
            </h2>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              {/* Patient */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Patient</label>
                <select
                  className="w-full bg-green-800 text-white p-2 rounded"
                  value={newInvoice.patient}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, patient: e.target.value })
                  }
                  required
                >
                  <option value="">-- Select Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Doctor (Optional)</label>
                <select
                  className="w-full bg-green-800 text-white p-2 rounded"
                  value={newInvoice.doctor}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, doctor: e.target.value })
                  }
                >
                  <option value="">-- Select Doctor --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.first_name} {d.last_name} ({d.specialty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Appointment */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Appointment (Optional)</label>
                <select
                  className="w-full bg-green-800 text-white p-2 rounded"
                  value={newInvoice.appointment}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, appointment: e.target.value })
                  }
                >
                  <option value="">-- Select Appointment --</option>
                  {appointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.date} - {a.patient_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Amount</label>
                <input
                  type="number"
                  className="w-full bg-green-800 text-white p-2 rounded"
                  value={newInvoice.amount}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, amount: e.target.value })
                  }
                  required
                  min="0"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Description</label>
                <textarea
                  className="w-full bg-green-800 text-white p-2 rounded"
                  value={newInvoice.description}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, description: e.target.value })
                  }
                ></textarea>
              </div>

              <button
                type="submit"
                className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
              >
                Create Invoice
              </button>
            </form>
          </div>

          {/* Search & Filter */}
          <div className="flex space-x-4 items-center">
            <div className="flex items-center space-x-2">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by patient or doctor..."
                className="bg-green-800 text-white p-2 rounded w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter size={18} />
              <select
                className="bg-green-800 text-white p-2 rounded"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>

          {/* Invoice Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-green-900 text-green-300">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Patient</th>
                  <th className="px-4 py-2">Doctor</th>
                  <th className="px-4 py-2">Appointment</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv, index) => (
                  <tr
                    key={inv.id}
                    className={index % 2 === 0 ? "bg-green-950" : "bg-green-900"}
                  >
                    <td className="px-4 py-2">{index + 1}</td>
                    <td className="px-4 py-2">{inv.patient_name}</td>
                    <td className="px-4 py-2">{inv.doctor_name || "-"}</td>
                    <td className="px-4 py-2">{inv.appointment_date || "-"}</td>
                    <td className="px-4 py-2">${inv.amount}</td>
                    <td className="px-4 py-2 capitalize">{inv.status}</td>
                    <td className="px-4 py-2 space-x-2">
                      {inv.status === "unpaid" && (
                        <button
                          onClick={() => handleMarkPaid(inv.id)}
                          className="bg-green-600 px-2 py-1 rounded hover:bg-green-700"
                        >
                          <CheckCircle size={16} /> Mark Paid
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(inv.id)}
                        className="bg-blue-600 px-2 py-1 rounded hover:bg-blue-700"
                      >
                        <Download size={16} /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center p-4">
                      No invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Billing;
