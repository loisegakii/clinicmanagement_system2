// src/pages/DoctorDashboard.jsx
import React, { useEffect, useState } from "react";
import API from "../api/axios";
import { toast } from "react-hot-toast";
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
  FaEye,
  FaPlay,
  FaCheck,
  FaTimes,
  FaDownload,
  FaEdit,
  FaCamera
} from "react-icons/fa";

const DoctorDashboard = () => {
  // State management
  const [activeSection, setActiveSection] = useState("dashboard");
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState({});
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  // Consultation modal state
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultAppointment, setConsultAppointment] = useState(null);
  const [consultForm, setConsultForm] = useState({
    diagnosis: "",
    notes: "",
    prescriptions: [{ drug: "", dosage: "", frequency: "", duration: "" }],
    lab_requests: [""],
    admission_required: false,
    follow_up_date: "",
  });

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalConsultations: 0,
    pendingAppointments: 0,
    admittedPatients: 0,
  });

  // Fetch all data
  useEffect(() => {
    reloadAll();
  }, []);

  const reloadAll = async () => {
    await Promise.all([
      fetchPatients(),
      fetchAppointments(),
      fetchMedicalRecords(),
      fetchDoctorProfile(),
      fetchNotifications(),
      fetchStats(),
    ]);
  };

  // Fetch doctor's assigned patients
  const fetchPatients = async () => {
    try {
      const res = await API.get("doctors/patients/");
      setPatients(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn("fetchPatients failed", err);
      setPatients([]);
    }
  };

  // Fetch appointments
  const fetchAppointments = async () => {
    try {
      const res = await API.get("doctors/appointments/");
      setAppointments(Array.isArray(res.data) ? res.data : []);
      
      // Update stats
      const pending = res.data.filter(a => ["REQUESTED", "PENDING"].includes(a.status?.toUpperCase()));
      setStats(prev => ({ ...prev, pendingAppointments: pending.length }));
    } catch (err) {
      console.warn("fetchAppointments failed", err);
      setAppointments([]);
    }
  };

  // Fetch medical records
  const fetchMedicalRecords = async () => {
    try {
      const res = await API.get("medical-records/");
      setMedicalRecords(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn("fetchMedicalRecords failed", err);
      setMedicalRecords([]);
    }
  };

  // Fetch doctor profile
  const fetchDoctorProfile = async () => {
    try {
      const res = await API.get("me/");
      setDoctorProfile(res.data);
    } catch (err) {
      console.warn("fetchDoctorProfile failed", err);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await API.get("doctors/notifications/");
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setNotifications([]);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await API.get("doctors/dashboard/");
      if (res.data) setStats(prev => ({ ...prev, ...res.data }));
    } catch (err) {
      // Use derived stats
    }
  };

  // Update the viewPatientDetails function to handle API errors better
  const viewPatientDetails = async (patient) => {
    setLoading(true);
    try {
      // Fetch comprehensive patient data from all sources
      const requests = [
        API.get(`patients/${patient.id}/`),
        API.get(`medical-records/?patient=${patient.id}`),
        API.get(`lab-results/?patient=${patient.id}`),
        API.get(`prescriptions/?patient=${patient.id}`)
      ];

      const [patientRes, medicalRecordsRes, labResultsRes, prescriptionsRes] = await Promise.allSettled(requests);

      // Handle responses even if some fail
      const patientData = patientRes.status === 'fulfilled' ? patientRes.value.data : patient;
      const medicalRecords = medicalRecordsRes.status === 'fulfilled' ? medicalRecordsRes.value.data : [];
      const labResults = labResultsRes.status === 'fulfilled' ? labResultsRes.value.data : [];
      const prescriptions = prescriptionsRes.status === 'fulfilled' ? prescriptionsRes.value.data : [];

      setPatientDetails({
        ...patientData,
        medicalRecords: Array.isArray(medicalRecords) ? medicalRecords : [],
        labResults: Array.isArray(labResults) ? labResults : [],
        prescriptions: Array.isArray(prescriptions) ? prescriptions : []
      });
      setSelectedPatient(patient);
    } catch (err) {
      toast.error("Failed to load patient details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fixed handleApproveAppointment function
  const handleApproveAppointment = async (appointment) => {
    try {
      setLoading(true);
      
      // Use the approve endpoint
      const response = await API.patch(`appointments/${appointment.id}/approve/`);
      
      // Update local state immediately for better UX
      setAppointments(prev => 
        prev.map(a => 
          a.id === appointment.id 
            ? { ...a, status: "ACCEPTED" } 
            : a
        )
      );
      
      toast.success("Appointment approved successfully");
      
      // Refresh data to get latest from server
      await Promise.all([fetchAppointments(), fetchStats()]);
      
    } catch (err) {
      console.error("Error approving appointment:", err);
      toast.error(err.response?.data?.error || "Failed to approve appointment");
    } finally {
      setLoading(false);
    }
  };

  // Fixed handleDeclineAppointment function  
  const handleDeclineAppointment = async (appointment) => {
    if (!window.confirm("Are you sure you want to decline this appointment?")) return;
    
    try {
      setLoading(true);
      
      // Use the decline endpoint
      const response = await API.patch(`appointments/${appointment.id}/decline/`);
      
      // Update local state
      setAppointments(prev => 
        prev.map(a => 
          a.id === appointment.id 
            ? { ...a, status: "DECLINED" } 
            : a
        )
      );
      
      toast.success("Appointment declined");
      
      // Refresh data
      await Promise.all([fetchAppointments(), fetchStats()]);
      
    } catch (err) {
      console.error("Error declining appointment:", err);
      toast.error(err.response?.data?.error || "Failed to decline appointment");
    } finally {
      setLoading(false);
    }
  };

  // Fixed startConsultation function
  const startConsultation = (appointment) => {
    // Find the patient for this appointment
    const appointmentPatient = {
      id: appointment.patient_id || appointment.patient?.id,
      name: appointment.patient_name || appointment.patient?.name,
      first_name: appointment.patient?.first_name || "",
      last_name: appointment.patient?.last_name || ""
    };

    setSelectedPatient(appointmentPatient);
    setConsultAppointment(appointment);
    
    // Reset consultation form
    setConsultForm({
      diagnosis: "",
      notes: "",
      prescriptions: [{ drug: "", dosage: "", frequency: "", duration: "" }],
      lab_requests: [""],
      admission_required: false,
      follow_up_date: "",
    });
    
    setConsultModalOpen(true);
  };

  // Fixed handleSaveConsultation function
  const handleSaveConsultation = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient || !consultAppointment) {
      toast.error("Missing patient or appointment information");
      return;
    }

    try {
      setLoading(true);

      // Create medical record
      const medicalRecordPayload = {
        patient: selectedPatient.id,
        appointment: consultAppointment.id,
        diagnosis: consultForm.diagnosis,
        notes: JSON.stringify({
          prescriptions: consultForm.prescriptions.filter(p => p.drug.trim()),
          lab_requests: consultForm.lab_requests.filter(req => req.trim()),
          admission_required: consultForm.admission_required,
          follow_up_date: consultForm.follow_up_date,
          consultation_notes: consultForm.notes,
        }),
      };

      await API.post("medical-records/", medicalRecordPayload);

      // Complete the appointment using the complete endpoint
      await API.patch(`appointments/${consultAppointment.id}/complete/`);

      // Close modal and refresh data
      setConsultModalOpen(false);
      setConsultAppointment(null);
      setSelectedPatient(null);
      
      await reloadAll();
      toast.success("Consultation saved and appointment completed successfully");
    } catch (err) {
      console.error("Error saving consultation:", err);
      toast.error(err.response?.data?.error || "Failed to save consultation");
    } finally {
      setLoading(false);
    }
  };

  // Prescription management - Fixed updatePrescriptionField function
  const updatePrescriptionField = (index, field, value) => {
    setConsultForm(prev => {
      const newPrescriptions = [...prev.prescriptions];
      newPrescriptions[index] = { ...newPrescriptions[index], [field]: value };
      return { ...prev, prescriptions: newPrescriptions };
    });
  };

  const addPrescriptionRow = () => {
    setConsultForm(prev => ({
      ...prev,
      prescriptions: [...prev.prescriptions, { drug: "", dosage: "", frequency: "", duration: "" }]
    }));
  };

  const removePrescriptionRow = (index) => {
    if (consultForm.prescriptions.length > 1) {
      setConsultForm(prev => ({
        ...prev,
        prescriptions: prev.prescriptions.filter((_, i) => i !== index)
      }));
    }
  };

  // Lab requests management
  const addLabRow = () => {
    setConsultForm(prev => ({
      ...prev,
      lab_requests: [...prev.lab_requests, ""]
    }));
  };

  const removeLabRow = (index) => {
    if (consultForm.lab_requests.length > 1) {
      setConsultForm(prev => ({
        ...prev,
        lab_requests: prev.lab_requests.filter((_, i) => i !== index)
      }));
    }
  };

  const updateLabField = (index, value) => {
    setConsultForm(prev => {
      const newLabRequests = [...prev.lab_requests];
      newLabRequests[index] = value;
      return { ...prev, lab_requests: newLabRequests };
    });
  };

  // Get appointment status display
  const getAppointmentStatusButton = (appointment) => {
    const status = appointment.status?.toUpperCase();
    
    if (["REQUESTED", "PENDING"].includes(status)) {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => handleApproveAppointment(appointment)}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
            disabled={loading}
          >
            <FaCheck size={12} /> Approve
          </button>
          <button
            onClick={() => handleDeclineAppointment(appointment)}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
            disabled={loading}
          >
            <FaTimes size={12} /> Decline
          </button>
        </div>
      );
    }
    
    if (["ACCEPTED", "APPROVED"].includes(status)) {
      return (
        <button
          onClick={() => startConsultation(appointment)}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
        >
          <FaPlay size={12} /> Start Consultation
        </button>
      );
    }
    
    if (["COMPLETED", "DONE"].includes(status)) {
      return (
        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded">
          Completed
        </span>
      );
    }
    
    return (
      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded">
        {appointment.status}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
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
              className={`p-3 rounded cursor-pointer hover:bg-blue-700 transition-colors ${
                activeSection === "dashboard" ? "bg-blue-900" : ""
              }`}
              onClick={() => setActiveSection("dashboard")}
            >
              <div className="flex items-center gap-3">
                <FaHome />
                <span>Dashboard</span>
              </div>
            </li>

            <li
              className={`p-3 rounded cursor-pointer hover:bg-blue-700 transition-colors ${
                activeSection === "patients" ? "bg-blue-900" : ""
              }`}
              onClick={() => setActiveSection("patients")}
            >
              <div className="flex items-center gap-3">
                <FaUsers />
                <span>My Patients</span>
              </div>
            </li>

            <li
              className={`p-3 rounded cursor-pointer hover:bg-blue-700 transition-colors ${
                activeSection === "appointments" ? "bg-blue-900" : ""
              }`}
              onClick={() => setActiveSection("appointments")}
            >
              <div className="flex items-center gap-3">
                <FaCalendarAlt />
                <span>Appointments</span>
              </div>
            </li>

            <li
              className={`p-3 rounded cursor-pointer hover:bg-blue-700 transition-colors ${
                activeSection === "records" ? "bg-blue-900" : ""
              }`}
              onClick={() => setActiveSection("records")}
            >
              <div className="flex items-center gap-3">
                <FaNotesMedical />
                <span>Medical Records</span>
              </div>
            </li>

            <li
              className={`p-3 rounded cursor-pointer hover:bg-blue-700 transition-colors ${
                activeSection === "profile" ? "bg-blue-900" : ""
              }`}
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
            className="w-full text-left p-3 rounded bg-red-600 hover:bg-red-700 flex items-center gap-2 transition-colors"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              Welcome, Dr. {doctorProfile.first_name} {doctorProfile.last_name}
            </h2>
            <p className="text-sm text-gray-600">
              {doctorProfile.specialization} • Today is {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-gray-100"
            >
              <FaBell className="text-xl text-gray-700" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1.5">
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-md z-40 p-4 max-h-96 overflow-y-auto">
                <h3 className="font-semibold mb-2">Notifications</h3>
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500">No new notifications</p>
                ) : (
                  notifications.map((notif, index) => (
                    <div key={index} className="text-sm p-2 border-b hover:bg-gray-50">
                      {notif.message}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Overview */}
        {activeSection === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <FaUsers className="text-blue-600 text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">My Patients</p>
                    <p className="text-2xl font-bold">{patients.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <FaCalendarAlt className="text-yellow-600 text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Pending Appointments</p>
                    <p className="text-2xl font-bold">{stats.pendingAppointments}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full">
                    <FaNotesMedical className="text-green-600 text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Medical Records</p>
                    <p className="text-2xl font-bold">{medicalRecords.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Patients Section */}
        {activeSection === "patients" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">My Patients</h3>
              <button
                onClick={fetchPatients}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Age
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {patient.name || `${patient.first_name} ${patient.last_name}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              {patient.phone || 'No phone'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.age || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.gender || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          patient.status === 'Admitted' 
                            ? 'bg-green-100 text-green-800'
                            : patient.status === 'Discharged'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {patient.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => viewPatientDetails(patient)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          disabled={loading}
                        >
                          <FaEye className="mr-1" />
                          {loading ? 'Loading...' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {patients.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No patients assigned to you yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Appointments Section */}
        {activeSection === "appointments" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Appointments</h3>
              <div className="text-sm text-gray-500">
                Total: {appointments.length} • Pending: {stats.pendingAppointments}
              </div>
            </div>

            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-lg">
                          {appointment.patient_name || 'Unknown Patient'}
                        </h4>
                        {appointment.is_emergency && (
                          <FaExclamationTriangle className="text-red-600" />
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p><strong>Date:</strong> {appointment.date}</p>
                          <p><strong>Time:</strong> {appointment.time}</p>
                        </div>
                        <div>
                          <p><strong>Status:</strong> {appointment.status}</p>
                          <p><strong>Reason:</strong> {appointment.reason || 'N/A'}</p>
                        </div>
                      </div>
                      
                      {appointment.notes && (
                        <div className="mt-3">
                          <p className="text-sm"><strong>Notes:</strong> {appointment.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      {getAppointmentStatusButton(appointment)}
                    </div>
                  </div>
                </div>
              ))}

              {appointments.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No appointments scheduled.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Medical Records Section */}
        {activeSection === "records" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Medical Records</h3>
              <button
                onClick={fetchMedicalRecords}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh Records
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h4 className="font-medium">Patient Medical Records</h4>
                <p className="text-sm text-gray-600">Complete history of all consultations and treatments</p>
              </div>

              <div className="divide-y divide-gray-200">
                {medicalRecords.map((record) => (
                  <div key={record.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-semibold">
                            {record.patient_name || record.patient?.name || 'Unknown Patient'}
                          </h5>
                          <span className="text-sm text-gray-500">
                            {new Date(record.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          {record.diagnosis && (
                            <p><strong>Diagnosis:</strong> {record.diagnosis}</p>
                          )}
                          
                          {record.notes && (
                            <div>
                              <strong>Notes:</strong>
                              <div className="mt-1 p-3 bg-gray-50 rounded">
                                {(() => {
                                  try {
                                    const parsedNotes = JSON.parse(record.notes);
                                    return (
                                      <div className="space-y-2">
                                        {parsedNotes.consultation_notes && (
                                          <p><em>Consultation:</em> {parsedNotes.consultation_notes}</p>
                                        )}
                                        {parsedNotes.prescriptions && parsedNotes.prescriptions.length > 0 && (
                                          <div>
                                            <em>Prescriptions:</em>
                                            <ul className="list-disc list-inside ml-2">
                                              {parsedNotes.prescriptions.map((presc, idx) => (
                                                <li key={idx}>
                                                  {presc.drug} - {presc.dosage} ({presc.frequency})
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {parsedNotes.lab_requests && parsedNotes.lab_requests.length > 0 && (
                                          <div>
                                            <em>Lab Requests:</em> {parsedNotes.lab_requests.filter(req => req).join(', ')}
                                          </div>
                                        )}
                                        {parsedNotes.admission_required && (
                                          <p><em>Admission Required:</em> Yes</p>
                                        )}
                                        {parsedNotes.follow_up_date && (
                                          <p><em>Follow-up:</em> {parsedNotes.follow_up_date}</p>
                                        )}
                                      </div>
                                    );
                                  } catch {
                                    return <p>{record.notes}</p>;
                                  }
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          title="Download Record"
                        >
                          <FaDownload />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {medicalRecords.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No medical records found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Section */}
        {activeSection === "profile" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
                <h3 className="text-xl font-semibold text-white">Doctor Profile</h3>
              </div>

              <div className="p-6">
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <div className="w-32 h-32 bg-gray-300 rounded-full flex items-center justify-center">
                        <FaUserMd className="text-4xl text-gray-600" />
                      </div>
                      <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700">
                        <FaCamera size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={doctorProfile.first_name || ''}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={doctorProfile.last_name || ''}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={doctorProfile.email || ''}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Username
                        </label>
                        <input
                          type="text"
                          value={doctorProfile.username || ''}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Specialization
                        </label>
                        <input
                          type="text"
                          value={doctorProfile.specialization || ''}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Role
                        </label>
                        <input
                          type="text"
                          value={doctorProfile.role || ''}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h4 className="text-lg font-semibold mb-4">Professional Statistics</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-600">{patients.length}</div>
                          <div className="text-sm text-blue-800">Total Patients</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-600">{appointments.length}</div>
                          <div className="text-sm text-green-800">Total Appointments</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-purple-600">{medicalRecords.length}</div>
                          <div className="text-sm text-purple-800">Medical Records</div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <div className="flex justify-end space-x-3">
                        <button className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                          <FaEdit className="inline mr-2" />
                          Edit Profile
                        </button>
                        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Patient Details Modal */}
      {selectedPatient && patientDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold">
                Patient Details - {patientDetails.name || `${patientDetails.first_name} ${patientDetails.last_name}`}
              </h3>
              <button
                onClick={() => {
                  setSelectedPatient(null);
                  setPatientDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 text-gray-800">Basic Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Age:</span> {patientDetails.age || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Gender:</span> {patientDetails.gender || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {patientDetails.phone || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {patientDetails.status || 'Active'}
                  </div>
                </div>
              </div>

              {/* Current Vitals */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 text-blue-800">Current Vitals (From Nurse)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Temperature:</span> {patientDetails.temperature ? `${patientDetails.temperature}°C` : 'Not recorded'}
                  </div>
                  <div>
                    <span className="font-medium">Blood Pressure:</span> {patientDetails.blood_pressure || 'Not recorded'}
                  </div>
                  <div>
                    <span className="font-medium">Heart Rate:</span> {patientDetails.heart_rate ? `${patientDetails.heart_rate} bpm` : 'Not recorded'}
                  </div>
                  <div>
                    <span className="font-medium">Respiratory Rate:</span> {patientDetails.respiratory_rate ? `${patientDetails.respiratory_rate}/min` : 'Not recorded'}
                  </div>
                </div>
              </div>

              {/* Medical Records */}
              <div>
                <h4 className="font-semibold mb-3 text-gray-800">Medical History</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {patientDetails.medicalRecords?.length > 0 ? (
                    patientDetails.medicalRecords.map((record) => (
                      <div key={record.id} className="bg-white border p-4 rounded">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{record.diagnosis || 'No diagnosis'}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(record.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {record.notes && <p className="text-sm text-gray-600">{record.notes}</p>}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No medical records available</p>
                  )}
                </div>
              </div>

              {/* Lab Results */}
              <div>
                <h4 className="font-semibold mb-3 text-gray-800">Lab Results</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {patientDetails.labResults?.length > 0 ? (
                    patientDetails.labResults.map((result) => (
                      <div key={result.id} className="bg-white border p-4 rounded">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{result.test_name}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(result.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{result.result}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No lab results available</p>
                  )}
                </div>
              </div>

              {/* Prescriptions */}
              <div>
                <h4 className="font-semibold mb-3 text-gray-800">Current Prescriptions (From Pharmacy)</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {patientDetails.prescriptions?.length > 0 ? (
                    patientDetails.prescriptions.map((prescription) => (
                      <div key={prescription.id} className="bg-white border p-4 rounded">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{prescription.medication_name}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            prescription.status === 'DISPENSED' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {prescription.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {prescription.dosage} - {prescription.duration}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No prescriptions available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Consultation Modal */}
      {consultModalOpen && selectedPatient && consultAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold">
                Consultation - {selectedPatient.name || consultAppointment.patient_name}
              </h3>
              <button
                onClick={() => {
                  setConsultModalOpen(false);
                  setConsultAppointment(null);
                  setSelectedPatient(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveConsultation} className="p-6 space-y-6">
              {/* Diagnosis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagnosis *
                </label>
                <input
                  type="text"
                  required
                  value={consultForm.diagnosis}
                  onChange={(e) => setConsultForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter primary diagnosis"
                />
              </div>

              {/* Prescriptions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Prescriptions
                  </label>
                  <button
                    type="button"
                    onClick={addPrescriptionRow}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Add Prescription
                  </button>
                </div>

                <div className="space-y-3">
                  {consultForm.prescriptions.map((prescription, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border rounded-lg">
                      <input
                        type="text"
                        placeholder="Drug name"
                        value={prescription.drug}
                        onChange={(e) => updatePrescriptionField(index, 'drug', e.target.value)}
                        className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Dosage"
                        value={prescription.dosage}
                        onChange={(e) => updatePrescriptionField(index, 'dosage', e.target.value)}
                        className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Frequency"
                        value={prescription.frequency}
                        onChange={(e) => updatePrescriptionField(index, 'frequency', e.target.value)}
                        className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Duration"
                        value={prescription.duration}
                        onChange={(e) => updatePrescriptionField(index, 'duration', e.target.value)}
                        className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removePrescriptionRow(index)}
                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lab Requests */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Lab Requests
                  </label>
                  <button
                    type="button"
                    onClick={addLabRow}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Add Lab Request
                  </button>
                </div>

                <div className="space-y-2">
                  {consultForm.lab_requests.map((request, index) => (
                    <div key={index} className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Lab test (e.g., CBC, X-ray, Blood Sugar)"
                        value={request}
                        onChange={(e) => updateLabField(index, e.target.value)}
                        className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeLabRow(index)}
                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={consultForm.admission_required}
                      onChange={(e) => setConsultForm(prev => ({ 
                        ...prev, 
                        admission_required: e.target.checked 
                      }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Admission Required
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={consultForm.follow_up_date}
                    onChange={(e) => setConsultForm(prev => ({ 
                      ...prev, 
                      follow_up_date: e.target.value 
                    }))}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  rows={4}
                  value={consultForm.notes}
                  onChange={(e) => setConsultForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter any additional observations or instructions..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setConsultModalOpen(false);
                    setConsultAppointment(null);
                    setSelectedPatient(null);
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={loading}
                >
                  {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                  Save & Complete Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;