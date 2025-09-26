import React, { useEffect, useState, useRef } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* -------------------- HELPER -------------------- */
// Safely normalize API responses
const normalize = (data) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.results)) {
    return data.results;
  }
  return [];
};

// Calculate age from date of birth
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/* -------------------- PATIENTS PAGE -------------------- */
const PatientsPage = ({
  patients = [],
  appointments = [],
  patientSearch,
  setPatientSearch,
  openPatientModal,
  completedActions,
  openActionModal,
}) => {
  // Helper function to get the latest appointment status for a patient
  const getPatientAppointmentStatus = (patientId) => {
    console.log("Looking for appointments for patient ID:", patientId);
    console.log("Available appointments:", appointments);
    
    // Try multiple ways to match patient ID
    const patientAppointments = appointments.filter(apt => {
      const matchesDirectId = apt.patient === patientId;
      const matchesNestedId = apt.patient?.id === patientId;
      const matchesPatientId = apt.patient_id === patientId;
      
      console.log(`Appointment ${apt.id}: patient=${apt.patient}, patient.id=${apt.patient?.id}, patient_id=${apt.patient_id}, matches=${matchesDirectId || matchesNestedId || matchesPatientId}`);
      
      return matchesDirectId || matchesNestedId || matchesPatientId;
    });
    
    console.log("Found appointments for patient:", patientAppointments);
    
    if (patientAppointments.length === 0) {
      return { status: "No Appointment", color: "text-gray-500", doctor: null };
    }

    // Get the most recent appointment
    const latestAppointment = patientAppointments.sort((a, b) => {
      const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
      const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
      return dateB - dateA;
    })[0];

    console.log("Latest appointment:", latestAppointment);

    const statusConfig = {
      "REQUESTED": { status: "Pending", color: "text-yellow-600" },
      "PENDING": { status: "Pending", color: "text-yellow-600" },
      "ACCEPTED": { status: "Approved", color: "text-green-600" },
      "APPROVED": { status: "Approved", color: "text-green-600" },
      "DECLINED": { status: "Declined", color: "text-red-600" },
      "CANCELLED": { status: "Cancelled", color: "text-red-500" },
      "COMPLETED": { status: "Completed", color: "text-blue-600" },
      "DONE": { status: "Completed", color: "text-blue-600" }
    };

    const appointmentStatus = latestAppointment.status?.toUpperCase() || "UNKNOWN";
    const config = statusConfig[appointmentStatus] || 
                  { status: latestAppointment.status || "Unknown", color: "text-gray-600" };

    return {
      ...config,
      doctor: latestAppointment.doctor_name || "Unknown Doctor",
      appointment: latestAppointment
    };
  };

  // Filter patients based on search input
  const filteredPatients = (patients || []).filter((p) => {
    const fullName = p.full_name || p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim();
    const searchTerm = patientSearch.toLowerCase();
    return fullName.toLowerCase().includes(searchTerm) || 
           (p.username && p.username.toLowerCase().includes(searchTerm));
  });

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3 text-gray-800">Patients</h2>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search patients..."
        value={patientSearch}
        onChange={(e) => setPatientSearch(e.target.value)}
        className="w-full mb-3 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Patients Table */}
      <table className="w-full bg-white shadow-lg rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-blue-100 text-left">
            <th className="p-3">Name</th>
            <th className="p-3">Age</th>
            <th className="p-3">Status</th>
            <th className="p-3">Appointment Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredPatients.map((p, i) => (
            <tr
              key={p.id || i}
              className={`${i % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition`}
            >
              {/* Name */}
              <td className="p-3">
                {p.full_name || p.name || (p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.username || "Unknown")}
              </td>

              {/* Age */}
              <td className="p-3">{p.age || (p.date_of_birth ? calculateAge(p.date_of_birth) : "—")}</td>

              {/* Status */}
              <td className="p-3">{p.status || "Pending"}</td>

              {/* Appointment Status */}
              <td className="p-3">
                {(() => {
                  const appointmentInfo = getPatientAppointmentStatus(p.id);
                  return (
                    <div className="text-sm">
                      <span className={`font-medium ${appointmentInfo.color}`}>
                        {appointmentInfo.status}
                      </span>
                      {appointmentInfo.doctor && appointmentInfo.status !== "No Appointment" && (
                        <div className="text-xs text-gray-500 mt-1">
                          Dr. {appointmentInfo.doctor}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </td>

              {/* Actions */}
              <td className="p-3 space-x-2">
                {/* View button */}
                {!completedActions[p.id]?.View && (
                  <button
                    onClick={() => openActionModal(p, "View")}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
                  >
                    View
                  </button>
                )}

                {/* Admit button */}
                {!completedActions[p.id]?.Admit && (
                  <button
                    onClick={() => openActionModal(p, "Admit")}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                  >
                    Admit
                  </button>
                )}

                {/* Attend button */}
                {!completedActions[p.id]?.Attend && (
                  <button
                    onClick={() => openActionModal(p, "Attend")}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                  >
                    Attend
                  </button>
                )}

                {/* Discharge button */}
                {!completedActions[p.id]?.Discharge && (
                  <button
                    onClick={() => openActionModal(p, "Discharge")}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                  >
                    Discharge
                  </button>
                )}
              </td>
            </tr>
          ))}

          {/* No patients found */}
          {filteredPatients.length === 0 && (
            <tr>
              <td colSpan={5} className="p-3 text-center text-gray-500">
                No patients found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
};

/* -------------------- TASKS PAGE -------------------- */
const TasksPage = ({ tasks = [], newTask, setNewTask, handleAddTask, taskSearch, setTaskSearch, handleCompleteTask }) => {
  const filteredTasks = (tasks || []).filter((t) =>
    t.description?.toLowerCase().includes(taskSearch.toLowerCase())
  );

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3 text-gray-800">Tasks</h2>

      <div className="flex mb-4">
        <input
          type="text"
          placeholder="New task..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          className="flex-1 p-3 border rounded-l-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAddTask}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-r-lg shadow transition"
        >
          Add
        </button>
      </div>

      <input
        type="text"
        placeholder="Search tasks..."
        value={taskSearch}
        onChange={(e) => setTaskSearch(e.target.value)}
        className="w-full mb-3 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <table className="w-full bg-white shadow-lg rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-blue-100 text-left">
            <th className="p-3">Description</th>
            <th className="p-3">Status</th>
            <th className="p-3">Created</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredTasks.map((t, i) => (
            <tr key={t.id || i} className={`${i % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50`}>
              <td className="p-3">{t.description}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs ${t.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {t.completed ? 'Completed' : 'Pending'}
                </span>
              </td>
              <td className="p-3">{new Date(t.created_at).toLocaleDateString()}</td>
              <td className="p-3">
                {!t.completed && (
                  <button
                    onClick={() => handleCompleteTask(t.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                  >
                    Complete
                  </button>
                )}
              </td>
            </tr>
          ))}
          {filteredTasks.length === 0 && (
            <tr>
              <td colSpan={4} className="p-3 text-center text-gray-500">
                No tasks found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
};

/* -------------------- MEDICATIONS PAGE -------------------- */
const MedicationsPage = ({ medications = [], medicationSearch, setMedicationSearch }) => {
  const filteredMedications = (medications || []).filter((m) =>
    m.name?.toLowerCase().includes(medicationSearch.toLowerCase())
  );

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3 text-gray-800">Medications</h2>
      <input
        type="text"
        placeholder="Search medications..."
        value={medicationSearch}
        onChange={(e) => setMedicationSearch(e.target.value)}
        className="w-full mb-3 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <table className="w-full bg-white shadow-lg rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-blue-100 text-left">
            <th className="p-3">Patient</th>
            <th className="p-3">Medication</th>
            <th className="p-3">Dosage</th>
            <th className="p-3">Scheduled Time</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredMedications.map((m, i) => (
            <tr key={m.id || i} className={`${i % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50`}>
              <td className="p-3">{m.patient_name || "Unknown Patient"}</td>
              <td className="p-3">{m.name}</td>
              <td className="p-3">{m.dosage}</td>
              <td className="p-3">{new Date(m.scheduled_time).toLocaleString()}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs ${m.administered ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {m.administered ? 'Administered' : 'Pending'}
                </span>
              </td>
            </tr>
          ))}
          {filteredMedications.length === 0 && (
            <tr>
              <td colSpan={5} className="p-3 text-center text-gray-500">
                No medications found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
};

/* -------------------- PRESCRIBED MEDICATIONS PAGE -------------------- */
const PrescribedMedicationsPage = ({ prescribedMeds = [] }) => (
  <section>
    <h2 className="text-xl font-semibold mb-3 text-gray-800">Prescribed Medications</h2>
    <table className="w-full bg-white shadow-lg rounded-lg overflow-hidden">
      <thead>
        <tr className="bg-blue-100 text-left">
          <th className="p-3">Patient</th>
          <th className="p-3">Medication</th>
          <th className="p-3">Dosage</th>
          <th className="p-3">Prescribed By</th>
        </tr>
      </thead>
      <tbody>
        {(prescribedMeds || []).map((m, i) => (
          <tr key={m.id || i} className={`${i % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50`}>
            <td className="p-3">{m.patient_name}</td>
            <td className="p-3">{m.medication_name}</td>
            <td className="p-3">{m.dosage}</td>
            <td className="p-3">{m.doctor_name}</td>
          </tr>
        ))}
        {(prescribedMeds || []).length === 0 && (
          <tr>
            <td colSpan={4} className="p-3 text-center text-gray-500">
              No prescribed medications found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </section>
);

/* -------------------- LAB RESULTS PAGE -------------------- */
const LabResultsPage = ({ labResults = [] }) => (
  <section>
    <h2 className="text-xl font-semibold mb-3 text-gray-800">Lab Results</h2>
    <table className="w-full bg-white shadow-lg rounded-lg overflow-hidden">
      <thead>
        <tr className="bg-blue-100 text-left">
          <th className="p-3">Patient</th>
          <th className="p-3">Test</th>
          <th className="p-3">Result</th>
          <th className="p-3">Date</th>
        </tr>
      </thead>
      <tbody>
        {(labResults || []).map((r, i) => (
          <tr key={r.id || i} className={`${i % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50`}>
            <td className="p-3">{r.patient_name || "Unknown Patient"}</td>
            <td className="p-3">{r.test_name}</td>
            <td className="p-3">{r.result}</td>
            <td className="p-3">{new Date(r.created_at || r.date).toLocaleDateString()}</td>
          </tr>
        ))}
        {(labResults || []).length === 0 && (
          <tr>
            <td colSpan={4} className="p-3 text-center text-gray-500">
              No lab results found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </section>
);

/* -------------------- HANDOVER PAGE -------------------- */
const HandoverPage = ({ handoverLogs = [], newHandover, setNewHandover, handleAddHandover }) => (
  <section>
    <h2 className="text-xl font-semibold mb-3 text-gray-800">Handover Logs</h2>
    
    <div className="mb-4">
      <div className="flex gap-2">
        <textarea
          placeholder="Enter handover note..."
          value={newHandover}
          onChange={(e) => setNewHandover(e.target.value)}
          className="flex-1 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        <button
          onClick={handleAddHandover}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg shadow transition self-start"
        >
          Add Note
        </button>
      </div>
    </div>

    <ul className="space-y-3">
      {(handoverLogs || []).map((log) => (
        <li key={log.id} className="p-4 border rounded-lg bg-white shadow-sm">
          <div className="flex justify-between items-start">
            <p className="flex-1">{log.note}</p>
            <div className="text-xs text-gray-500 ml-4">
              {new Date(log.created_at).toLocaleString()}
            </div>
          </div>
          {log.nurse_name && (
            <div className="text-xs text-gray-600 mt-2">
              By: {log.nurse_name}
            </div>
          )}
        </li>
      ))}
      {(handoverLogs || []).length === 0 && (
        <li className="p-4 border rounded-lg bg-white shadow-sm text-gray-500 text-center">
          No handover logs found.
        </li>
      )}
    </ul>
  </section>
);

/* -------------------- PATIENT MODAL -------------------- */
const PatientModal = ({ patient, onClose, labResults = [], prescribedMeds = [], appointments = [] }) => {
  if (!patient) return null;

  const patientLabResults = (labResults || []).filter((r) => r.patient_id === patient.id || r.patient === patient.id);
  const patientPrescribedMeds = (prescribedMeds || []).filter((m) => m.patient_id === patient.id || m.patient === patient.id);
  
  // Get appointment info for this specific patient
  const getPatientAppointmentInfo = () => {
    const patientAppointments = appointments.filter(apt => {
      return apt.patient === patient.id || apt.patient?.id === patient.id || apt.patient_id === patient.id;
    });
    
    if (patientAppointments.length === 0) {
      return { status: "No Appointment", color: "text-gray-500", doctor: null };
    }

    const latestAppointment = patientAppointments.sort((a, b) => {
      const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
      const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
      return dateB - dateA;
    })[0];

    const statusConfig = {
      "REQUESTED": { status: "Pending", color: "text-yellow-600" },
      "PENDING": { status: "Pending", color: "text-yellow-600" },
      "ACCEPTED": { status: "Approved", color: "text-green-600" },
      "APPROVED": { status: "Approved", color: "text-green-600" },
      "DECLINED": { status: "Declined", color: "text-red-600" },
      "CANCELLED": { status: "Cancelled", color: "text-red-500" },
      "COMPLETED": { status: "Completed", color: "text-blue-600" },
      "DONE": { status: "Completed", color: "text-blue-600" }
    };

    const appointmentStatus = latestAppointment.status?.toUpperCase() || "UNKNOWN";
    const config = statusConfig[appointmentStatus] || 
                  { status: latestAppointment.status || "Unknown", color: "text-gray-600" };

    return {
      ...config,
      doctor: latestAppointment.doctor_name || "Unknown Doctor",
      appointment: latestAppointment
    };
  };

  const appointmentInfo = getPatientAppointmentInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-20 z-50">
      <div className="bg-white w-11/12 md:w-3/4 lg:w-1/2 rounded-lg shadow-lg p-6 relative overflow-y-auto max-h-[80vh]">
        <button onClick={onClose} className="absolute top-2 right-2 text-red-600 text-lg font-bold">✖</button>
        
        <h2 className="text-2xl font-bold mb-4">
          {patient.full_name || patient.name || (patient.first_name && patient.last_name ? `${patient.first_name} ${patient.last_name}` : patient.username || "Unknown Patient")}
        </h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <p><strong>Age:</strong> {patient.age || (patient.date_of_birth ? calculateAge(patient.date_of_birth) : "—")}</p>
          <p><strong>Status:</strong> {patient.status || "Pending"}</p>
          {patient.gender && <p><strong>Gender:</strong> {patient.gender}</p>}
          {patient.phone && <p><strong>Phone:</strong> {patient.phone}</p>}
        </div>

        {/* Vitals Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold mb-2 text-blue-800">Current Vitals</h3>
          <div className="grid grid-cols-2 gap-4">
            <p><strong>Temperature:</strong> {patient.temperature ? `${patient.temperature}°C` : "Not recorded"}</p>
            <p><strong>Blood Pressure:</strong> {patient.blood_pressure || "Not recorded"}</p>
            <p><strong>Heart Rate:</strong> {patient.heart_rate ? `${patient.heart_rate} bpm` : "Not recorded"}</p>
            <p><strong>Respiratory Rate:</strong> {patient.respiratory_rate ? `${patient.respiratory_rate}/min` : "Not recorded"}</p>
          </div>
        </div>

        {/* Appointment Information */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold mb-2 text-green-800">Latest Appointment</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Status:</strong> <span className={`${appointmentInfo.color} font-medium`}>{appointmentInfo.status}</span></p>
              {appointmentInfo.doctor && appointmentInfo.status !== "No Appointment" && (
                <p><strong>Doctor:</strong> Dr. {appointmentInfo.doctor}</p>
              )}
            </div>
            {appointmentInfo.appointment && (
              <div>
                <p><strong>Date:</strong> {appointmentInfo.appointment.date}</p>
                <p><strong>Time:</strong> {appointmentInfo.appointment.time}</p>
                {appointmentInfo.appointment.notes && (
                  <p><strong>Notes:</strong> {appointmentInfo.appointment.notes}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <h3 className="text-xl font-semibold mt-6 mb-2">Lab Results</h3>
        {patientLabResults.length ? (
          <table className="w-full bg-white shadow rounded mb-4">
            <thead>
              <tr className="bg-blue-100 text-left">
                <th className="p-2">Test</th>
                <th className="p-2">Result</th>
                <th className="p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {patientLabResults.map((r) => (
                <tr key={r.id} className="hover:bg-blue-50">
                  <td className="p-2">{r.test_name}</td>
                  <td className="p-2">{r.result}</td>
                  <td className="p-2">{new Date(r.created_at || r.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p>No lab results.</p>}

        <h3 className="text-xl font-semibold mt-6 mb-2">Prescribed Medications</h3>
        {patientPrescribedMeds.length ? (
          <table className="w-full bg-white shadow rounded">
            <thead>
              <tr className="bg-blue-100 text-left">
                <th className="p-2">Medication</th>
                <th className="p-2">Dosage</th>
                <th className="p-2">Prescribed By</th>
              </tr>
            </thead>
            <tbody>
              {patientPrescribedMeds.map((m) => (
                <tr key={m.id} className="hover:bg-blue-50">
                  <td className="p-2">{m.medication_name}</td>
                  <td className="p-2">{m.dosage}</td>
                  <td className="p-2">{m.doctor_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p>No prescribed medications.</p>}
      </div>
    </div>
  );
};

/* -------------------- ACTION MODAL -------------------- */
const ActionModal = ({ actionModal, onClose, onSave, appointments = [] }) => {
  const { open, patient, type } = actionModal;
  const [formData, setFormData] = useState({
    notes: "",
    details: "",
    temperature: "",
    blood_pressure: "",
    heart_rate: "",
    respiratory_rate: "",
    ward_room: "",
    admission_type: "Regular",
    signs_symptoms: "",
    discharge_destination: "Home",
    discharge_summary: "",
    medications_on_discharge: "",
    follow_up_instructions: ""
  });

  useEffect(() => {
    if (open && patient && type !== "View") {
      setFormData({
        notes: "",
        details: "",
        temperature: patient.temperature || "",
        blood_pressure: patient.blood_pressure || "",
        heart_rate: patient.heart_rate || "",
        respiratory_rate: patient.respiratory_rate || "",
        ward_room: "",
        admission_type: "Regular",
        signs_symptoms: "",
        discharge_destination: "Home",
        discharge_summary: "",
        medications_on_discharge: "",
        follow_up_instructions: ""
      });
    }
  }, [open, patient, type]);

  if (!open || !patient) return null;

  // For View action, show patient information directly
  if (type === "View") {
    // Get appointment info for this patient
    const getAppointmentInfo = () => {
      const patientAppointments = appointments.filter(apt => {
        return apt.patient === patient.id || apt.patient?.id === patient.id || apt.patient_id === patient.id;
      });
      
      if (patientAppointments.length === 0) {
        return { status: "No Appointment", color: "text-gray-500", doctor: null };
      }

      const latestAppointment = patientAppointments.sort((a, b) => {
        const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
        const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
        return dateB - dateA;
      })[0];

      const statusConfig = {
        "REQUESTED": { status: "Pending", color: "text-yellow-600" },
        "PENDING": { status: "Pending", color: "text-yellow-600" },
        "ACCEPTED": { status: "Approved", color: "text-green-600" },
        "APPROVED": { status: "Approved", color: "text-green-600" },
        "DECLINED": { status: "Declined", color: "text-red-600" },
        "CANCELLED": { status: "Cancelled", color: "text-red-500" },
        "COMPLETED": { status: "Completed", color: "text-blue-600" },
        "DONE": { status: "Completed", color: "text-blue-600" }
      };

      const appointmentStatus = latestAppointment.status?.toUpperCase() || "UNKNOWN";
      const config = statusConfig[appointmentStatus] || 
                    { status: latestAppointment.status || "Unknown", color: "text-gray-600" };

      return {
        ...config,
        doctor: latestAppointment.doctor_name || "Unknown Doctor",
        appointment: latestAppointment
      };
    };

    const appointmentInfo = getAppointmentInfo();

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-20 z-50">
        <div className="bg-white w-11/12 md:w-2/3 lg:w-1/2 rounded-lg shadow-lg p-6 relative max-h-[80vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-red-600 text-lg font-bold"
          >
            ✖
          </button>

          <h2 className="text-2xl font-bold mb-4">
            Patient Details: {patient.full_name || patient.name || (patient.first_name && patient.last_name ? `${patient.first_name} ${patient.last_name}` : patient.username || "Unknown Patient")}
          </h2>

          {/* Basic Patient Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <p><strong>Age:</strong> {patient.age || (patient.date_of_birth ? calculateAge(patient.date_of_birth) : "—")}</p>
              <p><strong>Status:</strong> {patient.status || "Pending"}</p>
              {patient.gender && <p><strong>Gender:</strong> {patient.gender}</p>}
              {patient.phone && <p><strong>Phone:</strong> {patient.phone}</p>}
            </div>
          </div>

          {/* Vitals */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold mb-2 text-blue-800">Current Vitals</h3>
            <div className="grid grid-cols-2 gap-4">
              <p><strong>Temperature:</strong> {patient.temperature ? `${patient.temperature}°C` : "Not recorded"}</p>
              <p><strong>Blood Pressure:</strong> {patient.blood_pressure || "Not recorded"}</p>
              <p><strong>Heart Rate:</strong> {patient.heart_rate ? `${patient.heart_rate} bpm` : "Not recorded"}</p>
              <p><strong>Respiratory Rate:</strong> {patient.respiratory_rate ? `${patient.respiratory_rate}/min` : "Not recorded"}</p>
            </div>
          </div>

          {/* Appointment Information */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold mb-2 text-green-800">Appointment Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><strong>Status:</strong> <span className={`${appointmentInfo.color} font-medium`}>{appointmentInfo.status}</span></p>
                {appointmentInfo.doctor && appointmentInfo.status !== "No Appointment" && (
                  <p><strong>Doctor:</strong> Dr. {appointmentInfo.doctor}</p>
                )}
              </div>
              {appointmentInfo.appointment && (
                <div>
                  <p><strong>Date:</strong> {appointmentInfo.appointment.date}</p>
                  <p><strong>Time:</strong> {appointmentInfo.appointment.time}</p>
                  {appointmentInfo.appointment.notes && (
                    <p><strong>Notes:</strong> {appointmentInfo.appointment.notes}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    onSave(patient, type, formData);
    setFormData({
      notes: "",
      details: "",
      temperature: "",
      blood_pressure: "",
      heart_rate: "",
      respiratory_rate: "",
      ward_room: "",
      admission_type: "Regular",
      signs_symptoms: "",
      discharge_destination: "Home",
      discharge_summary: "",
      medications_on_discharge: "",
      follow_up_instructions: ""
    });
  };

  const renderFormFields = () => {
    switch (type) {
      case "Admit":
        return (
          <>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Ward/Room Number:</label>
              <input
                type="text"
                name="ward_room"
                value={formData.ward_room}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                placeholder="e.g., Ward A, Room 101"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Admission Type:</label>
              <select
                name="admission_type"
                value={formData.admission_type}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              >
                <option value="Regular">Regular</option>
                <option value="Emergency">Emergency</option>
                <option value="Observation">Observation</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Signs & Symptoms:</label>
              <textarea
                name="signs_symptoms"
                value={formData.signs_symptoms}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                placeholder="Describe patient's current signs and symptoms..."
                rows={3}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Additional Notes:</label>
              <textarea
                name="details"
                value={formData.details}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                placeholder="Any additional admission notes..."
                rows={3}
              />
            </div>
          </>
        );

      case "Attend":
        return (
          <>
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Record Vitals:</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium">Temperature (°C):</label>
                  <input
                    type="number"
                    step="0.1"
                    name="temperature"
                    value={formData.temperature}
                    onChange={handleChange}
                    className="w-full border p-2 rounded"
                    placeholder="37.0"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium">Blood Pressure:</label>
                  <input
                    type="text"
                    name="blood_pressure"
                    value={formData.blood_pressure}
                    onChange={handleChange}
                    className="w-full border p-2 rounded"
                    placeholder="120/80"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium">Heart Rate (bpm):</label>
                  <input
                    type="number"
                    name="heart_rate"
                    value={formData.heart_rate}
                    onChange={handleChange}
                    className="w-full border p-2 rounded"
                    placeholder="72"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium">Respiratory Rate (/min):</label>
                  <input
                    type="number"
                    name="respiratory_rate"
                    value={formData.respiratory_rate}
                    onChange={handleChange}
                    className="w-full border p-2 rounded"
                    placeholder="16"
                  />
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Patient Assessment:</label>
              <textarea
                name="details"
                value={formData.details}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                placeholder="Record your assessment findings, patient complaints, observations..."
                rows={4}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Additional Notes:</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                placeholder="Any additional nursing notes..."
                rows={3}
              />
            </div>
          </>
        );

      case "Discharge":
        return (
          <>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Discharge Destination:</label>
              <select
                name="discharge_destination"
                value={formData.discharge_destination}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              >
                <option value="Home">Home</option>
                <option value="Home with Care">Home with Home Care</option>
                <option value="Transfer">Transfer to Another Facility</option>
                <option value="Nursing Home">Nursing Home</option>
                <option value="Rehabilitation">Rehabilitation Center</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Discharge Summary:</label>
              <textarea
                name="discharge_summary"
                value={formData.discharge_summary}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                placeholder="Summary of treatment received, current condition, and discharge instructions..."
                rows={4}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Medications on Discharge:</label>
              <textarea
                name="medications_on_discharge"
                value={formData.medications_on_discharge}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                placeholder="List of medications patient should continue at home..."
                rows={3}
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Follow-up Instructions:</label>
              <textarea
                name="follow_up_instructions"
                value={formData.follow_up_instructions}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                placeholder="Follow-up appointments, care instructions, warning signs to watch for..."
                rows={3}
                required
              />
            </div>
          </>
        );

      default:
        return (
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Details / Notes:</label>
            <textarea
              name="details"
              value={formData.details}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              placeholder="Enter details here..."
              rows={4}
            />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-20 z-50">
      <div className="bg-white w-11/12 md:w-2/3 lg:w-1/2 rounded-lg shadow-lg p-6 relative max-h-[80vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-red-600 text-lg font-bold"
        >
          ✖
        </button>

        <h2 className="text-2xl font-bold mb-4">
          {type} Patient: {patient.full_name || patient.name || (patient.first_name && patient.last_name ? `${patient.first_name} ${patient.last_name}` : patient.username || "Unknown Patient")}
        </h2>

        {renderFormFields()}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Save {type}
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------- NURSE DASHBOARD -------------------- */
const NurseDashboard = () => {
  const navigate = useNavigate();

  // -------------------- STATE --------------------
  const [nurseName, setNurseName] = useState("");
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [medications, setMedications] = useState([]);
  const [prescribedMeds, setPrescribedMeds] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [handoverLogs, setHandoverLogs] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [medicationSearch, setMedicationSearch] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newHandover, setNewHandover] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);
  const [completedActions, setCompletedActions] = useState({});
  const [actionModal, setActionModal] = useState({
    open: false,
    patient: null,
    type: ""
  });

  const displayedAlerts = useRef(new Set());

  /* -------------------- FETCH NURSE INFO -------------------- */
  const fetchNurseInfo = async () => {
    try {
      const res = await API.get("/nurse/me/");
      setNurseName(res.data.name || res.data.username || "Nurse");
    } catch (error) {
      console.error("Failed to fetch nurse info:", error);
      toast.error("Error fetching nurse data");
    }
  };

  /* -------------------- FETCH DASHBOARD DATA -------------------- */
  const fetchAll = async () => {
    try {
      setLoading(true);
      await fetchNurseInfo();

      const [pRes, tRes, aRes, mRes, hRes, prescribedRes, labRes, appointmentsRes] = await Promise.all([
        API.get("/patients/"),
        API.get("/nurse/tasks/"),
        API.get("/nurse/alerts/"),
        API.get("/nurse/medications/"),
        API.get("/nurse/handovers/"),
        API.get("/prescribed-medications/"),
        API.get("/lab-results/"),
        API.get("/appointments/"),
      ]);

      const patientsData = normalize(pRes.data);
      const appointmentsData = normalize(appointmentsRes.data);
      
      console.log("Patients data:", patientsData);
      console.log("Appointments data:", appointmentsData);

      setPatients(patientsData);
      setTasks(normalize(tRes.data));
      setAlerts(normalize(aRes.data));
      setMedications(normalize(mRes.data));
      setHandoverLogs(normalize(hRes.data));
      setPrescribedMeds(normalize(prescribedRes.data));
      setLabResults(normalize(labRes.data));
      setAppointments(appointmentsData);

      // Display new alerts
      const newUnread = normalize(aRes.data).filter((a) => !a.acknowledged);
      newUnread.forEach((alert) => {
        if (!displayedAlerts.current.has(alert.id)) {
          toast.info(`⚠️ Alert: ${alert.message}`, { autoClose: 5000 });
          displayedAlerts.current.add(alert.id);
        }
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Error fetching dashboard data");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- POLLING ALERTS -------------------- */
  useEffect(() => {
    const access = localStorage.getItem("access_token");
    const refresh = localStorage.getItem("refresh_token");
    if (!access || !refresh) {
      navigate("/login");
      return;
    }

    fetchAll();

    // Poll alerts every 30s
    const interval = setInterval(async () => {
      try {
        const res = await API.get("/nurse/alerts/");
        const normalized = normalize(res.data);
        setAlerts(normalized);

        const newAlerts = normalized.filter((a) => !displayedAlerts.current.has(a.id) && !a.acknowledged);
        newAlerts.forEach((alert) => {
          toast.info(`⚠️ Alert: ${alert.message}`, { autoClose: 5000 });
          displayedAlerts.current.add(alert.id);
        });
      } catch (error) {
        console.error("Polling alerts failed:", error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [navigate]);

  // Modal handlers
  const openPatientModal = (patient) => setSelectedPatient(patient);
  const closePatientModal = () => setSelectedPatient(null);

  const openActionModal = (patient, type) => {
    setActionModal({ open: true, patient, type });
  };

  const closeActionModal = () => {
    setActionModal({ open: false, patient: null, type: "" });
  };

  // Task handlers
  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    try {
      const res = await API.post("/nurse/tasks/", { description: newTask });
      setTasks((prev) => [...prev, res.data]);
      setNewTask("");
      toast.success("Task added successfully!");
    } catch (error) {
      console.error("Failed to add task:", error);
      toast.error("Failed to add task");
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await API.patch(`/nurse/tasks/${taskId}/`, { completed: true });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, completed: true, completed_at: new Date().toISOString() } : task
        )
      );
      toast.success("Task completed!");
    } catch (error) {
      console.error("Failed to complete task:", error);
      toast.error("Failed to complete task");
    }
  };

  // Handover handlers
  const handleAddHandover = async () => {
    if (!newHandover.trim()) return;
    try {
      const res = await API.post("/nurse/handovers/", { note: newHandover });
      setHandoverLogs((prev) => [res.data, ...prev]);
      setNewHandover("");
      toast.success("Handover note added successfully!");
    } catch (error) {
      console.error("Failed to add handover note:", error);
      toast.error("Failed to add handover note");
    }
  };

  // Action save handler
  const handleActionSave = async (patient, type, data) => {
    try {
      // Handle View action specially - just close the modal since the view is shown in the modal itself
      if (type === "View") {
        closeActionModal();
        return;
      }

      let url = `/patients/${patient.id}/`;
      let payload = { details: data.details };

      // Handle different action types
      if (type === "Admit") {
        payload = {
          status: "Admitted",
          details: data.details,
          ward_room: data.ward_room,
          admission_type: data.admission_type,
          signs_symptoms: data.signs_symptoms
        };
      } else if (type === "Discharge") {
        payload = {
          status: "Discharged",
          discharge_destination: data.discharge_destination,
          discharge_summary: data.discharge_summary,
          medications_on_discharge: data.medications_on_discharge,
          follow_up_instructions: data.follow_up_instructions
        };
      } else if (type === "Attend") {
        // Update patient vitals and status
        payload = {
          status: "Attended",
          temperature: data.temperature ? parseFloat(data.temperature) : null,
          blood_pressure: data.blood_pressure,
          heart_rate: data.heart_rate ? parseInt(data.heart_rate) : null,
          respiratory_rate: data.respiratory_rate ? parseInt(data.respiratory_rate) : null,
          details: data.details,
          notes: data.notes
        };
      }

      await API.patch(url, payload);

      // Update local state
      const newStatus = type === "Admit" ? "Admitted" : 
                       type === "Discharge" ? "Discharged" : 
                       type === "Attend" ? "Attended" : patient.status;

      setPatients((prev) =>
        prev.map((p) => (p.id === patient.id ? { 
          ...p, 
          status: newStatus,
          temperature: data.temperature ? parseFloat(data.temperature) : p.temperature,
          blood_pressure: data.blood_pressure || p.blood_pressure,
          heart_rate: data.heart_rate ? parseInt(data.heart_rate) : p.heart_rate,
          respiratory_rate: data.respiratory_rate ? parseInt(data.respiratory_rate) : p.respiratory_rate
        } : p))
      );

      // Mark action as completed
      setCompletedActions((prev) => ({
        ...prev,
        [patient.id]: { ...prev[patient.id], [type]: true }
      }));

      toast.success(`${type} action completed for ${patient.full_name || patient.name || patient.first_name || "patient"}`);
      closeActionModal();
    } catch (error) {
      console.error(`Failed to ${type.toLowerCase()} patient:`, error);
      toast.error(`Failed to ${type.toLowerCase()} patient`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login");
  };

  return (
    <div className="flex h-screen font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white flex flex-col justify-between">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Nurse Dashboard</h2>
          <nav className="space-y-3">
            <Link to="/" className="block hover:text-blue-300">🏥 Patients</Link>
            <Link to="tasks" className="block hover:text-blue-300">📝 Tasks</Link>
            <Link to="medications" className="block hover:text-blue-300">💊 Medications</Link>
            <Link to="prescribed-medications" className="block hover:text-blue-300">📋 Prescriptions</Link>
            <Link to="lab-results" className="block hover:text-blue-300">🧪 Lab Results</Link>
            <Link to="handover-logs" className="block hover:text-blue-300">📝 Handover Logs</Link>
          </nav>
        </div>
        <div className="text-sm p-3">&copy; 2025 Clinic Management</div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white shadow p-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Hi {nurseName}</h1>
          <div className="flex items-center space-x-4 relative">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowAlertDropdown((prev) => !prev)}
                className="relative text-gray-700 hover:text-gray-900 text-2xl"
              >
                🔔
                {alerts.filter((a) => !a.acknowledged).length > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs font-bold px-1 rounded-full">
                    {alerts.filter((a) => !a.acknowledged).length}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {showAlertDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white border rounded shadow-lg max-h-80 overflow-y-auto z-50">
                  <h3 className="font-semibold p-2 border-b">Notifications</h3>
                  {alerts.length ? (
                    alerts.map((a) => (
                      <div
                        key={a.id}
                        className={`p-2 border-b hover:bg-blue-50 cursor-pointer ${
                          a.acknowledged ? "text-gray-500" : "text-black"
                        }`}
                      >
                        {a.message}
                      </div>
                    ))
                  ) : (
                    <p className="p-2 text-gray-500">No notifications</p>
                  )}
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow transition"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 flex-1 overflow-auto">
          {loading && <p>Loading dashboard...</p>}

          <Routes>
            <Route
              index
              element={
                <PatientsPage
                  patients={patients}
                  appointments={appointments}
                  patientSearch={patientSearch}
                  setPatientSearch={setPatientSearch}
                  openPatientModal={openPatientModal}
                  completedActions={completedActions}
                  openActionModal={openActionModal}
                />
              }
            />
            <Route
              path="tasks"
              element={
                <TasksPage
                  tasks={tasks}
                  newTask={newTask}
                  setNewTask={setNewTask}
                  handleAddTask={handleAddTask}
                  taskSearch={taskSearch}
                  setTaskSearch={setTaskSearch}
                  handleCompleteTask={handleCompleteTask}
                />
              }
            />
            <Route
              path="medications"
              element={
                <MedicationsPage
                  medications={medications}
                  medicationSearch={medicationSearch}
                  setMedicationSearch={setMedicationSearch}
                />
              }
            />
            <Route path="prescribed-medications" element={<PrescribedMedicationsPage prescribedMeds={prescribedMeds} />} />
            <Route path="lab-results" element={<LabResultsPage labResults={labResults} />} />
            <Route path="handover-logs" element={
              <HandoverPage 
                handoverLogs={handoverLogs}
                newHandover={newHandover}
                setNewHandover={setNewHandover}
                handleAddHandover={handleAddHandover}
              />
            } />
          </Routes>

          {/* Patient Modal */}
          {selectedPatient && (
            <PatientModal
              patient={selectedPatient}
              onClose={closePatientModal}
              labResults={labResults}
              prescribedMeds={prescribedMeds}
              appointments={appointments}
            />
          )}

          {/* Action Modal */}
          <ActionModal
            actionModal={actionModal}
            onClose={closeActionModal}
            onSave={handleActionSave}
            appointments={appointments}
          />
        </div>

        <ToastContainer />
      </main>
    </div>
  );
};

export default NurseDashboard