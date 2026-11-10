import React, { useState } from 'react';
import axiosInstance from '../../lib/axios';

export default function UpdateOrder({ orderId, currentStatus, onStatusUpdated }) {
  const [isUpdating, setIsUpdating] = useState(false);

  // UPDATE ORDER STATUS
  const handleDropdownChange = async (e) => {
    const nextStatus = e.target.value;
    try {
      setIsUpdating(true);

      const { data } = await axiosInstance.put(
        `/update-orders/${orderId}`,
        { status: nextStatus }
      );

      // 3. Update parent layout state on success
      onStatusUpdated(orderId, nextStatus);
      if (data?.emailSent === false) {
        alert(data.message || 'Order status changed, but the customer notification email was not sent.');
      }
    } catch (err) {
      console.error('Error changing order status via Axios:', err);
      alert(err.response?.data?.message || 'Failed to modify order status. Access Denied.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <select
      value={currentStatus}
      onChange={handleDropdownChange}
      disabled={isUpdating}
      className="text-xs bg-gray-50 border border-gray-300 text-gray-700 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
   <option value="PENDING">Pending</option>
   <option value="CONFIRMED">Confirmed</option>
   <option value="PROCESSING">Processing</option>
   <option value="PACKED">Packed</option>
   <option value="SHIPPED">Shipped</option>
   <option value="OUT FOR DELIVERY">Out for Delivery</option>
   <option value="DELIVERED">Delivered</option>
   <option value="CANCELLED">Cancelled</option>
   <option value="RETURN REQUESTED">Return Requested</option>
   <option value="RETURNED">Returned</option>
   <option value="REFUNDED">Refunded</option>
    </select>
  );
}
