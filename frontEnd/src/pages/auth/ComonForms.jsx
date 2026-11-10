

import React, { useState } from 'react';
import { Input } from "@base-ui/react/input";

export const CommonForms = ({ formControl = [], formData, setFormData, onSubmit, buttonText = "Submit" }) => {
  const [showPassword, setShowPassword] = useState(false);

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
                value={value}
                onChange={(e) => setFormData({
                  ...formData,
                  [getControlItem.name]: e.target.value
                })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm bg-gray-50/50 focus:bg-white transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-none"
              >
                {showPassword ? 'Hide' : 'Show'}
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
            value={value}
            onChange={(e) => setFormData({
              ...formData,
              [getControlItem.name]: e.target.value
            })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm bg-gray-50/50 focus:bg-white transition-all shadow-sm"
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
            onChange={(e) => setFormData({
              ...formData,
              [getControlItem.name]: e.target.value
            })}
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
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-col gap-4">
        {formControl.map((controlItem) => {
          const labelText = controlItem.label || controlItem.Label;

          return (
            <div className="flex flex-col w-full gap-1.5" key={controlItem.name}>
              {/* FIXED: Swapped out custom component for a robust, styled HTML label */}
              {labelText && (
                <label htmlFor={controlItem.name} className="block text-sm font-semibold text-gray-700">
                  {labelText}
                </label>
              )}
              
              {renderInputType(controlItem)}
            </div>
          );
        })}
      </div>

      <button
        type="submit"
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors cursor-pointer mt-2"
      >
        {buttonText}
      </button>
    </form>
  );
};

export default CommonForms;