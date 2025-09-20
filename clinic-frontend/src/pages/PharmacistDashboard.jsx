// src/pages/PharmacistDashboard.jsx
// Pharmacist Dashboard: Search patients and view prescribed medications

import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

function PharmacistDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  // ------------------------------
  // State Variables
  // ------------------------------
  const [patients, setPatients] = useState([]); // All patients
  const [filteredPatients, setFilteredPatients] = useState([]); // Patients matching search
  const [search, setSearch] = useState(""); // Search input
  const [selectedPatient, setSelectedPatient] = useState(null); // Selected patient with prescriptions

  // ------------------------------
  // Fetch all patients when page loads
  // ------------------------------
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/patients/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Ensure patients is always an array
        setPatients(Array.isArray(res.data) ? res.data : []);
        setFilteredPatients(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching patients:", err);
      }
    };
    fetchPatients();
  }, [token]);

  // ------------------------------
  // Filter patients based on search
  // ------------------------------
  useEffect(() => {
    setFilteredPatients(
      patients.filter((p) =>
        p.name?.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, patients]);

  // ------------------------------
  // Handle logout
  // ------------------------------
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // ------------------------------
  // Fetch full details of a patient (with prescriptions)
  // ------------------------------
  const fetchPatientDetails = async (id) => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/patients/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedPatient(res.data);
    } catch (err) {
      console.error("Error fetching patient details:", err);
    }
  };

  // ------------------------------
  // Mark prescription as dispensed
  // ------------------------------
  const markAsDispensed = async (prescriptionId) => {
    try {
      await axios.patch(
        `http://127.0.0.1:8000/api/prescriptions/${prescriptionId}/`,
        { status: "Dispensed" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update local state so UI reflects change
      setSelectedPatient((prev) => ({
        ...prev,
        prescriptions: prev.prescriptions.map((p) =>
          p.id === prescriptionId ? { ...p, status: "Dispensed" } : p
        ),
      }));

      alert("Prescription marked as dispensed.");
    } catch (err) {
      console.error("Error updating prescription:", err);
      alert("Failed to update prescription.");
    }
  };

  // ------------------------------
  // JSX Output
  // ------------------------------
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-purple-700 text-white flex flex-col">
        <div className="h-16 flex items-center justify-center font-bold text-xl border-b border-purple-500">
          ⚕ Pharmacist Panel
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button
            onClick={() => navigate("/pharmacist-dashboard")}
            className="w-full text-left px-3 py-2 rounded hover:bg-purple-600"
          >
            Dashboard
          </button>
        </nav>
        <div className="p-4 border-t border-purple-500">
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-6 overflow-y-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-700">
            Pharmacist Dashboard
          </h1>
          <div className="text-sm text-gray-600">
            Logged in as{" "}
            <span className="font-semibold">{user?.username}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search patients by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border rounded shadow-sm focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Layout: Patient list + Prescriptions */}
        <div className="flex flex-1 gap-6 overflow-hidden">
          {/* Patient List */}
          <div className="w-1/3 bg-white shadow rounded overflow-y-auto p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">
              Patient List
            </h2>
            {filteredPatients.length > 0 ? (
              <ul className="space-y-2">
                {filteredPatients.map((patient) => (
                  <li
                    key={patient.id}
                    onClick={() => fetchPatientDetails(patient.id)}
                    className="p-3 border rounded cursor-pointer hover:bg-purple-50 transition"
                  >
                    <p className="font-semibold text-gray-800">{patient.name}</p>
                    <p className="text-sm text-gray-500">
                      Age: {patient.age} | {patient.gender}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No patients found.</p>
            )}
          </div>

          {/* Patient Prescriptions */}
          <div className="flex-1 bg-white shadow rounded p-6 overflow-y-auto">
            {selectedPatient ? (
              <>
                <h2 className="text-xl font-bold text-gray-700 mb-4">
                  Prescriptions for {selectedPatient.name}
                </h2>

                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  {selectedPatient.prescriptions?.length > 0 ? (
                    selectedPatient.prescriptions.map((presc) => (
                      <li
                        key={presc.id}
                        className="flex justify-between items-center"
                      >
                        <span>
                          <strong>{presc.medicine}</strong> – {presc.dosage} (
                          <span className="italic">
                            {presc.status || "Pending"}
                          </span>
                          )
                        </span>
                        {presc.status !== "Dispensed" && (
                          <button
                            onClick={() => markAsDispensed(presc.id)}
                            className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                          >
                            Mark Dispensed
                          </button>
                        )}
                      </li>
                    ))
                  ) : (
                    <li>No prescriptions available.</li>
                  )}
                </ul>
              </>
            ) : (
              <p className="text-gray-500">Select a patient to view prescriptions.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default PharmacistDashboard;
