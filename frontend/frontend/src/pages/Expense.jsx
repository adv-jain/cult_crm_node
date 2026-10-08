import { useEffect, useMemo, useRef, useState } from "react";

import {
  FiActivity,
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiFilter,
  FiInfo,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import api from "../api";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   CONSTANTS
========================================================= */

const EXPENSE_CATEGORIES = [
  "Hotel",
  "Transport",
  "Flight",
  "Train",
  "Activity",
  "Supplier",
  "Visa",
  "Travel Insurance",
  "Food",
  "Guide",
  "Agent Commission",
  "Marketing",
  "Office",
  "Other",
];

const PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Net Banking",
  "Bank Transfer",
  "Cheque",
  "Wallet",
  "Other",
];

const STATUS_OPTIONS = [
  "Pending",
  "Approved",
  "Rejected",
  "Paid",
  "Cancelled",
];

const RECORDS_PER_PAGE = 50;

/* =========================================================
   HELPERS
========================================================= */

const extractList = (data, key = null) => {
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  if (key && Array.isArray(data?.data?.[key])) return data.data[key];
  if (Array.isArray(data?.expenses)) return data.expenses;
  if (Array.isArray(data?.data?.expenses)) return data.data.expenses;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const extractItem = (data, key = null) => {
  if (key && data?.[key]) return data[key];
  if (key && data?.data?.[key]) return data.data[key];
  return data?.expense || data?.data?.expense || data?.data || data;
};

const getExpenseAmount = (expense) => {
  const amount = Number(
    expense?.amount ?? expense?.expenseAmount ?? expense?.totalAmount ?? 0
  );
  return Number.isFinite(amount) ? amount : 0;
};

const getExpenseCurrency = (expense) => expense?.currency || "INR";

const getCustomerName = (expense) => {
  if (!expense?.customer) return "-";
  if (typeof expense.customer === "string") return expense.customer;
  return (
    expense.customer.name ||
    expense.customer.fullName ||
    `${expense.customer.firstName || ""} ${expense.customer.lastName || ""}`.trim() ||
    "-"
  );
};

const getBookingCode = (expense) => {
  if (!expense?.booking) return "-";
  if (typeof expense.booking === "string") return expense.booking;
  return (
    expense.booking.bookingNumber ||
    expense.booking.bookingCode ||
    expense.booking.referenceNumber ||
    expense.booking._id ||
    "-"
  );
};

const getSupplierName = (expense) => {
  if (!expense?.supplier) return "-";
  if (typeof expense.supplier === "string") return expense.supplier;
  return expense.supplier.name || expense.supplier.companyName || "-";
};

const getHotelName = (expense) => {
  if (!expense?.hotel) return "-";
  if (typeof expense.hotel === "string") return expense.hotel;
  return expense.hotel.name || expense.hotel.hotelName || "-";
};

const getTransportName = (expense) => {
  if (!expense?.transport) return "-";
  if (typeof expense.transport === "string") return expense.transport;
  return expense.transport.name || expense.transport.vehicleNumber || "-";
};

const getQuotationNumber = (expense) => {
  if (!expense?.quotation) return "-";
  if (typeof expense.quotation === "string") return expense.quotation;
  return (
    expense.quotation.quotationNumber ||
    expense.quotation.number ||
    expense.quotation._id ||
    "-"
  );
};

const getTripName = (expense) => {
  if (!expense?.trip) return "-";
  if (typeof expense.trip === "string") return expense.trip;
  return (
    expense.trip.tripCode ||
    expense.trip.tripNumber ||
    expense.trip.title ||
    expense.trip.name ||
    expense.trip._id ||
    "-"
  );
};

const formatCurrency = (amount, currency = "INR") => {
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
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusClasses = (status) => {
  switch (status) {
    case "Pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Approved":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Rejected":
      return "bg-red-50 text-red-700 border-red-200";
    case "Paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Cancelled":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Expense() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();

  const canCreate = ["admin", "manager", "operations", "accounts"].includes(role);
  const canEdit = ["admin", "manager", "operations", "accounts"].includes(role);
  const canApprove = ["admin", "manager", "accounts"].includes(role);
  const canDelete = ["admin", "manager", "accounts"].includes(role);

  const [expenses, setExpenses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [transports, setTransports] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [trips, setTrips] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [summary, setSummary] = useState({
    totalAmount: 0,
    totalPaidAmount: 0,
    pendingAmount: 0,
    approvedAmount: 0,
  });

  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const emptyForm = {
    title: "",
    description: "",
    category: "Hotel",
    subCategory: "",
    amount: "",
    currency: "INR",
    expenseDate: new Date().toISOString().split("T")[0],
    paymentMethod: "Bank Transfer",
    transactionId: "",
    receiptNumber: "",
    receiptUrl: "",
    supplier: "",
    hotel: "",
    transport: "",
    booking: "",
    quotation: "",
    trip: "",
    customer: "",
    isBillable: false,
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);

  /* =========================================================
     FETCH EXPENSES
  ========================================================= */

  const fetchExpenses = async (targetPage = page) => {
    try {
      setLoading(true);
      setError("");

      const params = { page: targetPage, limit: RECORDS_PER_PAGE };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (search.trim()) params.search = search.trim();

      const response = await api.get("/expenses", { params });
      const data = response.data;
      const list = extractList(data);

      setExpenses(list);

      const totalPages = Math.max(
        1,
        Number(data?.totalPages ?? data?.pagination?.pages ?? data?.pages ?? 1)
      );
      const currentPage = Number(
        data?.page ?? data?.pagination?.page ?? targetPage
      );

      setPage(currentPage);
      setPagination({
        total: Number(data?.total ?? data?.pagination?.total ?? list.length),
        pages: totalPages,
        page: currentPage,
      });

      const s = data?.summary || data?.data?.summary || {};
      setSummary({
        totalAmount: Number(s.totalAmount ?? data?.totalAmount ?? 0),
        totalPaidAmount: Number(s.totalPaidAmount ?? 0),
        pendingAmount: Number(s.pendingAmount ?? 0),
        approvedAmount: Number(s.approvedAmount ?? 0),
      });
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message || "Failed to load expenses."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     FETCH REFERENCE DATA
  ========================================================= */

  const fetchReferenceData = async () => {
    const results = await Promise.allSettled([
      api.get("/bookings", { params: { limit: 100 } }),
      api.get("/suppliers", { params: { limit: 100 } }),
      api.get("/hotels", { params: { limit: 100 } }),
      api.get("/transports", { params: { limit: 100 } }),
      api.get("/quotations", { params: { limit: 100 } }),
      api.get("/trips", { params: { limit: 100 } }),
      api.get("/customers", { params: { limit: 100 } }),
    ]);

    const [
      bookingResult,
      supplierResult,
      hotelResult,
      transportResult,
      quotationResult,
      tripResult,
      customerResult,
    ] = results;

    if (bookingResult.status === "fulfilled")
      setBookings(extractList(bookingResult.value.data, "bookings"));
    if (supplierResult.status === "fulfilled")
      setSuppliers(extractList(supplierResult.value.data, "suppliers"));
    if (hotelResult.status === "fulfilled")
      setHotels(extractList(hotelResult.value.data, "hotels"));
    if (transportResult.status === "fulfilled")
      setTransports(extractList(transportResult.value.data, "transports"));
    if (quotationResult.status === "fulfilled")
      setQuotations(extractList(quotationResult.value.data, "quotations"));
    if (tripResult.status === "fulfilled")
      setTrips(extractList(tripResult.value.data, "trips"));
    if (customerResult.status === "fulfilled")
      setCustomers(extractList(customerResult.value.data, "customers"));
  };

  /* =========================================================
     EFFECTS
  ========================================================= */

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchExpenses(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, categoryFilter, search]);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    if (!success && !error) return;
    const timer = setTimeout(() => {
      setSuccess("");
      setError("");
    }, 4000);
    return () => clearTimeout(timer);
  }, [success, error]);

  useEffect(() => {
    const handler = (event) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target)
      ) {
        setShowFilters(false);
      }
    };
    if (showFilters) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilters]);

  /* =========================================================
     MEMOS
  ========================================================= */

  const filteredExpenses = useMemo(() => {
    if (!search.trim()) return expenses;
    const term = search.toLowerCase();
    return expenses.filter(
      (expense) =>
        expense.title?.toLowerCase().includes(term) ||
        expense.expenseNumber?.toLowerCase().includes(term) ||
        expense.category?.toLowerCase().includes(term) ||
        getCustomerName(expense).toLowerCase().includes(term) ||
        getBookingCode(expense).toLowerCase().includes(term) ||
        getSupplierName(expense).toLowerCase().includes(term)
    );
  }, [expenses, search]);

  const activeFilterCount = [search, statusFilter, categoryFilter].filter(Boolean).length;
  const dropdownFilterCount = [statusFilter, categoryFilter].filter(Boolean).length;

  /* =========================================================
     FORM
  ========================================================= */

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openCreateModal = () => {
    setEditingExpense(null);
    setForm({ ...emptyForm });
    setError("");
    setShowFormModal(true);
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setForm({
      title: expense.title || "",
      description: expense.description || "",
      category: expense.category || "Hotel",
      subCategory: expense.subCategory || "",
      amount: expense.amount ?? "",
      currency: expense.currency || "INR",
      expenseDate: expense.expenseDate
        ? new Date(expense.expenseDate).toISOString().split("T")[0]
        : "",
      paymentMethod: expense.paymentMethod || "Bank Transfer",
      transactionId: expense.transactionId || "",
      receiptNumber: expense.receiptNumber || "",
      receiptUrl: expense.receiptUrl || "",
      supplier:
        typeof expense.supplier === "object"
          ? expense.supplier?._id || ""
          : expense.supplier || "",
      hotel:
        typeof expense.hotel === "object"
          ? expense.hotel?._id || ""
          : expense.hotel || "",
      transport:
        typeof expense.transport === "object"
          ? expense.transport?._id || ""
          : expense.transport || "",
      booking:
        typeof expense.booking === "object"
          ? expense.booking?._id || ""
          : expense.booking || "",
      quotation:
        typeof expense.quotation === "object"
          ? expense.quotation?._id || ""
          : expense.quotation || "",
      trip:
        typeof expense.trip === "object"
          ? expense.trip?._id || ""
          : expense.trip || "",
      customer:
        typeof expense.customer === "object"
          ? expense.customer?._id || ""
          : expense.customer || "",
      isBillable: Boolean(expense.isBillable),
      notes: expense.notes || "",
    });
    setError("");
    setShowFormModal(true);
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) return setError("Expense title is required.");
    if (!form.category) return setError("Expense category is required.");
    if (!form.amount || Number(form.amount) <= 0)
      return setError("Expense amount must be greater than 0.");

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        subCategory: form.subCategory.trim() || undefined,
        amount: Number(form.amount),
        currency: form.currency || "INR",
        expenseDate: form.expenseDate || undefined,
        paymentMethod: form.paymentMethod,
        transactionId: form.transactionId.trim() || undefined,
        receiptNumber: form.receiptNumber.trim() || undefined,
        receiptUrl: form.receiptUrl.trim() || undefined,
        supplier: form.supplier || null,
        hotel: form.hotel || null,
        transport: form.transport || null,
        booking: form.booking || null,
        quotation: form.quotation || null,
        trip: form.trip || null,
        customer: form.customer || null,
        isBillable: Boolean(form.isBillable),
        notes: form.notes.trim() || undefined,
      };

      if (editingExpense) {
        await api.put(`/expenses/${editingExpense._id}`, payload);
        setSuccess("Expense updated successfully.");
      } else {
        await api.post("/expenses", payload);
        setSuccess("Expense created successfully.");
      }

      setShowFormModal(false);
      setEditingExpense(null);
      setForm({ ...emptyForm });
      await fetchExpenses(page);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message || "Failed to save expense."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     VIEW
  ========================================================= */

  const handleView = async (expense) => {
    try {
      setError("");
      const response = await api.get(`/expenses/${expense._id}`);
      const item = extractItem(response.data, "expense");
      setSelectedExpense(item);
      setShowViewModal(true);
    } catch (err) {
      console.error(err);
      setSelectedExpense(expense);
      setShowViewModal(true);
    }
  };

  /* =========================================================
     APPROVE / REJECT / PAY / CANCEL (called from View modal)
  ========================================================= */

  const handleApprove = async (expense) => {
    if (!window.confirm("Approve this expense?")) return;
    try {
      setError("");
      await api.put(`/expenses/${expense._id}/approve`);
      setSuccess("Expense approved successfully.");
      await fetchExpenses(page);
      setShowViewModal(false);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to approve expense."
      );
    }
  };

  const handleReject = async (expense) => {
    const reason = window.prompt("Enter rejection reason:");
    if (reason === null) return;
    try {
      setError("");
      await api.put(`/expenses/${expense._id}/reject`, { reason: reason.trim() });
      setSuccess("Expense rejected successfully.");
      await fetchExpenses(page);
      setShowViewModal(false);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to reject expense."
      );
    }
  };

  const handleMarkPaid = async (expense) => {
    if (!window.confirm("Mark this expense as paid?")) return;
    try {
      setError("");
      await api.put(`/expenses/${expense._id}/pay`, {
        paymentMethod: expense.paymentMethod || "Bank Transfer",
        transactionId: expense.transactionId || undefined,
      });
      setSuccess("Expense marked as paid.");
      await fetchExpenses(page);
      setShowViewModal(false);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to mark expense as paid."
      );
    }
  };

  const handleCancel = async (expense) => {
    const reason = window.prompt("Enter cancellation reason:");
    if (reason === null) return;
    try {
      setError("");
      await api.put(`/expenses/${expense._id}/cancel`, { reason: reason.trim() });
      setSuccess("Expense cancelled successfully.");
      await fetchExpenses(page);
      setShowViewModal(false);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to cancel expense."
      );
    }
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const handleDelete = async () => {
    if (!selectedExpense?._id) return;
    try {
      setSaving(true);
      setError("");
      await api.delete(`/expenses/${selectedExpense._id}`);
      setSuccess("Expense deleted successfully.");
      setShowDeleteModal(false);
      setSelectedExpense(null);
      await fetchExpenses(page);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to delete expense."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setCategoryFilter("");
    setPage(1);
    setShowFilters(false);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          {/* SEARCH */}
          <div className="relative w-full sm:w-64">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={15}
            />
            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 h-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
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
              onClick={() => setShowFilters((prev) => !prev)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border transition ${
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
                className={showFilters ? "rotate-180" : ""}
              />
            </button>

            {showFilters && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-40 overflow-hidden">
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
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border ${
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
                      Category
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-700"
                    >
                      <option value="">All categories</option>
                      {EXPENSE_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5 flex items-start gap-2">
                    <FiInfo className="mt-0.5 text-gray-400" size={13} />
                    <p className="text-[10px] leading-4 text-gray-500">
                      Search supports title, number, booking, supplier and customer.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    disabled={dropdownFilterCount === 0}
                    className="text-xs font-medium text-gray-600 disabled:opacity-40"
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

          {/* REFRESH */}
          <button
            type="button"
            onClick={() => fetchExpenses(page)}
            className="inline-flex items-center justify-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          >
            <FiRefreshCw size={14} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* NEW EXPENSE */}
        {canCreate && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg shadow-brand"
          >
            <FiPlus size={15} />
            New Expense
          </button>
        )}
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard
          title="Total Expenses"
          value={formatCurrency(summary.totalAmount)}
          subtitle="All recorded expenses"
          icon={<FiDollarSign size={16} />}
          iconClass="bg-gray-100 text-gray-700"
        />
        <SummaryCard
          title="Paid"
          value={formatCurrency(summary.totalPaidAmount)}
          subtitle="Actual paid cost"
          icon={<FiCheck size={16} />}
          iconClass="bg-emerald-50 text-emerald-600"
          valueClass="text-emerald-700"
        />
        <SummaryCard
          title="Pending"
          value={formatCurrency(summary.pendingAmount)}
          subtitle="Awaiting approval"
          icon={<FiClock size={16} />}
          iconClass="bg-amber-50 text-amber-600"
          valueClass="text-amber-700"
        />
        <SummaryCard
          title="Approved"
          value={formatCurrency(summary.approvedAmount)}
          subtitle="Ready for payment"
          icon={<FiActivity size={16} />}
          iconClass="bg-blue-50 text-blue-600"
          valueClass="text-blue-700"
        />
      </div>

      {/* ALERTS */}
      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess("")} />
      )}
      {error && (
        <Alert type="error" message={error} onClose={() => setError("")} />
      )}

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-[3px] border-gray-200 border-t-brand-blue rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading expenses...</p>
            </div>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <EmptyState
            canCreate={canCreate}
            hasFilters={activeFilterCount > 0}
            onCreate={openCreateModal}
            onClear={handleClearFilters}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1150px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  {[
                    "Expense",
                    "Category",
                    "Booking",
                    "Supplier",
                    "Date",
                    "Amount",
                    "Status",
                    ...(canDelete ? ["Actions"] : []),
                  ].map((heading) => (
                    <th
                      key={heading}
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
                {filteredExpenses.map((expense) => (
                  <tr
                    key={expense._id}
                    onClick={() => handleView(expense)}
                    className="hover:bg-brand-blue-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-blue-50 text-brand-blue flex items-center justify-center shrink-0 group-hover:bg-brand-blue-100 transition">
                          <FiDollarSign size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate max-w-[180px]">
                            {expense.title || "-"}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">
                            {expense.expenseNumber || "No number"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-lg bg-gray-100 text-gray-700 px-2.5 py-1 text-[11px] font-semibold">
                        {expense.category || "-"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-700 text-xs">
                      {getBookingCode(expense)}
                    </td>

                    <td className="px-5 py-4 text-gray-700 text-xs">
                      {getSupplierName(expense)}
                    </td>

                    <td className="px-5 py-4 text-gray-700 text-xs whitespace-nowrap">
                      {formatDate(expense.expenseDate)}
                    </td>

                    <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">
                      {formatCurrency(
                        getExpenseAmount(expense),
                        getExpenseCurrency(expense)
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={expense.status} />
                    </td>

                    {canDelete && (
                      <td
                        className="px-5 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end">
                          {expense.status !== "Paid" && (
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => {
                                setSelectedExpense(expense);
                                setShowDeleteModal(true);
                              }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 bg-transparent hover:text-red-600 hover:bg-red-50 transition"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {!loading && pagination.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-500">
              Page <span className="font-medium text-gray-700">{page}</span> of{" "}
              <span className="font-medium text-gray-700">{pagination.pages}</span>
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => page > 1 && setPage((p) => p - 1)}
                disabled={page <= 1}
                className="w-8 h-8 inline-flex items-center justify-center border border-gray-200 rounded-lg disabled:opacity-40"
              >
                <FiChevronLeft size={16} />
              </button>
              <span className="px-3 h-8 inline-flex items-center text-sm font-medium text-gray-700">
                {page} / {pagination.pages}
              </span>
              <button
                type="button"
                onClick={() => page < pagination.pages && setPage((p) => p + 1)}
                disabled={page >= pagination.pages}
                className="w-8 h-8 inline-flex items-center justify-center border border-gray-200 rounded-lg disabled:opacity-40"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FORM MODAL */}
      {showFormModal && (
        <ExpenseFormModal
          form={form}
          saving={saving}
          editingExpense={editingExpense}
          error={error}
          bookings={bookings}
          suppliers={suppliers}
          hotels={hotels}
          transports={transports}
          quotations={quotations}
          trips={trips}
          customers={customers}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={() => !saving && setShowFormModal(false)}
        />
      )}

      {/* VIEW MODAL */}
      {showViewModal && selectedExpense && (
        <ExpenseViewModal
          expense={selectedExpense}
          canEdit={canEdit}
          canApprove={canApprove}
          onClose={() => setShowViewModal(false)}
          onEdit={(item) => {
            setShowViewModal(false);
            openEditModal(item);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
          onMarkPaid={handleMarkPaid}
          onCancel={handleCancel}
        />
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && selectedExpense && (
        <DeleteModal
          expense={selectedExpense}
          saving={saving}
          onClose={() => !saving && setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({ title, value, subtitle, icon, iconClass, valueClass = "text-gray-900" }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className={`mt-1.5 text-lg font-bold truncate ${valueClass}`}>{value}</p>
          <p className="mt-1 text-[11px] text-gray-400">{subtitle}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ALERT
========================================================= */

function Alert({ type, message, onClose }) {
  const success = type === "success";
  return (
    <div
      className={`flex items-start gap-3 ${
        success
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-red-50 border-red-200 text-red-800"
      } border text-sm px-4 py-3 rounded-lg`}
    >
      {success ? (
        <FiCheckCircle className="mt-0.5" size={18} />
      ) : (
        <FiAlertCircle className="mt-0.5" size={18} />
      )}
      <p className="flex-1">{message}</p>
      <button type="button" onClick={onClose}>
        <FiX size={16} />
      </button>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({ canCreate, hasFilters, onCreate, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
        <FiDollarSign size={24} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-gray-800">
        No expenses found
      </h3>
      <p className="mt-1 text-sm text-gray-500 max-w-sm">
        {hasFilters
          ? "No expenses match your current filters."
          : "Create your first expense record to get started."}
      </p>
      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
        >
          Clear Filters
        </button>
      ) : (
        canCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg"
          >
            <FiPlus size={15} />
            Add Expense
          </button>
        )
      )}
    </div>
  );
}

/* =========================================================
   STATUS
========================================================= */

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
        status
      )}`}
    >
      {status || "Pending"}
    </span>
  );
}

/* =========================================================
   FORM MODAL (unchanged — same as before)
========================================================= */

function ExpenseFormModal({
  form,
  saving,
  editingExpense,
  error,
  bookings,
  suppliers,
  hotels,
  transports,
  quotations,
  trips,
  customers,
  onChange,
  onSubmit,
  onClose,
}) {
  return (
    <ModalShell
      title={editingExpense ? "Edit Expense" : "Create Expense"}
      subtitle={
        editingExpense ? "Update expense details" : "Add a new agency expense"
      }
      onClose={onClose}
      disabled={saving}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-200 bg-white px-4 h-9 text-sm font-medium text-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="expense-form"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 h-9 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? (
              <>
                <FiRefreshCw className="animate-spin" size={15} />
                Saving...
              </>
            ) : (
              <>
                <FiCheck size={15} />
                {editingExpense ? "Update Expense" : "Create Expense"}
              </>
            )}
          </button>
        </>
      }
    >
      <form id="expense-form" onSubmit={onSubmit} className="p-6 space-y-6">
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">
            <FiAlertCircle className="mt-0.5" size={18} />
            <p>{error}</p>
          </div>
        )}

        {/* BASIC */}
        <section>
          <SectionTitle icon={<FiFileText size={14} />} title="Expense Information" />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Expense Title *">
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  placeholder="e.g. Manali Hotel Advance"
                  className="input"
                  required
                />
              </Field>
            </div>

            <Field label="Category *">
              <select name="category" value={form.category} onChange={onChange} className="input">
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </Field>

            <Field label="Sub Category">
              <input
                name="subCategory"
                value={form.subCategory}
                onChange={onChange}
                placeholder="e.g. 4 Star Hotel"
                className="input"
              />
            </Field>

            <Field label="Amount *">
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={onChange}
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="input"
                required
              />
            </Field>

            <Field label="Currency">
              <select name="currency" value={form.currency} onChange={onChange} className="input">
                <option value="INR">INR - ₹</option>
                <option value="USD">USD - $</option>
                <option value="EUR">EUR - €</option>
              </select>
            </Field>

            <Field label="Expense Date">
              <input
                type="date"
                name="expenseDate"
                value={form.expenseDate}
                onChange={onChange}
                className="input"
              />
            </Field>

            <Field label="Payment Method">
              <select name="paymentMethod" value={form.paymentMethod} onChange={onChange} className="input">
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </Field>

            <Field label="Transaction ID">
              <input
                name="transactionId"
                value={form.transactionId}
                onChange={onChange}
                placeholder="Optional"
                className="input"
              />
            </Field>

            <Field label="Receipt Number">
              <input
                name="receiptNumber"
                value={form.receiptNumber}
                onChange={onChange}
                placeholder="Optional"
                className="input"
              />
            </Field>
          </div>
        </section>

        {/* ASSOCIATIONS */}
        <section>
          <SectionTitle icon={<FiActivity size={14} />} title="Associations" />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Booking">
              <select name="booking" value={form.booking} onChange={onChange} className="input">
                <option value="">Select Booking</option>
                {bookings.map((booking) => (
                  <option key={booking._id} value={booking._id}>
                    {booking.bookingNumber || booking.bookingCode || booking._id}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Supplier">
              <select name="supplier" value={form.supplier} onChange={onChange} className="input">
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name || supplier.companyName || supplier._id}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Hotel">
              <select name="hotel" value={form.hotel} onChange={onChange} className="input">
                <option value="">Select Hotel</option>
                {hotels.map((hotel) => (
                  <option key={hotel._id} value={hotel._id}>
                    {hotel.name || hotel.hotelName || hotel._id}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Transport">
              <select name="transport" value={form.transport} onChange={onChange} className="input">
                <option value="">Select Transport</option>
                {transports.map((transport) => (
                  <option key={transport._id} value={transport._id}>
                    {transport.name || transport.vehicleNumber || transport._id}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Quotation">
              <select name="quotation" value={form.quotation} onChange={onChange} className="input">
                <option value="">Select Quotation</option>
                {quotations.map((quotation) => (
                  <option key={quotation._id} value={quotation._id}>
                    {quotation.quotationNumber || quotation.title || quotation._id}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Trip">
              <select name="trip" value={form.trip} onChange={onChange} className="input">
                <option value="">Select Trip</option>
                {trips.map((trip) => (
                  <option key={trip._id} value={trip._id}>
                    {trip.tripCode || trip.title || trip.name || trip._id}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Customer">
              <select name="customer" value={form.customer} onChange={onChange} className="input">
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name ||
                      customer.fullName ||
                      `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
                      customer._id}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* DETAILS */}
        <section>
          <SectionTitle icon={<FiFileText size={14} />} title="Additional Details" />
          <div className="mt-4 space-y-4">
            <Field label="Description">
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                rows="3"
                placeholder="Describe the expense..."
                className="input resize-none"
              />
            </Field>

            <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                name="isBillable"
                checked={form.isBillable}
                onChange={onChange}
                className="w-4 h-4"
              />
              Billable to customer
            </label>

            <Field label="Notes">
              <textarea
                name="notes"
                value={form.notes}
                onChange={onChange}
                rows="3"
                placeholder="Additional notes..."
                className="input resize-none"
              />
            </Field>
          </div>
        </section>
      </form>
    </ModalShell>
  );
}

/* =========================================================
   VIEW MODAL (with action buttons in footer)
========================================================= */

function ExpenseViewModal({
  expense,
  canEdit,
  canApprove,
  onClose,
  onEdit,
  onApprove,
  onReject,
  onMarkPaid,
  onCancel,
}) {
  const locked = ["Paid", "Cancelled"].includes(expense.status);
  const isPending = expense.status === "Pending";
  const isApproved = expense.status === "Approved";

  return (
    <ModalShell
      title="Expense Details"
      subtitle={expense.expenseNumber || "Expense"}
      onClose={onClose}
      footer={
        <>
          {canEdit && !locked && (
            <button
              type="button"
              onClick={() => onEdit(expense)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 h-9 text-sm font-medium text-gray-600"
            >
              <FiFileText size={14} />
              Edit
            </button>
          )}

          {canApprove && isPending && (
            <>
              <button
                type="button"
                onClick={() => onReject(expense)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 h-9 text-sm font-medium text-red-600"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => onApprove(expense)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 h-9 text-sm font-medium text-white"
              >
                <FiCheck size={14} />
                Approve
              </button>
            </>
          )}

          {canApprove && isApproved && (
            <button
              type="button"
              onClick={() => onMarkPaid(expense)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-4 h-9 text-sm font-medium text-white"
            >
              <FiDollarSign size={14} />
              Mark as Paid
            </button>
          )}

          {canApprove && (isPending || isApproved) && (
            <button
              type="button"
              onClick={() => onCancel(expense)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 h-9 text-sm font-medium text-gray-600"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 h-9 text-sm font-medium text-gray-600"
          >
            Close
          </button>
        </>
      }
    >
      <div className="p-6 space-y-6">
        {/* AMOUNT */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-gray-200">
          <div>
            <p className="text-xs font-medium text-gray-500">Expense Amount</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(getExpenseAmount(expense), getExpenseCurrency(expense))}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">{expense.title || "-"}</p>
          </div>
          <StatusBadge status={expense.status} />
        </div>

        {/* INFO */}
        <section>
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
            Expense Information
          </h3>
          <div className="space-y-2.5">
            <DetailLine label="Expense Number" value={expense.expenseNumber} />
            <DetailLine label="Category" value={expense.category} />
            <DetailLine label="Sub Category" value={expense.subCategory} />
            <DetailLine label="Date" value={formatDate(expense.expenseDate)} />
            <DetailLine label="Payment Method" value={expense.paymentMethod} />
            <DetailLine label="Transaction ID" value={expense.transactionId} />
            <DetailLine label="Receipt Number" value={expense.receiptNumber} />
          </div>
        </section>

        {/* ASSOCIATIONS */}
        <section>
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
            Associations
          </h3>
          <div className="space-y-2.5">
            <DetailLine label="Booking" value={getBookingCode(expense)} />
            <DetailLine label="Supplier" value={getSupplierName(expense)} />
            <DetailLine label="Hotel" value={getHotelName(expense)} />
            <DetailLine label="Transport" value={getTransportName(expense)} />
            <DetailLine label="Quotation" value={getQuotationNumber(expense)} />
            <DetailLine label="Trip" value={getTripName(expense)} />
            <DetailLine label="Customer" value={getCustomerName(expense)} />
          </div>
        </section>

        {/* DESCRIPTION */}
        {expense.description && (
          <section>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
              Description
            </h3>
            <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">
              {expense.description}
            </p>
          </section>
        )}

        {/* NOTES */}
        {expense.notes && (
          <section>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
              Notes
            </h3>
            <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">
              {expense.notes}
            </p>
          </section>
        )}

        {/* BILLABLE */}
        <div
          className={`rounded-lg px-4 py-3 text-sm font-semibold border ${
            expense.isBillable
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-gray-50 text-gray-600 border-gray-200"
          }`}
        >
          {expense.isBillable ? "✓ Billable to customer" : "Not billable to customer"}
        </div>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   DELETE MODAL
========================================================= */

function DeleteModal({ expense, saving, onClose, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200">
        <div className="p-6">
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
            <FiTrash2 size={20} />
          </div>
          <h3 className="text-base font-bold text-gray-900">Delete Expense?</h3>
          <p className="mt-2 text-sm text-gray-600 leading-6">
            Are you sure you want to delete{" "}
            <strong className="text-gray-800">{expense.title}</strong>?
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-200 bg-white px-4 h-9 text-sm font-medium text-gray-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 h-9 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? (
                <>
                  <FiRefreshCw className="animate-spin" size={14} />
                  Deleting...
                </>
              ) : (
                <>
                  <FiTrash2 size={14} />
                  Delete Expense
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MODAL SHELL
========================================================= */

function ModalShell({ title, subtitle, onClose, children, footer, disabled }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !disabled) onClose();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
          <div>
            <h2 className="text-base font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
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

/* =========================================================
   SECTION TITLE
========================================================= */

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

/* =========================================================
   FIELD
========================================================= */

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

/* =========================================================
   DETAIL
========================================================= */

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