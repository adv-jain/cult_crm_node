import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiPlus,
  FiSearch,
  FiX,
  FiFilter,
  FiCheckCircle,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUser,
  FiUsers,
  FiDollarSign,
  FiEye,
  FiEdit2,
  FiCheck,
  FiXCircle,
} from "react-icons/fi";
import api from "../api";
import { useAuth } from "../context/AuthContext";

// =========================
// CONSTANTS
// =========================

const STATUS_OPTIONS = [
  "Pending",
  "Confirmed",
  "Cancelled",
  "Completed",
  "Refunded",
];

const PAYMENT_STATUS_OPTIONS = ["Pending", "Partially Paid", "Paid"];

const TRAVEL_TYPES = ["Domestic", "International", "Other"];

const INITIAL_FORM = {
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
  specialRequests: "",
  internalNotes: "",
};

// =========================
// HELPERS
// =========================

const formatDate = (date) => {
  if (!date) return "—";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "—";

  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateInput = (date) => {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "";

  return value.toISOString().split("T")[0];
};

const formatCurrency = (amount, currency = "INR") => {
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

const getCustomerName = (customer) => {
  if (!customer) return "No customer";

  const name = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ");

  return name || customer.name || customer.email || "Customer";
};

const getOwnerName = (owner) => {
  if (!owner) return "Unassigned";

  return owner.name || owner.email || "User";
};

const getQuotationLabel = (quotation) => {
  if (!quotation) return "—";

  return quotation.quotationNumber || quotation.title || "Quotation";
};

const getStatusClasses = (status) => {
  const styles = {
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Cancelled: "bg-red-50 text-red-700 border-red-200",
    Completed: "bg-blue-50 text-blue-700 border-blue-200",
    Refunded: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return styles[status] || "bg-gray-50 text-gray-600 border-gray-200";
};

const getPaymentClasses = (status) => {
  const styles = {
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    "Partially Paid": "bg-blue-50 text-blue-700 border-blue-200",
    Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return styles[status] || "bg-gray-50 text-gray-600 border-gray-200";
};

// =========================
// BOOKINGS PAGE
// =========================

function Bookings() {
  const { user } = useAuth();

  // =========================
  // STATES
  // =========================

  const [bookings, setBookings] = useState([]);
  const [acceptedQuotations, setAcceptedQuotations] = useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);

  const RECORDS_PER_PAGE = 50;

  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [viewBooking, setViewBooking] = useState(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelBookingData, setCancelBookingData] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const [form, setForm] = useState(INITIAL_FORM);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quotationLoading, setQuotationLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // =========================
  // FETCH BOOKINGS
  // =========================

  const fetchBookings = async (page = currentPage) => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await api.get("/bookings", {
        params: {
          search,
          status,
          paymentStatus,
          page,
          limit: RECORDS_PER_PAGE,
        },
      });

      const data = response.data || {};

      setBookings(data.bookings || []);
      setCurrentPage(data.page || page);
      setTotalPages(Math.max(1, Number(data.pages || 1)));
      setTotalBookings(Number(data.total || 0));
    } catch (error) {
      console.error(
        "Fetch bookings error:",
        error.response?.data || error.message
      );

      setErrorMessage(
        error.response?.data?.message || "Failed to fetch bookings"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // FETCH ACCEPTED QUOTATIONS
  // =========================

  const fetchAcceptedQuotations = async () => {
    try {
      setQuotationLoading(true);

      const response = await api.get("/quotations", {
        params: {
          status: "Accepted",
          page: 1,
          limit: 50,
        },
      });

      const data = response.data || {};

      setAcceptedQuotations(data.quotations || []);
    } catch (error) {
      console.error(
        "Fetch accepted quotations error:",
        error.response?.data || error.message
      );
    } finally {
      setQuotationLoading(false);
    }
  };

  // =========================
  // FILTER EFFECT
  // =========================

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, paymentStatus]);

  // =========================
  // FETCH WHEN FILTER/PAGE CHANGES
  // =========================

  useEffect(() => {
    fetchBookings(currentPage);
  }, [currentPage, search, status, paymentStatus]);

  // =========================
  // FETCH QUOTATIONS ONCE
  // =========================

  useEffect(() => {
    fetchAcceptedQuotations();
  }, []);

  // =========================
  // CLEAR ALERTS
  // =========================

  useEffect(() => {
    if (!successMessage && !errorMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  // =========================
  // ESC CLOSE
  // =========================

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;

      if (showCancelModal) {
        closeCancelModal();
        return;
      }

      if (viewBooking) {
        setViewBooking(null);
        return;
      }

      if (showForm) {
        closeForm();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showCancelModal, viewBooking, showForm]);

  // =========================
  // SCROLL LOCK
  // =========================

  useEffect(() => {
    if (showForm || viewBooking || showCancelModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showForm, viewBooking, showCancelModal]);

  // =========================
  // CLOSE FILTER OUTSIDE CLICK
  // =========================

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilters]);

  // =========================
  // FORM ACTIONS
  // =========================

  const resetForm = () => {
    setForm({ ...INITIAL_FORM });
  };

  const openCreateForm = () => {
    resetForm();
    setEditingBooking(null);
    setErrorMessage("");
    setSuccessMessage("");
    setShowForm(true);
  };

  const openEditForm = (booking) => {
    setEditingBooking(booking);

    setForm({
      quotation: booking.quotation?._id || booking.quotation || "",
      destination: booking.destination || "",
      departureCity: booking.departureCity || "",
      travelDate: formatDateInput(booking.travelDate),
      returnDate: formatDateInput(booking.returnDate),
      adults: Number(booking.adults ?? 1),
      children: Number(booking.children ?? 0),
      infants: Number(booking.infants ?? 0),
      travelType: booking.travelType || "Other",
      currency: booking.currency || "INR",
      totalAmount: Number(booking.totalAmount ?? 0),
      totalCost: Number(booking.totalCost ?? 0),
      discountAmount: Number(booking.discountAmount ?? 0),
      taxAmount: Number(booking.taxAmount ?? 0),
      specialRequests: booking.specialRequests || "",
      internalNotes: booking.internalNotes || "",
    });

    setErrorMessage("");
    setSuccessMessage("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingBooking(null);
    resetForm();
  };

  const handleQuotationChange = (quotationId) => {
    const quotation = acceptedQuotations.find(
      (item) => item._id === quotationId
    );

    if (!quotation) {
      setForm((previous) => ({
        ...previous,
        quotation: quotationId,
      }));
      return;
    }

    setForm((previous) => ({
      ...previous,

      quotation: quotationId,

      destination:
        quotation.destination ||
        quotation.enquiry?.destination ||
        previous.destination,

      travelDate:
        formatDateInput(
          quotation.travelDate || quotation.enquiry?.travelDate
        ) || previous.travelDate,

      returnDate:
        formatDateInput(
          quotation.returnDate || quotation.enquiry?.returnDate
        ) || previous.returnDate,

      adults: Number(quotation.adults ?? previous.adults),
      children: Number(quotation.children ?? previous.children),
      infants: Number(quotation.infants ?? previous.infants),

      currency: quotation.currency || previous.currency,

      totalAmount: Number(quotation.totalAmount ?? previous.totalAmount),
      totalCost: Number(quotation.costAmount ?? previous.totalCost),
      discountAmount: Number(
        quotation.discountAmount ?? previous.discountAmount
      ),
      taxAmount: Number(quotation.taxAmount ?? previous.taxAmount),
    }));
  };

  const handleFormChange = (event) => {
    const { name, value, type } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        type === "number"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };

  // =========================
  // CREATE / UPDATE
  // =========================

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (!editingBooking && !form.quotation) {
        setErrorMessage("Please select an accepted quotation.");
        return false;
      }

      const payload = {
        destination: form.destination.trim(),
        departureCity: form.departureCity.trim(),
        travelDate: form.travelDate || null,
        returnDate: form.returnDate || null,
        adults: Number(form.adults || 1),
        children: Number(form.children || 0),
        infants: Number(form.infants || 0),
        travelType: form.travelType || "Other",
        currency: form.currency || "INR",
        totalAmount: Number(form.totalAmount || 0),
        totalCost: Number(form.totalCost || 0),
        discountAmount: Number(form.discountAmount || 0),
        taxAmount: Number(form.taxAmount || 0),
        specialRequests: form.specialRequests.trim(),
        internalNotes: form.internalNotes.trim(),
      };

      if (!editingBooking) {
        payload.quotation = form.quotation;
      }

      if (editingBooking) {
        await api.put(`/bookings/${editingBooking._id}`, payload);
        setSuccessMessage("Booking updated successfully");
      } else {
        await api.post("/bookings", payload);
        setSuccessMessage("Booking created successfully");
      }

      closeForm();
      await fetchBookings(currentPage);
      await fetchAcceptedQuotations();
      return true;
    } catch (error) {
      console.error(
        "Save booking error:",
        error.response?.data || error.message
      );

      setErrorMessage(
        error.response?.data?.message || "Failed to save booking"
      );

      return false;
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // VIEW
  // =========================

  const handleView = async (booking) => {
    try {
      setActionLoading(true);
      setErrorMessage("");

      const response = await api.get(`/bookings/${booking._id}`);

      setViewBooking(response.data?.booking || booking);
    } catch (error) {
      console.error(
        "View booking error:",
        error.response?.data || error.message
      );

      setErrorMessage(
        error.response?.data?.message || "Failed to fetch booking"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // =========================
  // CONFIRM
  // =========================

  const handleConfirm = async (booking) => {
    const confirmed = window.confirm(
      `Confirm booking ${booking.bookingNumber || booking._id}?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      await api.put(`/bookings/${booking._id}/confirm`, {});

      setSuccessMessage("Booking confirmed successfully");

      await fetchBookings(currentPage);

      if (viewBooking?._id === booking._id) {
        const response = await api.get(`/bookings/${booking._id}`);
        setViewBooking(response.data?.booking || null);
      }
    } catch (error) {
      console.error(
        "Confirm booking error:",
        error.response?.data || error.message
      );

      setErrorMessage(
        error.response?.data?.message || "Failed to confirm booking"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // =========================
  // CANCEL
  // =========================

  const openCancelModal = (booking) => {
    setCancelBookingData(booking);
    setCancellationReason("");
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    if (actionLoading) return;

    setShowCancelModal(false);
    setCancelBookingData(null);
    setCancellationReason("");
  };

  const handleCancel = async (event) => {
    event.preventDefault();

    if (!cancelBookingData) return;

    try {
      setActionLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      await api.put(`/bookings/${cancelBookingData._id}/cancel`, {
        cancellationReason: cancellationReason.trim(),
      });

      setSuccessMessage("Booking cancelled successfully");

      const cancelledId = cancelBookingData._id;

      closeCancelModal();

      await fetchBookings(currentPage);

      if (viewBooking?._id === cancelledId) {
        const response = await api.get(`/bookings/${cancelledId}`);
        setViewBooking(response.data?.booking || null);
      }
    } catch (error) {
      console.error(
        "Cancel booking error:",
        error.response?.data || error.message
      );

      setErrorMessage(
        error.response?.data?.message || "Failed to cancel booking"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // =========================
  // CLEAR FILTERS
  // =========================

  const handleClearFilters = () => {
    setSearch("");
    setStatus("");
    setPaymentStatus("");
    setCurrentPage(1);
    setShowFilters(false);
  };

  // =========================
  // PAGINATION
  // =========================

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((previous) => previous - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((previous) => previous + 1);
    }
  };

  // =========================
  // FILTER COUNTS
  // =========================

  const activeFilterCount = useMemo(() => {
    return [search, status, paymentStatus].filter(Boolean).length;
  }, [search, status, paymentStatus]);

  const dropdownFilterCount = useMemo(() => {
    return [status, paymentStatus].filter(Boolean).length;
  }, [status, paymentStatus]);

  // =========================
  // PERMISSIONS
  // =========================

  const canConfirm = (booking) => booking.status === "Pending";

  const canCancel = (booking) =>
    !["Cancelled", "Refunded", "Completed"].includes(booking.status);

  const canEdit = (booking) =>
    !["Cancelled", "Refunded", "Completed"].includes(booking.status);

  // =========================
  // RENDER
  // =========================

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">
      {/* ============================================
          HEADER
      ============================================ */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* SEARCH + FILTER */}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          {/* SEARCH */}

          <div className="relative w-full sm:w-64">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={15}
            />

            <input
              type="text"
              placeholder="Search bookings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 h-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
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

          {/* FILTER */}

          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setShowFilters((previous) => !previous)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border transition whitespace-nowrap ${
                dropdownFilterCount > 0
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <FiFilter size={14} />

              <span className="hidden sm:inline">Filters</span>

              {dropdownFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-semibold bg-blue-600 text-white rounded-full">
                  {dropdownFilterCount}
                </span>
              )}
            </button>

            {/* FILTER POPOVER */}

            {showFilters && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/60 z-30 overflow-hidden">
                {/* HEADER */}

                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Filters
                  </h3>

                  {dropdownFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="text-xs font-medium text-gray-500 hover:text-red-600 transition"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* BODY */}

                <div className="p-4 space-y-4">
                  {/* STATUS */}

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Status
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() =>
                            setStatus(status === item ? "" : item)
                          }
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                            status === item
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PAYMENT STATUS */}

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Payment status
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                      {PAYMENT_STATUS_OPTIONS.map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() =>
                            setPaymentStatus(
                              paymentStatus === item ? "" : item
                            )
                          }
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                            paymentStatus === item
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FOOTER */}

                <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    disabled={dropdownFilterCount === 0}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Clear all
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ADD BUTTON */}

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm whitespace-nowrap self-start lg:self-auto"
        >
          <FiPlus size={15} />
          New Booking
        </button>
      </div>

      {/* ============================================
          ACTIVE FILTER SUMMARY
      ============================================ */}

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            {activeFilterCount} filter
            {activeFilterCount > 1 ? "s" : ""} active
          </span>

          <button
            type="button"
            onClick={handleClearFilters}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ============================================
          ALERTS
      ============================================ */}

      {successMessage && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
          <FiCheckCircle className="flex-shrink-0 mt-0.5" size={18} />

          <p className="flex-1">{successMessage}</p>

          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="text-green-600 hover:text-green-800 flex-shrink-0"
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

      {/* ============================================
          TABLE
      ============================================ */}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />

              <p className="text-sm text-gray-500">Loading bookings...</p>
            </div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <FiCalendar size={24} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-gray-800">
              No bookings found
            </h3>

            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              Create a booking from an accepted quotation to start managing
              travel reservations.
            </p>

            <button
              type="button"
              onClick={openCreateForm}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              <FiPlus size={15} />
              Create Booking
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Booking
                  </th>

                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Customer
                  </th>

                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Destination
                  </th>

                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Travel date
                  </th>

                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Amount
                  </th>

                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Payment
                  </th>

                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>

                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {bookings.map((booking) => (
                  <tr
                    key={booking._id}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <FiCalendar size={17} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate max-w-[180px]">
                            {booking.bookingNumber ||
                              `BK-${String(booking._id)
                                .slice(-6)
                                .toUpperCase()}`}
                          </p>

                          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">
                            {getQuotationLabel(booking.quotation)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                          <FiUser size={13} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate max-w-[170px]">
                            {getCustomerName(booking.customer)}
                          </p>

                          <p className="text-xs text-gray-500 truncate max-w-[170px]">
                            {booking.customer?.phone ||
                              booking.customer?.email ||
                              ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <FiMapPin
                          size={14}
                          className="text-gray-400 shrink-0"
                        />

                        <span className="truncate max-w-[150px]">
                          {booking.destination || "—"}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-gray-700">
                        {formatDate(booking.travelDate)}
                      </p>

                      {booking.returnDate && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          to {formatDate(booking.returnDate)}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-800">
                        {formatCurrency(
                          booking.totalAmount,
                          booking.currency || "INR"
                        )}
                      </p>

                      <p className="text-xs text-gray-500 mt-0.5">
                        Due{" "}
                        {formatCurrency(
                          booking.amountDue,
                          booking.currency || "INR"
                        )}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getPaymentClasses(
                          booking.paymentStatus
                        )}`}
                      >
                        {booking.paymentStatus || "Pending"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getStatusClasses(
                          booking.status
                        )}`}
                      >
                        {booking.status || "Pending"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleView(booking)}
                          title="View"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 bg-gray-50 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                          <FiEye size={15} />
                        </button>

                        {canEdit(booking) && (
                          <button
                            type="button"
                            onClick={() => openEditForm(booking)}
                            title="Edit"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 bg-gray-50 hover:text-amber-600 hover:bg-amber-50 transition"
                          >
                            <FiEdit2 size={15} />
                          </button>
                        )}

                        {canConfirm(booking) && (
                          <button
                            type="button"
                            onClick={() => handleConfirm(booking)}
                            disabled={actionLoading}
                            title="Confirm"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 bg-gray-50 hover:text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-50"
                          >
                            <FiCheck size={16} />
                          </button>
                        )}

                        {canCancel(booking) && (
                          <button
                            type="button"
                            onClick={() => openCancelModal(booking)}
                            disabled={actionLoading}
                            title="Cancel"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 bg-gray-50 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                          >
                            <FiXCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================
          PAGINATION
      ============================================ */}

      {!loading && totalBookings > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">
              {bookings.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">{totalBookings}</span>{" "}
            {totalBookings === 1 ? "booking" : "bookings"}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || loading}
                className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiChevronLeft size={16} />
              </button>

              <span className="px-3 h-8 inline-flex items-center text-sm font-medium text-gray-700">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage === totalPages || loading}
                className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================
          CREATE / EDIT MODAL
      ============================================ */}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div className="w-full max-w-[620px] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {editingBooking ? "Edit Booking" : "New Booking"}
                </h2>

                <p className="text-xs text-gray-500 mt-0.5">
                  {editingBooking
                    ? "Update booking details"
                    : "Create a booking from an accepted quotation"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-5 py-4">
                {errorMessage && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-4">
                    <FiAlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-3.5">
                  {/* QUOTATION */}

                  {!editingBooking ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Accepted Quotation *
                      </label>

                      <select
                        name="quotation"
                        value={form.quotation}
                        onChange={(event) =>
                          handleQuotationChange(event.target.value)
                        }
                        disabled={quotationLoading || saving}
                        required
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition disabled:opacity-60"
                      >
                        <option value="">
                          {quotationLoading
                            ? "Loading accepted quotations..."
                            : "Select accepted quotation"}
                        </option>

                        {acceptedQuotations.map((quotation) => (
                          <option key={quotation._id} value={quotation._id}>
                            {getQuotationLabel(quotation)} —{" "}
                            {quotation.title ||
                              quotation.destination ||
                              "Quotation"}
                          </option>
                        ))}
                      </select>

                      {acceptedQuotations.length === 0 &&
                        !quotationLoading && (
                          <p className="text-[11px] text-amber-600 mt-1.5">
                            No accepted quotations available.
                          </p>
                        )}
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                      <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                        Quotation
                      </p>

                      <p className="text-sm font-semibold text-blue-900 mt-0.5">
                        {getQuotationLabel(editingBooking.quotation)}
                      </p>
                    </div>
                  )}

                  {/* DESTINATION + DEPARTURE */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Destination
                      </label>

                      <input
                        type="text"
                        name="destination"
                        value={form.destination}
                        onChange={handleFormChange}
                        placeholder="e.g. Dubai"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Departure City
                      </label>

                      <input
                        type="text"
                        name="departureCity"
                        value={form.departureCity}
                        onChange={handleFormChange}
                        placeholder="e.g. Delhi"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  {/* DATES */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Travel Date
                      </label>

                      <input
                        type="date"
                        name="travelDate"
                        value={form.travelDate}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Return Date
                      </label>

                      <input
                        type="date"
                        name="returnDate"
                        value={form.returnDate}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  {/* TRAVELLERS */}

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Travellers
                    </label>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">
                          Adults
                        </label>

                        <input
                          type="number"
                          min="1"
                          name="adults"
                          value={form.adults}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">
                          Children
                        </label>

                        <input
                          type="number"
                          min="0"
                          name="children"
                          value={form.children}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">
                          Infants
                        </label>

                        <input
                          type="number"
                          min="0"
                          name="infants"
                          value={form.infants}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* TRAVEL TYPE + CURRENCY */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Travel Type
                      </label>

                      <select
                        name="travelType"
                        value={form.travelType}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                      >
                        {TRAVEL_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Currency
                      </label>

                      <input
                        type="text"
                        name="currency"
                        value={form.currency}
                        onChange={handleFormChange}
                        maxLength="5"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 uppercase focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  {/* AMOUNTS */}

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Booking Amount
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">
                          Total Amount
                        </label>

                        <input
                          type="number"
                          min="0"
                          name="totalAmount"
                          value={form.totalAmount}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">
                          Total Cost
                        </label>

                        <input
                          type="number"
                          min="0"
                          name="totalCost"
                          value={form.totalCost}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">
                          Discount
                        </label>

                        <input
                          type="number"
                          min="0"
                          name="discountAmount"
                          value={form.discountAmount}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">
                          Tax
                        </label>

                        <input
                          type="number"
                          min="0"
                          name="taxAmount"
                          value={form.taxAmount}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PROFIT PREVIEW */}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                      <p className="text-[11px] text-gray-500">
                        Estimated profit
                      </p>

                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {formatCurrency(
                          Number(form.totalAmount || 0) -
                            Number(form.totalCost || 0),
                          form.currency || "INR"
                        )}
                      </p>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                      <p className="text-[11px] text-gray-500">
                        Initial amount due
                      </p>

                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {formatCurrency(
                          form.totalAmount,
                          form.currency || "INR"
                        )}
                      </p>
                    </div>
                  </div>

                  {/* SPECIAL REQUESTS */}

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Special Requests
                    </label>

                    <textarea
                      name="specialRequests"
                      value={form.specialRequests}
                      onChange={handleFormChange}
                      rows="3"
                      placeholder="Any customer requests or travel preferences..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                    />
                  </div>

                  {/* INTERNAL NOTES */}

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Internal Notes
                    </label>

                    <textarea
                      name="internalNotes"
                      value={form.internalNotes}
                      onChange={handleFormChange}
                      rows="3"
                      placeholder="Internal notes for the team..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    (!editingBooking && acceptedQuotations.length === 0)
                  }
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-60 min-w-[100px]"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Saving
                    </>
                  ) : editingBooking ? (
                    "Update"
                  ) : (
                    "Create Booking"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================
          VIEW MODAL
      ============================================ */}

      {viewBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewBooking(null);
            }
          }}
        >
          <div className="w-full max-w-[700px] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-gray-900">
                    {viewBooking.bookingNumber ||
                      `BK-${String(viewBooking._id)
                        .slice(-6)
                        .toUpperCase()}`}
                  </h2>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getStatusClasses(
                      viewBooking.status
                    )}`}
                  >
                    {viewBooking.status}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {viewBooking.destination || "Booking details"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewBooking(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* SUMMARY */}

              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">
                    Total
                  </p>

                  <p className="text-sm font-bold text-blue-900 mt-1">
                    {formatCurrency(
                      viewBooking.totalAmount,
                      viewBooking.currency || "INR"
                    )}
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">
                    Paid
                  </p>

                  <p className="text-sm font-bold text-emerald-900 mt-1">
                    {formatCurrency(
                      viewBooking.amountPaid,
                      viewBooking.currency || "INR"
                    )}
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide">
                    Due
                  </p>

                  <p className="text-sm font-bold text-amber-900 mt-1">
                    {formatCurrency(
                      viewBooking.amountDue,
                      viewBooking.currency || "INR"
                    )}
                  </p>
                </div>
              </div>

              {/* TRIP + TRAVELLERS */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FiMapPin size={16} className="text-blue-600" />

                    <h3 className="text-sm font-semibold text-gray-800">
                      Trip Details
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    <DetailRow
                      label="Destination"
                      value={viewBooking.destination || "—"}
                    />

                    <DetailRow
                      label="Departure"
                      value={viewBooking.departureCity || "—"}
                    />

                    <DetailRow
                      label="Travel Type"
                      value={viewBooking.travelType || "—"}
                    />

                    <DetailRow
                      label="Travel Date"
                      value={formatDate(viewBooking.travelDate)}
                    />

                    <DetailRow
                      label="Return Date"
                      value={formatDate(viewBooking.returnDate)}
                    />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FiUsers size={16} className="text-blue-600" />

                    <h3 className="text-sm font-semibold text-gray-800">
                      Travellers
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    <DetailRow label="Adults" value={viewBooking.adults ?? 0} />

                    <DetailRow
                      label="Children"
                      value={viewBooking.children ?? 0}
                    />

                    <DetailRow
                      label="Infants"
                      value={viewBooking.infants ?? 0}
                    />

                    <DetailRow
                      label="Payment"
                      value={
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getPaymentClasses(
                            viewBooking.paymentStatus
                          )}`}
                        >
                          {viewBooking.paymentStatus || "Pending"}
                        </span>
                      }
                    />
                  </div>
                </div>
              </div>

              {/* CUSTOMER + FINANCIALS */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FiUser size={16} className="text-blue-600" />

                    <h3 className="text-sm font-semibold text-gray-800">
                      Customer
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    <DetailRow
                      label="Name"
                      value={getCustomerName(viewBooking.customer)}
                    />

                    <DetailRow
                      label="Email"
                      value={viewBooking.customer?.email || "—"}
                    />

                    <DetailRow
                      label="Phone"
                      value={viewBooking.customer?.phone || "—"}
                    />

                    <DetailRow
                      label="Quotation"
                      value={getQuotationLabel(viewBooking.quotation)}
                    />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FiDollarSign size={16} className="text-blue-600" />

                    <h3 className="text-sm font-semibold text-gray-800">
                      Financials
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    <DetailRow
                      label="Total"
                      value={formatCurrency(
                        viewBooking.totalAmount,
                        viewBooking.currency || "INR"
                      )}
                    />

                    <DetailRow
                      label="Cost"
                      value={formatCurrency(
                        viewBooking.totalCost,
                        viewBooking.currency || "INR"
                      )}
                    />

                    <DetailRow
                      label="Profit"
                      value={formatCurrency(
                        viewBooking.profitAmount,
                        viewBooking.currency || "INR"
                      )}
                    />

                    <DetailRow
                      label="Discount"
                      value={formatCurrency(
                        viewBooking.discountAmount,
                        viewBooking.currency || "INR"
                      )}
                    />

                    <DetailRow
                      label="Tax"
                      value={formatCurrency(
                        viewBooking.taxAmount,
                        viewBooking.currency || "INR"
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* CONFIRMATION STATUS */}

              <div className="border border-gray-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <FiCheckCircle size={16} className="text-blue-600" />

                  <h3 className="text-sm font-semibold text-gray-800">
                    Confirmation Status
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ["Hotel", viewBooking.confirmationStatus?.hotel],
                    ["Transport", viewBooking.confirmationStatus?.transport],
                    ["Activities", viewBooking.confirmationStatus?.activities],
                    ["Overall", viewBooking.confirmationStatus?.overall],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="bg-gray-50 rounded-lg px-3 py-2.5"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        {label}
                      </p>

                      <p className="text-xs font-semibold text-gray-700 mt-1">
                        {value || "Pending"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* OWNERSHIP */}

              <div className="border border-gray-200 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Ownership
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow
                    label="Sales Owner"
                    value={getOwnerName(viewBooking.salesOwner)}
                  />

                  <DetailRow
                    label="Operations Owner"
                    value={getOwnerName(viewBooking.operationsOwner)}
                  />
                </div>
              </div>

              {/* REQUESTS + NOTES */}

              {viewBooking.specialRequests && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Special Requests
                  </label>

                  <div className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 min-h-[72px] whitespace-pre-wrap leading-relaxed">
                    {viewBooking.specialRequests}
                  </div>
                </div>
              )}

              {viewBooking.internalNotes && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Internal Notes
                  </label>

                  <div className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 min-h-[72px] whitespace-pre-wrap leading-relaxed">
                    {viewBooking.internalNotes}
                  </div>
                </div>
              )}

              {viewBooking.cancellationReason && (
                <div className="mb-2">
                  <label className="block text-xs font-medium text-red-600 mb-1">
                    Cancellation Reason
                  </label>

                  <div className="w-full px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 min-h-[72px] whitespace-pre-wrap leading-relaxed">
                    {viewBooking.cancellationReason}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
              {canEdit(viewBooking) && (
                <button
                  type="button"
                  onClick={() => {
                    setViewBooking(null);
                    openEditForm(viewBooking);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <FiEdit2 size={14} />
                  Edit
                </button>
              )}

              {canConfirm(viewBooking) && (
                <button
                  type="button"
                  onClick={() => handleConfirm(viewBooking)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  <FiCheck size={14} />
                  Confirm
                </button>
              )}

              {canCancel(viewBooking) && (
                <button
                  type="button"
                  onClick={() => openCancelModal(viewBooking)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  <FiXCircle size={14} />
                  Cancel
                </button>
              )}

              <button
                type="button"
                onClick={() => setViewBooking(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          CANCEL MODAL
      ============================================ */}

      {showCancelModal && cancelBookingData && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCancelModal();
            }
          }}
        >
          <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Cancel Booking
                </h2>

                <p className="text-xs text-gray-500 mt-0.5">
                  This will mark the booking as cancelled
                </p>
              </div>

              <button
                type="button"
                onClick={closeCancelModal}
                disabled={actionLoading}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleCancel}>
              <div className="px-5 py-5">
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-4">
                  <p className="text-xs text-red-700">
                    Booking{" "}
                    <span className="font-semibold">
                      {cancelBookingData.bookingNumber || cancelBookingData._id}
                    </span>{" "}
                    for{" "}
                    <span className="font-semibold">
                      {cancelBookingData.destination}
                    </span>{" "}
                    will be cancelled.
                  </p>
                </div>

                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Cancellation Reason *
                </label>

                <textarea
                  value={cancellationReason}
                  onChange={(event) =>
                    setCancellationReason(event.target.value)
                  }
                  rows="4"
                  placeholder="Enter the reason for cancellation..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 focus:bg-white transition"
                />
              </div>

              <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCancelModal}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Keep Booking
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-60"
                >
                  {actionLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <FiXCircle size={14} />
                      Cancel Booking
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// DETAIL ROW
// =====================================================

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>

      <span className="text-xs font-medium text-gray-800 text-right break-words">
        {value}
      </span>
    </div>
  );
}

export default Bookings;