import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiFileText,
  FiFilter,
  FiHash,
  FiInfo,
  FiPlus,
  FiRefreshCcw,
  FiSearch,
  FiSend,
  FiX,
  FiXCircle,
} from "react-icons/fi";

import api from "../api";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   CONSTANTS
========================================================= */

const REFUND_METHODS = [
  "Cash", "UPI", "Bank Transfer", "Credit Card", "Debit Card",
  "Net Banking", "Cheque", "Wallet", "Original Payment Method", "Other",
];

const REFUND_STATUSES = [
  "Requested", "Under Review", "Approved", "Processing",
  "Completed", "Rejected", "Cancelled",
];

const CREATE_ROLES = ["admin", "manager", "sales", "accounts"];
const ACTION_ROLES = ["admin", "manager", "accounts"];
const RECORDS_PER_PAGE = 50;

/* =========================================================
   HELPERS
========================================================= */

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const formatCurrency = (amount = 0, currency = "INR") => {
  const value = Number(amount || 0);
  const cur = String(currency || "INR").trim().toUpperCase() || "INR";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency", currency: cur, maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }
};

const formatDate = (date) => {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const getCustomerName = (customer) => {
  if (!customer) return "Unknown Customer";
  if (typeof customer === "string") return customer;
  const fullName = [customer.firstName, customer.middleName, customer.lastName]
    .filter(Boolean).join(" ");
  return fullName || customer.name || customer.fullName || "Unknown Customer";
};

const getCustomerInitials = (customer) => {
  const name = getCustomerName(customer);
  if (!name || name === "Unknown Customer") return "C";
  return name.split(" ").filter(Boolean).slice(0, 2)
    .map((p) => p[0]).join("").toUpperCase();
};

const getBookingCode = (b) => {
  if (!b) return "-";
  if (typeof b === "string") return b;
  return b.bookingNumber || b.bookingCode || b.code || b._id || "-";
};

const getBookingDestination = (b) => {
  if (!b || typeof b === "string") return "-";
  return b.destination || b.packageName || b.trip?.destination ||
    b.trip?.title || "Travel Booking";
};

const getPaymentNumber = (p) => {
  if (!p) return "-";
  if (typeof p === "string") return p;
  return p.paymentNumber || p.paymentCode || p._id || "-";
};

const getInvoiceNumber = (i) => {
  if (!i) return "-";
  if (typeof i === "string") return i;
  return i.invoiceNumber || i._id || "-";
};

const extractList = (data, key) => {
  if (Array.isArray(data)) return data;
  return data?.[key] || data?.data?.[key] || data?.data || data?.results || [];
};

const extractItem = (data, key) => {
  if (!data) return null;
  if (data?.[key]) return data[key];
  if (data?.data?.[key]) return data.data[key];
  if (data?.data) return data.data;
  if (data?.result) return data.result;
  return data;
};

const getRefundAmount = (refund) => {
  if (!refund) return 0;
  const amount = refund.amount ?? refund.refundAmount ?? refund.totalRefundAmount ?? 0;
  return Number(amount) || 0;
};

const getRefundCurrency = (refund) => {
  if (!refund) return "INR";
  return refund.currency || refund.booking?.currency || refund.payment?.currency || "INR";
};

const getStatusClasses = (status) => {
  switch (status) {
    case "Requested":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Under Review":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Approved":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "Processing":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "Completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Rejected":
      return "bg-red-50 text-red-700 border-red-200";
    case "Cancelled":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "Requested": return FiSend;
    case "Under Review": return FiClock;
    case "Approved": return FiCheckCircle;
    case "Processing": return FiRefreshCcw;
    case "Completed": return FiCheck;
    case "Rejected": return FiXCircle;
    case "Cancelled": return FiX;
    default: return FiClock;
  }
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Refund() {
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const canCreateRefund = CREATE_ROLES.includes(role);
  const canTakeAction = ACTION_ROLES.includes(role);

  const [refunds, setRefunds] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRefunds, setTotalRefunds] = useState(0);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);

  const [form, setForm] = useState({
    booking: "", payment: "", invoice: "",
    amount: "", refundDate: getToday(),
    reason: "", refundMethod: "Original Payment Method",
    transactionId: "", referenceNumber: "", notes: "",
  });

  /* =======================================================
     FETCHERS
  ======================================================= */

  const fetchRefunds = async (page = currentPage) => {
    try {
      setLoading(true);
      setErrorMessage("");
      const params = { page, limit: RECORDS_PER_PAGE };
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.refundMethod = methodFilter;

      const { data = {} } = await api.get("/refunds", { params });
      const list = extractList(data, "refunds");

      setRefunds(list);
      setCurrentPage(data?.page || page);
      setTotalRefunds(Number(data?.total ?? data?.data?.total ?? list.length));
      setTotalPages(
        Math.max(
          1,
          Number(
            data?.totalPages ||
              data?.pages ||
              data?.data?.totalPages ||
              Math.ceil((data?.total || list.length) / RECORDS_PER_PAGE)
          )
        )
      );
    } catch (err) {
      console.error("Fetch refunds error:", err);
      setErrorMessage(err.response?.data?.message || "Failed to fetch refunds");
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setBookingsLoading(true);
      const { data } = await api.get("/bookings", { params: { limit: 100 } });
      setBookings(extractList(data, "bookings"));
    } catch (err) {
      console.error("Fetch bookings error:", err);
    } finally {
      setBookingsLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setPaymentsLoading(true);
      const { data } = await api.get("/payments", {
        params: { limit: 100, status: "Completed" },
      });
      setPayments(extractList(data, "payments"));
    } catch (err) {
      console.error("Fetch payments error:", err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  /* =======================================================
     EFFECTS
  ======================================================= */

  useEffect(() => {
    fetchBookings();
    fetchPayments();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, methodFilter]);

  useEffect(() => {
    fetchRefunds(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, statusFilter, methodFilter]);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;
    const t = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 4000);
    return () => clearTimeout(t);
  }, [successMessage, errorMessage]);

  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };
    if (showFilters) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilters]);

  /* =======================================================
     MEMOS
  ======================================================= */

  const selectedBooking = useMemo(
    () => bookings.find((b) => b._id === form.booking) || null,
    [form.booking, bookings]
  );

  const completedRefundAmount = useMemo(() => {
    if (!form.booking) return 0;
    return refunds
      .filter((r) => {
        const id = typeof r.booking === "object" ? r.booking?._id : r.booking;
        return String(id) === String(form.booking) && r.status === "Completed";
      })
      .reduce((sum, r) => sum + getRefundAmount(r), 0);
  }, [refunds, form.booking]);

  const activeRefundAmount = useMemo(() => {
    if (!form.booking) return 0;
    const active = ["Requested", "Under Review", "Approved", "Processing"];
    return refunds
      .filter((r) => {
        const id = typeof r.booking === "object" ? r.booking?._id : r.booking;
        return String(id) === String(form.booking) && active.includes(r.status);
      })
      .reduce((sum, r) => sum + getRefundAmount(r), 0);
  }, [refunds, form.booking]);

  const maxRefundableAmount = useMemo(() => {
    if (!selectedBooking) return 0;
    const paid = Number(selectedBooking.amountPaid || 0);
    return Math.max(0, paid - completedRefundAmount - activeRefundAmount);
  }, [selectedBooking, completedRefundAmount, activeRefundAmount]);

  const filteredRefunds = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return refunds;
    return refunds.filter((r) => {
      const text = [
        r.refundNumber || "",
        getBookingCode(r.booking),
        getBookingDestination(r.booking),
        getCustomerName(r.customer),
        getPaymentNumber(r.payment),
        getInvoiceNumber(r.invoice),
        r.reason || "", r.transactionId || "", r.referenceNumber || "",
        r.refundMethod || "", r.status || "",
      ].join(" ").toLowerCase();
      return text.includes(term);
    });
  }, [refunds, search]);

  const summary = useMemo(() => {
    const completed = refunds.filter((r) => r.status === "Completed");
    const processing = refunds.filter((r) => ["Processing", "Approved"].includes(r.status));
    const requested = refunds.filter((r) => ["Requested", "Under Review"].includes(r.status));
    const rejected = refunds.filter((r) => ["Rejected", "Cancelled"].includes(r.status));
    const sum = (arr) => arr.reduce((s, r) => s + getRefundAmount(r), 0);
    return {
      completedCount: completed.length,
      completedAmount: sum(completed),
      processingCount: processing.length,
      processingAmount: sum(processing),
      requestedCount: requested.length,
      requestedAmount: sum(requested),
      rejectedCount: rejected.length,
    };
  }, [refunds]);

  const activeFilterCount = useMemo(
    () => [search, statusFilter, methodFilter].filter(Boolean).length,
    [search, statusFilter, methodFilter]
  );

  const dropdownFilterCount = useMemo(
    () => [statusFilter, methodFilter].filter(Boolean).length,
    [statusFilter, methodFilter]
  );

  /* =======================================================
     FORM HANDLERS
  ======================================================= */

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const openRefundModal = () => {
    setErrorMessage("");
    setForm({
      booking: "", payment: "", invoice: "",
      amount: "", refundDate: getToday(),
      reason: "", refundMethod: "Original Payment Method",
      transactionId: "", referenceNumber: "", notes: "",
    });
    setShowRefundModal(true);
  };

  const closeRefundModal = () => {
    if (saving) return;
    setShowRefundModal(false);
  };

  const handleBookingChange = (e) => {
    const bookingId = e.target.value;
    setForm((p) => ({
      ...p, booking: bookingId, payment: "", invoice: "", amount: "",
    }));
    if (!bookingId) return;
    const booking = bookings.find((b) => b._id === bookingId);
    if (booking && Number(booking.amountPaid || 0) <= 0) {
      setErrorMessage("This booking has no completed payment available for refund.");
      return;
    }
    setErrorMessage("");
  };

  const handlePaymentChange = (e) => {
    const paymentId = e.target.value;
    const payment = payments.find((p) => p._id === paymentId);
    setForm((p) => ({
      ...p,
      payment: paymentId,
      amount: payment ? Number(payment.amount || 0).toFixed(2) : "",
    }));
  };

  const fillRefundableAmount = () => {
    if (maxRefundableAmount <= 0) return;
    setForm((p) => ({ ...p, amount: maxRefundableAmount.toFixed(2) }));
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.booking) return setErrorMessage("Please select a booking.");

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0)
      return setErrorMessage("Please enter a valid refund amount.");
    if (maxRefundableAmount <= 0)
      return setErrorMessage("No refundable amount is available for this booking.");
    if (amount > maxRefundableAmount)
      return setErrorMessage(
        `Refund cannot exceed ${formatCurrency(
          maxRefundableAmount,
          selectedBooking?.currency || "INR"
        )}.`
      );
    if (!form.reason.trim()) return setErrorMessage("Please enter a refund reason.");
    if (!form.refundDate) return setErrorMessage("Please select refund date.");

    try {
      setSaving(true);
      const payload = {
        booking: form.booking, amount,
        refundDate: form.refundDate,
        reason: form.reason.trim(),
        refundMethod: form.refundMethod,
        notes: form.notes.trim(),
      };
      if (form.payment) payload.payment = form.payment;
      if (form.invoice) payload.invoice = form.invoice;
      if (form.transactionId.trim()) payload.transactionId = form.transactionId.trim();
      if (form.referenceNumber.trim()) payload.referenceNumber = form.referenceNumber.trim();

      const { data } = await api.post("/refunds", payload);
      const created = extractItem(data, "refund");

      setShowRefundModal(false);
      setSuccessMessage(`${created?.refundNumber || "Refund"} requested successfully`);
      await Promise.all([fetchRefunds(currentPage), fetchBookings(), fetchPayments()]);
    } catch (err) {
      console.error("Create refund error:", err);
      setErrorMessage(err.response?.data?.message || "Failed to create refund request");
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     VIEW / ACTIONS
  ======================================================= */

  const openRefundDetails = async (refund) => {
    try {
      setErrorMessage("");
      setSelectedRefund(refund);
      setShowDetailsModal(true);
      if (!refund?._id) return;
      const { data } = await api.get(`/refunds/${refund._id}`);
      const details = extractItem(data, "refund");
      if (details) setSelectedRefund(details);
    } catch (err) {
      console.error("Refund details error:", err);
      setErrorMessage(err.response?.data?.message || "Failed to load refund details");
    }
  };

  const handleRefresh = async () => {
    setErrorMessage("");
    await Promise.all([fetchRefunds(currentPage), fetchBookings(), fetchPayments()]);
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setMethodFilter("");
    setCurrentPage(1);
    setShowFilters(false);
  };

  const runRefundAction = async (refund, action) => {
    if (!refund?._id) return;
    try {
      setActionLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
      const { data } = await api.put(`/refunds/${refund._id}/${action}`, {});
      const updated = extractItem(data, "refund");
      if (updated) setSelectedRefund(updated);
      setSuccessMessage(
        `Refund ${updated?.refundNumber || refund.refundNumber || ""} updated successfully`
      );
      await Promise.all([fetchRefunds(currentPage), fetchBookings(), fetchPayments()]);
    } catch (err) {
      console.error(`Refund ${action} error:`, err);
      setErrorMessage(err.response?.data?.message || `Failed to ${action} refund`);
    } finally {
      setActionLoading(false);
    }
  };

  const getAvailableActions = (refund) => {
    if (!refund || !canTakeAction) return [];
    switch (refund.status) {
      case "Requested":
        return [
          { action: "review", label: "Review", icon: FiEye, cls: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200" },
          { action: "reject", label: "Reject", icon: FiXCircle, cls: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200" },
          { action: "cancel", label: "Cancel", icon: FiX, cls: "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200" },
        ];
      case "Under Review":
        return [
          { action: "approve", label: "Approve", icon: FiCheckCircle, cls: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200" },
          { action: "reject", label: "Reject", icon: FiXCircle, cls: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200" },
        ];
      case "Approved":
        return [
          { action: "process", label: "Process", icon: FiRefreshCcw, cls: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200" },
        ];
      case "Processing":
        return [
          { action: "complete", label: "Complete", icon: FiCheck, cls: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" },
        ];
      default:
        return [];
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={15}
            />
            <input
              type="text"
              placeholder="Search refunds..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 h-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600"
              >
                <FiX size={13} />
              </button>
            )}
          </div>

          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border transition whitespace-nowrap ${
                dropdownFilterCount > 0
                  ? "bg-brand-blue-50 text-brand-blue-dark border-brand-blue/30"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <FiFilter size={14} />
              <span className="hidden sm:inline">Filters</span>
              {dropdownFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-semibold bg-brand-blue text-white rounded-full">
                  {dropdownFilterCount}
                </span>
              )}
              <FiChevronDown
                size={13}
                className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </button>

            {showFilters && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
                  {dropdownFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="text-xs font-medium text-gray-500 hover:text-red-600"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Refund Status
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {REFUND_STATUSES.map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() =>
                            setStatusFilter(statusFilter === item ? "" : item)
                          }
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                            statusFilter === item
                              ? "bg-brand-blue text-white border-brand-blue"
                              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Refund Method
                    </label>
                    <select
                      value={methodFilter}
                      onChange={(e) => setMethodFilter(e.target.value)}
                      className="w-full h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-700 outline-none focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10"
                    >
                      <option value="">All methods</option>
                      {REFUND_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5 flex items-start gap-2">
                    <FiInfo className="mt-0.5 text-gray-400 flex-shrink-0" size={13} />
                    <p className="text-[10px] leading-4 text-gray-500">
                      Search supports refund number, booking, customer, payment & reason.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    disabled={dropdownFilterCount === 0}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark rounded-md"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap"
          >
            <FiRefreshCcw size={14} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {canCreateRefund && (
          <button
            type="button"
            onClick={openRefundModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap self-start lg:self-auto"
          >
            <FiPlus size={15} />
            New Refund
          </button>
        )}
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard
          title="Completed"
          value={formatCurrency(summary.completedAmount)}
          subtitle={`${summary.completedCount} refund${summary.completedCount === 1 ? "" : "s"}`}
          icon={<FiCheck size={16} />}
          iconClass="bg-emerald-50 text-emerald-600"
          valueClass="text-emerald-700"
        />
        <SummaryCard
          title="Requested"
          value={formatCurrency(summary.requestedAmount)}
          subtitle={`${summary.requestedCount} pending`}
          icon={<FiClock size={16} />}
          iconClass="bg-amber-50 text-amber-600"
          valueClass="text-amber-700"
        />
        <SummaryCard
          title="Processing"
          value={formatCurrency(summary.processingAmount)}
          subtitle={`${summary.processingCount} in flight`}
          icon={<FiRefreshCcw size={16} />}
          iconClass="bg-purple-50 text-purple-600"
          valueClass="text-purple-700"
        />
        <SummaryCard
          title="Rejected"
          value={summary.rejectedCount}
          subtitle="Cancelled / Rejected"
          icon={<FiXCircle size={16} />}
          iconClass="bg-red-50 text-red-600"
          valueClass="text-red-700"
        />
      </div>

      {/* ACTIVE FILTERS */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
          </span>
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-brand-blue hover:text-brand-blue-dark font-medium"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ALERTS */}
      {successMessage && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-lg">
          <FiCheckCircle className="flex-shrink-0 mt-0.5" size={18} />
          <p className="flex-1">{successMessage}</p>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="text-emerald-600 hover:text-emerald-800 flex-shrink-0"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">
          <FiAlertCircle className="flex-shrink-0 mt-0.5" size={18} />
          <p className="flex-1">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="text-red-600 hover:text-red-800 flex-shrink-0"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-[3px] border-brand-blue-50 border-t-brand-blue rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading refunds...</p>
            </div>
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <FiRefreshCcw size={24} />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-gray-800">
              No refunds found
            </h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              {activeFilterCount > 0
                ? "No refunds match your current filters."
                : "No refund transactions have been recorded yet."}
            </p>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
            ) : canCreateRefund ? (
              <button
                type="button"
                onClick={openRefundModal}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg"
              >
                <FiPlus size={15} />
                Request Refund
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  {["Refund", "Booking", "Customer", "Amount", "Method", "Date", "Status"].map(
                    (heading, i) => (
                      <th
                        key={i}
                        className="px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-left"
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRefunds.map((refund) => (
                  <RefundRow
                    key={refund._id}
                    refund={refund}
                    onView={openRefundDetails}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {!loading && totalRefunds > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">{filteredRefunds.length}</span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">{totalRefunds}</span>{" "}
            {totalRefunds === 1 ? "refund" : "refunds"}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => currentPage > 1 && setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1 || loading}
                className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40"
              >
                <FiChevronLeft size={16} />
              </button>
              <span className="px-3 h-8 inline-flex items-center text-sm font-medium text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  currentPage < totalPages && setCurrentPage((p) => p + 1)
                }
                disabled={currentPage === totalPages || loading}
                className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {showRefundModal && (
        <RefundFormModal
          form={form}
          saving={saving}
          bookings={bookings}
          bookingsLoading={bookingsLoading}
          payments={payments}
          paymentsLoading={paymentsLoading}
          selectedBooking={selectedBooking}
          completedRefundAmount={completedRefundAmount}
          maxRefundableAmount={maxRefundableAmount}
          onClose={closeRefundModal}
          onSubmit={handleSubmit}
          onChange={handleFormChange}
          onBookingChange={handleBookingChange}
          onPaymentChange={handlePaymentChange}
          onUseAvailable={fillRefundableAmount}
        />
      )}

      {showDetailsModal && selectedRefund && (
        <RefundDetailsModal
          refund={selectedRefund}
          actions={getAvailableActions(selectedRefund)}
          actionLoading={actionLoading}
          onAction={runRefundAction}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </div>
  );
}

/* =========================================================
   SUB-COMPONENTS
========================================================= */

function SummaryCard({ title, value, subtitle, icon, iconClass, valueClass = "text-gray-900" }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className={`mt-1.5 text-lg font-bold truncate ${valueClass}`}>{value}</p>
          {subtitle && (
            <p className="mt-1 text-[11px] text-gray-400">{subtitle}</p>
          )}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${iconClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const Icon = getStatusIcon(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
        status
      )}`}
    >
      <Icon size={11} />
      {status || "Unknown"}
    </span>
  );
}

function RefundRow({ refund, onView }) {
  const amount = getRefundAmount(refund);
  const currency = getRefundCurrency(refund);

  return (
    <tr
      onClick={() => onView(refund)}
      className="hover:bg-brand-blue-50/40 transition-colors cursor-pointer group"
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-blue-50 text-brand-blue flex items-center justify-center shrink-0 group-hover:bg-brand-blue-100 transition">
            <FiHash size={16} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate max-w-[160px]">
              {refund.refundNumber || "Refund"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[160px]">
              {refund.reason || "No reason"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="font-medium text-gray-800 truncate max-w-[160px]">
          {getBookingCode(refund.booking)}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[160px]">
          {getBookingDestination(refund.booking)}
        </p>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-bold shrink-0">
            {getCustomerInitials(refund.customer)}
          </div>
          <p className="font-medium text-gray-800 truncate max-w-[170px]">
            {getCustomerName(refund.customer)}
          </p>
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="font-semibold text-gray-800 whitespace-nowrap">
          {formatCurrency(amount, currency)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{currency}</p>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
            <FiCreditCard size={14} />
          </div>
          <span className="text-sm text-gray-700 truncate max-w-[130px]">
            {refund.refundMethod || "-"}
          </span>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FiCalendar size={14} className="text-gray-400 shrink-0" />
          {formatDate(refund.refundDate)}
        </div>
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={refund.status} />
      </td>
    </tr>
  );
}

/* =========================================================
   CREATE MODAL
========================================================= */

function RefundFormModal({
  form, saving, bookings, bookingsLoading, payments, paymentsLoading,
  selectedBooking, completedRefundAmount, maxRefundableAmount,
  onClose, onSubmit, onChange, onBookingChange, onPaymentChange, onUseAvailable,
}) {
  const eligibleBookings = bookings.filter(
    (b) => b.status !== "Cancelled" && Number(b.amountPaid || 0) > 0
  );

  const bookingPayments = payments.filter((p) => {
    const id = typeof p.booking === "object" ? p.booking?._id : p.booking;
    return String(id) === String(form.booking);
  });

  return (
    <ModalShell
      title="Request Refund"
      subtitle="Create a refund request against a completed customer payment"
      onClose={onClose}
      disabled={saving}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-200 bg-white px-4 h-9 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="refund-form"
            disabled={saving || !form.booking || !form.amount || !form.reason.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 h-9 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <FiRefreshCcw className="animate-spin" size={15} /> Creating...
              </>
            ) : (
              <>
                <FiSend size={15} /> Request Refund
              </>
            )}
          </button>
        </>
      }
    >
      <form id="refund-form" onSubmit={onSubmit} className="space-y-6 p-6">
        {/* BOOKING */}
        <section>
          <SectionTitle icon={<FiFileText size={14} />} title="Booking Information" />
          <div className="mt-4">
            <Field label="Booking *">
              <select
                value={form.booking}
                onChange={onBookingChange}
                disabled={bookingsLoading || saving}
                className="input"
                required
              >
                <option value="">
                  {bookingsLoading ? "Loading bookings..." : "Select booking"}
                </option>
                {eligibleBookings.map((booking) => (
                  <option key={booking._id} value={booking._id}>
                    {getBookingCode(booking)} — {getCustomerName(booking.customer)} — Paid{" "}
                    {formatCurrency(booking.amountPaid || 0, booking.currency || "INR")}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {selectedBooking && (
            <div className="mt-4 rounded-xl border border-brand-blue/20 bg-brand-blue-50/40 p-4">
              <div className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-blue">
                  Refundable Balance
                </p>
                <h4 className="mt-0.5 text-sm font-bold text-gray-800">
                  {getBookingCode(selectedBooking)}
                </h4>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <BalanceCell
                  label="Booking Total"
                  value={formatCurrency(selectedBooking.totalAmount || 0, selectedBooking.currency || "INR")}
                />
                <BalanceCell
                  label="Paid"
                  value={formatCurrency(selectedBooking.amountPaid || 0, selectedBooking.currency || "INR")}
                  valueClass="text-emerald-600"
                />
                <BalanceCell
                  label="Refunded"
                  value={formatCurrency(completedRefundAmount, selectedBooking.currency || "INR")}
                  valueClass="text-brand-blue"
                />
                <BalanceCell
                  label="Available"
                  value={formatCurrency(maxRefundableAmount, selectedBooking.currency || "INR")}
                  valueClass="text-brand-blue-dark"
                />
              </div>
            </div>
          )}
        </section>

        {/* PAYMENT */}
        {selectedBooking && (
          <section>
            <SectionTitle icon={<FiCreditCard size={14} />} title="Payment Reference" />
            <div className="mt-4">
              <Field label="Payment (optional)">
                <select
                  value={form.payment}
                  onChange={onPaymentChange}
                  disabled={paymentsLoading || saving}
                  className="input"
                >
                  <option value="">
                    {paymentsLoading ? "Loading payments..." : "Select payment (optional)"}
                  </option>
                  {bookingPayments.map((p) => (
                    <option key={p._id} value={p._id}>
                      {getPaymentNumber(p)} — {formatCurrency(p.amount, p.currency || "INR")}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>
        )}

        {/* REFUND INFO */}
        <section>
          <SectionTitle icon={<FiDollarSign size={14} />} title="Refund Information" />

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-600">
                  Refund Amount *
                </span>
                {maxRefundableAmount > 0 && (
                  <button
                    type="button"
                    onClick={onUseAvailable}
                    disabled={saving}
                    className="text-[11px] font-semibold text-brand-blue hover:text-brand-blue-dark"
                  >
                    Use available
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                  ₹
                </span>
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={onChange}
                  min="0.01"
                  max={maxRefundableAmount || undefined}
                  step="0.01"
                  placeholder="0.00"
                  disabled={!selectedBooking || saving}
                  className="input pl-7 font-semibold"
                />
              </div>
              {selectedBooking && (
                <p className="mt-1 text-[11px] text-gray-400">
                  Max:{" "}
                  <span className="font-semibold text-gray-600">
                    {formatCurrency(maxRefundableAmount, selectedBooking.currency || "INR")}
                  </span>
                </p>
              )}
            </div>

            <Field label="Refund Method *">
              <select
                name="refundMethod"
                value={form.refundMethod}
                onChange={onChange}
                disabled={saving}
                className="input"
              >
                {REFUND_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>

            <Field label="Refund Date *">
              <input
                type="date"
                name="refundDate"
                value={form.refundDate}
                onChange={onChange}
                disabled={saving}
                className="input"
              />
            </Field>

            <Field label="Reference Number (optional)">
              <input
                type="text"
                name="referenceNumber"
                value={form.referenceNumber}
                onChange={onChange}
                disabled={saving}
                placeholder="Refund reference"
                className="input"
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Refund Reason *">
              <textarea
                name="reason"
                value={form.reason}
                onChange={onChange}
                disabled={saving}
                rows={3}
                placeholder="Explain why the customer is requesting a refund..."
                className="input resize-none"
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Transaction ID (optional)">
              <input
                type="text"
                name="transactionId"
                value={form.transactionId}
                onChange={onChange}
                disabled={saving}
                placeholder="Refund transaction ref"
                className="input"
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Notes (optional)">
              <textarea
                name="notes"
                value={form.notes}
                onChange={onChange}
                disabled={saving}
                rows={3}
                placeholder="Add internal refund notes..."
                className="input resize-none"
              />
            </Field>
          </div>
        </section>

        {/* PREVIEW */}
        {selectedBooking && Number(form.amount || 0) > 0 && (
          <div className="rounded-xl border border-brand-blue/20 bg-brand-blue-50/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-blue">
                Refund Preview
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Estimated booking balance after refund completion.
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(
                  Math.max(0, Number(selectedBooking.amountPaid || 0) - Number(form.amount || 0)),
                  selectedBooking.currency || "INR"
                )}
              </p>
              <p className="text-[10px] text-gray-400">Estimated net paid</p>
            </div>
          </div>
        )}
      </form>
    </ModalShell>
  );
}

function BalanceCell({ label, value, valueClass = "text-gray-900" }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className={`mt-1 text-sm font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

/* =========================================================
   DETAILS MODAL
========================================================= */

function RefundDetailsModal({ refund, actions, actionLoading, onAction, onClose }) {
  const refundAmount = getRefundAmount(refund);
  const refundCurrency = getRefundCurrency(refund);

  return (
    <ModalShell
      title="Refund Details"
      subtitle={refund.refundNumber || "Refund transaction"}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-200 bg-white px-4 h-9 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Close
        </button>
      }
    >
      <div className="p-6 space-y-6">
        {/* AMOUNT + STATUS */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-gray-200">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500">Refund Amount</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 break-all">
              {formatCurrency(refundAmount, refundCurrency)}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Requested on {formatDate(refund.refundDate)}
            </p>
          </div>
          <div className="flex-shrink-0">
            <StatusBadge status={refund.status} />
          </div>
        </div>

        {/* ACTIONS */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map(({ action, label, icon: Icon, cls }) => (
              <button
                key={action}
                type="button"
                disabled={actionLoading}
                onClick={() => onAction(refund, action)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${cls}`}
              >
                {actionLoading ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Icon size={13} />
                )}
                {label}
              </button>
            ))}
          </div>
        )}

        {/* REFUND INFO */}
        <section>
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
            Refund Information
          </h3>
          <div className="space-y-2.5">
            <DetailLine label="Refund Number" value={refund.refundNumber || "-"} />
            <DetailLine label="Refund Method" value={refund.refundMethod || "-"} />
            <DetailLine label="Refund Date" value={formatDate(refund.refundDate)} />
            <DetailLine
              label="Requested By"
              value={refund.requestedBy?.name || refund.requestedBy?.email || "-"}
            />
          </div>
        </section>

        {/* BOOKING */}
        <section>
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
            Booking Information
          </h3>
          <div className="space-y-2.5">
            <DetailLine label="Booking No." value={getBookingCode(refund.booking)} />
            <DetailLine label="Destination" value={getBookingDestination(refund.booking)} />
            <DetailLine label="Customer" value={getCustomerName(refund.customer)} />
            <DetailLine label="Payment" value={getPaymentNumber(refund.payment)} />
            <DetailLine label="Invoice" value={getInvoiceNumber(refund.invoice)} />
          </div>
        </section>

        {/* REASON */}
        <section>
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
            Refund Reason
          </h3>
          <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">
            {refund.reason || "-"}
          </p>
        </section>

        {/* TRANSACTION */}
        {(refund.transactionId || refund.referenceNumber) && (
          <section>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
              Transaction
            </h3>
            <div className="space-y-2.5">
              {refund.transactionId && (
                <DetailLine label="Transaction ID" value={refund.transactionId} />
              )}
              {refund.referenceNumber && (
                <DetailLine label="Reference No." value={refund.referenceNumber} />
              )}
            </div>
          </section>
        )}

        {/* APPROVAL */}
        {(refund.approvedBy || refund.approvedAt) && (
          <section>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
              Approval
            </h3>
            <div className="space-y-2.5">
              <DetailLine
                label="Approved By"
                value={refund.approvedBy?.name || refund.approvedBy?.email || "-"}
              />
              <DetailLine
                label="Approved At"
                value={formatDateTime(refund.approvedAt)}
              />
            </div>
          </section>
        )}

        {/* PROCESSING */}
        {(refund.processedBy || refund.processedAt) && (
          <section>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
              Processing
            </h3>
            <div className="space-y-2.5">
              <DetailLine
                label="Processed By"
                value={refund.processedBy?.name || refund.processedBy?.email || "-"}
              />
              <DetailLine
                label="Processed At"
                value={formatDateTime(refund.processedAt)}
              />
            </div>
          </section>
        )}

        {/* REJECTION */}
        {refund.rejectionReason && (
          <section>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
              Rejection Reason
            </h3>
            <p className="text-sm leading-6 text-red-700 whitespace-pre-wrap">
              {refund.rejectionReason}
            </p>
          </section>
        )}

        {/* NOTES */}
        {refund.notes && (
          <section>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
              Notes
            </h3>
            <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">
              {refund.notes}
            </p>
          </section>
        )}

        {/* CREATED */}
        {refund.createdAt && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-3 border-t border-gray-100">
            <FiClock size={12} />
            Created {formatDateTime(refund.createdAt)}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

/* =========================================================
   PRIMITIVES
========================================================= */

function ModalShell({ title, subtitle, onClose, children, footer, disabled }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !disabled) onClose();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
          <div>
            <h2 className="text-base font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            disabled={disabled}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="overflow-y-auto">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-blue-50 text-brand-blue">
        {icon}
      </div>
      <h3 className="text-xs font-bold text-gray-800">{title}</h3>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-gray-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-800 break-all">
        {value || "-"}
      </span>
    </div>
  );
}