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
  FiFileText,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiEye,
  FiCheck,
  FiSend,
  FiTrash2,
  FiDownload,
  FiDollarSign,
  FiRefreshCw,
  FiMail,
} from "react-icons/fi";
import api from "../api";

/* =====================================================
   CONSTANTS
===================================================== */

const RECORDS_PER_PAGE = 50;

const EMPTY_ITEM = {
  description: "",
  category: "Service",
  quantity: 1,
  unitPrice: 0,
};

const ITEM_CATEGORIES = [
  "Hotel", "Transport", "Flight", "Train", "Activity",
  "Visa", "Insurance", "Package", "Service", "Other",
];

const STATUS_OPTIONS = [
  "Draft", "Issued", "Sent", "Viewed",
  "Partially Paid", "Paid", "Overdue", "Cancelled",
];

const PAYMENT_STATUS_OPTIONS = [
  "Pending", "Partially Paid", "Paid", "Overdue", "Cancelled",
];

const DEFAULT_TERMS =
  "Payment is due as per the agreed payment schedule. All services are subject to availability and applicable terms.";

const todayISO = () => new Date().toISOString().split("T")[0];

const emptyForm = () => ({
  booking: "",
  quotation: "",
  customer: "",
  company: "",
  trip: "",
  invoiceDate: todayISO(),
  dueDate: "",
  currency: "INR",
  items: [{ ...EMPTY_ITEM }],
  discountType: "Fixed",
  discountValue: 0,
  taxPercentage: 0,
  billingAddress: {
    name: "", street: "", city: "", state: "",
    country: "India", postalCode: "",
  },
  notes: "",
  termsAndConditions: DEFAULT_TERMS,
});

/* =====================================================
   HELPERS
===================================================== */

const formatCurrency = (value, currency = "INR") => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency", currency, maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
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

const formatDateRange = (start, end) => {
  if (!start && !end) return "-";
  if (start && end) return `${formatDate(start)} - ${formatDate(end)}`;
  return formatDate(start || end);
};

const getBookingId = (b) =>
  !b ? "" : typeof b === "string" ? b : b._id || b.id || "";

const getCustomerName = (c) => {
  if (!c) return "-";
  if (typeof c === "string") return c;
  return (
    c.name || c.fullName ||
    `${c.firstName || ""} ${c.lastName || ""}`.trim() || "-"
  );
};

const getBookingLabel = (b) => {
  if (!b) return "-";
  if (typeof b === "string") return b;
  return b.bookingNumber || b.bookingCode ||
    b.referenceNumber || b._id || "-";
};

const getTripLabel = (t) => {
  if (!t) return "-";
  if (typeof t === "string") return t;
  return t.title || t.name || t.tripCode || t._id || "-";
};

const getTravellerText = (b) => {
  if (!b) return "-";
  const adults = Number(b.adults || 0);
  const children = Number(b.children || 0);
  const infants = Number(b.infants || 0);
  const parts = [];
  if (adults) parts.push(`${adults} Adult${adults > 1 ? "s" : ""}`);
  if (children) parts.push(`${children} Child${children > 1 ? "ren" : ""}`);
  if (infants) parts.push(`${infants} Infant${infants > 1 ? "s" : ""}`);
  return parts.length ? parts.join(", ") : "1 Traveller";
};

const getStatusClasses = (status) => {
  switch (status) {
    case "Paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Partially Paid":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Overdue":
      return "bg-red-50 text-red-700 border-red-200";
    case "Cancelled":
      return "bg-gray-100 text-gray-600 border-gray-200";
    case "Issued":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Sent":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "Viewed":
      return "bg-purple-50 text-purple-700 border-purple-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const getPaymentClasses = (status) => {
  switch (status) {
    case "Paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Partially Paid":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Overdue":
      return "bg-red-50 text-red-700 border-red-200";
    case "Cancelled":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

/* =====================================================
   MAIN COMPONENT
===================================================== */

function Invoice() {
  const [invoices, setInvoices] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [form, setForm] = useState(emptyForm());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [summary, setSummary] = useState({
    totalInvoiceAmount: 0,
    totalPaid: 0,
    totalDue: 0,
  });

  /* =====================================================
     FETCH INVOICES
  ===================================================== */

  const fetchInvoices = async (page = currentPage) => {
    try {
      setLoading(true);
      setErrorMessage("");

      const params = { page, limit: RECORDS_PER_PAGE };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (paymentStatusFilter) params.paymentStatus = paymentStatusFilter;

      const { data = {} } = await api.get("/invoices", { params });

      setInvoices(data.invoices || data.data || []);
      setCurrentPage(data.page || page);
      setTotalPages(
        Math.max(
          1,
          Number(
            data.pagination?.totalPages ||
              data.pages ||
              Math.ceil((data.total || data.count || 0) / RECORDS_PER_PAGE)
          )
        )
      );
      setTotalInvoices(Number(data.total || data.count || 0));

      setSummary({
        totalInvoiceAmount:
          data.totals?.totalInvoiceAmount ||
          data.summary?.totalInvoiceAmount || 0,
        totalPaid: data.totals?.totalPaid || data.summary?.totalPaid || 0,
        totalDue: data.totals?.totalDue || data.summary?.totalDue || 0,
      });
    } catch (err) {
      console.error("Fetch invoices error:", err);
      setErrorMessage(
        err.response?.data?.message || "Failed to fetch invoices"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const { data = {} } = await api.get("/bookings", {
        params: { page: 1, limit: 100 },
      });
      setBookings(data.bookings || data.data || []);
    } catch (err) {
      console.error("Fetch bookings error:", err);
    }
  };

  /* =====================================================
     EFFECTS
  ===================================================== */

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, paymentStatusFilter]);

  useEffect(() => {
    fetchInvoices(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, statusFilter, paymentStatusFilter]);

  /* Auto-dismiss alerts */
  useEffect(() => {
    if (!successMessage && !errorMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 4000);
    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  /* Filter outside click */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };
    if (showFilters) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);

  /* =====================================================
     FORM HANDLERS
  ===================================================== */

  const resetForm = () => setForm(emptyForm());

  const openCreateModal = () => {
    resetForm();
    setErrorMessage("");
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (saving) return;
    setShowCreateModal(false);
    resetForm();
  };

  const handleBookingChange = (bookingId) => {
    const booking = bookings.find((b) => getBookingId(b) === bookingId);
    if (!booking) {
      setForm((p) => ({
        ...p, booking: "", customer: "", company: "", trip: "", quotation: "",
      }));
      return;
    }

    const pick = (obj) => obj?._id || obj?.id || obj || "";
    const customerName = getCustomerName(booking.customer);
    const bookingTotal =
      booking.totalAmount || booking.total || booking.grandTotal ||
      booking.amount || 0;

    setForm((prev) => ({
      ...prev,
      booking: bookingId,
      customer: pick(booking.customer),
      company: pick(booking.company),
      trip: pick(booking.trip),
      quotation: pick(booking.quotation),
      billingAddress: {
        ...prev.billingAddress,
        name: customerName,
        city: booking.customer?.city || prev.billingAddress.city,
        state: booking.customer?.state || prev.billingAddress.state,
        country: booking.customer?.country || "India",
        postalCode:
          booking.customer?.postalCode || prev.billingAddress.postalCode,
      },
      items:
        bookingTotal > 0
          ? [{
              description: booking.destination
                ? `Travel package - ${booking.destination}`
                : "Travel services",
              category: "Package",
              quantity: 1,
              unitPrice: Number(bookingTotal),
            }]
          : [{ ...EMPTY_ITEM }],
    }));
  };

  const updateForm = (field, value) =>
    setForm((p) => ({ ...p, [field]: value }));

  const updateBillingAddress = (field, value) =>
    setForm((p) => ({
      ...p,
      billingAddress: { ...p.billingAddress, [field]: value },
    }));

  const updateItem = (index, field, value) =>
    setForm((p) => {
      const items = [...p.items];
      items[index] = { ...items[index], [field]: value };
      return { ...p, items };
    });

  const addItem = () =>
    setForm((p) => ({ ...p, items: [...p.items, { ...EMPTY_ITEM }] }));

  const removeItem = (index) =>
    setForm((p) =>
      p.items.length === 1
        ? p
        : { ...p, items: p.items.filter((_, i) => i !== index) }
    );

  /* =====================================================
     CALCULATIONS
  ===================================================== */

  const calculatedTotals = useMemo(() => {
    const subtotal = form.items.reduce(
      (sum, i) => sum + Number(i.quantity || 0) * Number(i.unitPrice || 0),
      0
    );
    const discountAmount =
      form.discountType === "Percentage"
        ? (subtotal * Number(form.discountValue || 0)) / 100
        : Math.min(Number(form.discountValue || 0), subtotal);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = (taxableAmount * Number(form.taxPercentage || 0)) / 100;
    const totalAmount = taxableAmount + taxAmount;
    return { subtotal, discountAmount, taxableAmount, taxAmount, totalAmount };
  }, [form.items, form.discountType, form.discountValue, form.taxPercentage]);

  const selectedBooking = useMemo(
    () => bookings.find((b) => getBookingId(b) === form.booking) || null,
    [bookings, form.booking]
  );

  const activeFilterCount = useMemo(
    () => [search, statusFilter, paymentStatusFilter].filter(Boolean).length,
    [search, statusFilter, paymentStatusFilter]
  );

  const dropdownFilterCount = useMemo(
    () => [statusFilter, paymentStatusFilter].filter(Boolean).length,
    [statusFilter, paymentStatusFilter]
  );

  /* =====================================================
     ACTIONS
  ===================================================== */

  const createInvoice = async (e) => {
    e.preventDefault();
    if (!form.booking) return setErrorMessage("Please select a booking.");
    if (!form.customer)
      return setErrorMessage("Customer information is required.");

    const validItems = form.items.filter(
      (i) =>
        i.description.trim() &&
        Number(i.quantity) > 0 &&
        Number(i.unitPrice) >= 0
    );
    if (!validItems.length)
      return setErrorMessage("Add at least one valid invoice item.");

    try {
      setSaving(true);
      setErrorMessage("");

      await api.post("/invoices", {
        booking: form.booking,
        quotation: form.quotation || null,
        customer: form.customer,
        company: form.company || null,
        trip: form.trip || null,
        invoiceDate: form.invoiceDate || null,
        dueDate: form.dueDate || null,
        currency: form.currency,
        items: validItems.map((i) => ({
          description: i.description.trim(),
          category: i.category,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
        discountType: form.discountType,
        discountValue: Number(form.discountValue || 0),
        taxPercentage: Number(form.taxPercentage || 0),
        amountPaid: 0,
        billingAddress: form.billingAddress,
        notes: form.notes,
        termsAndConditions: form.termsAndConditions,
      });

      setSuccessMessage("Invoice created successfully");
      setShowCreateModal(false);
      resetForm();
      await fetchInvoices(currentPage);
    } catch (err) {
      console.error("Create invoice error:", err);
      setErrorMessage(
        err.response?.data?.message || "Failed to create invoice"
      );
    } finally {
      setSaving(false);
    }
  };

  const viewInvoice = async (invoice) => {
    try {
      setErrorMessage("");
      const id = invoice._id || invoice.id;
      const { data } = await api.get(`/invoices/${id}`);
      setSelectedInvoice(data?.invoice || data?.data || data);
      setShowViewModal(true);
    } catch (err) {
      console.error("View invoice error:", err);
      setErrorMessage(
        err.response?.data?.message || "Failed to load invoice"
      );
    }
  };

  const updateInvoiceStatus = async (invoice, action, message) => {
    try {
      setErrorMessage("");
      const id = invoice._id || invoice.id;
      await api.put(`/invoices/${id}/${action}`);
      setSuccessMessage(message);
      await fetchInvoices(currentPage);
      if (
        selectedInvoice &&
        (selectedInvoice._id === id || selectedInvoice.id === id)
      ) {
        const { data } = await api.get(`/invoices/${id}`);
        setSelectedInvoice(data?.invoice || data?.data || data);
      }
    } catch (err) {
      console.error(`Invoice ${action} error:`, err);
      setErrorMessage(
        err.response?.data?.message || `Failed to ${action} invoice`
      );
    }
  };

  const issueInvoice = (inv) =>
    updateInvoiceStatus(inv, "issue", "Invoice issued successfully");

  const sendInvoice = (inv) =>
    updateInvoiceStatus(inv, "send", "Invoice marked as sent successfully");

  const cancelInvoice = async (inv) => {
    if (!window.confirm(`Cancel ${inv.invoiceNumber}?`)) return;
    await updateInvoiceStatus(inv, "cancel", "Invoice cancelled successfully");
  };

  const deleteInvoice = async (inv) => {
    if (!window.confirm(`Delete draft invoice ${inv.invoiceNumber}?`)) return;
    try {
      await api.delete(`/invoices/${inv._id || inv.id}`);
      setSuccessMessage("Invoice deleted successfully");
      await fetchInvoices(currentPage);
    } catch (err) {
      console.error("Delete invoice error:", err);
      setErrorMessage(
        err.response?.data?.message || "Failed to delete invoice"
      );
    }
  };

  const handleDownload = (inv) => {
    if (inv.pdfUrl) return window.open(inv.pdfUrl, "_blank");
    window.print();
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPaymentStatusFilter("");
    setCurrentPage(1);
    setShowFilters(false);
  };

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
              placeholder="Search invoice number..."
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
                      Payment status
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PAYMENT_STATUS_OPTIONS.map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() =>
                            setPaymentStatusFilter(
                              paymentStatusFilter === item ? "" : item
                            )
                          }
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                            paymentStatusFilter === item
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
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap self-start lg:self-auto"
        >
          <FiPlus size={15} />
          New Invoice
        </button>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard
          title="Total Invoiced"
          value={formatCurrency(summary.totalInvoiceAmount)}
          icon={<FiFileText size={16} />}
          iconClass="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          title="Total Paid"
          value={formatCurrency(summary.totalPaid)}
          icon={<FiCheck size={16} />}
          iconClass="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          title="Total Due"
          value={formatCurrency(summary.totalDue)}
          icon={<FiDollarSign size={16} />}
          iconClass="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          title="Overdue"
          value={
            invoices.filter((i) => i.paymentStatus === "Overdue").length
          }
          icon={<FiAlertCircle size={16} />}
          iconClass="bg-red-50 text-red-600"
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
              <p className="text-sm text-gray-500">Loading invoices...</p>
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <FiFileText size={24} />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-gray-800">
              No invoices found
            </h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              Create your first invoice from a confirmed booking.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition"
            >
              <FiPlus size={15} />
              Create Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  {[
                    "Invoice",
                    "Booking",
                    "Customer",
                    "Travel",
                    "Date",
                    "Total",
                    "Paid",
                    "Due",
                    "Status",
                    "Actions",
                  ].map((heading, i) => (
                    <th
                      key={i}
                      className={`px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide ${
                        heading === "Actions" ? "text-right" : "text-left"
                      }`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => (
                  <InvoiceRow
                    key={invoice._id || invoice.id}
                    invoice={invoice}
                    onView={viewInvoice}
                    onIssue={issueInvoice}
                    onSend={sendInvoice}
                    onCancel={cancelInvoice}
                    onDelete={deleteInvoice}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {!loading && totalInvoices > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">
              {invoices.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">
              {totalInvoices}
            </span>{" "}
            {totalInvoices === 1 ? "invoice" : "invoices"}
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
      {showCreateModal && (
        <CreateInvoiceModal
          form={form}
          saving={saving}
          bookings={bookings}
          selectedBooking={selectedBooking}
          calculatedTotals={calculatedTotals}
          onClose={closeCreateModal}
          onSubmit={createInvoice}
          onBookingChange={handleBookingChange}
          updateForm={updateForm}
          updateBillingAddress={updateBillingAddress}
          updateItem={updateItem}
          addItem={addItem}
          removeItem={removeItem}
        />
      )}

      {showViewModal && selectedInvoice && (
        <InvoiceViewModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowViewModal(false);
            setSelectedInvoice(null);
          }}
          onDownload={handleDownload}
          onIssue={issueInvoice}
          onSend={sendInvoice}
          onCancel={cancelInvoice}
        />
      )}
    </div>
  );
}

/* =====================================================
   SUB-COMPONENTS
===================================================== */

function SummaryCard({ title, value, icon, iconClass }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <h3 className="mt-1.5 text-lg font-bold text-gray-800">{value}</h3>
        </div>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function InvoiceRow({
  invoice, onView, onIssue, onSend, onCancel, onDelete,
}) {
  const isDraft = invoice.status === "Draft";
  const isPaid =
    invoice.status === "Paid" || invoice.paymentStatus === "Paid";
  const canCancel = !isPaid && invoice.status !== "Cancelled";
  const canDelete = isDraft;
  const booking = invoice.booking;

  return (
    <tr
      onClick={() => onView(invoice)}
      className="hover:bg-brand-blue-50/40 transition-colors cursor-pointer"
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-blue-50 text-brand-blue flex items-center justify-center shrink-0">
            <FiFileText size={16} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate max-w-[160px]">
              {invoice.invoiceNumber || "-"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {invoice.currency || "INR"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="font-medium text-brand-blue truncate max-w-[150px]">
          {getBookingLabel(booking)}
        </p>
        {booking?.destination && (
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[150px]">
            {booking.destination}
          </p>
        )}
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
            <FiUser size={13} />
          </div>
          <p className="font-medium text-gray-800 truncate max-w-[170px]">
            {getCustomerName(invoice.customer)}
          </p>
        </div>
      </td>

      <td className="px-5 py-4">
        {booking ? (
          <div className="space-y-0.5">
            <p className="flex items-center gap-1.5 text-xs text-gray-700">
              <FiMapPin size={13} className="text-gray-400 shrink-0" />
              <span className="truncate max-w-[150px]">
                {booking.destination || "-"}
              </span>
            </p>
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <FiCalendar size={13} className="text-gray-400 shrink-0" />
              <span className="truncate max-w-[150px]">
                {formatDateRange(booking.travelDate, booking.returnDate)}
              </span>
            </p>
            <p className="text-xs text-gray-500 truncate max-w-[150px]">
              {getTravellerText(booking)}
            </p>
          </div>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </td>

      <td className="px-5 py-4 text-gray-700">
        {formatDate(invoice.invoiceDate)}
      </td>

      <td className="px-5 py-4 font-semibold text-gray-800">
        {formatCurrency(invoice.totalAmount, invoice.currency || "INR")}
      </td>

      <td className="px-5 py-4 font-medium text-emerald-600">
        {formatCurrency(invoice.amountPaid, invoice.currency || "INR")}
      </td>

      <td className="px-5 py-4 font-medium text-amber-600">
        {formatCurrency(invoice.amountDue, invoice.currency || "INR")}
      </td>

      <td className="px-5 py-4">
        <div className="flex flex-col items-start gap-1.5">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getStatusClasses(
              invoice.status
            )}`}
          >
            {invoice.status || "Draft"}
          </span>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getPaymentClasses(
              invoice.paymentStatus
            )}`}
          >
            {invoice.paymentStatus || "Pending"}
          </span>
        </div>
      </td>

      <td className="px-5 py-4">
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <ActionButton title="View" onClick={() => onView(invoice)}>
            <FiEye size={15} />
          </ActionButton>

          {isDraft && (
            <ActionButton title="Issue" onClick={() => onIssue(invoice)}>
              <FiCheck size={15} />
            </ActionButton>
          )}

          {(invoice.status === "Issued" || invoice.status === "Viewed") && (
            <ActionButton title="Send" onClick={() => onSend(invoice)}>
              <FiSend size={15} />
            </ActionButton>
          )}

          {canCancel && (
            <ActionButton
              title="Cancel"
              danger
              onClick={() => onCancel(invoice)}
            >
              <FiX size={15} />
            </ActionButton>
          )}

          {canDelete && (
            <ActionButton
              title="Delete"
              danger
              onClick={() => onDelete(invoice)}
            >
              <FiTrash2 size={15} />
            </ActionButton>
          )}
        </div>
      </td>
    </tr>
  );
}

function ActionButton({ children, onClick, title, danger = false }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-lg p-1.5 transition ${
        danger
          ? "text-red-500 hover:bg-red-50"
          : "text-gray-500 hover:bg-gray-100 hover:text-brand-blue"
      }`}
    >
      {children}
    </button>
  );
}

/* =====================================================
   CREATE MODAL
===================================================== */

function CreateInvoiceModal({
  form, saving, bookings, selectedBooking, calculatedTotals,
  onClose, onSubmit, onBookingChange, updateForm,
  updateBillingAddress, updateItem, addItem, removeItem,
}) {
  return (
    <ModalShell
      title="Create Invoice"
      subtitle="Create a draft invoice from a confirmed booking"
      onClose={onClose}
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
            form="create-invoice-form"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 h-9 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <FiRefreshCw className="animate-spin" size={15} /> Creating...
              </>
            ) : (
              <>
                <FiCheck size={15} /> Create Draft Invoice
              </>
            )}
          </button>
        </>
      }
    >
      <form
        id="create-invoice-form"
        onSubmit={onSubmit}
        className="space-y-6 p-6"
      >
        {/* Booking */}
        <section>
          <SectionTitle icon={<FiFileText size={14} />} title="Booking Information" />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Booking *">
              <select
                value={form.booking}
                onChange={(e) => onBookingChange(e.target.value)}
                className="input"
                required
              >
                <option value="">Select Booking</option>
                {bookings.map((b) => (
                  <option key={getBookingId(b)} value={getBookingId(b)}>
                    {getBookingLabel(b)}
                    {b.customer ? ` - ${getCustomerName(b.customer)}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Invoice Date">
              <input
                type="date"
                value={form.invoiceDate}
                onChange={(e) => updateForm("invoiceDate", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => updateForm("dueDate", e.target.value)}
                className="input"
              />
            </Field>
          </div>

          {selectedBooking && (
            <div className="mt-4 rounded-xl border border-brand-blue/20 bg-brand-blue-50/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-blue">
                    Selected Booking
                  </p>
                  <h4 className="mt-0.5 text-sm font-bold text-gray-800">
                    {getBookingLabel(selectedBooking)}
                  </h4>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getStatusClasses(
                    selectedBooking.status
                  )}`}
                >
                  {selectedBooking.status || "-"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoMiniCard icon={<FiMapPin size={12} />} label="Destination" value={selectedBooking.destination || "-"} />
                <InfoMiniCard icon={<FiCalendar size={12} />} label="Travel Dates" value={formatDateRange(selectedBooking.travelDate, selectedBooking.returnDate)} />
                <InfoMiniCard icon={<FiUser size={12} />} label="Travellers" value={getTravellerText(selectedBooking)} />
                <InfoMiniCard icon={<FiFileText size={12} />} label="Travel Type" value={selectedBooking.travelType || "-"} />
              </div>
            </div>
          )}
        </section>

        {/* Billing */}
        <section>
          <SectionTitle icon={<FiDollarSign size={14} />} title="Billing Information" />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Billing Name">
              <input
                value={form.billingAddress.name}
                onChange={(e) => updateBillingAddress("name", e.target.value)}
                className="input"
                placeholder="Customer name"
              />
            </Field>
            <Field label="Street">
              <input
                value={form.billingAddress.street}
                onChange={(e) => updateBillingAddress("street", e.target.value)}
                className="input"
                placeholder="Street address"
              />
            </Field>
            <Field label="City">
              <input
                value={form.billingAddress.city}
                onChange={(e) => updateBillingAddress("city", e.target.value)}
                className="input"
                placeholder="City"
              />
            </Field>
            <Field label="State">
              <input
                value={form.billingAddress.state}
                onChange={(e) => updateBillingAddress("state", e.target.value)}
                className="input"
                placeholder="State"
              />
            </Field>
            <Field label="Country">
              <input
                value={form.billingAddress.country}
                onChange={(e) => updateBillingAddress("country", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Postal Code">
              <input
                value={form.billingAddress.postalCode}
                onChange={(e) => updateBillingAddress("postalCode", e.target.value)}
                className="input"
                placeholder="Postal code"
              />
            </Field>
          </div>
        </section>

        {/* Items */}
        <section>
          <div className="flex items-center justify-between">
            <SectionTitle icon={<FiFileText size={14} />} title="Invoice Items" />
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-blue/30 px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue-50"
            >
              <FiPlus size={14} /> Add Item
            </button>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[850px]">
              <thead className="bg-gray-50">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2.5">Description</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Qty</th>
                  <th className="px-3 py-2.5">Unit Price</th>
                  <th className="px-3 py-2.5">Amount</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {form.items.map((item, index) => {
                  const amount =
                    Number(item.quantity || 0) * Number(item.unitPrice || 0);
                  return (
                    <tr key={index}>
                      <td className="px-3 py-2.5">
                        <input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(index, "description", e.target.value)
                          }
                          placeholder="e.g. Hotel accommodation"
                          className="input"
                          required
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={item.category}
                          onChange={(e) =>
                            updateItem(index, "category", e.target.value)
                          }
                          className="input"
                        >
                          {ITEM_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, "quantity", e.target.value)
                          }
                          className="input w-20"
                          required
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(index, "unitPrice", e.target.value)
                          }
                          className="input w-32"
                          required
                        />
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-gray-700">
                        {formatCurrency(amount)}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          disabled={form.items.length === 1}
                          onClick={() => removeItem(index)}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Discount & Tax */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <SectionTitle icon={<FiDollarSign size={14} />} title="Discount & Tax" />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Discount Type">
                <select
                  value={form.discountType}
                  onChange={(e) => updateForm("discountType", e.target.value)}
                  className="input"
                >
                  <option value="Fixed">Fixed</option>
                  <option value="Percentage">Percentage</option>
                </select>
              </Field>
              <Field label="Discount Value">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discountValue}
                  onChange={(e) => updateForm("discountValue", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Tax %">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.taxPercentage}
                  onChange={(e) => updateForm("taxPercentage", e.target.value)}
                  className="input"
                />
              </Field>
            </div>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="space-y-2.5 text-sm">
              <TotalRow label="Subtotal" value={calculatedTotals.subtotal} />
              <TotalRow
                label="Discount"
                value={-calculatedTotals.discountAmount}
                negative
              />
              <TotalRow label="Tax" value={calculatedTotals.taxAmount} />
              <div className="border-t border-gray-200 pt-2.5">
                <TotalRow
                  label="Total Amount"
                  value={calculatedTotals.totalAmount}
                  strong
                />
              </div>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section>
          <SectionTitle icon={<FiFileText size={14} />} title="Notes & Terms" />
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Field label="Notes">
              <textarea
                rows="3"
                value={form.notes}
                onChange={(e) => updateForm("notes", e.target.value)}
                className="input resize-none"
                placeholder="Additional notes..."
              />
            </Field>
            <Field label="Terms & Conditions">
              <textarea
                rows="3"
                value={form.termsAndConditions}
                onChange={(e) => updateForm("termsAndConditions", e.target.value)}
                className="input resize-none"
              />
            </Field>
          </div>
        </section>
      </form>
    </ModalShell>
  );
}

/* =====================================================
   VIEW MODAL
===================================================== */

function InvoiceViewModal({
  invoice, onClose, onDownload, onIssue, onSend, onCancel,
}) {
  const isPaid =
    invoice.status === "Paid" || invoice.paymentStatus === "Paid";
  const canIssue = invoice.status === "Draft";
  const canSend = invoice.status === "Issued" || invoice.status === "Viewed";
  const canCancel = !isPaid && invoice.status !== "Cancelled";
  const booking = invoice.booking;
  const travellerText = getTravellerText(booking);

  return (
    <ModalShell
      title={`Invoice ${invoice.invoiceNumber}`}
      subtitle="Professional invoice preview"
      onClose={onClose}
      headerExtra={
        <button
          onClick={() => onDownload(invoice)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 h-8 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <FiDownload size={14} /> PDF
        </button>
      }
      footer={
        <>
          {canIssue && (
            <button
              onClick={() => onIssue(invoice)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 h-9 text-sm font-medium text-white hover:bg-blue-700"
            >
              <FiCheck size={15} /> Issue
            </button>
          )}
          {canSend && (
            <button
              onClick={() => onSend(invoice)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 h-9 text-sm font-medium text-white hover:bg-brand-blue-dark"
            >
              <FiMail size={15} /> Send
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel(invoice)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 h-9 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <FiX size={15} /> Cancel
            </button>
          )}
        </>
      }
    >
      <div className="bg-gray-100 p-4 md:p-6">
        <div className="mx-auto max-w-4xl bg-white shadow-sm">
          <div className="p-5 md:p-8">
            {/* Brand + meta */}
            <div className="flex flex-col justify-between gap-6 border-b border-gray-200 pb-6 sm:flex-row">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue text-white">
                  <FiFileText size={18} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">
                    CultHolidays
                  </h1>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-brand-blue">
                    Travel & Holidays
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="inline-flex rounded-lg bg-brand-blue-50 px-3 py-1 text-xs font-bold tracking-wider text-brand-blue">
                  INVOICE
                </span>
                <p className="mt-2 text-lg font-bold text-gray-800">
                  {invoice.invoiceNumber}
                </p>
                <div className="mt-3 space-y-1 text-xs text-gray-500">
                  <p>
                    Invoice Date:{" "}
                    <span className="font-medium text-gray-700">
                      {formatDate(invoice.invoiceDate)}
                    </span>
                  </p>
                  <p>
                    Due Date:{" "}
                    <span className="font-medium text-gray-700">
                      {invoice.dueDate
                        ? formatDate(invoice.dueDate)
                        : isPaid
                        ? "Paid"
                        : "-"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Bill To + Booking */}
            <div className="grid grid-cols-1 gap-4 border-b border-gray-200 py-6 md:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Bill To
                </p>
                <h3 className="text-sm font-bold text-gray-800">
                  {getCustomerName(invoice.customer)}
                </h3>
                {invoice.customer?.email && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {invoice.customer.email}
                  </p>
                )}
                {invoice.customer?.phone && (
                  <p className="text-xs text-gray-500">
                    {invoice.customer.phone}
                  </p>
                )}
                {invoice.billingAddress && (
                  <div className="mt-2 text-xs leading-5 text-gray-500">
                    {invoice.billingAddress.street && (
                      <p>{invoice.billingAddress.street}</p>
                    )}
                    <p>
                      {[
                        invoice.billingAddress.city,
                        invoice.billingAddress.state,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p>
                      {[
                        invoice.billingAddress.country,
                        invoice.billingAddress.postalCode,
                      ]
                        .filter(Boolean)
                        .join(" - ")}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Booking Details
                </p>
                <div className="space-y-2">
                  <DetailLine label="Booking No." value={getBookingLabel(booking)} />
                  <DetailLine label="Destination" value={booking?.destination || "-"} />
                  <DetailLine
                    label="Travel Dates"
                    value={formatDateRange(booking?.travelDate, booking?.returnDate)}
                  />
                  <DetailLine label="Travellers" value={travellerText} />
                  <DetailLine label="Travel Type" value={booking?.travelType || "-"} />
                </div>
              </div>
            </div>

            {/* Trip strip */}
            {(invoice.trip || booking) && (
              <div className="border-b border-gray-200 py-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <InvoiceInfoBox
                    label="Booking Reference"
                    value={getBookingLabel(booking)}
                  />
                  <InvoiceInfoBox
                    label="Trip"
                    value={getTripLabel(invoice.trip)}
                  />
                  <InvoiceInfoBox label="Travellers" value={travellerText} />
                </div>
              </div>
            )}

            {/* Items */}
            <div className="py-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px]">
                  <thead>
                    <tr className="border-b-2 border-gray-200 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      <th className="pb-2.5">Description</th>
                      <th className="pb-2.5">Category</th>
                      <th className="pb-2.5 text-center">Qty</th>
                      <th className="pb-2.5 text-right">Unit Price</th>
                      <th className="pb-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(invoice.items || []).map((item, i) => (
                      <tr key={i}>
                        <td className="py-3 text-xs font-semibold text-gray-700">
                          {item.description}
                        </td>
                        <td className="py-3 text-xs text-gray-500">
                          {item.category}
                        </td>
                        <td className="py-3 text-center text-xs text-gray-600">
                          {item.quantity}
                        </td>
                        <td className="py-3 text-right text-xs text-gray-600">
                          {formatCurrency(item.unitPrice, invoice.currency)}
                        </td>
                        <td className="py-3 text-right text-xs font-bold text-gray-700">
                          {formatCurrency(item.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end border-t border-gray-200 pt-6">
              <div className="w-full max-w-sm space-y-2.5 text-sm">
                <TotalRow label="Subtotal" value={invoice.subtotal} />
                {Number(invoice.discountAmount || 0) > 0 && (
                  <TotalRow
                    label="Discount"
                    value={-invoice.discountAmount}
                    negative
                  />
                )}
                <TotalRow
                  label={`Tax (${invoice.taxPercentage || 0}%)`}
                  value={invoice.taxAmount}
                />
                <div className="rounded-xl bg-gray-50 p-3">
                  <TotalRow
                    label="Total Amount"
                    value={invoice.totalAmount}
                    strong
                  />
                </div>
                <TotalRow
                  label="Amount Paid"
                  value={invoice.amountPaid}
                  valueClass="text-emerald-600"
                />
                <TotalRow
                  label="Amount Due"
                  value={invoice.amountDue}
                  valueClass="text-amber-600"
                  strong
                />
              </div>
            </div>

            {/* Payment status */}
            <div className="mt-6">
              <div
                className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                  isPaid
                    ? "border-emerald-200 bg-emerald-50"
                    : invoice.paymentStatus === "Partially Paid"
                    ? "border-amber-200 bg-amber-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Payment Status
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getStatusClasses(
                        invoice.status
                      )}`}
                    >
                      {invoice.status}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getPaymentClasses(
                        invoice.paymentStatus
                      )}`}
                    >
                      {invoice.paymentStatus}
                    </span>
                  </div>
                </div>
                {isPaid && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">
                    <FiCheck size={14} /> PAID IN FULL
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {(invoice.notes || invoice.termsAndConditions) && (
              <div className="mt-7 grid grid-cols-1 gap-5 border-t border-gray-200 pt-6 sm:grid-cols-2">
                {invoice.notes && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      Notes
                    </h4>
                    <p className="mt-1.5 whitespace-pre-line text-xs leading-5 text-gray-500">
                      {invoice.notes}
                    </p>
                  </div>
                )}
                {invoice.termsAndConditions && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      Terms & Conditions
                    </h4>
                    <p className="mt-1.5 whitespace-pre-line text-xs leading-5 text-gray-500">
                      {invoice.termsAndConditions}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 border-t border-gray-200 pt-5">
              <div className="flex flex-col justify-between gap-4 text-[10px] text-gray-400 sm:flex-row">
                <div>
                  <p className="font-semibold text-gray-500">CultHolidays</p>
                  <p>Travel & Holidays</p>
                </div>
                <div className="sm:text-right">
                  <p>This is a computer-generated invoice.</p>
                  <p className="mt-0.5">Thank you for choosing CultHolidays.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

/* =====================================================
   PRIMITIVES
===================================================== */

function ModalShell({ title, subtitle, onClose, children, footer, headerExtra }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
          <div>
            <h2 className="text-base font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {headerExtra}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <FiX size={18} />
            </button>
          </div>
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

function InfoMiniCard({ icon, label, value }) {
  return (
    <div className="rounded-lg bg-white p-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-blue-50 text-brand-blue">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
            {label}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-gray-700">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function InvoiceInfoBox({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-bold text-gray-700">{value || "-"}</p>
    </div>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="text-right font-semibold text-gray-700">
        {value || "-"}
      </span>
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

function TotalRow({ label, value, negative = false, strong = false, valueClass = "" }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className={strong ? "font-bold text-gray-800" : "text-gray-500"}>
        {label}
      </span>
      <span
        className={`font-semibold ${
          negative ? "text-red-500" : valueClass || "text-gray-700"
        } ${strong ? "text-base" : ""}`}
      >
        {formatCurrency(Math.abs(Number(value || 0)))}
        {negative && Number(value || 0) !== 0 ? " -" : ""}
      </span>
    </div>
  );
}

export default Invoice;