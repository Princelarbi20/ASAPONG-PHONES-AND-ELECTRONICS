import { formatPrice } from "@/lib/utils";
import { API_BASE } from "./dashboardApi";

// Currency uses the same formatPrice helper as the rest of the store.
export const money = (value) => formatPrice(Number(value) || 0);

const compactFormatter = new Intl.NumberFormat("en-GH", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const plainFormatter = new Intl.NumberFormat("en-GH");

export const compactNumber = (value) =>
  compactFormatter.format(Number(value) || 0);
export const number = (value) => plainFormatter.format(Number(value) || 0);

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value,
  );
  return Number.isNaN(date.getTime()) ? null : date;
};

// "2026-11-10" or an ISO date -> "10 Nov"
export const formatDay = (value) => {
  const date = toDate(value);
  return date
    ? date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })
    : "";
};

export const formatDateTime = (value) => {
  const date = toDate(value);
  return date
    ? date.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
};

export const formatTime = (date) =>
  date
    ? date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "";

// "OUT_FOR_DELIVERY" -> "Out for delivery"
export const humanize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

// Colour family for an order / payment status. Unknown statuses stay neutral.
export const getStatusTone = (status) => {
  const key = String(status ?? "").toUpperCase();
  if (["PAID", "SUCCESS", "SUCCESSFUL", "COMPLETED", "DELIVERED"].includes(key))
    return "success";
  if (["PENDING", "AWAITING_PAYMENT"].includes(key)) return "warning";
  if (["CANCELLED", "CANCELED", "FAILED", "REFUNDED"].includes(key))
    return "danger";
  if (["PROCESSING", "CONFIRMED", "SHIPPED", "OUT_FOR_DELIVERY"].includes(key))
    return "info";
  return "neutral";
};

export const resolveImageUrl = (img) => {
  if (!img) return "";
  if (/^https?:\/\//.test(img)) return img;
  return `${API_BASE}/${String(img).replace(/\\/g, "/")}`;
};
