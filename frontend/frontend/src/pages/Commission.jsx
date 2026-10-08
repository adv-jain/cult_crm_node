import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiDollarSign,
  FiFilter,
  FiInfo,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUser,
  FiX,
  FiXCircle,
} from "react-icons/fi";

import api from "../api";
import { useAuth } from "../context/AuthContext";

/* ============================================================================
   CONSTANTS
============================================================================ */

const COMMISSION_STATUSES = ["Pending", "Approved", "Payable", "Paid", "Cancelled"];
const COMMISSION_TYPES = ["Percentage", "Fixed"];
const CREATE_ROLES = ["admin", "manager", "accounts"];
const RECORDS_PER_PAGE = 50;

/* ============================================================================
   HELPERS
============================================================================ */

const extractList = (data, key = null) => {
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  if (key && Array.isArray(data?.data?.[key])) return data.data[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
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
    day: "2-digit", month: "short", year: "numeric",
  });
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.error || fallback;

const getId = (item) => item?._id || item?.id || "";

const getName = (user) => {
  if (!user) return "Unknown";
  return user.name || user.fullName || user.username || user.email || "Unknown";
};

const getCustomerName = (customer) => {
  if (!customer) return "Unknown";
  return (
    customer.name ||
    customer.fullName ||
    `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
    customer.email ||
    "Unknown"
  );
};

const getBookingLabel = (booking) => {
  if (!booking) return "Unknown Booking";
  return (
    booking.bookingNumber ||
    booking.bookingCode ||
    booking.referenceNumber ||
    booking._id ||
    "Booking"
  );
};

const getTripName = (trip) => {
  if (!trip) return "No Trip";
  return trip.tripTitle || trip.title || trip.name || trip.destination || "Trip";
};

const getStatusClasses = (status) => {
  switch (status) {
    case "Pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Approved":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Payable":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "Paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Cancelled":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "Pending": return FiClock;
    case "Approved": return FiCheckCircle;
    case "Payable": return FiDollarSign;
    case "Paid": return FiCheck;
    case "Cancelled": return FiXCircle;
    default: return FiClock;
  }
};

/* ============================================================================
   MAIN COMPONENT
============================================================================ */

export default function Commission() {
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase?.() || "";
  const canCreate = CREATE_ROLES.includes(userRole);

  const [commissions, setCommissions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [salesPeople, setSalesPeople] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(RECORDS_PER_PAGE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [summary, setSummary] = useState({
    totalCommissionAmount: 0,
    paidCommissionAmount: 0,
    payableCommissionAmount: 0,
    pendingCommissionAmount: 0,
    approvedCommissionAmount: 0,
  });

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [editingCommission, setEditingCommission] = useState(null);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const emptyForm = {
    booking: "", trip: "", customer: "", salesPerson: "",
    commissionType: "Percentage",
    baseAmount: "", percentage: "", commissionAmount: "",
    currency: "INR", notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  /* =========================================================
     FETCHERS
  ========================================================= */

  const fetchCommissions = async (targetPage = page) => {
    try {
      setLoading(true);
      const params = { page: targetPage, limit };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.commissionType = typeFilter;

      const { data } = await api.get("/commissions", { params });

      setCommissions(extractList(data, "commissions"));
      setTotal(Number(data?.total || 0));
      setTotalPages(Math.max(1, Number(data?.totalPages || 1)));
      setSummary({
        totalCommissionAmount: Number(data?.totalCommissionAmount || 0),
        paidCommissionAmount: Number(data?.paidCommissionAmount || 0),
        payableCommissionAmount: Number(data?.payableCommissionAmount || 0),
        pendingCommissionAmount: Number(data?.pendingCommissionAmount || 0),
        approvedCommissionAmount: Number(data?.approvedCommissionAmount || 0),
      });
    } catch (error) {
      console.error("Fetch commissions error:", error);
      alert(getErrorMessage(error, "Failed to fetch commissions"));
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [bookingsResponse, usersResponse] = await Promise.all([
        api.get("/bookings", { params: { limit: 100 } }),
        api.get("/users", { params: { limit: 100 } }),
      ]);

      setBookings(extractList(bookingsResponse.data, "bookings"));
      setSalesPeople(
        extractList(usersResponse.data, "users").filter((item) =>
          ["admin", "manager", "sales"].includes(String(item?.role || "").toLowerCase())
        )
      );
    } catch (error) {
      console.error("Reference data error:", error);
    }
  };

  /* =========================================================
     EFFECTS
  ========================================================= */

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchCommissions(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };
    if (showFilters) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilters]);

  /* =========================================================
     MEMOS
  ========================================================= */

  const selectedBooking = useMemo(
    () => bookings.find((item) => String(getId(item)) === String(form.booking)),
    [bookings, form.booking]
  );

  const activeFilterCount = useMemo(
    () => [search, statusFilter, typeFilter].filter(Boolean).length,
    [search, statusFilter, typeFilter]
  );

  const dropdownFilterCount = useMemo(
    () => [statusFilter, typeFilter].filter(Boolean).length,
    [statusFilter, typeFilter]
  );

  const formExpectedAmount = useMemo(() => {
    if (form.commissionType !== "Percentage") return null;
    const base = Number(form.baseAmount) || 0;
    const percentage = Number(form.percentage) || 0;
    return Math.round(((base * percentage) / 100) * 100) / 100;
  }, [form.baseAmount, form.percentage, form.commissionType]);

  /* =========================================================
     FORM HANDLERS
  ========================================================= */

  const handleBookingChange = (bookingId) => {
    const booking = bookings.find((item) => String(getId(item)) === String(bookingId));
    setForm((prev) => ({
      ...prev,
      booking: bookingId,
      trip: getId(booking?.trip) || "",
      customer: getId(booking?.customer) || "",
      salesPerson: getId(booking?.salesOwner) || getId(booking?.assignedTo) || "",
      baseAmount: booking?.totalAmount || booking?.total || "",
    }));
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "baseAmount" || field === "percentage") {
        if (next.commissionType === "Percentage") {
          const base = Number(next.baseAmount) || 0;
          const percentage = Number(next.percentage) || 0;
          const amount = Math.round(((base * percentage) / 100) * 100) / 100;
          next.commissionAmount = amount ? amount.toFixed(2) : "";
        }
      }

      if (field === "commissionType" && value === "Fixed") {
        next.percentage = "";
      }

      return next;
    });
  };

  const openCreate = () => {
    setEditingCommission(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (commission) => {
    setEditingCommission(commission);
    setForm({
      booking: getId(commission.booking),
      trip: getId(commission.trip),
      customer: getId(commission.customer),
      salesPerson: getId(commission.salesPerson),
      commissionType: commission.commissionType || "Percentage",
      baseAmount: commission.baseAmount ?? "",
      percentage: commission.percentage ?? "",
      commissionAmount: commission.commissionAmount ?? "",
      currency: commission.currency || "INR",
      notes: commission.notes || "",
    });
    setShowForm(true);
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.booking) return alert("Please select a booking");
    if (!form.salesPerson) return alert("Please select a sales person");
    if (!form.commissionAmount || Number(form.commissionAmount) <= 0)
      return alert("Commission amount must be greater than 0");

    try {
      setActionLoading(true);
      const payload = {
        booking: form.booking,
        trip: form.trip || null,
        customer: form.customer || null,
        salesPerson: form.salesPerson,
        commissionType: form.commissionType,
        baseAmount: Number(form.baseAmount || 0),
        percentage:
          form.commissionType === "Percentage" ? Number(form.percentage || 0) : 0,
        commissionAmount: Number(form.commissionAmount),
        currency: form.currency || "INR",
        notes: form.notes || "",
      };

      if (editingCommission) {
        await api.put(`/commissions/${getId(editingCommission)}`, payload);
      } else {
        await api.post("/commissions", payload);
      }

      setShowForm(false);
      setEditingCommission(null);
      setForm(emptyForm);
      await fetchCommissions(page);
    } catch (error) {
      console.error("Save commission error:", error);
      alert(getErrorMessage(error, "Failed to save commission"));
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================================
     ACTIONS
  ========================================================= */

  const executeAction = async (action, commission) => {
    const id = getId(commission);
    if (!id) return;
    try {
      setActionLoading(true);
      if (action === "approve") await api.put(`/commissions/${id}/approve`);
      if (action === "payable") await api.put(`/commissions/${id}/payable`);
      if (action === "paid")
        await api.put(`/commissions/${id}/pay`, {
          paymentDate: new Date().toISOString(),
          paymentReference:
            commission.paymentReference || `COMM-PAY-${Date.now()}`,
        });
      if (action === "cancel") await api.put(`/commissions/${id}/cancel`);
      if (action === "delete") await api.delete(`/commissions/${id}`);

      setConfirmAction(null);
      await fetchCommissions(page);

      // If the action was performed from the View modal, refresh selection
      if (selectedCommission && getId(selectedCommission) === id && action !== "delete") {
        const { data } = await api.get(`/commissions/${id}`);
        const fresh = data?.commission || data?.data || data;
        if (fresh) setSelectedCommission(fresh);
      }
      if (action === "delete" && selectedCommission && getId(selectedCommission) === id) {
        setShowView(false);
        setSelectedCommission(null);
      }
    } catch (error) {
      console.error(`${action} commission error:`, error);
      alert(getErrorMessage(error, `Failed to ${action} commission`));
    } finally {
      setActionLoading(false);
    }
  };

  const askAction = (action, commission) => {
    const labels = {
      approve: { title: "Approve Commission?", message: "Move from Pending to Approved.", confirm: "Approve" },
      payable: { title: "Mark Payable?", message: "Move from Approved to Payable.", confirm: "Mark Payable" },
      paid: { title: "Mark Paid?", message: "Record commission as paid.", confirm: "Mark Paid" },
      cancel: { title: "Cancel Commission?", message: "This cannot be undone.", confirm: "Cancel Commission" },
      delete: { title: "Delete Commission?", message: "This permanently removes the record.", confirm: "Delete" },
    };
    setConfirmAction({ action, commission, ...labels[action] });
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setTypeFilter("");
    setPage(1);
    setShowFilters(false);
  };

  const openView = (commission) => {
    setSelectedCommission(commission);
    setShowView(true);
  };

  /* =========================================================
     RENDER
  ========================================================= */

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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search commissions..."
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
                      {COMMISSION_STATUSES.map((item) => (
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
                      Type
                    </label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-700 outline-none focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10"
                    >
                      <option value="">All types</option>
                      {COMMISSION_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5 flex items-start gap-2">
                    <FiInfo className="mt-0.5 text-gray-400 flex-shrink-0" size={13} />
                    <p className="text-[10px] leading-4 text-gray-500">
                      Search supports commission number, booking, salesperson & reference.
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
            onClick={() => fetchCommissions(page)}
            className="inline-flex items-center justify-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap"
          >
            <FiRefreshCw size={14} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap self-start lg:self-auto"
          >
            <FiPlus size={15} />
            New Commission
          </button>
        )}
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <SummaryCard
          title="Total"
          value={formatCurrency(summary.totalCommissionAmount)}
          subtitle="All commissions"
          icon={<FiDollarSign size={16} />}
          iconClass="bg-gray-100 text-gray-700"
        />
        <SummaryCard
          title="Pending"
          value={formatCurrency(summary.pendingCommissionAmount)}
          subtitle="Awaiting approval"
          icon={<FiClock size={16} />}
          iconClass="bg-amber-50 text-amber-600"
          valueClass="text-amber-700"
        />
        <SummaryCard
          title="Approved"
          value={formatCurrency(summary.approvedCommissionAmount)}
          subtitle="Approved"
          icon={<FiCheckCircle size={16} />}
          iconClass="bg-blue-50 text-blue-600"
          valueClass="text-blue-700"
        />
        <SummaryCard
          title="Payable"
          value={formatCurrency(summary.payableCommissionAmount)}
          subtitle="Ready for payout"
          icon={<FiDollarSign size={16} />}
          iconClass="bg-purple-50 text-purple-600"
          valueClass="text-purple-700"
        />
        <SummaryCard
          title="Paid"
          value={formatCurrency(summary.paidCommissionAmount)}
          subtitle="Already paid"
          icon={<FiCheck size={16} />}
          iconClass="bg-emerald-50 text-emerald-600"
          valueClass="text-emerald-700"
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

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-[3px] border-brand-blue-50 border-t-brand-blue rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading commissions...</p>
            </div>
          </div>
        ) : commissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <FiDollarSign size={24} />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-gray-800">
              No commissions found
            </h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              {activeFilterCount > 0
                ? "No commissions match your current filters."
                : "Create your first commission to get started."}
            </p>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Clear Filters
              </button>
            ) : canCreate ? (
              <button
                type="button"
                onClick={openCreate}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg"
              >
                <FiPlus size={15} /> New Commission
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  {["Commission", "Booking", "Sales Person", "Type", "Amount", "Status", "Created", "Actions"].map(
                    (heading, i) => (
                      <th
                        key={i}
                        className={`px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide ${
                          heading === "Amount" || heading === "Actions"
                            ? "text-right"
                            : "text-left"
                        }`}
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commissions.map((commission) => (
                  <CommissionRow
                    key={getId(commission)}
                    commission={commission}
                    onView={openView}
                    onDelete={(c) => askAction("delete", c)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-700">
                {(page - 1) * limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-gray-700">
                {Math.min(page * limit, total)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-700">{total}</span>{" "}
              commissions
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => page > 1 && setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40"
                >
                  <FiChevronLeft size={16} />
                </button>
                <span className="px-3 h-8 inline-flex items-center text-sm font-medium text-gray-700">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => page < totalPages && setPage((p) => p + 1)}
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

      {/* FORM MODAL */}
      {showForm && (
        <CommissionFormModal
          form={form}
          actionLoading={actionLoading}
          editingCommission={editingCommission}
          bookings={bookings}
          salesPeople={salesPeople}
          selectedBooking={selectedBooking}
          formExpectedAmount={formExpectedAmount}
          onBookingChange={handleBookingChange}
          onFormChange={handleFormChange}
          onSubmit={handleSubmit}
          onClose={() => !actionLoading && setShowForm(false)}
        />
      )}

      {/* VIEW MODAL */}
      {showView && selectedCommission && (
        <CommissionViewModal
          commission={selectedCommission}
          canEdit={!["Paid", "Cancelled", "Payable"].includes(selectedCommission.status)}
          onClose={() => setShowView(false)}
          onEdit={(c) => {
            setShowView(false);
            openEdit(c);
          }}
          onAction={askAction}
        />
      )}

      {/* CONFIRM */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText={confirmAction.confirm}
          danger={["delete", "cancel"].includes(confirmAction.action)}
          loading={actionLoading}
          onClose={() => !actionLoading && setConfirmAction(null)}
          onConfirm={() => executeAction(confirmAction.action, confirmAction.commission)}
        />
      )}
    </div>
  );
}

/* ============================================================================
   SUB-COMPONENTS
============================================================================ */

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

function TypeBadge({ type }) {
  return (
    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700">
      {type || "Percentage"}
    </span>
  );
}

function CommissionRow({ commission, onView, onDelete }) {
  const canDelete = commission.status !== "Paid";

  return (
    <tr
      onClick={() => onView(commission)}
      className="hover:bg-brand-blue-50/40 transition-colors cursor-pointer group"
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-blue-50 text-brand-blue flex items-center justify-center shrink-0 group-hover:bg-brand-blue-100 transition">
            <FiDollarSign size={15} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate max-w-[160px]">
              {commission.commissionNumber || "—"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[160px]">
              {commission.notes ? commission.notes.slice(0, 40) : "No notes"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="font-medium text-gray-800 truncate max-w-[160px]">
          {getBookingLabel(commission.booking)}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[160px]">
          {getCustomerName(commission.customer)}
        </p>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
            <FiUser size={13} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-800 truncate max-w-[150px]">
              {getName(commission.salesPerson)}
            </p>
            <p className="text-xs text-gray-500 truncate max-w-[150px]">
              {commission.salesPerson?.role || ""}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <TypeBadge type={commission.commissionType} />
        {commission.commissionType === "Percentage" && (
          <p className="text-xs text-gray-500 mt-1">{commission.percentage || 0}%</p>
        )}
      </td>

      <td className="px-5 py-4 text-right">
        <p className="font-semibold text-gray-800 whitespace-nowrap">
          {formatCurrency(commission.commissionAmount, commission.currency)}
        </p>
        {commission.commissionType === "Percentage" && (
          <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">
            Base {formatCurrency(commission.baseAmount, commission.currency)}
          </p>
        )}
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={commission.status} />
      </td>

      <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
        {formatDate(commission.createdAt)}
      </td>

      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end">
          {canDelete && (
            <button
              type="button"
              title="Delete"
              onClick={() => onDelete(commission)}
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

/* ============================================================================
   FORM MODAL
============================================================================ */

function CommissionFormModal({
  form, actionLoading, editingCommission, bookings, salesPeople,
  selectedBooking, formExpectedAmount,
  onBookingChange, onFormChange, onSubmit, onClose,
}) {
  return (
    <ModalShell
      title={editingCommission ? "Edit Commission" : "Create Commission"}
      subtitle={
        editingCommission
          ? "Update commission details before approval."
          : "Create a new salesperson commission."
      }
      onClose={onClose}
      disabled={actionLoading}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={actionLoading}
            className="rounded-lg border border-gray-200 bg-white px-4 h-9 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="commission-form"
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 h-9 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading ? (
              <>
                <FiRefreshCw className="animate-spin" size={15} /> Saving...
              </>
            ) : (
              <>
                <FiCheck size={15} />
                {editingCommission ? "Update Commission" : "Create Commission"}
              </>
            )}
          </button>
        </>
      }
    >
      <form id="commission-form" onSubmit={onSubmit} className="p-6 space-y-6">
        <section>
          <SectionTitle icon={<FiDollarSign size={14} />} title="Booking" />
          <div className="mt-4">
            <Field label="Booking *">
              <select
                value={form.booking}
                onChange={(e) => onBookingChange(e.target.value)}
                disabled={Boolean(editingCommission)}
                className="input"
                required
              >
                <option value="">Select Booking</option>
                {bookings.map((booking) => (
                  <option key={getId(booking)} value={getId(booking)}>
                    {getBookingLabel(booking)} — {getCustomerName(booking.customer)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {selectedBooking && (
            <div className="mt-4 rounded-xl border border-brand-blue/20 bg-brand-blue-50/40 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <BalanceCell label="Customer" value={getCustomerName(selectedBooking.customer)} />
                <BalanceCell label="Trip" value={getTripName(selectedBooking.trip)} />
                <BalanceCell
                  label="Booking Total"
                  value={formatCurrency(selectedBooking.totalAmount || selectedBooking.total || 0)}
                  valueClass="text-brand-blue"
                />
              </div>
            </div>
          )}
        </section>

        <section>
          <SectionTitle icon={<FiUser size={14} />} title="Sales Person" />
          <div className="mt-4">
            <Field label="Sales Person *">
              <select
                value={form.salesPerson}
                onChange={(e) => onFormChange("salesPerson", e.target.value)}
                className="input"
                required
              >
                <option value="">Select Sales Person</option>
                {salesPeople.map((person) => (
                  <option key={getId(person)} value={getId(person)}>
                    {getName(person)} — {person.role || ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section>
          <SectionTitle icon={<FiDollarSign size={14} />} title="Commission Details" />

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Commission Type *">
              <select
                value={form.commissionType}
                onChange={(e) => onFormChange("commissionType", e.target.value)}
                className="input"
              >
                {COMMISSION_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </Field>

            <Field label="Currency">
              <select
                value={form.currency}
                onChange={(e) => onFormChange("currency", e.target.value)}
                className="input"
              >
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </Field>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Base Amount">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.baseAmount}
                onChange={(e) => onFormChange("baseAmount", e.target.value)}
                className="input"
                placeholder="0.00"
              />
            </Field>

            {form.commissionType === "Percentage" && (
              <Field label="Percentage">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.percentage}
                    onChange={(e) => onFormChange("percentage", e.target.value)}
                    className="input pr-10"
                    placeholder="5"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    %
                  </span>
                </div>
              </Field>
            )}

            <div className={form.commissionType === "Fixed" ? "sm:col-span-2" : ""}>
              <Field label="Commission Amount *">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.commissionAmount}
                  onChange={(e) => onFormChange("commissionAmount", e.target.value)}
                  readOnly={form.commissionType === "Percentage"}
                  className="input read-only:bg-gray-50"
                  placeholder="0.00"
                  required
                />
              </Field>
            </div>
          </div>

          {form.commissionType === "Percentage" && formExpectedAmount !== null && (
            <div className="mt-4 rounded-xl border border-brand-blue/20 bg-brand-blue-50/40 p-4 flex items-start gap-3">
              <FiCheckCircle className="mt-0.5 text-brand-blue flex-shrink-0" size={16} />
              <div>
                <p className="text-xs font-semibold text-brand-blue">
                  Commission Calculation
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  {formatCurrency(Number(form.baseAmount || 0))} ×{" "}
                  {Number(form.percentage || 0)}% ={" "}
                  <strong>{formatCurrency(formExpectedAmount)}</strong>
                </p>
              </div>
            </div>
          )}
        </section>

        <section>
          <SectionTitle icon={<FiInfo size={14} />} title="Notes" />
          <div className="mt-4">
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => onFormChange("notes", e.target.value)}
                rows={3}
                maxLength={3000}
                placeholder="Add commission notes..."
                className="input resize-none"
              />
            </Field>
            <p className="mt-1 text-right text-[11px] text-gray-400">
              {form.notes.length}/3000
            </p>
          </div>
        </section>
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

/* ============================================================================
   VIEW MODAL (with action buttons in footer)
============================================================================ */

function CommissionViewModal({ commission, canEdit, onClose, onEdit, onAction }) {
  const isPending = commission.status === "Pending";
  const isApproved = commission.status === "Approved";
  const isPayable = commission.status === "Payable";
  const isPaid = commission.status === "Paid";
  const isCancelled = commission.status === "Cancelled";

  return (
    <ModalShell
      title="Commission Details"
      subtitle={commission.commissionNumber}
      onClose={onClose}
      footer={
        <>
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(commission)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 h-9 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <FiEdit2 size={14} />
              Edit
            </button>
          )}

          {isPending && (
            <button
              type="button"
              onClick={() => onAction("approve", commission)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 h-9 text-sm font-medium text-white hover:bg-blue-700"
            >
              <FiCheckCircle size={14} />
              Approve
            </button>
          )}

          {isApproved && (
            <button
              type="button"
              onClick={() => onAction("payable", commission)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 h-9 text-sm font-medium text-white hover:bg-purple-700"
            >
              <FiDollarSign size={14} />
              Mark Payable
            </button>
          )}

          {isPayable && (
            <button
              type="button"
              onClick={() => onAction("paid", commission)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 h-9 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <FiCheck size={14} />
              Mark Paid
            </button>
          )}

          {!isPaid && !isCancelled && (
            <button
              type="button"
              onClick={() => onAction("cancel", commission)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 h-9 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <FiXCircle size={14} />
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 h-9 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>
        </>
      }
    >
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-gray-200">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500">Commission Amount</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 break-all">
              {formatCurrency(commission.commissionAmount, commission.currency)}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {commission.commissionNumber || "—"}
            </p>
          </div>
          <div className="flex-shrink-0">
            <StatusBadge status={commission.status} />
          </div>
        </div>

        <section>
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
            Commission Information
          </h3>
          <div className="space-y-2.5">
            <DetailLine label="Commission Number" value={commission.commissionNumber || "-"} />
            <DetailLine label="Type" value={commission.commissionType || "-"} />
            <DetailLine
              label="Base Amount"
              value={formatCurrency(commission.baseAmount, commission.currency)}
            />
            <DetailLine label="Percentage" value={`${commission.percentage || 0}%`} />
            <DetailLine
              label="Commission Amount"
              value={formatCurrency(commission.commissionAmount, commission.currency)}
            />
            <DetailLine label="Currency" value={commission.currency || "INR"} />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
            Booking Information
          </h3>
          <div className="space-y-2.5">
            <DetailLine label="Booking" value={getBookingLabel(commission.booking)} />
            <DetailLine label="Customer" value={getCustomerName(commission.customer)} />
            <DetailLine label="Trip" value={getTripName(commission.trip)} />
            <DetailLine label="Sales Person" value={getName(commission.salesPerson)} />
          </div>
        </section>

        {(commission.status === "Paid" ||
          commission.paymentDate ||
          commission.paymentReference) && (
          <section>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
              Payment Information
            </h3>
            <div className="space-y-2.5">
              <DetailLine
                label="Payment Date"
                value={formatDate(commission.paymentDate)}
              />
              <DetailLine
                label="Payment Reference"
                value={commission.paymentReference || "-"}
              />
            </div>
          </section>
        )}

        {commission.approvedBy && (
          <section>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
              Approval Information
            </h3>
            <div className="space-y-2.5">
              <DetailLine label="Approved By" value={getName(commission.approvedBy)} />
              <DetailLine
                label="Approved At"
                value={formatDate(commission.approvedAt)}
              />
            </div>
          </section>
        )}

        <section>
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
            Notes
          </h3>
          <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">
            {commission.notes || "No notes added."}
          </p>
        </section>
      </div>
    </ModalShell>
  );
}

/* ============================================================================
   CONFIRM MODAL
============================================================================ */

function ConfirmModal({ title, message, confirmText, danger, loading, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="p-6">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
              danger ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
            }`}
          >
            <FiAlertCircle size={20} />
          </div>

          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-600 leading-6">{message}</p>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-200 bg-white px-4 h-9 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-lg px-4 h-9 text-sm font-medium text-white disabled:opacity-60 ${
                danger ? "bg-red-600 hover:bg-red-700" : "bg-brand-blue hover:bg-brand-blue-dark"
              }`}
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin" size={14} /> Processing...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   PRIMITIVES
============================================================================ */

function ModalShell({ title, subtitle, onClose, children, footer, disabled }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !disabled) onClose();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
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