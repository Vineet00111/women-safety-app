import React, { useState, useContext } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useForm } from "react-hook-form";
import axios from "axios";
import { Config } from '../../API/Config';
import { useGoogleLogin } from "@react-oauth/google";
import { AuthContext } from '../Context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../API/CustomApi';

function Signup() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    // Destructured errors as formErrors to avoid confusion with the 'errors' state string
    const { register, handleSubmit, formState: { errors: formErrors } } = useForm();
    const [errors, setErrors] = useState("");
    const { checkAuth } = useContext(AuthContext);
    const navigate = useNavigate();
    const mobileNumberError =
        formErrors.MobileNo?.message ||
        (errors.toLowerCase().includes("mobile number") ? errors : "");

    const Submit = async (data) => {
        setErrors("");
        try {
            if (data.password !== password) {
                setErrors("Password Doesn't match");
                return;
            }

            if (!data.agreeToTerms) {
                setErrors("Please agree to the Terms and Privacy Policy");
                return;
            }

            setIsLoading(true);
            const response = await axios.post(Config.SignUPUrl, {
                username: data.userName,
                email: data.email,
                password: data.password,
                MobileNo: data.MobileNo // Added this line
            });

            if (response.data) {
                await checkAuth();
                navigate("/HomePage");
            }
        } catch (error) {
            setErrors(error.response?.data?.message || "Signup failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSuccess = async (tokenResponse) => {
        try {
            setIsLoading(true);
            const userInfoResponse = await axios.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                }
            );

            const googleUser = userInfoResponse.data;
            const response = await api.post(Config.GoogleSignUpUrl, {
                email: googleUser.email,
                googleId: googleUser.sub,
                name: googleUser.name,
                picture: googleUser.picture
            });

            if (response.data) {
                await checkAuth();
                navigate("/HomePage");
            }
        } catch (error) {
            setErrors("Google signup failed: " + (error.response?.data?.message || "Please try again"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignup = useGoogleLogin({
        onSuccess: handleGoogleSuccess,
        onError: (error) => {
            console.error("Google login error:", error);
            setErrors("Google signup failed. Please try again.");
        }
    });

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-100 p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <img className="h-12 mx-auto mb-4" src="/logo.svg" alt="Logo" />
                    <h1 className="text-2xl font-bold text-black mb-2">Create an Account</h1>
                    <p className="text-gray-600">Join us to stay safe and connected</p>
                </div>

                <form onSubmit={handleSubmit(Submit)} className="bg-white rounded-lg border-2 border-dotted border-black p-6 space-y-4">
                    <button
                        type="button"
                        disabled={isLoading}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 hover:bg-gray-50 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => handleGoogleSignup()}
                    >
                        <img src="/google.jfif" alt="Google logo" className="w-5 h-5" />
                        {isLoading ? 'Loading...' : 'Sign up with Google'}
                    </button>

                    {/* Display global error message */}
                    {(errors || formErrors.userName || formErrors.email || formErrors.MobileNo || formErrors.password) && (
                        <div className="text-red-500 text-sm text-center">
                            {errors || "Please fill in all required fields correctly"}
                        </div>
                    )}

                    <div className="relative flex py-5 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink mx-4 text-gray-400">or</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    {/* Username Field */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">User Name</label>
                        <input
                            type="text"
                            className={`w-full px-3 py-2 rounded-lg border ${formErrors.userName ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-black transition-colors duration-300`}
                            {...register("userName", { required: "Username is Required", maxLength: 20 })}
                            placeholder="Enter Your Username"
                        />
                    </div>

                    {/* Email Field */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            className={`w-full px-3 py-2 rounded-lg border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-black transition-colors duration-300`}
                            placeholder="john.doe@example.com"
                            {...register("email", {
                                required: true,
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: "invalid email address"
                                }
                            })}
                        />
                    </div>

                    {/* --- NEW: Mobile Number Field --- */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
                        <input
                            type="text"
                            className={`w-full px-3 py-2 rounded-lg border ${formErrors.MobileNo ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-black transition-colors duration-300`}
                            placeholder="Enter 10 digit number"
                            {...register("MobileNo", {
                                required: "Mobile number is required",
                                pattern: {
                                    value: /^[0-9]{10}$/,
                                    message: "Please enter a valid 10-digit number"
                                }
                            })}
                        />
                        {mobileNumberError && (
                            <p className="mt-1 text-sm text-red-500">{mobileNumberError}</p>
                        )}
                    </div>

                    {/* Password Field */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className={`w-full px-3 py-2 rounded-lg border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-black transition-colors duration-300`}
                                    placeholder="••••••••"
                                    {...register("password", { required: true, maxLength: 20 })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border ${errors === "Password Doesn't match" ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-black transition-colors duration-300`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showConfirmPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start space-x-2">
                        <input
                            type="checkbox"
                            className="mt-1 rounded border-gray-300 text-black focus:ring-black"
                            {...register("agreeToTerms", { required: true })}
                        />
                        <label className="text-sm text-gray-600">
                            I agree to the <a href="/terms" className="text-black hover:underline">Terms of Service</a> and <a href="/privacy" className="text-black hover:underline">Privacy Policy</a>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-black text-white rounded-lg py-2.5 font-semibold hover:bg-gray-800 transition-colors duration-300 disabled:opacity-50"
                    >
                        {isLoading ? 'Creating...' : 'Create Account'}
                    </button>

                    <div className="text-center text-sm text-gray-600">
                        Already have an account? <Link to="/login" className="font-semibold text-black hover:underline">Sign in</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Signup;
