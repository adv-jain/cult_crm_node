/* =========================================================
   BOOKING HELPERS
========================================================= */

export const STATUS_OPTIONS = [
  "Pending",
  "Confirmed",
  "Cancelled",
  "Completed",
  "Refunded",
];

export const PAYMENT_STATUS_OPTIONS = [
  "Pending",
  "Partially Paid",
  "Paid",
];

export const TRAVEL_TYPES = [
  "Domestic",
  "International",
  "Honeymoon",
  "Family",
  "Solo",
  "Corporate",
  "Group",
  "Adventure",
  "Pilgrimage",
  "Other",
];

export const INITIAL_BOOKING_FORM = {
  quotation: "",
  destination: "",
  departureCity: "",
  travelDate: "",
  returnDate: "",
  adults: 1,
  children: 0,
  infants: 0,
  travelType: "Other",
  currency: "INR",
  totalAmount: 0,
  totalCost: 0,
  discountAmount: 0,
  taxAmount: 0,
  salesOwner: "",
  operationsOwner: "",
  specialRequests: "",
  internalNotes: "",
  nextPaymentDueDate: "",
};

/* =========================================================
   FORMATTERS
========================================================= */

export const formatDate = (date) => {
  if (!date) return "—";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "—";
  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateInput = (date) => {
  if (!date) return "";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return value.toISOString().split("T")[0];
};

export const formatCurrency = (amount, currency = "INR") => {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `₹${value.toLocaleString("en-IN")}`;
  }
};

/* =========================================================
   LABEL HELPERS
========================================================= */

export const getCustomerName = (customer) => {
  if (!customer) return "No customer";
  const name = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ");
  return name || customer.name || customer.email || "Customer";
};

export const getOwnerName = (owner) => {
  if (!owner) return "Unassigned";
  return owner.name || owner.email || "User";
};

export const getQuotationLabel = (quotation) => {
  if (!quotation) return "—";
  return quotation.quotationNumber || quotation.title || "Quotation";
};

export const getBookingNumber = (booking) => {
  if (booking.bookingNumber) return booking.bookingNumber;
  return `BK-${String(booking._id).slice(-6).toUpperCase()}`;
};

/* =========================================================
   STYLE HELPERS
========================================================= */

export const getStatusClasses = (status) => {
  const styles = {
    Pending: "bg-brand-gold-50 text-brand-gold-dark border-brand-gold/30",
    Confirmed: "bg-brand-blue-50 text-brand-blue-dark border-brand-blue/30",
    Cancelled: "bg-red-50 text-red-700 border-red-200",
    Completed: "bg-brand-blue-50 text-brand-blue-dark border-brand-blue/30",
    Refunded: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return styles[status] || "bg-gray-50 text-gray-600 border-gray-200";
};

export const getPaymentClasses = (status) => {
  const styles = {
    Pending: "bg-brand-gold-50 text-brand-gold-dark border-brand-gold/30",
    "Partially Paid":
      "bg-brand-blue-50 text-brand-blue-dark border-brand-blue/30",
    Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return styles[status] || "bg-gray-50 text-gray-600 border-gray-200";
};

/* =========================================================
   PERMISSION HELPERS
========================================================= */

export const canConfirm = (booking) => booking.status === "Pending";

export const canCancel = (booking) =>
  !["Cancelled", "Refunded", "Completed"].includes(booking.status);

export const canEdit = (booking) =>
  !["Cancelled", "Refunded", "Completed"].includes(booking.status);