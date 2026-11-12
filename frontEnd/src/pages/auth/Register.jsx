import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosInstance from '../../lib/axios'
import toast from 'react-hot-toast'
import CommonForms from './ComonForms' // Casing preserved exactly as requested
import { registerFormController } from '../../Data/Data'
import ShopName from '@/component/ShopName'
import { withCsrf } from '../../lib/csrf'


const initialState = { userName: '', email: '', password: '', phone: '' }

const Register = () => {
  const [formData, setFormData] = useState(initialState)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 🚀 withCredentials guarantees cookies are accepted and stored automatically by the browser
      const config = await withCsrf({ withCredentials: true })
      const response = await axiosInstance.post('/user-register', formData, config)
      const { user, otpExpiresAt } = response.data

      toast.success('Account created! Please verify your OTP.')
      // Navigate to OTP verification page with email in state
      navigate('/auth/otp-verify', { state: { email: user.email, otpExpiresAt } })
    } catch (error) {
      if (error.response?.status === 503 && error.response?.data?.user?.email) {
        toast.error(error.response.data.message || 'Account created, but the OTP email could not be sent. You can request another code now.');
        navigate('/auth/otp-verify', {
          state: {
            email: error.response.data.user.email,
            otpExpiresAt: error.response.data.otpExpiresAt,
          },
        });
        return;
      }
      const serverMessage = error.response?.data?.message;
      const statusText = error.response?.statusText;
      const statusCode = error.response?.status;

      const errorToastStyle = {
        style: {
          border: '2px solid #ef4444',   // Bold Red Border Line
          padding: '12px 16px',          // Comfortable internal padding
          color: '#1f2937',              // Clear dark charcoal text styling
          fontWeight: '500',             // Semi-bold message presentation
          backgroundColor: '#fff',       // Clean white panel layout
        },
        duration: 2000,
      };

      if (statusCode === 429) {
        toast.error(`Error 429: Too many registration attempts. Please wait a few minutes before trying again.`, errorToastStyle);
      } else if (serverMessage) {
        toast.error(serverMessage, errorToastStyle);
      } else if (statusText) {
        toast.error(`Server Error (${statusCode}): ${statusText}`, errorToastStyle);
      } else {
        toast.error(error.message || 'Registration failed. Check your connection or terminal code logs.', errorToastStyle);
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-transparent flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-md min-h-0 flex flex-col justify-center space-y-4 overflow-y-auto bg-white/10 border border-slate-200/20 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg backdrop-blur-sm">

        {/* Header Section */}
        <div className="text-center shrink-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">
            <ShopName />
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Join <span className="font-semibold text-indigo-600">Asapong Phones & Electronics</span> today
          </p>
        </div>

        {/* Dynamic Multi-Input Form Component Sheet Container */}
        <div className="min-h-0 py-1">
          <CommonForms
            formControl={registerFormController}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            buttonText={isLoading ? 'Creating account...' : 'Create Account'}
          />
        </div>

        {/* Footer Navigation Link */}
        <div className="pt-2 border-t border-gray-100 text-center shrink-0">
          <p className="text-xs text-gray-400">
            Already have an account?{' '}
            <Link to="/auth/login" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors duration-200 underline underline-offset-4 decoration-indigo-200 hover:decoration-indigo-500">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}

export default Register;
