

import React, { useState } from 'react';
import { Input } from "@base-ui/react/input";
import { Eye, EyeOff } from 'lucide-react';

export const CommonForms = ({ formControl = [], formData, setFormData, onSubmit, buttonText = "Submit" }) => {
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isRegistration = formControl.some((field) => field.name === 'userName');

  const validate = (onlyField) => {
    const nextErrors = {};
    for (const field of formControl.filter((item) => !onlyField || item.name === onlyField)) {
      const value = formData[field.name];
      const text = typeof value === 'string' ? value.trim() : '';
      if (!text) nextErrors[field.name] = 'This field is required.';
      else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) nextErrors[field.name] = 'Enter a valid email address.';
      else if (field.name === 'userName' && (text.length < 2 || text.length > 80 || !/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(text))) nextErrors[field.name] = 'Enter a valid name (2–80 characters).';
      else if (field.name === 'phone' && !/^(?:\+?233|0)\d{9}$/.test(text.replace(/[\s()-]/g, ''))) nextErrors[field.name] = 'Enter a valid Ghana phone number.';
      else if (field.name === 'password' && (text.length > 128 || (isRegistration && (text.length < 8 || !/[a-z]/.test(text) || !/[A-Z]/.test(text) || !/\d/.test(text) || !/[^A-Za-z\d]/.test(text))))) nextErrors[field.name] = isRegistration ? 'Use at least 8 characters with upper and lowercase letters, a number, and a symbol.' : 'Password is too long.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || !validate()) return;
    setSubmitting(true);
    try { await onSubmit(event); } finally { setSubmitting(false); }
  };

  const updateValue = (name, value) => {
    setFormData((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
  };

  // Helper engine to dynamically map schema objects to actual interactive elements
  function renderInputType(getControlItem) {
    let element = null;
    const value = formData[getControlItem.name] || "";
    const isPasswordField = getControlItem.name === 'password';

    switch (getControlItem.componentType || getControlItem.componetType) {
      case "input":
        if (isPasswordField) {
          element = (
            <div className="relative">
              <input
                name={getControlItem.name}
                placeholder={getControlItem.placeholder}
                id={getControlItem.name}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={Boolean(errors[getControlItem.name])}
                aria-describedby={errors[getControlItem.name] ? `${getControlItem.name}-error` : undefined}
                value={value}
                onBlur={() => validate(getControlItem.name)}
                onChange={(e) => updateValue(getControlItem.name, e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 pr-12 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm bg-gray-50/50 focus:bg-white transition-all shadow-sm ${errors[getControlItem.name] ? 'border-red-500' : 'border-gray-300'}`}
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-slate-500 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500">
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          );
        }
        element = (
          <Input 
            name={getControlItem.name}
            placeholder={getControlItem.placeholder}
            id={getControlItem.name}
            type={getControlItem.type || 'text'}
            aria-invalid={Boolean(errors[getControlItem.name])}
            aria-describedby={errors[getControlItem.name] ? `${getControlItem.name}-error` : undefined}
            value={value}
            onBlur={() => validate(getControlItem.name)}
            onChange={(e) => updateValue(getControlItem.name, e.target.value)}
            className={`w-full rounded-lg border px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm bg-gray-50/50 focus:bg-white transition-all shadow-sm ${errors[getControlItem.name] ? 'border-red-500' : 'border-gray-300'}`}
          />
        );
        break;

      case "textarea":
        element = (
      <textarea
            name={getControlItem.name}
            placeholder={getControlItem.placeholder}
            id={getControlItem.name}
            rows={getControlItem.rows || 4}
            value={value}
            onChange={(e) => updateValue(getControlItem.name, e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm bg-gray-50/50 focus:bg-white transition-all shadow-sm resize-none"
          />
        );
        break;

      default:
        element = null;
    }

    return element;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        {formControl.map((controlItem) => {
          const labelText = controlItem.label || controlItem.Label;

          return (
            <div className="flex flex-col w-full gap-1.5" key={controlItem.name}>
              {/* FIXED: Swapped out custom component for a robust, styled HTML label */}
              {labelText && (
                <label htmlFor={controlItem.name} className="block text-xs sm:text-sm font-semibold text-gray-700">
                  {labelText}
                </label>
              )}
              
              {renderInputType(controlItem)}
              {errors[controlItem.name] && <p id={`${controlItem.name}-error`} role="alert" className="text-xs text-red-600">{errors[controlItem.name]}</p>}
            </div>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors cursor-pointer mt-2"
      >
        {submitting ? 'Please wait…' : buttonText}
      </button>
    </form>
  );
};

export default CommonForms;
