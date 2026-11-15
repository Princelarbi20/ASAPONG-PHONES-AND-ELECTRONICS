import test from "node:test";
import assert from "node:assert/strict";
import { buildOrderStatusEmail, ORDER_STATUSES } from "../utils/orderStatusEmail.js";

const order = {
  _id: "order-123",
  user: { userName: "Amina Customer" },
  paymentStatus: "PAID",
  totalPrice: 39.98,
  items: [
    {
      name: "Blue Mug",
      image: "https://cdn.example.com/blue-mug.jpg",
      price: 19.99,
      quantity: 2,
      password: "must-not-be-emailed",
    },
  ],
  shippingAddress: { address: "Private address" },
};

test("builds a complete, status-specific email for every order status", () => {
  const subjects = new Set();

  for (const status of ORDER_STATUSES) {
    const email = buildOrderStatusEmail({
      order,
      previousStatus: "PROCESSING",
      newStatus: status,
    });

    subjects.add(email.subject);
    assert.match(email.text, /Amina Customer/);
    assert.match(email.text, /order-123/);
    assert.match(email.text, new RegExp(status));
    assert.match(email.text, /Blue Mug x 2/);
    assert.match(email.html, /blue-mug\.jpg/);
    assert.match(email.html, />2<|>2<\/td>/);
    assert.match(email.html, /background-color: #f4f6f9/);
    assert.match(email.html, /max-width: 480px/);
    assert.match(email.html, /CLOUDINARY_LOG|Asapong Logo/);
    assert.match(email.html, /#4f46e5/);
    assert.match(email.html, /Asapong Inc\. All rights reserved\./);
    assert.doesNotMatch(email.text, /must-not-be-emailed|Private address/);
    assert.doesNotMatch(email.html, /password|shippingAddress|Private address/);
  }

  assert.equal(ORDER_STATUSES.length, 11);
  assert.equal(subjects.size, ORDER_STATUSES.length);
});