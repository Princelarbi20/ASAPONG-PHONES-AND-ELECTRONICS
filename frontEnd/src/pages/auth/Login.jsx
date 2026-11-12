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
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0)
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
      setFailedLoginAttempts(0);

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
      if (error.response?.status === 401) {
        setFailedLoginAttempts((attempts) => attempts + 1);
      }

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
    <div className="min-h-screen min-h-[100dvh] w-full bg-transparent flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-md min-h-0 flex flex-col justify-center space-y-4 overflow-y-auto bg-white/10 border border-slate-200/20 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg backdrop-blur-sm">
        <div className="text-center shrink-0">
          <ShopName />
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Sign in to your
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            <span className="font-semibold text-indigo-600">Asapong</span> account
          </p>
        </div>

        <div className="min-h-0 py-1">
          <CommonForms
            formControl={loginFormController}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            buttonText={isLoading ? 'Signing in...' : 'Sign In'}
          />
          {failedLoginAttempts >= 3 && (
            <p className="mt-3 text-center text-sm text-slate-600">
              Forgotten password?{' '}
              <Link to="/auth/forgot-password" className="font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-700">
                Reset it here
              </Link>
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 text-center shrink-0 space-y-1.5">
          <p className="text-xs text-gray-400">
            Don't have an account?{' '}
            <Link to="/auth/register" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors duration-200 underline underline-offset-4 decoration-indigo-200 hover:decoration-indigo-500">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
