import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCashOnDeliveryOrderEmail, buildPaymentConfirmationEmail } from '../utils/orderEmail.js';
import { buildOrderStatusEmail } from '../utils/orderStatusEmail.js';

const order = {
  _id: '64b000000000000000000001', orderNumber: 'AS-1001', customerName: 'Ama Customer',
  customerEmail: 'ama@example.com', totalPrice: 350, paymentMethod: 'COD', paymentStatus: 'PENDING',
  shippingAddress: { address: '12 Main Road', city: 'Accra', country: 'Ghana' },
  items: [{ name: 'Phone', quantity: 2, price: 150 }],
};

test('COD confirmation includes order, payment, delivery and GHS totals', () => {
  const email = buildCashOnDeliveryOrderEmail(order);
  assert.match(email.subject, /AS-1001/);
  for (const value of ['Ama Customer', 'Phone', 'Qty: 2', 'Subtotal', 'Delivery charges', 'GHS', 'Cash on Delivery', '12 Main Road']) {
    assert.ok(email.html.includes(value) || email.text.includes(value), `contains ${value}`);
  }
});

test('Paystack payment confirmation includes verified reference, amount and method', () => {
  const email = buildPaymentConfirmationEmail(order, { reference: 'paystack-ref-1', amount: 350, paymentMethod: 'card' });
  assert.match(email.subject, /AS-1001/);
  for (const value of ['paystack-ref-1', 'card', 'GHS', 'Phone']) assert.ok(email.html.includes(value) || email.text.includes(value));
});

test('supported admin status updates produce customer templates with order context', () => {
  for (const status of ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']) {
    const email = buildOrderStatusEmail({ order, previousStatus: 'PENDING', newStatus: status });
    assert.ok(email.subject);
    assert.ok(email.html.includes(status));
    assert.ok(email.html.includes('AS-1001'));
    assert.ok(email.text.includes('Phone'));
  }
});
