// src/pages/PatientDetails.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../api/axios";
import { ArrowLeft, Calendar, User, FileText, Stethoscope } from "lucide-react";

function PatientDetails() {
  const { id } = useParams(); // patientId from route
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Notes state
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Fetch patient details
  const fetchPatient = async () => {
    try {
      const res = await API.get(`/patients/${id}/`);
      setPatient(res.data);
    } catch (err) {
      setError("Failed to fetch patient details.");
    }
  };

  // Fetch appointments (doctor fetched directly from backend)
  const fetchAppointments = async () => {
    try {
      const res = await API.get("/appointments/");
      const patientAppointments = (Array.isArray(res.data)
        ? res.data
        : res.data.results || []
      ).filter((a) => a.patient?.id === parseInt(id));

      setAppointments(patientAppointments);
    } catch (err) {
      console.error("❌ Failed to fetch appointments:", err.message);
    }
  };

  // Save notes_for_doctor with timestamp
  const saveNotes = async () => {
    if (!note.trim()) return;
    setSaving(true);
    setMessage("");

    const today = new Date().toLocaleDateString();
    const newEntry = `[${today}] ${note}`;
    const updatedNotes = patient.notes_for_doctor
      ? `${patient.notes_for_doctor}\n${newEntry}`
      : newEntry;

    try {
      await API.patch(`/patients/${id}/`, { notes_for_doctor: updatedNotes });
      setPatient((prev) => ({ ...prev, notes_for_doctor: updatedNotes }));
      setNote("");
      setMessage("✅ Note saved successfully!");
    } catch (err) {
      setMessage("❌ Failed to save note.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchPatient(), fetchAppointments()]).finally(() =>
      setLoading(false)
    );
  }, [id]);

  if (loading) return <p className="text-center py-6">Loading...</p>;
  if (error) return <p className="text-center py-6 text-red-600">{error}</p>;
  if (!patient) return <p className="text-center py-6 text-gray-500">Patient not found.</p>;

  // ✅ Collect unique doctors from all appointments
  const doctorsAssigned = Array.from(
    new Map(
      appointments
        .filter((a) => a.doctor_name) // only valid doctors
        .map((a) => [
          a.doctor_name + "|" + (a.doctor_specialty || ""),
          { name: a.doctor_name, specialty: a.doctor_specialty },
        ])
    ).values()
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-green-600 hover:text-green-800"
        >
          <ArrowLeft size={18} /> <span>Back to Patients</span>
        </button>
      </div>

      {/* Patient Info */}
      <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-2">
          <User className="text-green-600" /> Patient Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
          <p><span className="font-medium">Full Name:</span> {patient.first_name} {patient.last_name}</p>
          <p><span className="font-medium">Username:</span> {patient.username}</p>
          <p><span className="font-medium">Email:</span> {patient.email}</p>
          <p><span className="font-medium">Phone:</span> {patient.phone || "—"}</p>
          <p><span className="font-medium">Address:</span> {patient.address || "—"}</p>
          <p><span className="font-medium">Gender:</span> {patient.gender === "M" ? "Male" : "Female"}</p>
          <p><span className="font-medium">Date of Birth:</span> {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "—"}</p>
          <p><span className="font-medium">Next of Kin:</span> {patient.next_of_kin_name || "—"} ({patient.next_of_kin_phone || "—"})</p>

          {/* ✅ Doctors Assigned */}
          <div className="col-span-1 md:col-span-2">
            <p className="flex items-center gap-2 font-medium text-gray-800 mb-1">
              <Stethoscope className="text-green-600" size={18} />
              Doctor(s) Assigned:
            </p>
            {doctorsAssigned.length > 0 ? (
              <ul className="list-disc list-inside text-gray-700 ml-6">
                {doctorsAssigned.map((doc, idx) => (
                  <li key={idx}>
                    Dr. {doc.name}{" "}
                    {doc.specialty && (
                      <span className="text-sm text-gray-500">({doc.specialty})</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 ml-6">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Notes for Doctor */}
      <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-black mb-4 flex items-center gap-2">
          <FileText className="text-blue-600" /> Notes for Doctor
        </h2>

        {patient.notes_for_doctor ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 whitespace-pre-line text-sm text-gray-700">
            {patient.notes_for_doctor}
          </div>
        ) : (
          <p className="text-gray-500 mb-4">No notes yet.</p>
        )}

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
          rows={3}
          placeholder="Add a new note for the doctor..."
        />
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={saveNotes}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-white ${
              saving ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {saving ? "Saving..." : "Save Note"}
          </button>
          {message && (
            <p className={`text-sm ${message.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
              {message}
            </p>
          )}
        </div>
      </div>

      {/* Appointments */}
      <div className="bg-white shadow-lg rounded-xl p-6">
        <h2 className="text-xl font-semibold text-black mb-4 flex items-center gap-2">
          <Calendar className="text-red-600" /> Appointments
        </h2>
        {appointments.length === 0 ? (
          <p className="text-gray-500">No appointments found.</p>
        ) : (
          <div className="space-y-4">
            {appointments.map((a) => (
              <div
                key={a.id}
                className="p-4 border rounded-lg shadow flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-black">
                    Dr. {a.doctor_name || "Unknown"}{" "}
                    {a.doctor_specialty && (
                      <span className="text-sm text-gray-500">
                        ({a.doctor_specialty})
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">
                    Date: {new Date(a.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Status: {a.status || "Scheduled"}
                  </p>
                </div>
                <Link
                  to="/appointments"
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                >
                  Manage
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientDetails;
