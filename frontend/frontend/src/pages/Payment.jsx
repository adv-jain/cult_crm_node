import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiEye,
  FiFileText,
  FiFilter,
  FiHash,
  FiInfo,
  FiPlus,
  FiRefreshCcw,
  FiSearch,
  FiUser,
  FiX,
  FiXCircle,
} from "react-icons/fi";

import api from "../api";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   CONSTANTS
========================================================= */

const PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
  "Cheque",
  "Online",
];

const PAYMENT_STATUSES = [
  "Pending",
  "Completed",
  "Failed",
  "Refunded",
];

const CREATABLE_STATUSES = [
  "Pending",
  "Completed",
  "Failed",
];

const CREATE_ROLES = [
  "admin",
  "manager",
  "sales",
  "accounts",
];

/* =========================================================
   HELPERS
========================================================= */

const getToday = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatCurrency = (amount = 0, currency = "INR") => {
  const value = Number(amount || 0);

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `₹${value.toLocaleString("en-IN")}`;
  }
};

const formatDate = (date) => {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getCustomerName = (customer) => {
  if (!customer) return "Unknown Customer";

  if (typeof customer === "string") {
    return customer;
  }

  const fullName = [
    customer.firstName,
    customer.middleName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    fullName ||
    customer.name ||
    customer.fullName ||
    "Unknown Customer"
  );
};

const getCustomerInitials = (customer) => {
  const name = getCustomerName(customer);

  if (!name || name === "Unknown Customer") {
    return "C";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const getBookingCode = (booking) => {
  if (!booking) return "-";

  if (typeof booking === "string") {
    return booking;
  }

  return (
    booking.bookingNumber ||
    booking.bookingCode ||
    booking.code ||
    booking._id ||
    "-"
  );
};

const getBookingDestination = (booking) => {
  if (!booking || typeof booking === "string") {
    return "-";
  }

  return (
    booking.destination ||
    booking.packageName ||
    "Travel Booking"
  );
};

const extractPayments = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  return (
    data?.payments ||
    data?.data ||
    data?.results ||
    []
  );
};

const extractBookings = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  return (
    data?.bookings ||
    data?.data ||
    data?.results ||
    []
  );
};

/* =========================================================
   LOADING SPINNER
========================================================= */

const LoadingSpinner = ({
  text = "Loading...",
}) => {
  return (
    <div className="flex min-h-[260px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-600" />

        <span className="text-sm text-gray-500">
          {text}
        </span>
      </div>
    </div>
  );
};

/* =========================================================
   STATUS BADGE
========================================================= */

const StatusBadge = ({ status }) => {
  const config = {
    Completed: {
      icon: FiCheck,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
    },

    Pending: {
      icon: FiClock,
      className:
        "border-amber-200 bg-amber-50 text-amber-700",
    },

    Failed: {
      icon: FiXCircle,
      className:
        "border-red-200 bg-red-50 text-red-700",
    },

    Refunded: {
      icon: FiRefreshCcw,
      className:
        "border-purple-200 bg-purple-50 text-purple-700",
    },
  };

  const current = config[status] || {
    icon: FiClock,
    className:
      "border-gray-200 bg-gray-50 text-gray-600",
  };

  const Icon = current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${current.className}`}
    >
      <Icon size={12} />
      {status || "Unknown"}
    </span>
  );
};

/* =========================================================
   METHOD BADGE
========================================================= */

const MethodBadge = ({ method }) => {
  const icons = {
    UPI: "UPI",
    Card: "CARD",
    Cash: "CASH",
    "Bank Transfer": "BANK",
    Cheque: "CHEQUE",
    Online: "ONLINE",
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
        <FiCreditCard size={14} />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700">
          {method || "-"}
        </p>

        {method && icons[method] && (
          <p className="text-[9px] font-semibold tracking-wider text-gray-400">
            {icons[method]}
          </p>
        )}
      </div>
    </div>
  );
};

/* =========================================================
   SUMMARY CARD
========================================================= */

const SummaryCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
  valueClass = "text-gray-900",
}) => {
  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {title}
          </p>

          <p
            className={`mt-2 truncate text-2xl font-bold ${valueClass}`}
          >
            {value}
          </p>

          {subtitle && (
            <p className="mt-1.5 text-xs text-gray-500">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Payment() {
  const { user } = useAuth();

  const role = String(
    user?.role || ""
  ).toLowerCase();

  const canCreatePayment =
    CREATE_ROLES.includes(role);

  /* =======================================================
     DATA
  ======================================================= */

  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);

  /* =======================================================
     UI
  ======================================================= */

  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("");
  const [methodFilter, setMethodFilter] =
    useState("");

  const [showFilters, setShowFilters] =
    useState(false);

  const [page, setPage] = useState(1);
  const limit = 10;

  const [totalPages, setTotalPages] =
    useState(1);

  const [totalPayments, setTotalPayments] =
    useState(0);

  const [showPaymentModal, setShowPaymentModal] =
    useState(false);

  const [showDetailsModal, setShowDetailsModal] =
    useState(false);

  const [selectedPayment, setSelectedPayment] =
    useState(null);

  /* =======================================================
     FORM
  ======================================================= */

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
     FETCH PAYMENTS
  ======================================================= */

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit,
      };

      if (statusFilter) {
        params.status = statusFilter;
      }

      if (methodFilter) {
        params.paymentMethod = methodFilter;
      }

      const response = await api.get(
        "/payments",
        { params }
      );

      const data = response.data || {};

      const paymentList =
        extractPayments(data);

      setPayments(paymentList);

      setTotalPayments(
        Number(
          data.total ??
            paymentList.length
        )
      );

      setTotalPages(
        Math.max(
          Number(data.totalPages ?? 1),
          1
        )
      );
    } catch (err) {
      console.error(
        "Fetch payments error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load payments."
      );

      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     FETCH BOOKINGS
  ======================================================= */

  const fetchBookings = async () => {
    try {
      setBookingsLoading(true);

      const response = await api.get(
        "/bookings",
        {
          params: {
            limit: 100,
          },
        }
      );

      const bookingList =
        extractBookings(response.data);

      setBookings(bookingList);
    } catch (err) {
      console.error(
        "Fetch bookings error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load bookings."
      );
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
    fetchPayments();
  }, [
    page,
    statusFilter,
    methodFilter,
  ]);

  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      setSuccess("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => {
      setError("");
    }, 6000);

    return () => clearTimeout(timer);
  }, [error]);

  /* =======================================================
     SELECTED BOOKING
  ======================================================= */

  const selectedBooking = useMemo(() => {
    if (!form.booking) {
      return null;
    }

    return bookings.find(
      (booking) =>
        booking._id === form.booking
    );
  }, [
    form.booking,
    bookings,
  ]);

  /* =======================================================
     FILTERED PAYMENTS
  ======================================================= */

  const filteredPayments = useMemo(() => {
    const term =
      search.trim().toLowerCase();

    if (!term) {
      return payments;
    }

    return payments.filter(
      (payment) => {
        const searchableText = [
          payment.paymentNumber || "",
          getBookingCode(
            payment.booking
          ),
          getCustomerName(
            payment.customer
          ),
          payment.transactionId || "",
          payment.paymentMethod || "",
          payment.status || "",
          getBookingDestination(
            payment.booking
          ),
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(
          term
        );
      }
    );
  }, [payments, search]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    const completed =
      payments.filter(
        (payment) =>
          payment.status ===
          "Completed"
      );

    const pending =
      payments.filter(
        (payment) =>
          payment.status ===
          "Pending"
      );

    const failed =
      payments.filter(
        (payment) =>
          payment.status ===
          "Failed"
      );

    const refunded =
      payments.filter(
        (payment) =>
          payment.status ===
          "Refunded"
      );

    const completedAmount =
      completed.reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.amount || 0
          ),
        0
      );

    const pendingAmount =
      pending.reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.amount || 0
          ),
        0
      );

    const refundedAmount =
      refunded.reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.amount || 0
          ),
        0
      );

    return {
      completedCount:
        completed.length,

      completedAmount,

      pendingCount:
        pending.length,

      pendingAmount,

      failedCount:
        failed.length,

      refundedCount:
        refunded.length,

      refundedAmount,
    };
  }, [payments]);

  /* =======================================================
     FORM CHANGE
  ======================================================= */

  const handleFormChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  /* =======================================================
     OPEN PAYMENT MODAL
  ======================================================= */

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

  /* =======================================================
     CLOSE PAYMENT MODAL
  ======================================================= */

  const closePaymentModal = () => {
    if (saving) return;

    setShowPaymentModal(false);
  };

  /* =======================================================
     BOOKING CHANGE
  ======================================================= */

  const handleBookingChange = (
    event
  ) => {
    const bookingId =
      event.target.value;

    const booking =
      bookings.find(
        (item) =>
          item._id === bookingId
      );

    setForm(
      (previous) => ({
        ...previous,
        booking: bookingId,
        amount: "",
      })
    );

    if (
      booking &&
      Number(
        booking.amountDue || 0
      ) <= 0
    ) {
      setError(
        "This booking has no outstanding amount."
      );
    } else {
      setError("");
    }
  };

  /* =======================================================
     QUICK FILL DUE
  ======================================================= */

  const fillDueAmount = () => {
    if (!selectedBooking) {
      return;
    }

    const due = Number(
      selectedBooking.amountDue || 0
    );

    if (due <= 0) {
      return;
    }

    setForm(
      (previous) => ({
        ...previous,
        amount: due.toFixed(2),
      })
    );
  };

  /* =======================================================
     CREATE PAYMENT
  ======================================================= */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.booking) {
      setError(
        "Please select a booking."
      );
      return;
    }

    const amount =
      Number(form.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        "Please enter a valid payment amount."
      );
      return;
    }

    if (!selectedBooking) {
      setError(
        "Selected booking could not be found."
      );
      return;
    }

    const amountDue =
      Number(
        selectedBooking.amountDue || 0
      );

    if (amountDue <= 0) {
      setError(
        "This booking has no outstanding amount."
      );
      return;
    }

    if (amount > amountDue) {
      setError(
        `Payment cannot exceed the booking due amount of ${formatCurrency(
          amountDue,
          selectedBooking.currency ||
            "INR"
        )}.`
      );
      return;
    }

    if (!form.paymentMethod) {
      setError(
        "Please select a payment method."
      );
      return;
    }

    if (!form.paymentDate) {
      setError(
        "Please select payment date."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        booking:
          form.booking,

        amount,

        paymentMethod:
          form.paymentMethod,

        paymentDate:
          form.paymentDate,

        status:
          form.status,

        notes:
          form.notes.trim(),
      };

      if (
        form.transactionId.trim()
      ) {
        payload.transactionId =
          form.transactionId.trim();
      }

      const response =
        await api.post(
          "/payments",
          payload
        );

      const createdPayment =
        response.data?.payment ||
        response.data;

      setShowPaymentModal(false);

      setSuccess(
        `${
          createdPayment?.paymentNumber ||
          "Payment"
        } recorded successfully.`
      );

      await Promise.all([
        fetchPayments(),
        fetchBookings(),
      ]);
    } catch (err) {
      console.error(
        "Create payment error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to record payment."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     PAYMENT DETAILS
  ======================================================= */

  const openPaymentDetails =
    async (payment) => {
      try {
        setError("");

        setSelectedPayment(
          payment
        );

        setShowDetailsModal(
          true
        );

        if (!payment?._id) {
          return;
        }

        const response =
          await api.get(
            `/payments/${payment._id}`
          );

        const details =
          response.data?.payment ||
          response.data;

        if (details) {
          setSelectedPayment(
            details
          );
        }
      } catch (err) {
        console.error(
          "Payment details error:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Failed to load payment details."
        );
      }
    };

  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  const clearFilters = () => {
    setStatusFilter("");
    setMethodFilter("");
    setSearch("");
    setPage(1);
  };

  const hasFilters = Boolean(
    search ||
      statusFilter ||
      methodFilter
  );

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = async () => {
    setError("");

    await Promise.all([
      fetchPayments(),
      fetchBookings(),
    ]);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-full bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-200">
                <FiDollarSign size={22} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  Payments
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Manage booking collections,
                  transactions and payment records.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">

            {/* SEARCH */}

            <div className="relative">
              <FiSearch
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                size={17}
              />

              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value
                  );
                  setPage(1);
                }}
                placeholder="Search payments..."
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 sm:w-64"
              />
            </div>

            {/* FILTER + COMPACT POPUP */}

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setShowFilters(
                    (previous) =>
                      !previous
                  )
                }
                className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold shadow-sm transition sm:w-auto ${
                  showFilters ||
                  hasFilters
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <FiFilter size={16} />

                Filters

                {hasFilters && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                    {
                      [
                        search,
                        statusFilter,
                        methodFilter,
                      ].filter(Boolean)
                        .length
                    }
                  </span>
                )}

                <FiChevronDown
                  size={15}
                  className={`transition-transform ${
                    showFilters
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </button>

              {/* =================================================
                  COMPACT FILTER POPUP
              ================================================= */}

              {showFilters && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[280px] rounded-xl border border-gray-200 bg-white p-4 shadow-xl shadow-gray-200/50">

                  {/* POPUP HEADER */}

                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Filters
                      </h3>

                      <p className="mt-0.5 text-[11px] text-gray-400">
                        Refine payments
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowFilters(
                          false
                        )
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                      title="Close filters"
                    >
                      <FiX size={15} />
                    </button>
                  </div>

                  {/* STATUS */}

                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Payment Status
                    </label>

                    <select
                      value={
                        statusFilter
                      }
                      onChange={(event) => {
                        setStatusFilter(
                          event.target.value
                        );
                        setPage(1);
                      }}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-50"
                    >
                      <option value="">
                        All statuses
                      </option>

                      {PAYMENT_STATUSES.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* METHOD */}

                  <div className="mt-3">
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Payment Method
                    </label>

                    <select
                      value={
                        methodFilter
                      }
                      onChange={(event) => {
                        setMethodFilter(
                          event.target.value
                        );
                        setPage(1);
                      }}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-50"
                    >
                      <option value="">
                        All methods
                      </option>

                      {PAYMENT_METHODS.map(
                        (method) => (
                          <option
                            key={method}
                            value={method}
                          >
                            {method}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* SEARCH INFO */}

                  <div className="mt-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5">
                    <div className="flex items-start gap-2">
                      <FiInfo
                        className="mt-0.5 flex-shrink-0 text-gray-400"
                        size={13}
                      />

                      <p className="text-[10px] leading-4 text-gray-500">
                        Search works with payment
                        number, booking, customer,
                        destination and transaction ID.
                      </p>
                    </div>
                  </div>

                  {/* ACTIONS */}

                  <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        clearFilters();
                      }}
                      disabled={!hasFilters}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowFilters(
                          false
                        )
                      }
                      className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* REFRESH */}

            <button
              type="button"
              onClick={
                handleRefresh
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <FiRefreshCcw
                size={16}
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>

            {/* RECORD PAYMENT */}

            {canCreatePayment && (
              <button
                type="button"
                onClick={
                  openPaymentModal
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.98]"
              >
                <FiPlus size={17} />

                Record Payment
              </button>
            )}
          </div>
        </div>

        {/* =================================================
            ALERTS
        ================================================= */}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 shadow-sm">
            <FiCheck
              className="mt-0.5 flex-shrink-0"
              size={18}
            />

            <div className="flex-1 text-sm font-medium">
              {success}
            </div>

            <button
              type="button"
              onClick={() =>
                setSuccess("")
              }
              className="text-emerald-500 transition hover:text-emerald-700"
            >
              <FiX size={17} />
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 shadow-sm">
            <FiAlertCircle
              className="mt-0.5 flex-shrink-0"
              size={18}
            />

            <div className="flex-1 text-sm font-medium">
              {error}
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="text-red-500 transition hover:text-red-700"
            >
              <FiX size={17} />
            </button>
          </div>
        )}

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            title="Collected"
            value={formatCurrency(
              summary.completedAmount
            )}
            subtitle={`${summary.completedCount} completed transaction${
              summary.completedCount ===
              1
                ? ""
                : "s"
            }`}
            icon={FiCheck}
            iconClass="bg-emerald-50 text-emerald-600"
            valueClass="text-emerald-700"
          />

          <SummaryCard
            title="Pending"
            value={formatCurrency(
              summary.pendingAmount
            )}
            subtitle={`${summary.pendingCount} pending transaction${
              summary.pendingCount ===
              1
                ? ""
                : "s"
            }`}
            icon={FiClock}
            iconClass="bg-amber-50 text-amber-600"
            valueClass="text-amber-700"
          />

          <SummaryCard
            title="Failed"
            value={
              summary.failedCount
            }
            subtitle="Failed payment transactions"
            icon={FiXCircle}
            iconClass="bg-red-50 text-red-600"
            valueClass="text-red-700"
          />

          <SummaryCard
            title="Refunded"
            value={formatCurrency(
              summary.refundedAmount
            )}
            subtitle={`${summary.refundedCount} refunded transaction${
              summary.refundedCount ===
              1
                ? ""
                : "s"
            }`}
            icon={FiRefreshCcw}
            iconClass="bg-purple-50 text-purple-600"
            valueClass="text-purple-700"
          />
        </div>

        {/* =================================================
            TRANSACTION TABLE
        ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          {/* TABLE HEADER */}

          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">
                  Payment Transactions
                </h2>

                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                  {totalPayments}
                </span>
              </div>

              <p className="mt-1 text-xs text-gray-500">
                Recent payment activity across bookings.
              </p>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="inline-flex items-center gap-1.5 self-start rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200"
              >
                <FiX size={13} />
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <LoadingSpinner text="Loading payment transactions..." />
          ) : filteredPayments.length ===
            0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-5 py-12 text-center">

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                <FiDollarSign
                  size={28}
                />
              </div>

              <h3 className="mt-5 text-sm font-bold text-gray-900">
                No payments found
              </h3>

              <p className="mt-1 max-w-md text-sm leading-6 text-gray-500">
                {hasFilters
                  ? "No payment transactions match your current search or filters."
                  : "No payment transactions have been recorded yet."}
              </p>

              {hasFilters && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="mt-5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              )}

              {canCreatePayment &&
                !hasFilters && (
                  <button
                    type="button"
                    onClick={
                      openPaymentModal
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    <FiPlus
                      size={16}
                    />
                    Record First Payment
                  </button>
                )}
            </div>
          ) : (
            <>
              {/* TABLE */}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Payment
                      </th>

                      <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Booking
                      </th>

                      <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Customer
                      </th>

                      <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Amount
                      </th>

                      <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Method
                      </th>

                      <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Date
                      </th>

                      <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Status
                      </th>

                      <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredPayments.map(
                      (payment) => (
                        <tr
                          key={
                            payment._id
                          }
                          onClick={() =>
                            openPaymentDetails(
                              payment
                            )
                          }
                          className="group cursor-pointer transition hover:bg-blue-50/30"
                        >
                          {/* PAYMENT */}

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
                                <FiHash
                                  size={16}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-gray-900">
                                  {payment.paymentNumber ||
                                    "Payment"}
                                </p>

                                {payment.transactionId ? (
                                  <p className="mt-1 max-w-[180px] truncate font-mono text-[10px] text-gray-400">
                                    {
                                      payment.transactionId
                                    }
                                  </p>
                                ) : (
                                  <p className="mt-1 text-[10px] text-gray-400">
                                    No transaction ID
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* BOOKING */}

                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-gray-800">
                              {getBookingCode(
                                payment.booking
                              )}
                            </p>

                            <p className="mt-1 max-w-[170px] truncate text-xs text-gray-400">
                              {getBookingDestination(
                                payment.booking
                              )}
                            </p>
                          </td>

                          {/* CUSTOMER */}

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                                {getCustomerInitials(
                                  payment.customer
                                )}
                              </div>

                              <span className="max-w-[160px] truncate text-sm font-medium text-gray-700">
                                {getCustomerName(
                                  payment.customer
                                )}
                              </span>
                            </div>
                          </td>

                          {/* AMOUNT */}

                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-gray-900">
                              {formatCurrency(
                                payment.amount,
                                payment.currency ||
                                  "INR"
                              )}
                            </p>

                            <p className="mt-1 text-[10px] text-gray-400">
                              {payment.currency ||
                                "INR"}
                            </p>
                          </td>

                          {/* METHOD */}

                          <td className="px-5 py-4">
                            <MethodBadge
                              method={
                                payment.paymentMethod
                              }
                            />
                          </td>

                          {/* DATE */}

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FiCalendar
                                size={14}
                                className="text-gray-400"
                              />

                              {formatDate(
                                payment.paymentDate
                              )}
                            </div>
                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                payment.status
                              }
                            />
                          </td>

                          {/* ACTION */}

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                openPaymentDetails(
                                  payment
                                );
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-gray-400 transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600"
                              title="View payment"
                            >
                              <FiEye
                                size={16}
                              />
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}

              <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-gray-700">
                    {filteredPayments.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-700">
                    {totalPayments}
                  </span>{" "}
                  payments
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      page <= 1
                    }
                    onClick={() =>
                      setPage(
                        (previous) =>
                          Math.max(
                            1,
                            previous - 1
                          )
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FiChevronLeft
                      size={16}
                    />
                  </button>

                  <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-bold text-white shadow-sm">
                    {page}
                  </div>

                  <button
                    type="button"
                    disabled={
                      page >=
                      totalPages
                    }
                    onClick={() =>
                      setPage(
                        (previous) =>
                          Math.min(
                            totalPages,
                            previous + 1
                          )
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FiChevronRight
                      size={16}
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* =====================================================
          RECORD PAYMENT MODAL
      ===================================================== */}

      {showPaymentModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-gray-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closePaymentModal();
            }
          }}
        >
          <div className="my-6 w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FiCreditCard
                    size={20}
                  />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Record Payment
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-500">
                    Record a customer payment against a booking.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  closePaymentModal
                }
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <FiX size={19} />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleSubmit
              }
            >
              <div className="max-h-[72vh] overflow-y-auto px-6 py-6">

                {/* BOOKING SECTION */}

                <div>
                  <div className="mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      Booking
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Select the booking against which this payment is being received.
                    </p>
                  </div>

                  <select
                    name="booking"
                    value={
                      form.booking
                    }
                    onChange={
                      handleBookingChange
                    }
                    disabled={
                      bookingsLoading ||
                      saving
                    }
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-gray-50"
                  >
                    <option value="">
                      {bookingsLoading
                        ? "Loading bookings..."
                        : "Select booking"}
                    </option>

                    {bookings
                      .filter(
                        (booking) =>
                          booking.status !==
                            "Cancelled" &&
                          booking.status !==
                            "Refunded" &&
                          Number(
                            booking.amountDue ||
                              0
                          ) > 0
                      )
                      .map(
                        (booking) => {
                          const amountDue =
                            Number(
                              booking.amountDue ||
                                0
                            );

                          return (
                            <option
                              key={
                                booking._id
                              }
                              value={
                                booking._id
                              }
                            >
                              {getBookingCode(
                                booking
                              )}{" "}
                              —{" "}
                              {getCustomerName(
                                booking.customer
                              )}{" "}
                              — Due{" "}
                              {formatCurrency(
                                amountDue,
                                booking.currency ||
                                  "INR"
                              )}
                            </option>
                          );
                        }
                      )}
                  </select>
                </div>

                {/* BOOKING FINANCIAL SNAPSHOT */}

                {selectedBooking && (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/60">
                    <div className="border-b border-blue-100 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FiFileText
                          className="text-blue-600"
                          size={15}
                        />

                        <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                          Booking Financial Summary
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 divide-y divide-blue-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                      <div className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Booking Total
                        </p>

                        <p className="mt-1 text-base font-bold text-gray-900">
                          {formatCurrency(
                            selectedBooking.totalAmount ||
                              0,
                            selectedBooking.currency ||
                              "INR"
                          )}
                        </p>
                      </div>

                      <div className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Already Paid
                        </p>

                        <p className="mt-1 text-base font-bold text-emerald-600">
                          {formatCurrency(
                            selectedBooking.amountPaid ||
                              0,
                            selectedBooking.currency ||
                              "INR"
                          )}
                        </p>
                      </div>

                      <div className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Outstanding
                        </p>

                        <p className="mt-1 text-base font-bold text-blue-700">
                          {formatCurrency(
                            selectedBooking.amountDue ||
                              0,
                            selectedBooking.currency ||
                              "INR"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* PAYMENT SECTION */}

                <div className="mt-7">
                  <div className="mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      Payment Information
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Enter the amount and transaction details.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                    {/* AMOUNT */}

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-sm font-semibold text-gray-700">
                          Amount
                          <span className="ml-1 text-red-500">
                            *
                          </span>
                        </label>

                        {selectedBooking &&
                          Number(
                            selectedBooking.amountDue ||
                              0
                          ) > 0 && (
                            <button
                              type="button"
                              onClick={
                                fillDueAmount
                              }
                              disabled={
                                saving
                              }
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                            >
                              Use full due
                            </button>
                          )}
                      </div>

                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                          ₹
                        </span>

                        <input
                          type="number"
                          name="amount"
                          value={
                            form.amount
                          }
                          onChange={
                            handleFormChange
                          }
                          min="0.01"
                          step="0.01"
                          max={
                            selectedBooking
                              ? selectedBooking.amountDue
                              : undefined
                          }
                          placeholder="0.00"
                          disabled={
                            !selectedBooking ||
                            saving
                          }
                          className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-8 pr-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-gray-50"
                        />
                      </div>

                      {selectedBooking && (
                        <p className="mt-1.5 text-xs text-gray-400">
                          Maximum payment:{" "}
                          <span className="font-semibold text-gray-600">
                            {formatCurrency(
                              selectedBooking.amountDue ||
                                0,
                              selectedBooking.currency ||
                                "INR"
                            )}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* METHOD */}

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        Payment Method
                        <span className="ml-1 text-red-500">
                          *
                        </span>
                      </label>

                      <select
                        name="paymentMethod"
                        value={
                          form.paymentMethod
                        }
                        onChange={
                          handleFormChange
                        }
                        disabled={
                          saving
                        }
                        className="h-12 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      >
                        {PAYMENT_METHODS.map(
                          (method) => (
                            <option
                              key={
                                method
                              }
                              value={
                                method
                              }
                            >
                              {method}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* DATE */}

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        Payment Date
                        <span className="ml-1 text-red-500">
                          *
                        </span>
                      </label>

                      <input
                        type="date"
                        name="paymentDate"
                        value={
                          form.paymentDate
                        }
                        onChange={
                          handleFormChange
                        }
                        max={
                          getToday()
                        }
                        disabled={
                          saving
                        }
                        className="h-12 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      />
                    </div>

                    {/* STATUS */}

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        Status
                      </label>

                      <select
                        name="status"
                        value={
                          form.status
                        }
                        onChange={
                          handleFormChange
                        }
                        disabled={
                          saving
                        }
                        className="h-12 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      >
                        {CREATABLE_STATUSES.map(
                          (status) => (
                            <option
                              key={
                                status
                              }
                              value={
                                status
                              }
                            >
                              {status}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* TRANSACTION SECTION */}

                <div className="mt-7">
                  <div className="mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      Transaction Details
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Transaction ID
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        Optional
                      </span>
                    </label>

                    <input
                      type="text"
                      name="transactionId"
                      value={
                        form.transactionId
                      }
                      onChange={
                        handleFormChange
                      }
                      disabled={
                        saving
                      }
                      placeholder="e.g. UPI transaction reference"
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-gray-50"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Notes
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        Optional
                      </span>
                    </label>

                    <textarea
                      name="notes"
                      value={
                        form.notes
                      }
                      onChange={
                        handleFormChange
                      }
                      disabled={
                        saving
                      }
                      rows={3}
                      placeholder="Add any useful payment notes..."
                      className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                {/* PAYMENT PREVIEW */}

                {selectedBooking &&
                  Number(
                    form.amount || 0
                  ) > 0 && (
                    <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            After This Payment
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            Estimated remaining balance
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(
                              Math.max(
                                0,
                                Number(
                                  selectedBooking.amountDue ||
                                    0
                                ) -
                                  Number(
                                    form.amount ||
                                      0
                                  )
                              ),
                              selectedBooking.currency ||
                                "INR"
                            )}
                          </p>

                          <p className="text-xs text-gray-400">
                            Remaining due
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              {/* FOOTER */}

              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closePaymentModal
                  }
                  disabled={
                    saving
                  }
                  className="h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !form.booking ||
                    !form.amount
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <FiCheck
                        size={16}
                      />
                      Record Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          PAYMENT DETAILS MODAL
      ===================================================== */}

      {showDetailsModal &&
        selectedPayment && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-gray-950/55 p-4 backdrop-blur-sm"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setShowDetailsModal(
                  false
                );
              }
            }}
          >
            <div className="my-6 w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">

              {/* HEADER */}

              <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FiDollarSign
                      size={21}
                    />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Payment Details
                    </h2>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {selectedPayment.paymentNumber ||
                        "Payment transaction"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowDetailsModal(
                      false
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <FiX size={19} />
                </button>
              </div>

              {/* CONTENT */}

              <div className="max-h-[72vh] overflow-y-auto px-6 py-6">

                {/* PAYMENT HERO */}

                <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Payment Amount
                      </p>

                      <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
                        {formatCurrency(
                          selectedPayment.amount,
                          selectedPayment.currency ||
                            "INR"
                        )}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {formatDate(
                          selectedPayment.paymentDate
                        )}
                      </p>
                    </div>

                    <StatusBadge
                      status={
                        selectedPayment.status
                      }
                    />
                  </div>
                </div>

                {/* TRANSACTION INFO */}

                <div className="mt-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-600">
                    Transaction Information
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                    <div className="rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                        <FiHash
                          size={14}
                        />
                        Payment Number
                      </div>

                      <p className="mt-2 text-sm font-bold text-gray-900">
                        {selectedPayment.paymentNumber ||
                          "-"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                        <FiCreditCard
                          size={14}
                        />
                        Payment Method
                      </div>

                      <p className="mt-2 text-sm font-bold text-gray-900">
                        {selectedPayment.paymentMethod ||
                          "-"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                        <FiCalendar
                          size={14}
                        />
                        Payment Date
                      </div>

                      <p className="mt-2 text-sm font-bold text-gray-900">
                        {formatDate(
                          selectedPayment.paymentDate
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                        <FiUser
                          size={14}
                        />
                        Received By
                      </div>

                      <p className="mt-2 text-sm font-bold text-gray-900">
                        {selectedPayment.receivedBy
                          ?.name ||
                          selectedPayment
                            .receivedBy
                            ?.email ||
                          "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* BOOKING */}

                <div className="mt-6">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-600">
                    Booking Information
                  </p>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                        <FiFileText
                          size={17}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900">
                          {getBookingCode(
                            selectedPayment.booking
                          )}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {getBookingDestination(
                            selectedPayment.booking
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CUSTOMER */}

                <div className="mt-4">
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                        {getCustomerInitials(
                          selectedPayment.customer
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Customer
                        </p>

                        <p className="mt-1 text-sm font-bold text-gray-900">
                          {getCustomerName(
                            selectedPayment.customer
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TRANSACTION ID */}

                {selectedPayment.transactionId && (
                  <div className="mt-4 rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Transaction ID
                    </p>

                    <p className="mt-2 break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs font-medium text-gray-700">
                      {
                        selectedPayment.transactionId
                      }
                    </p>
                  </div>
                )}

                {/* NOTES */}

                {selectedPayment.notes && (
                  <div className="mt-4 rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Notes
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {
                        selectedPayment.notes
                      }
                    </p>
                  </div>
                )}

                {/* CREATED */}

                {selectedPayment.createdAt && (
                  <div className="mt-5 flex items-center gap-2 text-xs text-gray-400">
                    <FiClock
                      size={13}
                    />

                    Created{" "}
                    {formatDateTime(
                      selectedPayment.createdAt
                    )}
                  </div>
                )}
              </div>

              {/* FOOTER */}

              <div className="flex justify-end border-t border-gray-100 bg-gray-50/60 px-6 py-4">
                <button
                  type="button"
                  onClick={() =>
                    setShowDetailsModal(
                      false
                    )
                  }
                  className="h-10 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}