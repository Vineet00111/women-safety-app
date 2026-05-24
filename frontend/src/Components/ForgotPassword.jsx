import React, { useState } from 'react';
import api from '../../API/CustomApi';
import { Config } from '../../API/Config';
import { Link, useNavigate } from 'react-router-dom';

function ForgotPassword() {
  const [formData, setFormData] = useState({
    email: '',
    mobileNo: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.email || !formData.mobileNo || !formData.newPassword || !formData.confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (!/^\d{10}$/.test(formData.mobileNo.trim())) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post(Config.FORGOTPASSWORDUrl, {
        email: formData.email.trim(),
        MobileNo: formData.mobileNo.trim(),
        newPassword: formData.newPassword,
      });

      setSuccess(response.data?.message || 'Password updated successfully.');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img className="h-12 mx-auto mb-4" src="/logo.svg" alt="Logo" />
          <h1 className="text-2xl font-bold text-black mb-2">Reset Password</h1>
          <p className="text-gray-600">Verify your email and mobile number to set a new password</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border-2 border-dotted border-black p-6 space-y-4">
          {(error || success) && (
            <div className={`text-sm text-center ${error ? 'text-red-500' : 'text-green-600'}`}>
              {error || success}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-black transition-colors duration-300"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
            <input
              type="text"
              name="mobileNo"
              value={formData.mobileNo}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-black transition-colors duration-300"
              placeholder="Enter your 10-digit mobile number"
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-black transition-colors duration-300"
              placeholder="Enter a new password"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-black transition-colors duration-300"
              placeholder="Confirm your new password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white rounded-lg py-2.5 font-semibold hover:bg-gray-800 transition-colors duration-300 disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Reset Password'}
          </button>

          <div className="text-center text-sm text-gray-600">
            Back to <Link to="/login" className="font-semibold text-black hover:underline">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;
