// src/pages/Login.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext"; // use context for login

function Login() {
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      //  delegate to AuthContext
      await login(username, password);
      // no need to navigate here, AuthContext handles redirects by role
    } catch (err) {
      console.error("❌ Login error:", err.message);
      setError(err.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-100 px-4">
      <div className="max-w-md w-full bg-white shadow-xl rounded-lg p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-600 text-white text-3xl font-bold shadow-md">
            ✚
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-blue-700 tracking-wide">
            AfyaCare
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 text-red-600 text-sm p-2 border border-red-400 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-700 text-sm mb-1">Username</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm mb-1">Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Logging in...</span>
              </div>
            ) : (
              "Login"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 border-t pt-4 text-center text-xs text-gray-500">
          <p className="flex items-center justify-center space-x-2">
            <span className="text-blue-500">✚</span>
            <span>
              Secure access to <strong>AfyaCare</strong> Clinic System
            </span>
          </p>
          <p className="mt-1">
            © {new Date().getFullYear()} AfyaCare. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
