// src/pages/LabTechnicianDashboard.jsx
export default function LabTechnicianDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Lab Technician Dashboard</h1>
      <p className="text-gray-700 mb-6">
        Welcome! Here you can manage lab tests, view pending requests, and upload results.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Tests */}
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-2">Pending Tests</h2>
          <p className="text-gray-600">View and process pending lab test requests.</p>
        </div>

        {/* Completed Tests */}
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-2">Completed Tests</h2>
          <p className="text-gray-600">Access completed lab results and reports.</p>
        </div>

        {/* Upload Results */}
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-2">Upload Results</h2>
          <p className="text-gray-600">Upload new test results for patients.</p>
        </div>
      </div>
    </div>
  );
}
