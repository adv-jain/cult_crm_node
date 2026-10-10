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
  FiCheck,
  FiSend,
  FiTrash2,
  FiDownload,
  FiDollarSign,
  FiRefreshCw,
  FiMail,
} from "react-icons/fi";
import api from "../api";

const RECORDS_PER_PAGE = 50;

const EMPTY_ITEM = {
  description: "",
  category: "Service",
  quantity: 1,
  unitPrice: 0,
};

const ITEM_CATEGORIES = [
  "Hotel",
  "Transport",
  "Flight",
  "Train",
  "Activity",
  "Visa",
  "Insurance",
  "Package",
  "Service",
  "Other",
];

const STATUS_OPTIONS = [
  "Draft",
  "Issued",
  "Sent",
  "Viewed",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Cancelled",
];

const todayISO = () => new Date().toISOString().split("T")[0];

const emptyForm = () => ({
  booking: "",
  quotation: "",
  customer: "",
  company: "",
  trip: "",
  invoiceDate: todayISO(),
  dueDate: "",
  items: [{ ...EMPTY_ITEM }],
  discountType: "Fixed",
  discountValue: 0,
  taxPercentage: 0,
  billingAddress: {
    name: "",
    street: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
  },
  notes: "",
});

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

const formatAmount = (value) => {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const formatDate = (date) => {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return typeof date === "string" ? date : "-";
  }
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateRange = (start, end) => {
  if (!start && !end) return "-";
  if (start && end) return `${formatDate(start)} - ${formatDate(end)}`;
  return formatDate(start || end);
};

const getId = (value) =>
  !value ? "" : typeof value === "string" ? value : value._id || value.id || "";

const getCustomerName = (customer) => {
  if (!customer) return "-";
  if (typeof customer === "string") return customer;
  return (
    customer.name ||
    customer.fullName ||
    `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
    "-"
  );
};

const getBookingLabel = (booking) => {
  if (!booking) return "-";
  if (typeof booking === "string") {
    return booking.length === 24
      ? `${booking.slice(0, 6)}…${booking.slice(-4)}`
      : booking;
  }
  return (
    booking.bookingNumber ||
    booking.bookingCode ||
    booking.referenceNumber ||
    booking.code ||
    (booking._id
      ? `${String(booking._id).slice(0, 6)}…${String(booking._id).slice(-4)}`
      : "-")
  );
};

const getTravellerText = (booking) => {
  if (!booking) return "-";
  const adults = Number(booking.adults || 0);
  const children = Number(booking.children || 0);
  const infants = Number(booking.infants || 0);
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

function Invoice() {
  const [invoices, setInvoices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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

  const fetchInvoices = async (page = currentPage) => {
    try {
      setLoading(true);
      const params = { page, limit: RECORDS_PER_PAGE };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const { data = {} } = await api.get("/invoices", { params });
      const list = data.invoices || data.data || [];
      const total = Number(data.total || data.count || 0);
      const pages = Math.max(
        1,
        Number(
          data.pagination?.totalPages ||
            data.pages ||
            Math.ceil(total / RECORDS_PER_PAGE)
        )
      );

      setInvoices(list);
      setCurrentPage(data.page || page);
      setTotalPages(pages);
      setTotalInvoices(total);
      setSummary({
        totalInvoiceAmount:
          data.totals?.totalInvoiceAmount ||
          data.summary?.totalInvoiceAmount ||
          0,
        totalPaid: data.totals?.totalPaid || data.summary?.totalPaid || 0,
        totalDue: data.totals?.totalDue || data.summary?.totalDue || 0,
      });
    } catch (err) {
      console.error("Fetch invoices error:", err);
      setErrorMessage(err.response?.data?.message || "Failed to fetch invoices");
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

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchInvoices(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, statusFilter]);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 4000);
    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  useEffect(() => {
    const close = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };
    if (showFilters) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showFilters]);

  const calculatedTotals = useMemo(() => {
    const subtotal = form.items.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0
    );
    const discountAmount =
      form.discountType === "Percentage"
        ? (subtotal * Number(form.discountValue || 0)) / 100
        : Math.min(Number(form.discountValue || 0), subtotal);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount =
      (taxableAmount * Number(form.taxPercentage || 0)) / 100;
    return {
      subtotal,
      discountAmount,
      taxableAmount,
      taxAmount,
      totalAmount: taxableAmount + taxAmount,
    };
  }, [form.items, form.discountType, form.discountValue, form.taxPercentage]);

  const selectedBooking = useMemo(
    () => bookings.find((booking) => getId(booking) === form.booking) || null,
    [bookings, form.booking]
  );

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
    const booking = bookings.find((item) => getId(item) === bookingId);
    if (!booking) {
      setForm((prev) => ({
        ...prev,
        booking: "",
        customer: "",
        company: "",
        trip: "",
        quotation: "",
      }));
      return;
    }

    const customer = booking.customer;
    const bookingTotal = Number(
      booking.totalAmount ||
        booking.total ||
        booking.grandTotal ||
        booking.amount ||
        0
    );

    setForm((prev) => ({
      ...prev,
      booking: bookingId,
      customer: getId(customer),
      company: getId(booking.company),
      trip: getId(booking.trip),
      quotation: getId(booking.quotation),
      billingAddress: {
        ...prev.billingAddress,
        name: getCustomerName(customer),
        city: customer?.city || prev.billingAddress.city,
        state: customer?.state || prev.billingAddress.state,
        country: customer?.country || "India",
        postalCode: customer?.postalCode || prev.billingAddress.postalCode,
      },
      items:
        bookingTotal > 0
          ? [
              {
                description: booking.destination
                  ? `Travel package - ${booking.destination}`
                  : "Travel services",
                category: "Package",
                quantity: 1,
                unitPrice: bookingTotal,
              },
            ]
          : [{ ...EMPTY_ITEM }],
    }));
  };

  const updateForm = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateBillingAddress = (field, value) =>
    setForm((prev) => ({
      ...prev,
      billingAddress: { ...prev.billingAddress, [field]: value },
    }));

  const updateItem = (index, field, value) =>
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });

  const addItem = () =>
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_ITEM }],
    }));

  const removeItem = (index) =>
    setForm((prev) =>
      prev.items.length === 1
        ? prev
        : { ...prev, items: prev.items.filter((_, i) => i !== index) }
    );

  const createInvoice = async (event) => {
    event.preventDefault();
    if (!form.booking) return setErrorMessage("Please select a booking.");
    if (!form.customer)
      return setErrorMessage("Customer information is required.");

    const validItems = form.items.filter(
      (item) =>
        item.description.trim() &&
        Number(item.quantity) > 0 &&
        Number(item.unitPrice) >= 0
    );

    if (!validItems.length)
      return setErrorMessage("Add at least one valid invoice item.");

    try {
      setSaving(true);
      await api.post("/invoices", {
        booking: form.booking,
        quotation: form.quotation || null,
        customer: form.customer,
        company: form.company || null,
        trip: form.trip || null,
        invoiceDate: form.invoiceDate || null,
        dueDate: form.dueDate || null,
        items: validItems.map((item) => ({
          description: item.description.trim(),
          category: item.category,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        discountType: form.discountType,
        discountValue: Number(form.discountValue || 0),
        taxPercentage: Number(form.taxPercentage || 0),
        amountPaid: 0,
        billingAddress: form.billingAddress,
        notes: form.notes,
      });

      setSuccessMessage("Invoice created successfully");
      setShowCreateModal(false);
      resetForm();
      await fetchInvoices(currentPage);
    } catch (err) {
      console.error("Create invoice error:", err);
      setErrorMessage(err.response?.data?.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  const viewInvoice = async (invoice) => {
    try {
      const id = invoice._id || invoice.id;
      const { data } = await api.get(`/invoices/${id}`);
      setSelectedInvoice(data?.invoice || data?.data || data);
      setShowViewModal(true);
    } catch (err) {
      console.error("View invoice error:", err);
      setErrorMessage(err.response?.data?.message || "Failed to load invoice");
    }
  };

  const updateInvoiceStatus = async (invoice, action, message) => {
    try {
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

  const issueInvoice = (invoice) =>
    updateInvoiceStatus(invoice, "issue", "Invoice issued successfully");

  const sendInvoice = (invoice) =>
    updateInvoiceStatus(invoice, "send", "Invoice marked as sent successfully");

  const cancelInvoice = async (invoice) => {
    if (!window.confirm(`Cancel ${invoice.invoiceNumber}?`)) return;
    await updateInvoiceStatus(invoice, "cancel", "Invoice cancelled successfully");
  };

  const deleteInvoice = async (invoice, event) => {
    event?.stopPropagation?.();

    if (!window.confirm(`Delete draft invoice ${invoice.invoiceNumber}?`)) return;

    try {
      await api.delete(`/invoices/${invoice._id || invoice.id}`);
      setSuccessMessage("Invoice deleted successfully");
      if (invoices.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      } else {
        await fetchInvoices(currentPage);
      }
    } catch (err) {
      console.error("Delete invoice error:", err);
      setErrorMessage(err.response?.data?.message || "Failed to delete invoice");
    }
  };

  const handleDownload = async (invoice) => {
    const element = document.getElementById("invoice-print-area");
    if (!element) {
      window.print();
      return;
    }

    let wrapper = null;

    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const images = Array.from(element.querySelectorAll("img"));
      await Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              })
        )
      );

      const clone = element.cloneNode(true);

      /* =====================================================
         FORCE HEADER — via flex div inside TH
      ===================================================== */
      const headerAlignMap = ["flex-start", "flex-start", "center", "flex-end", "flex-end"];

      const forceHeaders = (root) => {
        root.querySelectorAll("thead th").forEach((th, index) => {
          const align = headerAlignMap[index] || "flex-start";

          th.style.setProperty("vertical-align", "middle", "important");
          th.style.setProperty("padding-top", "0px", "important");
          th.style.setProperty("padding-bottom", "10px", "important");
          th.style.setProperty("background-color", "#1f4f8f", "important");
          th.style.setProperty("color", "#ffffff", "important");
          th.style.setProperty("font-weight", "700", "important");

          const innerDiv = th.querySelector("div");
          if (innerDiv) {
            innerDiv.style.setProperty("display", "flex", "important");
            innerDiv.style.setProperty("align-items", "center", "important");
            innerDiv.style.setProperty("justify-content", align, "important");
            innerDiv.style.setProperty("min-height", "16px", "important");
            innerDiv.style.setProperty("line-height", "1.2", "important");
            
          }
        });
      };

      forceHeaders(clone);

      /* Body cells — vertical center */
      /* Body cells — vertical center */
clone.querySelectorAll("tbody td").forEach((td) => {
  td.style.setProperty("vertical-align", "middle", "important");
  td.style.setProperty("padding-top", "0px", "important");
  td.style.setProperty("padding-bottom", "8px", "important");
});

      /* Force table layout */
      clone.querySelectorAll("table").forEach((table) => {
        table.style.width = "100%";
        table.style.maxWidth = "100%";
        table.style.tableLayout = "fixed";
        table.style.borderCollapse = "collapse";
      });

      wrapper = document.createElement("div");
      wrapper.className = "fixed left-[-10000px] top-0 bg-white p-0 m-0";
      wrapper.style.width = "194mm";
      wrapper.style.backgroundColor = "#ffffff";
      wrapper.style.boxSizing = "border-box";
      wrapper.style.overflow = "visible";

      clone.style.width = "194mm";
      clone.style.maxWidth = "194mm";
      clone.style.margin = "0";
      clone.style.padding = "8mm";
      clone.style.boxSizing = "border-box";
      clone.style.backgroundColor = "#ffffff";
      clone.style.boxShadow = "none";
      clone.style.overflow = "visible";

      /* Skip TH and their inner divs in generic loop */
      clone.querySelectorAll("*").forEach((node) => {
        if (node.tagName === "TH") return;
        if (node.parentElement?.tagName === "TH") return;

        node.style.maxWidth = "100%";
        node.style.boxSizing = "border-box";
        node.style.overflowWrap = "anywhere";
        node.style.wordBreak = "break-word";
      });

      /* Re-apply header force AFTER generic loop */
      forceHeaders(clone);

      

      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      await new Promise((resolve) => setTimeout(resolve, 300));

      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: `${invoice.invoiceNumber || "invoice"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
            width: wrapper.scrollWidth,
            height: wrapper.scrollHeight,
            windowWidth: wrapper.scrollWidth,
            windowHeight: Math.max(wrapper.scrollHeight, 1200),
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
            compress: true,
          },
          pagebreak: {
            mode: ["css", "legacy"],
            avoid: [".invoice-section", ".invoice-card", "tr"],
          },
        })
        .from(clone)
        .save();
    } catch (err) {
      console.error("PDF generation error:", err);
      window.print();
    } finally {
      if (wrapper?.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setCurrentPage(1);
    setShowFilters(false);
  };

  const activeFilterCount = [search, statusFilter].filter(Boolean).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={15}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice number..."
              className="w-full pl-9 pr-8 h-9 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <FiX size={13} />
              </button>
            )}
          </div>

          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className="inline-flex items-center justify-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              <FiFilter size={14} />
              <span>Filters</span>
              {statusFilter && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] bg-brand-blue text-white rounded-full">
                  {statusFilter ? 1 : 0}
                </span>
              )}
            </button>

            {showFilters && (
              <div className="absolute left-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-gray-500 hover:text-red-600"
                  >
                    Reset
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <FilterGroup
                    label="Status"
                    value={statusFilter}
                    options={STATUS_OPTIONS}
                    onChange={setStatusFilter}
                  />
                </div>

                <div className="flex justify-end px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-blue rounded-md"
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
          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg"
        >
          <FiPlus size={15} />
          New Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard
          title="Total Invoiced"
          value={formatAmount(summary.totalInvoiceAmount)}
          icon={<FiFileText size={16} />}
          iconClass="bg-blue-50 text-blue-600"
        />
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
          </span>
          <button
            type="button"
            onClick={clearFilters}
            className="text-brand-blue font-medium"
          >
            Clear filters
          </button>
        </div>
      )}

      {successMessage && (
        <Alert
          type="success"
          message={successMessage}
          onClose={() => setSuccessMessage("")}
        />
      )}

      {errorMessage && (
        <Alert
          type="error"
          message={errorMessage}
          onClose={() => setErrorMessage("")}
        />
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-[3px] border-brand-blue-50 border-t-brand-blue rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading invoices...</p>
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState onCreate={openCreateModal} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: "1250px" }}>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Travel</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead align="right">Total</TableHead>
                  <TableHead align="center">Status</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => (
                  <InvoiceRow
                    key={invoice._id || invoice.id}
                    invoice={invoice}
                    onView={viewInvoice}
                    onDelete={deleteInvoice}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && totalInvoices > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">{invoices.length}</span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">{totalInvoices}</span>{" "}
            invoices
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1 || loading}
                onClick={() =>
                  currentPage > 1 && setCurrentPage((page) => page - 1)
                }
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg disabled:opacity-40"
              >
                <FiChevronLeft size={16} />
              </button>
              <span className="px-3 text-sm font-medium text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages || loading}
                onClick={() =>
                  currentPage < totalPages && setCurrentPage((page) => page + 1)
                }
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg disabled:opacity-40"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

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

function Alert({ type, message, onClose }) {
  const success = type === "success";
  return (
    <div
      className={`flex items-start gap-3 border text-sm px-4 py-3 rounded-lg ${
        success
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-red-50 border-red-200 text-red-800"
      }`}
    >
      {success ? <FiCheckCircle size={18} /> : <FiAlertCircle size={18} />}
      <p className="flex-1">{message}</p>
      <button type="button" onClick={onClose}>
        <FiX size={16} />
      </button>
    </div>
  );
}

function FilterGroup({ label, value, options, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => onChange(value === option ? "" : option)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border ${
              value === option
                ? "bg-brand-blue text-white border-brand-blue"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function TableHead({ children, align = "left" }) {
  return (
    <th
      className={`px-4 py-3 text-${align} text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap`}
      style={{ verticalAlign: "middle" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            align === "right"
              ? "flex-end"
              : align === "center"
              ? "center"
              : "flex-start",
          minHeight: "16px",
          lineHeight: "1.2",
        }}
      >
        {children}
      </div>
    </th>
  );
}

function InvoiceRow({ invoice, onView, onDelete }) {
  const isDraft = invoice.status === "Draft";
  const booking = invoice.booking;

  return (
    <tr
      onClick={() => onView(invoice)}
      className="hover:bg-brand-blue-50/40 transition-colors cursor-pointer group"
    >
      <td className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-blue-50 text-brand-blue flex items-center justify-center group-hover:bg-brand-blue-100 transition">
            <FiFileText size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-800 truncate">
              {invoice.invoiceNumber || "-"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
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
              <FiMapPin size={11} className="text-gray-400" />
              {booking.destination || "-"}
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <FiCalendar size={11} className="text-gray-400" />
              {formatDateRange(booking.travelDate, booking.returnDate)}
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
        {formatAmount(invoice.totalAmount)}
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

      <td
        className="px-4 py-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-end">
          {isDraft && (
            <button
              type="button"
              onClick={(event) => onDelete(invoice, event)}
              title="Delete"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 bg-transparent hover:text-red-600 hover:bg-red-50 transition"
            >
              <FiTrash2 size={15} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
        <FiFileText size={24} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-gray-800">
        No invoices found
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        Create your first invoice from a confirmed booking.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg"
      >
        <FiPlus size={15} /> Create Invoice
      </button>
    </div>
  );
}

function CreateInvoiceModal({
  form,
  saving,
  bookings,
  selectedBooking,
  calculatedTotals,
  onClose,
  onSubmit,
  onBookingChange,
  updateForm,
  updateBillingAddress,
  updateItem,
  addItem,
  removeItem,
}) {
  return (
    <ModalShell
      title="Create Invoice"
      subtitle="Create a professional customer invoice from a confirmed booking"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-200 bg-white px-4 h-9 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-invoice-form"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 h-9 text-sm font-medium text-white disabled:opacity-60"
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
      <form id="create-invoice-form" onSubmit={onSubmit} className="space-y-6 p-6">
        <section>
          <SectionTitle icon={<FiFileText size={14} />} title="Booking Information" />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Booking *">
              <select
                value={form.booking}
                onChange={(event) => onBookingChange(event.target.value)}
                className="input"
                required
              >
                <option value="">Select Booking</option>
                {bookings.map((booking) => (
                  <option key={getId(booking)} value={getId(booking)}>
                    {getBookingLabel(booking)}
                    {booking.customer ? ` - ${getCustomerName(booking.customer)}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Invoice Date">
              <input
                type="date"
                value={form.invoiceDate}
                onChange={(event) => updateForm("invoiceDate", event.target.value)}
                className="input"
              />
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => updateForm("dueDate", event.target.value)}
                className="input"
              />
            </Field>
          </div>

          {selectedBooking && (
            <div className="mt-4 rounded-xl border border-brand-blue/20 bg-brand-blue-50/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-blue">
                    Selected Booking
                  </p>
                  <h4 className="mt-0.5 text-sm font-bold text-gray-800">
                    {getBookingLabel(selectedBooking)}
                  </h4>
                </div>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                    selectedBooking.status
                  )}`}
                >
                  {selectedBooking.status || "-"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoMiniCard
                  icon={<FiMapPin size={12} />}
                  label="Destination"
                  value={selectedBooking.destination || "-"}
                />
                <InfoMiniCard
                  icon={<FiCalendar size={12} />}
                  label="Travel Dates"
                  value={formatDateRange(
                    selectedBooking.travelDate,
                    selectedBooking.returnDate
                  )}
                />
                <InfoMiniCard
                  icon={<FiUser size={12} />}
                  label="Travellers"
                  value={getTravellerText(selectedBooking)}
                />
                <InfoMiniCard
                  icon={<FiFileText size={12} />}
                  label="Travel Type"
                  value={selectedBooking.travelType || "-"}
                />
              </div>
            </div>
          )}
        </section>

        <section>
          <SectionTitle icon={<FiUser size={14} />} title="Billing Information" />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Billing Name">
              <input
                value={form.billingAddress.name}
                onChange={(event) => updateBillingAddress("name", event.target.value)}
                className="input"
                placeholder="Customer name"
              />
            </Field>
            <Field label="Street">
              <input
                value={form.billingAddress.street}
                onChange={(event) => updateBillingAddress("street", event.target.value)}
                className="input"
                placeholder="Street address"
              />
            </Field>
            <Field label="City">
              <input
                value={form.billingAddress.city}
                onChange={(event) => updateBillingAddress("city", event.target.value)}
                className="input"
                placeholder="City"
              />
            </Field>
            <Field label="State">
              <input
                value={form.billingAddress.state}
                onChange={(event) => updateBillingAddress("state", event.target.value)}
                className="input"
                placeholder="State"
              />
            </Field>
            <Field label="Country">
              <input
                value={form.billingAddress.country}
                onChange={(event) => updateBillingAddress("country", event.target.value)}
                className="input"
              />
            </Field>
            <Field label="Postal Code">
              <input
                value={form.billingAddress.postalCode}
                onChange={(event) =>
                  updateBillingAddress("postalCode", event.target.value)
                }
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
                          onChange={(event) =>
                            updateItem(index, "description", event.target.value)
                          }
                          placeholder="e.g. Hotel accommodation"
                          className="input"
                          required
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={item.category}
                          onChange={(event) =>
                            updateItem(index, "category", event.target.value)
                          }
                          className="input"
                        >
                          {ITEM_CATEGORIES.map((category) => (
                            <option key={category}>{category}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(index, "quantity", event.target.value)
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
                          onChange={(event) =>
                            updateItem(index, "unitPrice", event.target.value)
                          }
                          className="input w-32"
                          required
                        />
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-gray-700">
                        {formatAmount(amount)}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          disabled={form.items.length === 1}
                          onClick={() => removeItem(index)}
                          className="rounded-lg p-1.5 text-red-500 disabled:opacity-30"
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
                  onChange={(event) => updateForm("discountType", event.target.value)}
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
                  onChange={(event) => updateForm("discountValue", event.target.value)}
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
                  onChange={(event) => updateForm("taxPercentage", event.target.value)}
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
            </div>
          </div>
        </section>

        <section>
          <SectionTitle icon={<FiFileText size={14} />} title="Notes" />
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Field label="Notes">
              <textarea
                rows="4"
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                className="input resize-none"
                placeholder="Additional customer-facing notes..."
              />
            </Field>
          </div>
        </section>
      </form>
    </ModalShell>
  );
}

function InvoiceViewModal({ invoice, onClose, onDownload, onIssue, onSend, onCancel }) {
  const booking = invoice.booking || null;
  const customer = invoice.customer || null;
  const trip = invoice.trip || booking?.trip || null;

  const isPaid = invoice.status === "Paid" || invoice.paymentStatus === "Paid";
  const canIssue = invoice.status === "Draft";
  const canSend = invoice.status === "Issued" || invoice.status === "Viewed";
  const canCancel = !isPaid && invoice.status !== "Cancelled";

  const destination = booking?.destination || trip?.destination || "-";
  const travelDate = booking?.travelDate || trip?.travelDate || trip?.startDate;
  const returnDate = booking?.returnDate || trip?.returnDate || trip?.endDate;
  const customerEmail = typeof customer === "object" ? customer?.email : "";
  const customerPhone =
    typeof customer === "object"
      ? customer?.phone || customer?.mobile || customer?.phoneNumber
      : "";

  const billing = invoice.billingAddress || {};
  const billingCityState = [billing.city, billing.state].filter(Boolean).join(", ");
  const billingCountryPostal = [billing.country, billing.postalCode]
    .filter(Boolean)
    .join(" - ");

  const safeText = (value, fallback = "-") => {
    if (value === null || value === undefined || value === "") return fallback;
    return String(value);
  };

  return (
    <ModalShell
      title={`Invoice ${invoice.invoiceNumber || ""}`}
      subtitle="Professional A4 invoice preview"
      onClose={onClose}
      headerExtra={
        <button
          type="button"
          onClick={() => onDownload(invoice)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-blue px-3 text-xs font-semibold text-white hover:bg-brand-blue-dark"
        >
          <FiDownload size={14} /> Download PDF
        </button>
      }
      footer={
        <>
          {canIssue && (
            <button
              type="button"
              onClick={() => onIssue(invoice)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
            >
              <FiCheck size={15} /> Issue
            </button>
          )}
          {canSend && (
            <button
              type="button"
              onClick={() => onSend(invoice)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-blue px-4 text-sm font-medium text-white hover:bg-brand-blue-dark"
            >
              <FiMail size={15} /> Send
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel(invoice)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <FiX size={15} /> Cancel
            </button>
          )}
        </>
      }
    >
      <div className="bg-gray-100 p-3 sm:p-4 md:p-6 print:bg-white print:p-0">
        <div
          id="invoice-print-area"
          className="invoice-root invoice-section mx-auto w-full max-w-[190mm] overflow-visible bg-white p-[8mm] text-gray-800 shadow-sm sm:p-[9mm] print:max-w-none print:shadow-none"
          style={{
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          {/* HEADER */}
          <section className="invoice-section break-inside-avoid">
            <div className="grid min-w-0 grid-cols-[1fr_auto] gap-4">
              <div className="min-w-0">
                <img
                  src={COMPANY.logo}
                  alt={COMPANY.name}
                  className="h-10 w-auto max-w-full object-contain object-left"
                  crossOrigin="anonymous"
                />

                <div className="mt-2 max-w-full text-[8px] leading-[12px] text-gray-500 break-words">
                  {COMPANY.addressLines.map((line, index) => (
                    <p key={index} className="m-0 break-words">
                      {line}
                    </p>
                  ))}

                  <p className="m-0 break-words">Phone: {COMPANY.phone}</p>
                  <p className="m-0 break-words">Email: {COMPANY.email}</p>
                  <p className="m-0 break-words">{COMPANY.website}</p>
                </div>
              </div>

              <div className="min-w-0 text-right">
                <h1 className="m-0 text-[24px] font-bold leading-none text-gray-900">
                  INVOICE
                </h1>

                <div className="mt-3 ml-auto grid max-w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[9px] leading-4">
                  <span className="text-gray-500">Invoice No.</span>
                  <span className="min-w-0 break-words font-semibold text-gray-900">
                    {safeText(invoice.invoiceNumber)}
                  </span>

                  <span className="text-gray-500">Invoice Date</span>
                  <span className="min-w-0 break-words font-semibold text-gray-900">
                    {formatDate(invoice.invoiceDate)}
                  </span>

                  <span className="text-gray-500">Due Date</span>
                  <span className="min-w-0 break-words font-semibold text-gray-900">
                    {invoice.dueDate ? formatDate(invoice.dueDate) : "-"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* CUSTOMER + TRIP */}
          <section className="invoice-section mt-4 break-inside-avoid">
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              {/* BILL TO */}
              <div className="invoice-card min-w-0 break-inside-avoid rounded-lg border border-gray-200 p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[13px] text-brand-blue">
                    👤
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.5px] text-gray-400">
                      Customer Details
                    </p>
                    <p className="m-0 text-xs font-bold text-gray-900">Bill To</p>
                  </div>
                </div>

                <p className="mt-2.5 mb-0 break-words text-[11px] font-bold leading-4 text-gray-900">
                  {safeText(getCustomerName(customer))}
                </p>

                <div className="mt-1.5 space-y-0.5 break-words text-[9px] leading-[14px] text-gray-500">
                  {customerEmail && <p className="m-0 break-words">{customerEmail}</p>}
                  {customerPhone && <p className="m-0 break-words">{customerPhone}</p>}
                  {billing.street && <p className="m-0 break-words">{billing.street}</p>}
                  {billingCityState && <p className="m-0 break-words">{billingCityState}</p>}
                  {billingCountryPostal && (
                    <p className="m-0 break-words">{billingCountryPostal}</p>
                  )}
                </div>
              </div>

              {/* TRAVEL INFORMATION */}
              <div className="invoice-card min-w-0 break-inside-avoid rounded-lg border border-gray-200 p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[13px] text-brand-blue">
                    📍
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 text-[9px] font-bold uppercase tracking-[0.5px] text-gray-400">
                      Trip Details
                    </p>
                    <p className="m-0 text-xs font-bold text-gray-900">
                      Travel Information
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 grid min-w-0 grid-cols-2 gap-x-3 gap-y-3">
                  <div className="min-w-0">
                    <p className="m-0 text-[8px] font-semibold uppercase tracking-[0.4px] text-gray-400">
                      Booking No.
                    </p>
                    <p className="m-0 mt-0.5 break-words text-[10px] font-semibold leading-[14px] text-gray-700">
                      {safeText(
                        booking?.bookingNumber ||
                          booking?.bookingCode ||
                          booking?.referenceNumber ||
                          booking?.code
                      )}
                    </p>
                    <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.4px] text-gray-400">
                      Destination
                    </p>
                    <p className="m-0 mt-0.5 break-words text-[10px] font-semibold leading-[14px] text-gray-700">
                      {safeText(destination)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="m-0 text-[8px] font-semibold uppercase tracking-[0.4px] text-gray-400">
                      Travel Dates
                    </p>
                    <p className="m-0 mt-0.5 break-words text-[10px] font-semibold leading-[14px] text-gray-700">
                      {formatDateRange(travelDate, returnDate)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="m-0 text-[8px] font-semibold uppercase tracking-[0.4px] text-gray-400">
                      Travellers
                    </p>
                    <p className="m-0 mt-0.5 break-words text-[10px] font-semibold leading-[14px] text-gray-700">
                      {safeText(getTravellerText(booking))}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="m-0 text-[8px] font-semibold uppercase tracking-[0.4px] text-gray-400">
                      Travel Type
                    </p>
                    <p className="m-0 mt-0.5 break-words text-[10px] font-semibold leading-[14px] text-gray-700">
                      {safeText(booking?.travelType || trip?.travelType)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ITEMS */}
          <section className="invoice-section mt-5 break-inside-auto">
            <p className="m-0 text-[8px] font-bold uppercase tracking-[0.5px] text-gray-400">
              Invoice Breakdown
            </p>

            <div className="mt-1.5 w-full min-w-0 overflow-visible rounded-md border border-gray-200">
             
<table
  className="w-full table-fixed border-collapse"
  style={{ width: "100%", tableLayout: "fixed" }}
>
  <colgroup>
    <col style={{ width: "18%" }} />
    <col style={{ width: "38%" }} />
    <col style={{ width: "10%" }} />
    <col style={{ width: "17%" }} />
    <col style={{ width: "17%" }} />
  </colgroup>

  <thead>
    <tr className="bg-[#1f4f8f]">
      {[
        { label: "Services", align: "left" },
        { label: "Description", align: "left" },
        { label: "Qty", align: "center" },
        { label: "Rate", align: "right" },
        { label: "Amount", align: "right" },
      ].map(({ label, align }) => (
        <th
          key={label}
          className={`px-2.5 text-${align} text-[8px] font-bold uppercase tracking-[0.5px] text-white`}
          style={{
            verticalAlign: "middle",
            paddingTop: "10px",
            paddingBottom: "10px",
            lineHeight: "12px",
          }}
        >
          {label}
        </th>
      ))}
    </tr>
  </thead>

  <tbody>
    {(invoice.items || []).map((item, index) => {
      const quantity = Number(item.quantity || 1);
      const rate = Number(item.unitPrice || 0);
      const amount = Number(item.amount ?? quantity * rate);

      return (
        <tr
          key={index}
          className={`invoice-card break-inside-avoid ${
            index % 2 === 0 ? "bg-gray-50" : "bg-white"
          }`}
        >
          <td className="border-b border-gray-100 px-2.5 py-2.5 align-middle text-[9px] font-semibold leading-[13px] text-gray-800 break-words">
            {safeText(
              item.service || item.category || "Travel Service"
            )}
          </td>

          <td className="border-b border-gray-100 px-2.5 py-2.5 align-middle text-[9px] leading-[13px] text-gray-700 break-words">
            {safeText(item.description)}
          </td>

          <td className="border-b border-gray-100 px-2.5 py-2.5 text-center align-middle text-[9px] font-medium leading-[13px] text-gray-700">
            {quantity}
          </td>

          <td className="border-b border-gray-100 px-2.5 py-2.5 text-right align-middle text-[9px] leading-[13px] text-gray-700 whitespace-nowrap">
            {formatAmount(rate)}
          </td>

          <td className="border-b border-gray-100 px-2.5 py-2.5 text-right align-middle text-[9px] font-bold leading-[13px] text-gray-900 whitespace-nowrap">
            {formatAmount(amount)}
          </td>
        </tr>
      );
    })}
  </tbody>
</table>


            </div>
          </section>

          {/* NOTES */}
          {invoice.notes && (
            <section className="invoice-section invoice-card mt-5 break-inside-avoid rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="m-0 text-[8px] font-bold uppercase tracking-[0.5px] text-gray-400">
                Notes
              </p>
              <p className="m-0 mt-1.5 whitespace-pre-line break-words text-[9px] leading-[14px] text-gray-600">
                {invoice.notes}
              </p>
            </section>
          )}

          {/* FOOTER */}
          <section className="invoice-section mt-6 break-inside-avoid">
            <div
              className="mt-6 border-t border-gray-200 pt-3"
              style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
            >
              <div className="flex w-full items-start justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[10px] font-bold text-gray-800">
                    Thank you for choosing Cult Holidays
                  </p>

                  <p className="mt-1 text-[8px] leading-[13px] text-gray-500">
                    We look forward to making your journey memorable.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, subtitle, onClose, children, footer, headerExtra }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm print:bg-white print:p-0">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl print:max-h-none print:max-w-none print:shadow-none">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5 print:hidden">
          <div>
            <h2 className="text-base font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {headerExtra}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3.5 print:hidden">
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

function TotalRow({ label, value, negative = false, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className={strong ? "font-bold text-gray-800" : "text-gray-500"}>
        {label}
      </span>
      <span
        className={`${strong ? "text-base" : "text-sm"} font-semibold ${
          negative ? "text-red-500" : "text-gray-700"
        }`}
      >
        {negative && Number(value) !== 0 ? "- " : ""}
        {formatAmount(Math.abs(Number(value || 0)))}
      </span>
    </div>
  );
}

function InvoiceMeta({ label, value }) {
  return (
    <div className="flex justify-between gap-8">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
}

function CardHeading({ icon, eyebrow, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-lg bg-brand-blue-50 text-brand-blue flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
          {eyebrow}
        </p>
        <p className="text-[12px] font-bold text-gray-900">{title}</p>
      </div>
    </div>
  );
}

function InvoiceInfo({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold text-gray-700 truncate">
        {value || "-"}
      </p>
    </div>
  );
}

function PolicyBox({ title, content }) {
  return (
    <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-[8px] font-bold uppercase tracking-wider text-gray-400">
        {title}
      </p>
      <p className="mt-1.5 text-[9px] leading-[14px] text-gray-600 whitespace-pre-line">
        {content}
      </p>
    </div>
  );
}

export default Invoice;