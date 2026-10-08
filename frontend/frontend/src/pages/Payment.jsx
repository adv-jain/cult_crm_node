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
  FiX,
  FiXCircle,
} from "react-icons/fi";

import api from "../api";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   CONSTANTS
========================================================= */

const PAYMENT_METHODS = [
  "Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Online",
];

const PAYMENT_STATUSES = [
  "Pending", "Completed", "Failed", "Refunded",
];

const CREATABLE_STATUSES = ["Pending", "Completed", "Failed"];

const CREATE_ROLES = ["admin", "manager", "sales", "accounts"];

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
  const cur = String(currency || "INR").trim().toUpperCase() || "INR";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
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

const getBookingCode = (booking) => {
  if (!booking) return "-";
  if (typeof booking === "string") return booking;
  return (
    booking.bookingNumber || booking.bookingCode || booking.code ||
    booking._id || "-"
  );
};

const getBookingDestination = (booking) => {
  if (!booking || typeof booking === "string") return "-";
  return booking.destination || booking.packageName || "Travel Booking";
};

const extractPayments = (data) => {
  if (Array.isArray(data)) return data;
  return data?.payments || data?.data?.payments || data?.data || data?.results || [];
};

const extractBookings = (data) => {
  if (Array.isArray(data)) return data;
  return data?.bookings || data?.data?.bookings || data?.data || data?.results || [];
};

const getStatusClasses = (status) => {
  switch (status) {
    case "Completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Failed":
      return "bg-red-50 text-red-700 border-red-200";
    case "Refunded":
      return "bg-purple-50 text-purple-700 border-purple-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "Completed": return FiCheck;
    case "Pending": return FiClock;
    case "Failed": return FiXCircle;
    case "Refunded": return FiRefreshCcw;
    default: return FiClock;
  }
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Payment() {
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const canCreatePayment = CREATE_ROLES.includes(role);

  /* Data */
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);

  /* UI */
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* Filters */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  /* Pagination */
  const [page, setPage] = useState(1);
  const [limit] = useState(RECORDS_PER_PAGE);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);

  /* Modals */
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  /* Form */
  const [form, setForm] = useState({
    booking: "",
    amount: "",
    paymentMethod: "UPI",
    transactionId: "",
    paymentDate: getToday(),
    status: "Completed",
    notes: "",
  });

  /* =======================================================
     FETCHERS
  ======================================================= */

  const fetchPayments = async (targetPage = page) => {
    try {
      setLoading(true);
      setError("");

      const params = { page: targetPage, limit };
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.paymentMethod = methodFilter;

      const { data = {} } = await api.get("/payments", { params });
      const list = extractPayments(data);

      setPayments(list);
      setTotalPayments(Number(data.total ?? list.length));
      setTotalPages(Math.max(1, Number(data.totalPages ?? 1)));
      setPage(Number(data.page || targetPage));
    } catch (err) {
      console.error("Fetch payments error:", err);
      setError(err.response?.data?.message || "Failed to load payments.");
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setBookingsLoading(true);
      const { data } = await api.get("/bookings", { params: { limit: 100 } });
      setBookings(extractBookings(data));
    } catch (err) {
      console.error("Fetch bookings error:", err);
    } finally {
      setBookingsLoading(false);
    }
  };

  /* =======================================================
     EFFECTS
  ======================================================= */

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, methodFilter]);

  useEffect(() => {
    fetchPayments(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, methodFilter]);

  useEffect(() => {
    if (!success && !error) return;
    const t = setTimeout(() => {
      setSuccess("");
      setError("");
    }, 4000);
    return () => clearTimeout(t);
  }, [success, error]);

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

  const filteredPayments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return payments;
    return payments.filter((p) => {
      const text = [
        p.paymentNumber || "",
        getBookingCode(p.booking),
        getCustomerName(p.customer),
        p.transactionId || "",
        p.paymentMethod || "",
        p.status || "",
        getBookingDestination(p.booking),
      ].join(" ").toLowerCase();
      return text.includes(term);
    });
  }, [payments, search]);

  const summary = useMemo(() => {
    const completed = payments.filter((p) => p.status === "Completed");
    const pending = payments.filter((p) => p.status === "Pending");
    const failed = payments.filter((p) => p.status === "Failed");
    const refunded = payments.filter((p) => p.status === "Refunded");
    const sum = (arr) => arr.reduce((s, p) => s + Number(p.amount || 0), 0);
    return {
      completedCount: completed.length,
      completedAmount: sum(completed),
      pendingCount: pending.length,
      pendingAmount: sum(pending),
      failedCount: failed.length,
      refundedCount: refunded.length,
      refundedAmount: sum(refunded),
    };
  }, [payments]);

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

  const openPaymentModal = () => {
    setError("");
    setForm({
      booking: "",
      amount: "",
      paymentMethod: "UPI",
      transactionId: "",
      paymentDate: getToday(),
      status: "Completed",
      notes: "",
    });
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    if (saving) return;
    setShowPaymentModal(false);
  };

  const handleBookingChange = (e) => {
    const bookingId = e.target.value;
    const booking = bookings.find((b) => b._id === bookingId);
    setForm((p) => ({ ...p, booking: bookingId, amount: "" }));
    if (booking && Number(booking.amountDue || 0) <= 0) {
      setError("This booking has no outstanding amount.");
    } else {
      setError("");
    }
  };

  const fillDueAmount = () => {
    if (!selectedBooking) return;
    const due = Number(selectedBooking.amountDue || 0);
    if (due <= 0) return;
    setForm((p) => ({ ...p, amount: due.toFixed(2) }));
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.booking) return setError("Please select a booking.");
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0)
      return setError("Please enter a valid payment amount.");
    if (!selectedBooking)
      return setError("Selected booking could not be found.");

    const amountDue = Number(selectedBooking.amountDue || 0);
    if (amountDue <= 0) return setError("This booking has no outstanding amount.");
    if (amount > amountDue)
      return setError(
        `Payment cannot exceed the booking due amount of ${formatCurrency(
          amountDue,
          selectedBooking.currency || "INR"
        )}.`
      );
    if (!form.paymentMethod) return setError("Please select a payment method.");
    if (!form.paymentDate) return setError("Please select payment date.");

    try {
      setSaving(true);
      const payload = {
        booking: form.booking,
        amount,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        status: form.status,
        notes: form.notes.trim(),
      };
      if (form.transactionId.trim())
        payload.transactionId = form.transactionId.trim();

      const { data } = await api.post("/payments", payload);
      const created = data?.payment || data;

      setShowPaymentModal(false);
      setSuccess(
        `${created?.paymentNumber || "Payment"} recorded successfully.`
      );
      await Promise.all([fetchPayments(page), fetchBookings()]);
    } catch (err) {
      console.error("Create payment error:", err);
      setError(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     DETAILS
  ======================================================= */

  const openPaymentDetails = async (payment) => {
    try {
      setError("");
      setSelectedPayment(payment);
      setShowDetailsModal(true);
      if (!payment?._id) return;
      const { data } = await api.get(`/payments/${payment._id}`);
      const details = data?.payment || data;
      if (details) setSelectedPayment(details);
    } catch (err) {
      console.error("Payment details error:", err);
      setError(err.response?.data?.message || "Failed to load payment details.");
    }
  };

  const handleRefresh = async () => {
    setError("");
    await Promise.all([fetchPayments(page), fetchBookings()]);
  };

  const clearFilters = () => {
    setStatusFilter("");
    setMethodFilter("");
    setSearch("");
    setPage(1);
    setShowFilters(false);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* LEFT: SEARCH + FILTER + REFRESH */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={15}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payments..."
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
              onClick={() => setShowFilters((p) => !p)}
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
                      onClick={clearFilters}
                      className="text-xs font-medium text-gray-500 hover:text-red-600"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Payment Status
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PAYMENT_STATUSES.map((item) => (
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
                      Payment Method
                    </label>
                    <select
                      value={methodFilter}
                      onChange={(e) => setMethodFilter(e.target.value)}
                      className="w-full h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-700 outline-none focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10"
                    >
                      <option value="">All methods</option>
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5 flex items-start gap-2">
                    <FiInfo className="mt-0.5 text-gray-400 flex-shrink-0" size={13} />
                    <p className="text-[10px] leading-4 text-gray-500">
                      Search supports payment number, booking, customer, destination & transaction ID.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={clearFilters}
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

        {/* RIGHT: RECORD PAYMENT */}
        {canCreatePayment && (
          <button
            type="button"
            onClick={openPaymentModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap self-start lg:self-auto"
          >
            <FiPlus size={15} />
            Record Payment
          </button>
        )}
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard
          title="Collected"
          value={formatCurrency(summary.completedAmount)}
          subtitle={`${summary.completedCount} transaction${summary.completedCount === 1 ? "" : "s"}`}
          icon={<FiCheck size={16} />}
          iconClass="bg-emerald-50 text-emerald-600"
          valueClass="text-emerald-700"
        />
        <SummaryCard
          title="Pending"
          value={formatCurrency(summary.pendingAmount)}
          subtitle={`${summary.pendingCount} pending`}
          icon={<FiClock size={16} />}
          iconClass="bg-amber-50 text-amber-600"
          valueClass="text-amber-700"
        />
        <SummaryCard
          title="Failed"
          value={summary.failedCount}
          subtitle="Failed transactions"
          icon={<FiXCircle size={16} />}
          iconClass="bg-red-50 text-red-600"
          valueClass="text-red-700"
        />
        <SummaryCard
          title="Refunded"
          value={formatCurrency(summary.refundedAmount)}
          subtitle={`${summary.refundedCount} refunded`}
          icon={<FiRefreshCcw size={16} />}
          iconClass="bg-purple-50 text-purple-600"
          valueClass="text-purple-700"
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
            onClick={clearFilters}
            className="text-brand-blue hover:text-brand-blue-dark font-medium"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ALERTS */}
      {success && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-lg">
          <FiCheckCircle className="flex-shrink-0 mt-0.5" size={18} />
          <p className="flex-1">{success}</p>
          <button
            onClick={() => setSuccess("")}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <FiX size={16} />
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">
          <FiAlertCircle className="flex-shrink-0 mt-0.5" size={18} />
          <p className="flex-1">{error}</p>
          <button
            onClick={() => setError("")}
            className="text-red-600 hover:text-red-800"
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
              <p className="text-sm text-gray-500">Loading payments...</p>
            </div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <FiDollarSign size={24} />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-gray-800">
              No payments found
            </h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              {activeFilterCount > 0
                ? "No payments match your current filters."
                : "No payment transactions have been recorded yet."}
            </p>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Clear Filters
              </button>
            ) : canCreatePayment ? (
              <button
                type="button"
                onClick={openPaymentModal}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg"
              >
                <FiPlus size={15} /> Record First Payment
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  {["Payment", "Booking", "Customer", "Amount", "Method", "Date", "Status"].map(
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
                {filteredPayments.map((payment) => (
                  <PaymentRow
                    key={payment._id}
                    payment={payment}
                    onView={openPaymentDetails}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {!loading && totalPayments > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-700">{filteredPayments.length}</span>{" "}
              of{" "}
              <span className="font-medium text-gray-700">{totalPayments}</span>{" "}
              {totalPayments === 1 ? "payment" : "payments"}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40"
                >
                  <FiChevronLeft size={16} />
                </button>
                <span className="px-3 h-8 inline-flex items-center text-sm font-medium text-gray-700">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && (
        <PaymentFormModal
          form={form}
          saving={saving}
          bookings={bookings}
          bookingsLoading={bookingsLoading}
          selectedBooking={selectedBooking}
          onChange={handleFormChange}
          onBookingChange={handleBookingChange}
          onUseDue={fillDueAmount}
          onSubmit={handleSubmit}
          onClose={closePaymentModal}
        />
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && selectedPayment && (
        <PaymentDetailsModal
          payment={selectedPayment}
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
          {subtitle && <p className="mt-1 text-[11px] text-gray-400">{subtitle}</p>}
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

function PaymentRow({ payment, onView }) {
  return (
    <tr
      onClick={() => onView(payment)}
      className="hover:bg-brand-blue-50/40 transition-colors cursor-pointer group"
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-blue-50 text-brand-blue flex items-center justify-center shrink-0 group-hover:bg-brand-blue-100 transition">
            <FiHash size={15} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate max-w-[160px]">
              {payment.paymentNumber || "Payment"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[160px]">
              {payment.transactionId || "No transaction ID"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="font-medium text-gray-800 truncate max-w-[160px]">
          {getBookingCode(payment.booking)}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[160px]">
          {getBookingDestination(payment.booking)}
        </p>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-bold shrink-0">
            {getCustomerInitials(payment.customer)}
          </div>
          <p className="font-medium text-gray-800 truncate max-w-[160px]">
            {getCustomerName(payment.customer)}
          </p>
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="font-semibold text-gray-800 whitespace-nowrap">
          {formatCurrency(payment.amount, payment.currency || "INR")}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{payment.currency || "INR"}</p>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
            <FiCreditCard size={13} />
          </div>
          <span className="text-sm text-gray-700 truncate max-w-[120px]">
            {payment.paymentMethod || "-"}
          </span>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <FiCalendar size={13} className="text-gray-400 shrink-0" />
          {formatDate(payment.paymentDate)}
        </div>
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={payment.status} />
      </td>
    </tr>
  );
}

/* =========================================================
   FORM MODAL
========================================================= */

function PaymentFormModal({
  form, saving, bookings, bookingsLoading, selectedBooking,
  onChange, onBookingChange, onUseDue, onSubmit, onClose,
}) {
  return (
    <ModalShell
      title="Record Payment"
      subtitle="Record a customer payment against a booking"
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
            form="payment-form"
            disabled={saving || !form.booking || !form.amount}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 h-9 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <FiRefreshCcw className="animate-spin" size={15} /> Recording...
              </>
            ) : (
              <>
                <FiCheck size={15} /> Record Payment
              </>
            )}
          </button>
        </>
      }
    >
      <form id="payment-form" onSubmit={onSubmit} className="p-6 space-y-6">
        {/* BOOKING */}
        <section>
          <SectionTitle icon={<FiFileText size={14} />} title="Booking" />
          <div className="mt-4">
            <Field label="Booking *">
              <select
                name="booking"
                value={form.booking}
                onChange={onBookingChange}
                disabled={bookingsLoading || saving}
                className="input"
              >
                <option value="">
                  {bookingsLoading ? "Loading bookings..." : "Select booking"}
                </option>
                {bookings
                  .filter(
                    (b) =>
                      b.status !== "Cancelled" &&
                      b.status !== "Refunded" &&
                      Number(b.amountDue || 0) > 0
                  )
                  .map((b) => (
                    <option key={b._id} value={b._id}>
                      {getBookingCode(b)} — {getCustomerName(b.customer)} — Due{" "}
                      {formatCurrency(b.amountDue || 0, b.currency || "INR")}
                    </option>
                  ))}
              </select>
            </Field>
          </div>

          {selectedBooking && (
            <div className="mt-4 rounded-xl border border-brand-blue/20 bg-brand-blue-50/40 p-4">
              <div className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-blue">
                  Booking Financial Summary
                </p>
                <h4 className="mt-0.5 text-sm font-bold text-gray-800">
                  {getBookingCode(selectedBooking)}
                </h4>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <BalanceCell
                  label="Total"
                  value={formatCurrency(
                    selectedBooking.totalAmount || 0,
                    selectedBooking.currency || "INR"
                  )}
                />
                <BalanceCell
                  label="Paid"
                  value={formatCurrency(
                    selectedBooking.amountPaid || 0,
                    selectedBooking.currency || "INR"
                  )}
                  valueClass="text-emerald-600"
                />
                <BalanceCell
                  label="Outstanding"
                  value={formatCurrency(
                    selectedBooking.amountDue || 0,
                    selectedBooking.currency || "INR"
                  )}
                  valueClass="text-brand-blue"
                />
              </div>
            </div>
          )}
        </section>

        {/* PAYMENT */}
        <section>
          <SectionTitle icon={<FiCreditCard size={14} />} title="Payment Information" />

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-600">
                  Amount *
                </span>
                {selectedBooking && Number(selectedBooking.amountDue || 0) > 0 && (
                  <button
                    type="button"
                    onClick={onUseDue}
                    disabled={saving}
                    className="text-[11px] font-semibold text-brand-blue hover:text-brand-blue-dark"
                  >
                    Use full due
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
                  step="0.01"
                  max={selectedBooking ? selectedBooking.amountDue : undefined}
                  placeholder="0.00"
                  disabled={!selectedBooking || saving}
                  className="input pl-7 font-semibold"
                />
              </div>
              {selectedBooking && (
                <p className="mt-1 text-[11px] text-gray-400">
                  Max:{" "}
                  <span className="font-semibold text-gray-600">
                    {formatCurrency(
                      selectedBooking.amountDue || 0,
                      selectedBooking.currency || "INR"
                    )}
                  </span>
                </p>
              )}
            </div>

            <Field label="Payment Method *">
              <select
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={onChange}
                disabled={saving}
                className="input"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>

            <Field label="Payment Date *">
              <input
                type="date"
                name="paymentDate"
                value={form.paymentDate}
                onChange={onChange}
                max={getToday()}
                disabled={saving}
                className="input"
              />
            </Field>

            <Field label="Status">
              <select
                name="status"
                value={form.status}
                onChange={onChange}
                disabled={saving}
                className="input"
              >
                {CREATABLE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
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
                placeholder="e.g. UPI transaction reference"
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
                placeholder="Add any useful payment notes..."
                className="input resize-none"
              />
            </Field>
          </div>
        </section>

        {/* PREVIEW */}
        {selectedBooking && Number(form.amount || 0) > 0 && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                After This Payment
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Estimated remaining balance
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(
                  Math.max(
                    0,
                    Number(selectedBooking.amountDue || 0) - Number(form.amount || 0)
                  ),
                  selectedBooking.currency || "INR"
                )}
              </p>
              <p className="text-[10px] text-gray-400">Remaining due</p>
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
      <p className={`mt-1 text-sm font-bold truncate ${valueClass}`}>{value}</p>
    </div>
  );
}

/* =========================================================
   DETAILS MODAL
========================================================= */

function PaymentDetailsModal({ payment, onClose }) {
  return (
    <ModalShell
      title="Payment Details"
      subtitle={payment.paymentNumber || "Payment transaction"}
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
            <p className="text-xs font-medium text-gray-500">Payment Amount</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 break-all">
              {formatCurrency(payment.amount, payment.currency || "INR")}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {formatDate(payment.paymentDate)}
            </p>
          </div>
          <div className="flex-shrink-0">
            <StatusBadge status={payment.status} />
          </div>
        </div>

        {/* TRANSACTION INFO */}
        <section>
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
            Transaction Information
          </h3>
          <div className="space-y-2.5">
            <DetailLine label="Payment Number" value={payment.paymentNumber || "-"} />
            <DetailLine label="Payment Method" value={payment.paymentMethod || "-"} />
            <DetailLine label="Payment Date" value={formatDate(payment.paymentDate)} />
            <DetailLine
              label="Received By"
              value={payment.receivedBy?.name || payment.receivedBy?.email || "-"}
            />
          </div>
        </section>

        {/* BOOKING */}
        <section>
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
            Booking Information
          </h3>
          <div className="space-y-2.5">
            <DetailLine label="Booking No." value={getBookingCode(payment.booking)} />
            <DetailLine
              label="Destination"
              value={getBookingDestination(payment.booking)}
            />
            <DetailLine label="Customer" value={getCustomerName(payment.customer)} />
          </div>
        </section>

        {/* TRANSACTION ID */}
        {payment.transactionId && (
          <section>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
              Transaction ID
            </h3>
            <p className="text-sm break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-gray-700">
              {payment.transactionId}
            </p>
          </section>
        )}

        {/* NOTES */}
        {payment.notes && (
          <section>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
              Notes
            </h3>
            <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">
              {payment.notes}
            </p>
          </section>
        )}

        {/* CREATED */}
        {payment.createdAt && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-3 border-t border-gray-100">
            <FiClock size={12} />
            Created {formatDateTime(payment.createdAt)}
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