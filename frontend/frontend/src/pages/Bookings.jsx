import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
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
  FiMapPin,
  FiUser,
} from "react-icons/fi";
import api from "../api";
import BookingFormModal from "../components/bookings/BookingFormModal";
import BookingViewModal from "../components/bookings/BookingViewModal";
import BookingCancelModal from "../components/bookings/BookingCancelModal";
import {
  STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  INITIAL_BOOKING_FORM,
  formatDate,
  formatDateInput,
  formatCurrency,
  getCustomerName,
  getQuotationLabel,
  getBookingNumber,
  getStatusClasses,
  getPaymentClasses,
} from "../components/bookings/bookingHelpers";

const RECORDS_PER_PAGE = 50;

function Bookings() {
  const location = useLocation();

  /* =====================================================
     STATE
  ===================================================== */

  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [viewBooking, setViewBooking] = useState(null);
  const [cancelBookingData, setCancelBookingData] = useState(null);

  const [form, setForm] = useState(INITIAL_BOOKING_FORM);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /* =====================================================
     FETCH BOOKINGS
  ===================================================== */

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
      console.error("Fetch bookings error:", error);
      setErrorMessage(
        error.response?.data?.message || "Failed to fetch bookings"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     CONVERT FROM QUOTATION
     Jab Quotations page se "Convert" click karke aao,
     to quotation data se form auto-fill karo
  ===================================================== */

  useEffect(() => {
    const quotation = location.state?.createFromQuotation;

    if (!quotation) return;

    console.log("Convert from quotation:", quotation);

    setForm({
      ...INITIAL_BOOKING_FORM,
      quotation: quotation._id || "",
      destination: quotation.destination || "",
      departureCity: quotation.departureCity || "",
      travelDate: formatDateInput(quotation.travelDate),
      returnDate: formatDateInput(quotation.returnDate),
      adults: Number(quotation.adults || 1),
      children: Number(quotation.children || 0),
      infants: Number(quotation.infants || 0),
      travelType: quotation.travelType || "Other",
      currency: quotation.currency || "INR",
      totalAmount: Number(quotation.totalAmount || 0),
      totalCost: Number(quotation.costAmount || 0),
      discountAmount: Number(quotation.discountAmount || 0),
      taxAmount: Number(quotation.taxAmount || 0),
      specialRequests: "",
      internalNotes: "",
    });

    setEditingBooking(null);
    setShowForm(true);

    /* URL state clear karo — refresh pe dobara na khule */
    window.history.replaceState({}, document.title);
  }, [location.state]);

  /* =====================================================
     EFFECTS
  ===================================================== */

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, paymentStatus]);

  useEffect(() => {
    fetchBookings(currentPage);
  }, [currentPage, search, status, paymentStatus]);

  /* =====================================================
     AUTO-DISMISS ALERTS
  ===================================================== */

  useEffect(() => {
    if (!successMessage && !errorMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 4000);
    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  /* =====================================================
     FILTER OUTSIDE CLICK
  ===================================================== */

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

  /* =====================================================
     HANDLERS
  ===================================================== */

  const handleCreateSuccess = () => {
    setSuccessMessage("Booking saved successfully");
    fetchBookings(currentPage);
  };

  const handleView = async (booking) => {
    try {
      setActionLoading(true);
      const response = await api.get(`/bookings/${booking._id}`);
      setViewBooking(response.data?.booking || booking);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Failed to fetch booking"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async (booking) => {
    const confirmed = window.confirm(
      `Confirm booking ${getBookingNumber(booking)}?`
    );
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.put(`/bookings/${booking._id}/confirm`, {});

      setSuccessMessage("Booking confirmed successfully");
      await fetchBookings(currentPage);

      if (viewBooking?._id === booking._id) {
        const response = await api.get(`/bookings/${booking._id}`);
        setViewBooking(response.data?.booking || null);
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Failed to confirm booking"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelConfirm = async (reason) => {
    if (!cancelBookingData) return;

    try {
      setActionLoading(true);
      await api.put(`/bookings/${cancelBookingData._id}/cancel`, {
        cancellationReason: reason,
      });

      setSuccessMessage("Booking cancelled successfully");

      const cancelledId = cancelBookingData._id;
      setCancelBookingData(null);
      await fetchBookings(currentPage);

      if (viewBooking?._id === cancelledId) {
        const response = await api.get(`/bookings/${cancelledId}`);
        setViewBooking(response.data?.booking || null);
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Failed to cancel booking"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openEditForm = (booking) => {
    setViewBooking(null);
    setEditingBooking(booking);
    setShowForm(true);
  };

  const openCreateForm = () => {
    setForm({ ...INITIAL_BOOKING_FORM });
    setEditingBooking(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingBooking(null);
    setForm({ ...INITIAL_BOOKING_FORM });
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus("");
    setPaymentStatus("");
    setCurrentPage(1);
    setShowFilters(false);
  };

  const activeFilterCount = useMemo(
    () => [search, status, paymentStatus].filter(Boolean).length,
    [search, status, paymentStatus]
  );

  const dropdownFilterCount = useMemo(
    () => [status, paymentStatus].filter(Boolean).length,
    [status, paymentStatus]
  );

  /* =====================================================
     RENDER
  ===================================================== */

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
              placeholder="Search bookings..."
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
            </button>

            {showFilters && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
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

                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Status
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() => setStatus(status === item ? "" : item)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                            status === item
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
                      Payment status
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PAYMENT_STATUS_OPTIONS.map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() =>
                            setPaymentStatus(paymentStatus === item ? "" : item)
                          }
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                            paymentStatus === item
                              ? "bg-brand-blue text-white border-brand-blue"
                              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    disabled={dropdownFilterCount === 0}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 transition disabled:opacity-40"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark rounded-md transition"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap self-start lg:self-auto"
        >
          <FiPlus size={15} />
          New Booking
        </button>
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
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition"
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
                  {[
                    "Booking",
                    "Customer",
                    "Destination",
                    "Travel Date",
                    "Amount",
                    "Payment",
                    "Status",
                  ].map((heading, i) => (
                    <th
                      key={i}
                      className="px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-left"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((booking) => (
                  <tr
                    key={booking._id}
                    onClick={() => handleView(booking)}
                    className="hover:bg-brand-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-blue-50 text-brand-blue flex items-center justify-center shrink-0">
                          <FiCalendar size={17} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate max-w-[180px]">
                            {getBookingNumber(booking)}
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
                        <FiMapPin size={14} className="text-gray-400 shrink-0" />
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {!loading && totalBookings > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">{bookings.length}</span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">
              {totalBookings}
            </span>{" "}
            {totalBookings === 1 ? "booking" : "bookings"}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  currentPage > 1 && setCurrentPage((p) => p - 1)
                }
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
      <BookingFormModal
        open={showForm}
        editingBooking={editingBooking}
        initialForm={form}
        onClose={closeForm}
        onSuccess={handleCreateSuccess}
      />

      <BookingViewModal
        booking={viewBooking}
        onClose={() => setViewBooking(null)}
        onEdit={openEditForm}
        onConfirm={handleConfirm}
        onCancel={(b) => setCancelBookingData(b)}
        actionLoading={actionLoading}
      />

      <BookingCancelModal
        open={!!cancelBookingData}
        booking={cancelBookingData}
        loading={actionLoading}
        onClose={() => setCancelBookingData(null)}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}

export default Bookings;