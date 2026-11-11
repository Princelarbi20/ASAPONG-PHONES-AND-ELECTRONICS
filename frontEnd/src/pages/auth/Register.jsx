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
    <div className="h-screen w-full bg-transparent flex items-center justify-center p-0">
      <div className="w-full h-full flex flex-col justify-center space-y-3 overflow-hidden bg-white/10 border border-slate-200/20 p-6 shadow-lg backdrop-blur-sm">

        {/* Header Section */}
        <div className="text-center shrink-0">
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight leading-none">
            <ShopName />
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Join <span className="font-semibold text-indigo-600">Asapong Phones & Electronics</span> today
          </p>
        </div>

        {/* Dynamic Multi-Input Form Component Sheet Container */}
        <div className="flex-1 min-h-0 overflow-hidden py-1">
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
