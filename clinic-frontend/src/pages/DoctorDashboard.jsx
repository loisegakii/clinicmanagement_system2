// src/pages/DoctorDashboard.jsx
import React, { useEffect, useState } from "react";
import API from "../api/axios"; // configured axios instance (baseURL should point to /api/)
import {
  FaUserMd,
  FaSignOutAlt,
  FaHome,
  FaUsers,
  FaCalendarAlt,
  FaNotesMedical,
  FaUser,
  FaBell,
  FaExclamationTriangle,
  FaFileMedicalAlt,
  FaClipboardList,
  FaPills,
  FaVial,
} from "react-icons/fa";

/**
 * DoctorDashboard.jsx
 *
 * Features included:
 * - Dashboard overview (simple stats).
 * - Patients tab with full patient history view + discharge summary flow.
 * - Appointments tab with correct Approve / Decline / Start Consultation / Complete flows.
 * - Consultation modal (structured prescriptions, labs, admission flag, follow-up scheduling).
 * - Notifications dropdown with categorized sections: Appointments | Labs | Prescriptions | Admissions | Discharges.
 * - Robust error handling & fallbacks when backend endpoints don't exist yet (so frontend won't crash).
 *
 * NOTE: This file focuses on frontend/UX. For full backend integration you should add endpoints
 * that return structured data for lab-results, prescriptions, and optionally an endpoint for consultations/discharges.
 */

/* -------------------------
   Helper constants & utils
   ------------------------- */
const normalizeStatus = (s) => (s ? String(s).toUpperCase() : ""); // keep comparisons consistent

// Status categories for appointment flow
const AppointmentRequestedStatuses = new Set(["REQUESTED", "PENDING"]); // backend variations
const AppointmentAcceptedStatuses = new Set(["ACCEPTED", "APPROVED"]);
const AppointmentCompletedStatuses = new Set(["COMPLETED", "DONE"]);

/* -------------------------
   Component
   ------------------------- */
const DoctorDashboard = () => {
  /* -------------------------
     State: main data
     ------------------------- */
  const [activeSection, setActiveSection] = useState("dashboard");
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patientHistory, setPatientHistory] = useState([]);

  /* -------------------------
     State: notifications
     ------------------------- */
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifAppointments, setNotifAppointments] = useState([]);
  const [notifLabResults, setNotifLabResults] = useState([]);
  const [notifPrescriptions, setNotifPrescriptions] = useState([]);
  const [notifAdmissions, setNotifAdmissions] = useState([]);
  const [notifDischarges, setNotifDischarges] = useState([]);

  /* -------------------------
     Consultation modal & form
     ------------------------- */
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultAppointment, setConsultAppointment] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [consultForm, setConsultForm] = useState({
    diagnosis: "",
    notes: "",
    prescriptions: [{ drug: "", dosage: "", frequency: "", duration: "" }],
    lab_requests: [""],
    admission_required: false,
    follow_up_date: "",
  });

  /* -------------------------
     Discharge modal
     ------------------------- */
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [dischargePatient, setDischargePatient] = useState(null);
  const [dischargeSummary, setDischargeSummary] = useState("");

  /* -------------------------
     Search / filters / stats
     ------------------------- */
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalConsultations: 0,
    pendingAppointments: 0,
    admittedPatients: 0,
  });

  /* -------------------------
     Fetching data
     ------------------------- */
  useEffect(() => {
    reloadAll();
  }, []);

  const reloadAll = async () => {
    await Promise.all([
      fetchPatients(),
      fetchAppointments(),
      fetchNotifications(),
      fetchStats(),
    ]);
  };

  /* -------------------------
     Handle Approve / Decline
     ------------------------- */
  // REMOVE: Duplicate handleApproveAppointment and handleDeclineAppointment

  /* -------------------------
     Handle Save Consultation
     ------------------------- */
  const handleConsultSave = async () => {
    if (!consultAppointment || !selectedPatient) return;

    try {
      // Create medical record
      await API.post(`/medical-records/`, {
        patient: selectedPatient.id,
        appointment: consultAppointment.id,
        diagnosis: consultForm.diagnosis,
        notes: consultForm.notes,
        prescriptions: consultForm.prescriptions,
        lab_requests: consultForm.lab_requests,
        admission_required: consultForm.admission_required,
        follow_up_date: consultForm.follow_up_date,
      });

      // Update appointment status
      await API.patch(`/appointments/${consultAppointment.id}/`, {
        status: "COMPLETED",
      });

      toast.success("Consultation saved successfully");

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === consultAppointment.id ? { ...a, status: "COMPLETED" } : a
        )
      );

      // Reset modal
      setConsultModalOpen(false);
      setConsultAppointment(null);
      setConsultForm({
        diagnosis: "",
        notes: "",
        prescriptions: [{ drug: "", dosage: "", frequency: "", duration: "" }],
        lab_requests: [""],
        admission_required: false,
        follow_up_date: "",
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save consultation");
    }
  };
  // Fetch patients assigned to the doctor
  const fetchPatients = async () => {
    try {
      const res = await API.get("doctors/patients/"); // viewset action in your backend
      // Expecting array of patients with fields like { id, name, age, gender, phone, is_emergency, ... }
      if (Array.isArray(res.data)) {
        setPatients(res.data);
        const admittedCount = res.data.filter((p) => p.status && p.status === "ADMITTED").length;
        setStats((s) => ({ ...s, admittedPatients: admittedCount }));
      } else {
        setPatients([]);
      }
    } catch (err) {
      console.warn("fetchPatients failed — make sure doctors/patients/ exists", err);
      setPatients([]);
    }
  };

  // Fetch appointments for this doctor
  const fetchAppointments = async () => {
    try {
      const res = await API.get("doctors/appointments/");
      if (Array.isArray(res.data)) {
        setAppointments(res.data);

        // derive notification segment for appointment requests
        const pending = res.data.filter((a) => AppointmentRequestedStatuses.has(normalizeStatus(a.status)));
        setNotifAppointments(pending);

        setStats((s) => ({ ...s, pendingAppointments: pending.length }));
      } else {
        setAppointments([]);
        setNotifAppointments([]);
      }
    } catch (err) {
      console.warn("fetchAppointments failed — make sure doctors/appointments/ exists", err);
      setAppointments([]);
      setNotifAppointments([]);
    }
  };

  // Fetch other notification sources (lab results, prescriptions, admissions, discharges)
  // These calls are best-effort; if endpoints don't exist they will silently fail and UI stays stable.
  const fetchNotifications = async () => {
    // Lab results ready
    try {
      const labRes = await API.get("lab-results/?doctor=true"); // adjust query to your backend
      // assume labRes.data is array of lab results with a patient_name field
      setNotifLabResults(Array.isArray(labRes.data) ? labRes.data : []);
    } catch (err) {
      // endpoint might not exist yet
      setNotifLabResults([]);
    }

    // Prescriptions pending (pharmacist queue)
    try {
      const presRes = await API.get("prescriptions/?status=PENDING"); // optional filter
      setNotifPrescriptions(Array.isArray(presRes.data) ? presRes.data : []);
    } catch (err) {
      setNotifPrescriptions([]);
    }

    // Admissions (medical records flagged admission_required)
    try {
      const mrRes = await API.get("medical-records/?admission_required=true"); // adjust server-side filtering
      setNotifAdmissions(Array.isArray(mrRes.data) ? mrRes.data : []);
    } catch (err) {
      setNotifAdmissions([]);
    }

    // Discharge notifications (recent discharge records or requests)
    try {
      const dischargeRes = await API.get("medical-records/?type=discharge"); // optional
      setNotifDischarges(Array.isArray(dischargeRes.data) ? dischargeRes.data : []);
    } catch (err) {
      setNotifDischarges([]);
    }
  };

  // Optional stats endpoint: if you add one, it will populate totals
  const fetchStats = async () => {
    try {
      const res = await API.get("doctors/dashboard/"); // optional dedicated stats endpoint
      if (res.data) setStats(res.data);
    } catch (err) {
      // fallback will use derived stats from patients & appointments
      // console.warn('stats endpoint missing - falling back to derived counts', err);
    }
  };

  /* -------------------------
     PATIENT HISTORY (open from Patients list).
     This loads medical-records for a patient and displays them in the Patients tab.
     ------------------------- */
  const openPatientHistory = async (patient) => {
    setSelectedPatient(patient);
    setPatientHistory([]); // clear while loading
    try {
      const res = await API.get(`medical-records/?patient=${patient.id}`);
      setPatientHistory(Array.isArray(res.data) ? res.data : []);
      // Automatically switch to a panel/view if it helps UX (we remain on Patients)
    } catch (err) {
      console.warn("Unable to load patient history", err);
      setPatientHistory([]);
    }
  };

  /* -------------------------
     APPOINTMENT ACTIONS
     - Approve: PATCH status -> ACCEPTED
     - Decline: PATCH status -> DECLINED
     - Start Consultation:
         * If appointment was still REQUESTED, we first ACCEPT it (server update) and then open modal
         * If already ACCEPTED, open modal directly
     - Complete appointment: after saving consultation, set appointment status -> COMPLETED
     ------------------------- */
  const apiPatchAppointmentStatus = async (id, newStatus) => {
    try {
      // Some backends accept PATCH, some accept PUT — PATCH is safer here.
      await API.patch(`appointments/${id}/`, { status: newStatus });
      // refresh appointment list & notifications after change
      await fetchAppointments();
      await fetchNotifications();
      return true;
    } catch (err) {
      console.error("Failed to update appointment status", err);
      return false;
    }
  };

  const handleApproveAppointment = async (appointment) => {
    // normalize & patch
    const succeeded = await apiPatchAppointmentStatus(appointment.id, "ACCEPTED");
    if (succeeded) {
      // Optionally open consultation immediately
      // openConsultation(appointment); // <-- uncomment if you want approve -> start consult
    }
  };

  const handleDeclineAppointment = async (appointment) => {
    if (!window.confirm("Decline this appointment?")) return;
    await apiPatchAppointmentStatus(appointment.id, "DECLINED");
  };

  const openConsultation = async (appointment) => {
    // If appointment is requested, accept it first to lock it
    if (AppointmentRequestedStatuses.has(normalizeStatus(appointment.status))) {
      const patched = await apiPatchAppointmentStatus(appointment.id, "ACCEPTED");
      if (!patched) {
        alert("Could not accept appointment. Try again.");
        return;
      }
      // fetch fresh appointment details
      try {
        const res = await API.get(`appointments/${appointment.id}/`);
        appointment = res.data; // updated appointment
      } catch (err) {
        // ignore — we will proceed with existing object
      }
    }

    // set selected patient (we expect appointment to contain patient or patient id)
    // handle multiple possible shapes of appointment.patient
    const patientObj = appointment.patient || appointment.patient_detail || { id: appointment.patient_id, name: appointment.patient_name };
    setSelectedPatient(patientObj);

    // reset & open consult modal
    setConsultForm({
      diagnosis: "",
      prescriptions: [{ drug: "", dosage: "", frequency: "", duration: "" }],
      lab_requests: [""],
      admission_required: false,
      follow_up_date: "",
      notes: "",
    });
    setConsultAppointment(appointment);
    setConsultModalOpen(true);
  };

  // Save consultation: create a medical record with structured content embedded in notes
  // For now we POST to medical-records/ and then PATCH appointment as COMPLETED
  const handleSaveConsultation = async (e) => {
    e && e.preventDefault && e.preventDefault();

    if (!selectedPatient || !consultAppointment) {
      alert("Missing patient or appointment info.");
      return;
    }

    // structure payload for medical record
    // There's no standard "prescriptions" or "labs" field in CreateMedicalRecordSerializer currently,
    // so we'll send diagnosis + notes containing JSON for prescriptions/labs/admission etc.
    // Later you can add dedicated endpoints and update this payload.
    const payload = {
      patient: selectedPatient.id || selectedPatient, // could be id or nested object
      appointment: consultAppointment.id,
      diagnosis: consultForm.diagnosis,
      // use notes to carry structured JSON for other systems (pharmacy / lab / admission workflows)
      notes: JSON.stringify({
        prescriptions: consultForm.prescriptions,
        lab_requests: consultForm.lab_requests,
        admission_required: consultForm.admission_required,
        follow_up_date: consultForm.follow_up_date,
        free_notes: consultForm.notes,
      }),
    };

    try {
      // 1) create medical record
      const res = await API.post("medical-records/", payload);
      // 2) if we got a successful response, mark appointment as completed
      if (res.status === 201 || res.status === 200) {
        await apiPatchAppointmentStatus(consultAppointment.id, "COMPLETED");
      }
      // 3) close modal and refresh lists
      setConsultModalOpen(false);
      await reloadAll();
      alert("Consultation saved successfully.");
    } catch (err) {
      console.error("Failed to save consultation", err);
      alert("Failed to save consultation — check console for details.");
    }
  };

  /* -------------------------
     PRESCRIPTION & LAB helpers (UI manipulations)
     - Add / remove dynamic fields
     ------------------------- */
  const addPrescriptionRow = () => {
    setConsultForm((prev) => ({
      ...prev,
      prescriptions: [...prev.prescriptions, { drug: "", dosage: "", frequency: "", duration: "" }],
    }));
  };
  const removePrescriptionRow = (idx) => {
    setConsultForm((prev) => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== idx),
    }));
  };
  const updatePrescriptionField = (idx, field, value) => {
    setConsultForm((prev) => {
      const copy = [...prev.prescriptions];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...prev, prescriptions: copy };
    });
  };

  const addLabRow = () => {
    setConsultForm((prev) => ({ ...prev, lab_requests: [...prev.lab_requests, ""] }));
  };
  const updateLabField = (idx, value) => {
    setConsultForm((prev) => {
      const copy = [...prev.lab_requests];
      copy[idx] = value;
      return { ...prev, lab_requests: copy };
    });
  };
  const removeLabRow = (idx) => {
    setConsultForm((prev) => ({ ...prev, lab_requests: prev.lab_requests.filter((_, i) => i !== idx) }));
  };

  /* -------------------------
     DISCHARGE workflow
     - Create a medical record capturing the discharge summary and then patch Patient.status -> DISCHARGED
     ------------------------- */
  const openDischargeModal = (patient) => {
    setDischargePatient(patient);
    setDischargeSummary("");
    setDischargeModalOpen(true);
  };

  const handleDischargeSubmit = async (e) => {
    e && e.preventDefault && e.preventDefault();
    if (!dischargePatient) return;

    try {
      // 1) create a medical record representing the discharge summary
      await API.post("medical-records/", {
        patient: dischargePatient.id,
        diagnosis: "Discharge summary",
        notes: JSON.stringify({ discharge_summary: dischargeSummary }),
      });

      // 2) update patient status to DISCHARGED
      await API.patch(`patients/${dischargePatient.id}/`, { status: "DISCHARGED" });

      // close + refresh
      setDischargeModalOpen(false);
      setDischargePatient(null);
      await fetchPatients();
      alert("Patient discharged and summary recorded.");
    } catch (err) {
      console.error("Failed to discharge patient", err);
      alert("Failed to process discharge — check console for details.");
    }
  };

  /* -------------------------
     Derived values & small helpers for UI
     ------------------------- */
  const totalNotifications =
    notifAppointments.length + notifLabResults.length + notifPrescriptions.length + notifAdmissions.length + notifDischarges.length;

  const filteredPatients = patients.filter((p) =>
    (p.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* -------------------------
     Render — heavily commented blocks
     ------------------------- */
  return (
    <div className="flex h-screen bg-gray-50">
      {/* ---------- SIDEBAR ---------- */}
      <aside className="w-64 bg-gradient-to-b from-blue-800 to-blue-700 text-white p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <FaUserMd className="text-2xl" />
          <div>
            <h1 className="font-bold text-lg">AfyaCare</h1>
            <p className="text-xs opacity-80">Doctor Console</p>
          </div>
        </div>

        <nav className="flex-1">
          <ul className="space-y-2">
            <li
              className={`p-2 rounded cursor-pointer hover:bg-blue-700 ${activeSection === "dashboard" ? "bg-blue-900" : ""}`}
              onClick={() => setActiveSection("dashboard")}
            >
              <div className="flex items-center gap-3">
                <FaHome />
                <span>Overview</span>
              </div>
            </li>

            <li
              className={`p-2 rounded cursor-pointer hover:bg-blue-700 ${activeSection === "patients" ? "bg-blue-900" : ""}`}
              onClick={() => setActiveSection("patients")}
            >
              <div className="flex items-center gap-3">
                <FaUsers />
                <span>Patients</span>
              </div>
            </li>

            <li
              className={`p-2 rounded cursor-pointer hover:bg-blue-700 ${activeSection === "appointments" ? "bg-blue-900" : ""}`}
              onClick={() => setActiveSection("appointments")}
            >
              <div className="flex items-center gap-3">
                <FaCalendarAlt />
                <span>Appointments</span>
              </div>
            </li>

            <li
              className={`p-2 rounded cursor-pointer hover:bg-blue-700 ${activeSection === "medicalRecords" ? "bg-blue-900" : ""}`}
              onClick={() => setActiveSection("medicalRecords")}
            >
              <div className="flex items-center gap-3">
                <FaNotesMedical />
                <span>Records</span>
              </div>
            </li>

            <li
              className={`p-2 rounded cursor-pointer hover:bg-blue-700 ${activeSection === "profile" ? "bg-blue-900" : ""}`}
              onClick={() => setActiveSection("profile")}
            >
              <div className="flex items-center gap-3">
                <FaUser />
                <span>Profile</span>
              </div>
            </li>
          </ul>
        </nav>

        <div className="mt-auto">
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/login";
            }}
            className="w-full text-left p-3 rounded bg-red-600 hover:bg-red-700 flex items-center gap-2"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>

      {/* ---------- MAIN ---------- */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Top bar: title + notifications */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Doctor Dashboard</h2>
            <p className="text-sm text-gray-600">Manage appointments, consultations & patient records</p>
          </div>

          {/* Notification bell with categorized dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((s) => !s)}
              className="relative p-2 rounded-full hover:bg-gray-100"
              aria-label="Notifications"
            >
              <FaBell className="text-xl text-gray-700" />
              {totalNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1.5">
                  {totalNotifications}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-white shadow-lg rounded-md z-40 p-4">
                <h3 className="font-semibold mb-2">Notifications</h3>

                {/* Category: Appointments */}
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Appointment Requests</h4>
                    <span className="text-xs text-gray-500">{notifAppointments.length}</span>
                  </div>
                  <div className="max-h-28 overflow-auto mt-1">
                    {notifAppointments.length === 0 ? (
                      <p className="text-xs text-gray-500">No new appointment requests</p>
                    ) : (
                      notifAppointments.map((a) => (
                        <div key={a.id} className="text-sm p-1 border-b">
                          <strong>{a.patient_name || a.patient?.name || "Unknown"}</strong> requested {a.date} {a.time}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Category: Lab results */}
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Lab Results Ready</h4>
                    <span className="text-xs text-gray-500">{notifLabResults.length}</span>
                  </div>
                  <div className="max-h-28 overflow-auto mt-1">
                    {notifLabResults.length === 0 ? (
                      <p className="text-xs text-gray-500">No lab results</p>
                    ) : (
                      notifLabResults.map((lr) => (
                        <div key={lr.id} className="text-sm p-1 border-b">
                          Lab result for <strong>{lr.patient_name || lr.patient?.name}</strong> is ready
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Category: Prescriptions */}
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Pending Prescriptions</h4>
                    <span className="text-xs text-gray-500">{notifPrescriptions.length}</span>
                  </div>
                  <div className="max-h-28 overflow-auto mt-1">
                    {notifPrescriptions.length === 0 ? (
                      <p className="text-xs text-gray-500">No pending prescriptions</p>
                    ) : (
                      notifPrescriptions.map((pr) => (
                        <div key={pr.id} className="text-sm p-1 border-b">
                          Prescription for <strong>{pr.patient_name || pr.patient?.name}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Category: Admissions */}
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Admissions</h4>
                    <span className="text-xs text-gray-500">{notifAdmissions.length}</span>
                  </div>
                  <div className="max-h-28 overflow-auto mt-1">
                    {notifAdmissions.length === 0 ? (
                      <p className="text-xs text-gray-500">No admission requests</p>
                    ) : (
                      notifAdmissions.map((r) => (
                        <div key={r.id} className="text-sm p-1 border-b">
                          <strong>{r.patient?.name || r.patient_name}</strong> requires admission
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Category: Discharges */}
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Discharges</h4>
                    <span className="text-xs text-gray-500">{notifDischarges.length}</span>
                  </div>
                  <div className="max-h-28 overflow-auto mt-1">
                    {notifDischarges.length === 0 ? (
                      <p className="text-xs text-gray-500">No recent discharges</p>
                    ) : (
                      notifDischarges.map((d) => (
                        <div key={d.id} className="text-sm p-1 border-b">
                          Discharged: <strong>{d.patient?.name || d.patient_name}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ---------- MAIN PANELS ---------- */}
        <section className="space-y-6">
          {/* Dashboard overview */}
          {activeSection === "dashboard" && (
            <div>
              <h3 className="text-xl font-semibold mb-3">Overview</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded shadow">
                  <p className="text-sm text-gray-500">Total Consultations</p>
                  <h4 className="text-2xl font-bold">{stats.totalConsultations ?? 0}</h4>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <p className="text-sm text-gray-500">Pending Appointments</p>
                  <h4 className="text-2xl font-bold">{stats.pendingAppointments ?? 0}</h4>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <p className="text-sm text-gray-500">Admitted Patients</p>
                  <h4 className="text-2xl font-bold">{stats.admittedPatients ?? 0}</h4>
                </div>
              </div>
            </div>
          )}

          {/* Patients */}
          {activeSection === "patients" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold">My Patients</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search patients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="p-2 border rounded"
                  />
                  <button onClick={() => fetchPatients()} className="px-3 py-2 bg-gray-200 rounded">
                    Refresh
                  </button>
                </div>
              </div>

              <div className="bg-white rounded shadow divide-y">
                {filteredPatients.length === 0 && (
                  <div className="p-4 text-gray-500">No patients assigned.</div>
                )}

                {filteredPatients.map((p) => (
                  <div key={p.id} className="p-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium">
                        {p.name}{" "}
                        {p.is_emergency && <FaExclamationTriangle className="inline text-red-600 ml-2" />}
                      </div>
                      <div className="text-sm text-gray-600">
                        {p.age} yrs • {p.gender} • {p.phone || "no contact"}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openPatientHistory(p)}
                        className="px-3 py-1 bg-blue-600 text-white rounded"
                      >
                        View History
                      </button>

                      <button
                        onClick={() => {
                          setSelectedPatient(p);
                          setConsultAppointment(null); // creation from patient view (no appointment)
                          setConsultForm((prev) => ({
                            ...prev,
                            diagnosis: "",
                            prescriptions: [{ drug: "", dosage: "", frequency: "", duration: "" }],
                            lab_requests: [""],
                            admission_required: false,
                            follow_up_date: "",
                            notes: "",
                          }));
                          setConsultModalOpen(true);
                        }}
                        className="px-3 py-1 bg-green-600 text-white rounded"
                      >
                        New Record / Consult
                      </button>

                      {/* discharge button only visible if not already discharged */}
                      {p.status !== "DISCHARGED" && (
                        <button
                          onClick={() => openDischargeModal(p)}
                          className="px-3 py-1 bg-red-600 text-white rounded"
                        >
                          Discharge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected patient history panel */}
              {selectedPatient && (
                <section className="mt-4 bg-white rounded shadow p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{selectedPatient.name} — History</h4>
                      <div className="text-sm text-gray-600">{selectedPatient.phone || ""}</div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      Status: <span className="font-medium">{selectedPatient.status || "N/A"}</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    {patientHistory.length === 0 ? (
                      <p className="text-gray-500 text-sm">No medical records found</p>
                    ) : (
                      <ul className="divide-y">
                        {patientHistory.map((r) => (
                          <li key={r.id} className="py-3">
                            <div className="flex justify-between">
                              <div>
                                <div className="font-medium">{r.diagnosis || "Diagnosis N/A"}</div>
                                <div className="text-sm text-gray-600">Notes: {r.notes ? r.notes : "—"}</div>
                              </div>
                              <div className="text-sm text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}

{/* ====================== APPOINTMENTS ====================== */}
{activeSection === "appointments" && (
  <div>
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xl font-semibold">Appointments</h3>
      <div className="text-sm text-gray-500">
        Pending: {notifAppointments.length} • Total: {appointments.length}
      </div>
    </div>

    <div className="grid gap-3">
      {appointments.length === 0 && (
        <div className="p-4 bg-white rounded shadow">No appointments yet</div>
      )}

      {appointments.map((a) => {
        const statusNorm = normalizeStatus(a.status);
        const isRequested = AppointmentRequestedStatuses.has(statusNorm);
        const isAccepted = AppointmentAcceptedStatuses.has(statusNorm);
        const isCompleted = AppointmentCompletedStatuses.has(statusNorm);

        return (
          <div
            key={a.id}
            className="p-4 bg-white rounded shadow flex justify-between items-center"
          >
            {/* Appointment Info */}
            <div>
              <div className="font-medium">
                {a.patient_name || a.patient?.name || "Unknown patient"}{" "}
                {a.is_emergency && (
                  <FaExclamationTriangle className="inline text-red-600 ml-2" />
                )}
              </div>
              <div className="text-sm text-gray-600">
                {a.date} {a.time} • <span className="capitalize">{a.status}</span>
              </div>
              <div className="text-sm text-gray-500">{a.notes || ""}</div>
            </div>

            {/* Appointment Actions */}
            <div className="flex gap-2">
              {/* APPROVE */}
              {isRequested && (
                <button
                  onClick={async () => {
                    try {
                      await handleApproveAppointment(a);
                      toast.success("Appointment approved");
                    } catch (err) {
                      toast.error("Error approving appointment");
                    }
                  }}
                  className="px-3 py-1 bg-green-600 text-white rounded"
                >
                  Approve
                </button>
              )}

              {/* DECLINE */}
              {isRequested && (
                <button
                  onClick={async () => {
                    try {
                      await handleDeclineAppointment(a);
                      toast.info("Appointment declined");
                    } catch (err) {
                      toast.error("Error declining appointment");
                    }
                  }}
                  className="px-3 py-1 bg-red-600 text-white rounded"
                >
                  Decline
                </button>
              )}

              {/* START CONSULTATION */}
              {isAccepted && !isCompleted && (
                <button
                  onClick={() => {
                    setConsultAppointment(a);
                    setSelectedPatient(
                      a.patient || { id: a.patient_id, name: a.patient_name }
                    );
                    setConsultModalOpen(true);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Start Consultation
                </button>
              )}

              {/* VIEW RECORD */}
              {isCompleted && (
                <button
                  onClick={() => {
                    setSelectedPatient(
                      a.patient || { id: a.patient_id, name: a.patient_name }
                    );
                    (async () => {
                      try {
                        const rr = await API.get(
                          `medical-records/?appointment=${a.id}`
                        );
                        setPatientHistory(Array.isArray(rr.data) ? rr.data : []);
                        setActiveSection("patients");
                      } catch (err) {
                        console.warn("Could not fetch records", err);
                        toast.error("Unable to retrieve medical record");
                      }
                    })();
                  }}
                  className="px-3 py-1 bg-gray-500 text-white rounded"
                >
                  View Record
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}


{/* =======================
   Consultation Modal
   ======================= */}
{consultModalOpen && consultAppointment && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
    <div className="bg-white p-6 rounded shadow-lg w-full max-w-lg">
      <h2 className="text-xl font-bold mb-4">
        Consultation for {consultAppointment.patient_name}
      </h2>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await API.post("consultations/", {
              appointment: consultAppointment.id,
              diagnosis: consultForm.diagnosis,
              prescription: consultForm.prescription,
              lab_request: consultForm.lab_request,
              admission_required: consultForm.admission_required,
              discharge_summary: consultForm.discharge_summary,
            });
            toast.success("Consultation saved ✅");
            setconsultModalOpen(false);
            setConsultForm({
              diagnosis: "",
              prescription: "",
              lab_request: "",
              admission_required: false,
              discharge_summary: "",
            });
          } catch (err) {
            toast.error("Failed to save consultation ❌");
          }
        }}
        className="flex flex-col space-y-3"
      >
        <input
          type="text"
          placeholder="Diagnosis"
          value={consultForm.diagnosis}
          onChange={(e) =>
            setConsultForm({ ...consultForm, diagnosis: e.target.value })
          }
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Prescription"
          value={consultForm.prescription}
          onChange={(e) =>
            setConsultForm({ ...consultForm, prescription: e.target.value })
          }
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Lab Request"
          value={consultForm.lab_request}
          onChange={(e) =>
            setConsultForm({ ...consultForm, lab_request: e.target.value })
          }
          className="border p-2 rounded"
        />
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={consultForm.admission_required}
            onChange={(e) =>
              setConsultForm({
                ...consultForm,
                admission_required: e.target.checked,
              })
            }
          />
          <span>Admission Required</span>
        </label>
        <textarea
          placeholder="Discharge Summary"
          value={consultForm.discharge_summary}
          onChange={(e) =>
            setConsultForm({
              ...consultForm,
              discharge_summary: e.target.value,
            })
          }
          className="border p-2 rounded"
        />

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => setconsultModalOpen(false)}
            className="px-3 py-1 bg-gray-500 text-white rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1 bg-green-600 text-white rounded"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  </div>
)}

          {/* Medical Records (global view) */}
          {activeSection === "medicalRecords" && (
            <div>
              <h3 className="text-xl font-semibold mb-3">Medical Records (global)</h3>
              <p className="text-sm text-gray-500">This list can be implemented server-side (filtering/pagination).</p>

              {/* small helper: load and list last 10 medical records */}
              <RecentMedicalRecords />
            </div>
          )}

          {/* Profile */}
          {activeSection === "profile" && (
            <div>
              <h3 className="text-xl font-semibold mb-3">Profile</h3>
              <p className="text-sm text-gray-500">Doctor profile & preferences (coming soon).</p>
            </div>
          )}
        </section>
      </main>

      {/* ---------- CONSULTATION MODAL (reused) ---------- */}
      {consultModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white w-full max-w-3xl rounded shadow-lg overflow-auto max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h4 className="font-semibold">Consultation — {selectedPatient.name}</h4>
                <div className="text-sm text-gray-500">{selectedPatient.age ?? ""} • {selectedPatient.gender ?? ""}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setConsultModalOpen(false);
                    setConsultAppointment(null);
                    setSelectedPatient(null);
                  }}
                  className="px-3 py-1 bg-gray-300 rounded"
                >
                  Close
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveConsultation} className="p-4 space-y-4">
              {/* Diagnosis */}
              <div>
                <label className="block text-sm font-medium">Diagnosis</label>
                <input
                  required
                  value={consultForm.diagnosis}
                  onChange={(e) => setConsultForm((p) => ({ ...p, diagnosis: e.target.value }))}
                  className="w-full border p-2 rounded"
                />
              </div>

              {/* Structured prescriptions */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">Prescriptions</label>
                  <button type="button" onClick={addPrescriptionRow} className="px-2 py-1 bg-gray-200 rounded text-sm">
                    + Add
                  </button>
                </div>

                {consultForm.prescriptions.map((presc, i) => (
                  <div key={i} className="flex gap-2 mt-2">
                    <input
                      placeholder="Drug"
                      value={presc.drug}
                      onChange={(e) => updatePrescriptionField(i, "drug", e.target.value)}
                      className="border p-2 rounded flex-1"
                    />
                    <input
                      placeholder="Dosage"
                      value={presc.dosage}
                      onChange={(e) => updatePrescriptionField(i, "dosage", e.target.value)}
                      className="border p-2 rounded w-36"
                    />
                    <input
                      placeholder="Frequency"
                      value={presc.frequency}
                      onChange={(e) => updatePrescriptionField(i, "frequency", e.target.value)}
                      className="border p-2 rounded w-36"
                    />
                    <input
                      placeholder="Duration"
                      value={presc.duration}
                      onChange={(e) => updatePrescriptionField(i, "duration", e.target.value)}
                      className="border p-2 rounded w-36"
                    />
                    <button type="button" onClick={() => removePrescriptionRow(i)} className="px-2 py-1 bg-red-500 text-white rounded">
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {/* Lab requests */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">Lab Requests</label>
                  <button type="button" onClick={addLabRow} className="px-2 py-1 bg-gray-200 rounded text-sm">
                    + Add
                  </button>
                </div>

                {consultForm.lab_requests.map((lab, i) => (
                  <div key={i} className="flex gap-2 mt-2">
                    <input
                      placeholder="Lab test name (e.g., CBC, X-ray)"
                      value={lab}
                      onChange={(e) => updateLabField(i, e.target.value)}
                      className="border p-2 rounded flex-1"
                    />
                    <button type="button" onClick={() => removeLabRow(i)} className="px-2 py-1 bg-red-500 text-white rounded">
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {/* Admission & follow-up */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={consultForm.admission_required}
                    onChange={(e) => setConsultForm((p) => ({ ...p, admission_required: e.target.checked }))}
                  />
                  <span>Requires Admission</span>
                </label>

                <div>
                  <label className="block text-sm">Follow-up date</label>
                  <input
                    type="date"
                    value={consultForm.follow_up_date}
                    onChange={(e) => setConsultForm((p) => ({ ...p, follow_up_date: e.target.value }))}
                    className="border p-2 rounded"
                  />
                </div>
              </div>

              {/* Free notes */}
              <div>
                <label className="block text-sm font-medium">Notes (free text)</label>
                <textarea
                  value={consultForm.notes}
                  onChange={(e) => setConsultForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full border p-2 rounded"
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setConsultModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                  Save Consultation & Complete Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- DISCHARGE MODAL ---------- */}
      {dischargeModalOpen && dischargePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white w-full max-w-xl rounded shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold">Discharge Summary — {dischargePatient.name}</h4>
              <button onClick={() => setDischargeModalOpen(false)} className="px-2 py-1 bg-gray-200 rounded">Close</button>
            </div>

            <form onSubmit={handleDischargeSubmit} className="space-y-3">
              <textarea
                required
                rows={6}
                placeholder="Write a clear discharge summary: treatments given, condition at discharge, medications, follow-up instructions..."
                value={dischargeSummary}
                onChange={(e) => setDischargeSummary(e.target.value)}
                className="w-full border p-2 rounded"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDischargeModalOpen(false)} className="px-3 py-1 bg-gray-300 rounded">
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded">
                  Record Discharge & Mark Patient Discharged
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------
   Small helper component to show recent medical records (global)
   - Demonstrates how to load other data from the backend
   - Best-effort: catches and logs errors if endpoint missing
   ------------------------- */
function RecentMedicalRecords() {
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("medical-records/?limit=10");
        setRecent(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        // no-op if endpoint missing
        setRecent([]);
      }
    })();
  }, []);
  return (
    <div className="bg-white rounded shadow p-4">
      {recent.length === 0 ? (
        <p className="text-gray-500">No recent records</p>
      ) : (
        <ul className="divide-y">
          {recent.map((r) => (
            <li key={r.id} className="py-2">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{r.patient?.name || r.patient_name || "Patient"}</div>
                  <div className="text-sm text-gray-600">{r.diagnosis || "Diagnosis N/A"}</div>
                </div>
                <div className="text-sm text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DoctorDashboard;
