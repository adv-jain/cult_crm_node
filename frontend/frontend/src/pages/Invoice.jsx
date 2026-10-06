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
   COMPANY DETAILS
===================================================== */

const COMPANY = {
  name: "Cult Holidays",
  addressLines: [
    "4th Floor, A-122, Main Uttam Nagar Rd,",
    "New Delhi, India - 110059",
  ],
  phone: "+91 921-7154-515",
  email: "hello@cultholidays.com",
  website: "www.cultholidays.com",
  logo: "/images/cult-holidays-logo.webp",
};

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
  if (typeof b === "string") {
    return b.length === 24 ? `${b.slice(0, 6)}…${b.slice(-4)}` : b;
  }
  return (
    b.bookingNumber ||
    b.bookingCode ||
    b.referenceNumber ||
    b.code ||
    (b._id
      ? `${String(b._id).slice(0, 6)}…${String(b._id).slice(-4)}`
      : "-")
  );
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
     FETCH
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

  useEffect(() => {
    if (!successMessage && !errorMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 4000);
    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

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

      // invoiceNumber backend auto-generates (INV-YYYY-XXXXXXXX)
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

  const handleDownload = async (inv) => {
    if (inv.pdfUrl) {
      window.open(inv.pdfUrl, "_blank");
      return;
    }

    const element = document.getElementById("invoice-print-area");
    if (!element) {
      window.print();
      return;
    }

    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const filename = `${inv.invoiceNumber || "invoice"}.pdf`;

      const options = {
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      };

      await html2pdf().set(options).from(element).save();
    } catch (err) {
      console.error("PDF generation error:", err);
      window.print();
    }
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
                  <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
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
          value={invoices.filter((i) => i.paymentStatus === "Overdue").length}
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
            <table className="w-full text-sm" style={{ minWidth: "1250px" }}>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider" style={{ width: "150px" }}>Invoice</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider" style={{ width: "160px" }}>Booking</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider" style={{ width: "180px" }}>Customer</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider" style={{ width: "220px" }}>Travel</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap" style={{ width: "110px" }}>Date</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap" style={{ width: "110px" }}>Total</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap" style={{ width: "110px" }}>Paid</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap" style={{ width: "110px" }}>Due</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider" style={{ width: "130px" }}>Status</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider" style={{ width: "80px" }}>Actions</th>
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
            <span className="font-medium text-gray-700">{invoices.length}</span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">{totalInvoices}</span>{" "}
            {totalInvoices === 1 ? "invoice" : "invoices"}
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
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function InvoiceRow({ invoice, onView, onIssue, onSend, onCancel, onDelete }) {
  const isDraft = invoice.status === "Draft";
  const isPaid = invoice.status === "Paid" || invoice.paymentStatus === "Paid";
  const canCancel = !isPaid && invoice.status !== "Cancelled";
  const canDelete = isDraft;
  const booking = invoice.booking;

  return (
    <tr
      onClick={() => onView(invoice)}
      className="hover:bg-brand-blue-50/40 transition-colors cursor-pointer"
    >
      <td className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-blue-50 text-brand-blue flex items-center justify-center shrink-0">
            <FiFileText size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-800 truncate">
              {invoice.invoiceNumber || "-"}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {invoice.currency || "INR"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-4">
        <p className="text-[12px] font-semibold text-gray-700 font-mono truncate">
          {getBookingLabel(booking)}
        </p>
        {booking?.destination && (
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">
            {booking.destination}
          </p>
        )}
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
            <FiUser size={12} />
          </div>
          <p className="text-[12px] font-medium text-gray-800 truncate">
            {getCustomerName(invoice.customer)}
          </p>
        </div>
      </td>

      <td className="px-4 py-4">
        {booking ? (
          <div className="space-y-0.5">
            <p className="flex items-center gap-1.5 text-[11px] text-gray-700">
              <FiMapPin size={11} className="text-gray-400 shrink-0" />
              <span className="truncate">{booking.destination || "-"}</span>
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <FiCalendar size={11} className="text-gray-400 shrink-0" />
              <span className="truncate">
                {formatDateRange(booking.travelDate, booking.returnDate)}
              </span>
            </p>
            <p className="text-[11px] text-gray-500 truncate">
              {getTravellerText(booking)}
            </p>
          </div>
        ) : (
          <span className="text-[11px] text-gray-400">-</span>
        )}
      </td>

      <td className="px-4 py-4 text-gray-700 text-[12px] whitespace-nowrap">
        {formatDate(invoice.invoiceDate)}
      </td>

      <td className="px-4 py-4 text-right font-semibold text-gray-800 text-[12px] whitespace-nowrap">
        {formatCurrency(invoice.totalAmount, invoice.currency || "INR")}
      </td>

      <td className="px-4 py-4 text-right font-medium text-emerald-600 text-[12px] whitespace-nowrap">
        {formatCurrency(invoice.amountPaid, invoice.currency || "INR")}
      </td>

      <td className="px-4 py-4 text-right font-medium text-amber-600 text-[12px] whitespace-nowrap">
        {formatCurrency(invoice.amountDue, invoice.currency || "INR")}
      </td>

      <td className="px-4 py-4 text-center">
        <span
          className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${getStatusClasses(
            invoice.status
          )}`}
        >
          {invoice.status || "Draft"}
        </span>
      </td>

      <td className="px-4 py-4">
        <div
          className="flex items-center justify-end gap-0.5"
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
            <ActionButton title="Cancel" danger onClick={() => onCancel(invoice)}>
              <FiX size={15} />
            </ActionButton>
          )}

          {canDelete && (
            <ActionButton title="Delete" danger onClick={() => onDelete(invoice)}>
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
   VIEW MODAL — A4 INVOICE (clean, no fake data)
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

  const subtotal = Number(invoice.subtotal || 0);
  const discountAmount = Number(invoice.discountAmount || 0);
  const taxAmount = Number(invoice.taxAmount || 0);
  const taxPercentage = Number(invoice.taxPercentage || 0);
  const totalAmount = Number(invoice.totalAmount || 0);
  const amountPaid = Number(invoice.amountPaid || 0);
  const amountDue = Number(invoice.amountDue ?? totalAmount - amountPaid);

  const hasMultipleItems = (invoice.items || []).length > 1;

  return (
    <ModalShell
      title={`Invoice ${invoice.invoiceNumber}`}
      subtitle="A4 invoice preview"
      onClose={onClose}
      headerExtra={
        <button
          onClick={() => onDownload(invoice)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 h-8 text-xs font-semibold text-white hover:bg-brand-blue-dark"
        >
          <FiDownload size={14} /> Download PDF
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
        <div
          id="invoice-print-area"
          className="mx-auto bg-white shadow-sm"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "22mm 18mm",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          }}
        >
          {/* ============ HEADER: LOGO + TITLE ============ */}
          <div className="flex items-start justify-between gap-6 pb-8">
            <img
              src={COMPANY.logo}
              alt={COMPANY.name}
              className="h-14 w-auto object-contain"
              crossOrigin="anonymous"
            />
            <h1 className="text-2xl font-bold text-gray-900 pt-2">
              Travel Agency Invoice
            </h1>
          </div>

          {/* ============ INVOICE META (right-aligned) ============ */}
          <div className="flex justify-end pb-8">
            <div className="w-64 text-[10px]">
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Invoice no.:</span>
                <span className="font-semibold text-gray-800">
                  {invoice.invoiceNumber || "-"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Invoice date:</span>
                <span className="font-semibold text-gray-800">
                  {formatDate(invoice.invoiceDate)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Due:</span>
                <span className="font-semibold text-gray-800">
                  {invoice.dueDate ? formatDate(invoice.dueDate) : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* ============ FROM / BILL TO / SHIP TO ============ */}
          <div className="grid grid-cols-2 gap-6 pb-10">
            {/* LEFT — FROM */}
            <div>
              <p className="text-[12px] font-bold text-gray-900 mb-1.5">
                From
              </p>
              <p className="text-[13px] font-bold text-gray-900">
                {COMPANY.name}
              </p>
              <div className="mt-1 text-[10px] leading-[16px] text-gray-500">
                {COMPANY.addressLines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                <p className="mt-1">{COMPANY.email}</p>
                <p>{COMPANY.phone}</p>
              </div>
            </div>

            {/* RIGHT — BILL TO + SHIP TO */}
            <div className="text-right">
              <p className="text-[12px] font-bold text-gray-900 mb-1.5">
                Bill to
              </p>
              <p className="text-[13px] font-bold text-gray-900">
                {getCustomerName(invoice.customer) || "Customer"}
              </p>
              <div className="mt-1 text-[10px] leading-[16px] text-gray-500">
                {invoice.customer?.email && <p>{invoice.customer.email}</p>}
                {invoice.customer?.phone && <p>{invoice.customer.phone}</p>}
                {invoice.billingAddress?.street && (
                  <p>{invoice.billingAddress.street}</p>
                )}
                {(invoice.billingAddress?.city ||
                  invoice.billingAddress?.state) && (
                  <p>
                    {[invoice.billingAddress.city, invoice.billingAddress.state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                {invoice.billingAddress?.country && (
                  <p>
                    {[
                      invoice.billingAddress.country,
                      invoice.billingAddress.postalCode,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}
              </div>

              {booking && (
                <div className="mt-5">
                  <p className="text-[12px] font-bold text-gray-900 mb-1.5">
                    Ship to
                  </p>
                  <p className="text-[10px] leading-[16px] text-gray-500">
                    {booking.destination || "-"}
                  </p>
                  <p className="text-[10px] leading-[16px] text-gray-500">
                    {formatDateRange(booking.travelDate, booking.returnDate)}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {getTravellerText(booking)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ============ ITEMS TABLE ============ */}
          <div className="mt-2">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ backgroundColor: "#2563eb" }}>
                  <th className="py-2.5 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-white w-[35%]">
                    Description
                  </th>
                  <th className="py-2.5 px-3 text-right text-[10px] font-bold uppercase tracking-wider text-white w-[20%]">
                    Rate
                  </th>
                  <th className="py-2.5 px-3 text-center text-[10px] font-bold uppercase tracking-wider text-white w-[10%]">
                    Qty
                  </th>
                  <th className="py-2.5 px-3 text-center text-[10px] font-bold uppercase tracking-wider text-white w-[10%]">
                    Tax
                  </th>
                  <th className="py-2.5 px-3 text-center text-[10px] font-bold uppercase tracking-wider text-white w-[10%]">
                    Disc
                  </th>
                  <th className="py-2.5 px-3 text-right text-[10px] font-bold uppercase tracking-wider text-white w-[15%]">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, i) => {
                  const qty = Number(item.quantity || 1);
                  const rate = Number(item.unitPrice || 0);
                  const amount = Number(item.amount ?? qty * rate);
                  const isEven = i % 2 === 0;

                  return (
                    <tr
                      key={i}
                      style={{
                        backgroundColor: isEven ? "#f9fafb" : "#ffffff",
                      }}
                    >
                      <td className="py-3 px-3 text-[11px] text-gray-800 align-top">
                        <p className="font-semibold">{item.description}</p>
                        {item.category && (
                          <p className="mt-0.5 text-[10px] text-gray-400">
                            {item.category}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-[11px] text-gray-700 align-top whitespace-nowrap">
                        {formatCurrency(rate, invoice.currency)}
                      </td>
                      <td className="py-3 px-3 text-center text-[11px] text-gray-700 align-top whitespace-nowrap">
                        {qty}
                      </td>
                      <td className="py-3 px-3 text-center text-[11px] text-gray-700 align-top whitespace-nowrap">
                        {taxPercentage > 0 ? `${taxPercentage}%` : "-"}
                      </td>
                      <td className="py-3 px-3 text-center text-[11px] text-gray-700 align-top whitespace-nowrap">
                        {discountAmount > 0 ? "Yes" : "-"}
                      </td>
                      <td className="py-3 px-3 text-right text-[11px] font-semibold text-gray-800 align-top whitespace-nowrap">
                        {formatCurrency(amount, invoice.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ============ TOTALS ============ */}
          <div className="mt-8 grid grid-cols-2 gap-8">
            {/* LEFT — empty spacer (payment instructions removed) */}
            <div />

            {/* RIGHT — Totals */}
            <div>
              <div className="text-[11px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(subtotal, invoice.currency)}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Discount:</span>
                    <span className="font-semibold text-red-500">
                      - {formatCurrency(discountAmount, invoice.currency)}
                    </span>
                  </div>
                )}

                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Tax {taxPercentage > 0 && `(${taxPercentage}%)`}:
                    </span>
                    <span className="font-semibold text-gray-800">
                      {formatCurrency(taxAmount, invoice.currency)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between border-t border-gray-200 pt-1.5">
                  <span className="font-bold text-gray-800">Total:</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(totalAmount, invoice.currency)}
                  </span>
                </div>

                {amountPaid > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount paid:</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(amountPaid, invoice.currency)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between bg-gray-100 px-2 py-1.5 mt-1">
                  <span className="font-bold text-gray-800">
                    Balance Due:
                  </span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(amountDue, invoice.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ============ NOTES ============ */}
          {invoice.notes && (
            <div className="mt-10">
              <p className="text-[11px] font-bold text-gray-900 mb-2">
                Notes
              </p>
              <p className="text-[10px] leading-[16px] text-gray-500 max-w-md whitespace-pre-line">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* ============ FOOTER ============ */}
          <div className="mt-16 border-t border-gray-200 pt-4">
            <p className="text-[10px] text-gray-500">
              {COMPANY.website}
            </p>
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