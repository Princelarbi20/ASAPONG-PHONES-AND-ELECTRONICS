import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosInstance from '../../lib/axios'
import toast from 'react-hot-toast'
import CommonForms from './ComonForms' 
import { loginFormController } from '../../Data/Data'
import { useDispatch } from 'react-redux'
import { authAction } from '../../redux/store'
import ShopName from '@/component/ShopName'
import { withCsrf } from '../../lib/csrf'

const initialState = { email: '', password: '' }

const Login = () => {
  const [formData, setFormData] = useState(initialState)
  const [isLoading, setIsLoading] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    const errorToastStyle = {
      style: {
        border: '2px solid #ef4444',
        padding: '12px 16px',
        color: '#1f2937',
        fontWeight: '500',
        backgroundColor: '#fff',
      },
      duration: 3000,
    };

    try {
      // 1. Fetch baseline CSRF configuration with credentials enabled
      const baseConfig = await withCsrf({ withCredentials: true });
      const response = await axiosInstance.post('/user-login', formData, baseConfig);
      const { user, accountType } = response.data;

      // 3. Persist display data in Redux (JWT remains stored in HttpOnly cookie)
      dispatch(authAction.login({ user, role: user?.role, accountType }));
      toast.success('Login successful!');

      // 4. Role-based Navigation Matrix
      const role = user?.role?.toUpperCase();
      if (role === 'ADMIN') {
        navigate('/admin');
      } else if (accountType === 'DEALER' || role === 'DEALER') {
        navigate('/dealer');
      } else {
        navigate('/');
      }
      
    } catch (error) {
      // Extract backend response error message
      const serverMessage = error.response?.data?.message || 'Login failed. Please try again.';

      // Unverified accounts must complete OTP verification before they can log in.
      if (error.response?.status === 403 && error.response?.data?.isVerified === false) {
        toast.error(serverMessage, errorToastStyle);
        navigate('/auth/otp-verify', {
          state: {
            email: formData.email.trim().toLowerCase(),
            otpExpiresAt: error.response.data.otpExpiresAt,
          },
        });
      } else if (error.response?.status === 403) {
        toast.error(serverMessage, errorToastStyle);
      } else if (error.response?.status === 401) {
        toast.error(serverMessage, errorToastStyle);
      } else {
        toast.error(serverMessage, errorToastStyle);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="h-screen w-full bg-transparent flex items-center justify-center p-0">
      <div className="w-full h-full flex flex-col justify-center space-y-3 overflow-hidden bg-white/10 border border-slate-200/20 p-6 shadow-lg backdrop-blur-sm">
        <div className="text-center shrink-0">
          <ShopName />
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight leading-none">
            Sign in to your
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            <span className="font-semibold text-indigo-600">Asapong</span> account
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden py-1">
          <CommonForms
            formControl={loginFormController}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            buttonText={isLoading ? 'Signing in...' : 'Sign In'}
          />
        </div>

        <div className="pt-2 border-t border-gray-100 text-center shrink-0 space-y-1.5">
          <p className="text-xs text-gray-400">
            Don't have an account?{' '}
            <Link to="/auth/register" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors duration-200 underline underline-offset-4 decoration-indigo-200 hover:decoration-indigo-500">
              Create one
            </Link>
          </p>
          <p className="text-xs text-gray-400">
            <Link to="/auth/reset-password" className="font-medium text-slate-500 hover:text-indigo-600 transition-colors duration-200">
              Forgot password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
