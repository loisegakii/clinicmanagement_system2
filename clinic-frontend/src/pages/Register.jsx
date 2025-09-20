// src/pages/Register.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Create an Account
        </h2>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              placeholder="John Doe"
              className="input input-bordered w-full mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="input input-bordered w-full mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              placeholder="********"
              className="input input-bordered w-full mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="********"
              className="input input-bordered w-full mt-1"
            />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-4">
            Register
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{" "}
          <Link to="/" className="link link-primary">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
