import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiPlus,
  FiSearch,
  FiX,
  FiFilter,
  FiFileText,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

import api from "../api";
import EnquiryForm from "../components/EnquiryForm";
import ViewEnquiry from "../components/ViewEnquiry";

/* ======================================================
   OPTIONS
====================================================== */

const STATUS_OPTIONS = [
  "New",
  "In Progress",
  "Waiting for Customer",
  "Quotation Prepared",
  "Quotation Sent",
  "Confirmed",
  "Cancelled",
  "Closed",
];

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

const TRAVEL_TYPES = [
  "Domestic",
  "International",
  "Honeymoon",
  "Family",
  "Solo",
  "Corporate",
  "Group",
  "Adventure",
  "Pilgrimage",
  "Other",
];

/* ======================================================
   COMPONENT
====================================================== */

function Enquiries() {
  const navigate = useNavigate();

  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [travelTypeFilter, setTravelTypeFilter] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const [showForm, setShowForm] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState(null);
  const [viewEnquiry, setViewEnquiry] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [assignableUsers, setAssignableUsers] = useState([]);

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const user = storedUser?.user || storedUser;

  /* FETCH */
  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/enquiries");
      const data = response.data;
      if (Array.isArray(data)) setEnquiries(data);
      else if (Array.isArray(data?.enquiries)) setEnquiries(data.enquiries);
      else if (Array.isArray(data?.data)) setEnquiries(data.data);
      else setEnquiries([]);
    } catch (err) {
      console.error("Fetch enquiries error:", err);
      setError(
        err.response?.data?.message || "Failed to load travel enquiries."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignableUsers = async () => {
    if (user?.role !== "admin" && user?.role !== "manager") return;
    try {
      const response = await api.get("/enquiries/assignable-users");
      const data = response.data;
      if (Array.isArray(data)) setAssignableUsers(data);
      else if (Array.isArray(data?.users)) setAssignableUsers(data.users);
      else if (Array.isArray(data?.data)) setAssignableUsers(data.data);
      else setAssignableUsers([]);
    } catch (err) {
      console.error("Fetch assignable users error:", err);
      setAssignableUsers([]);
    }
  };

  useEffect(() => {
    fetchEnquiries();
    fetchAssignableUsers();
  }, []);

  /* AUTO DISMISS */
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => {
    if (!error || showForm) return;
    const t = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(t);
  }, [error, showForm]);

  /* OUTSIDE CLICK */
  useEffect(() => {
    const handle = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  /* HANDLERS */
  const openCreateForm = () => {
    setEditingEnquiry(null);
    setMessage("");
    setError("");
    setShowForm(true);
  };

  const openEditForm = (enquiry) => {
    setEditingEnquiry(enquiry);
    setMessage("");
    setError("");
    setViewEnquiry(null);
    setShowForm(true);
  };

  const handleCreateQuotation = (enquiry) => {
    if (!enquiry?._id) return;
    setViewEnquiry(null);
    navigate("/quotations", {
      state: { createQuotationFromEnquiry: enquiry },
    });
  };

  const handleRowClick = (enquiry) => {
    setViewEnquiry(enquiry);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingEnquiry(null);
    setError("");
  };

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      if (
        payload.travelDate &&
        payload.returnDate &&
        new Date(payload.returnDate) < new Date(payload.travelDate)
      ) {
        setError("Return date cannot be before travel date.");
        return false;
      }

      if (
        payload.budgetMin !== undefined &&
        payload.budgetMax !== undefined &&
        payload.budgetMin !== "" &&
        payload.budgetMax !== "" &&
        Number(payload.budgetMax) < Number(payload.budgetMin)
      ) {
        setError("Maximum budget cannot be lower than minimum budget.");
        return false;
      }

      const destination = payload.destination?.trim();
      const generatedTitle =
        editingEnquiry?.title?.trim() ||
        (destination ? `${destination} Travel Enquiry` : "Travel Enquiry");

      const submitPayload = { ...payload, title: generatedTitle };

      if (!editingEnquiry?._id) {
        await api.post("/enquiries", submitPayload);
        setMessage("Travel enquiry created successfully.");
      } else {
        await api.put(`/enquiries/${editingEnquiry._id}`, submitPayload);
        setMessage("Travel enquiry updated successfully.");
      }

      setShowForm(false);
      setEditingEnquiry(null);
      await fetchEnquiries();
      return true;
    } catch (err) {
      console.error("Save enquiry error:", err);
      setError(
        err.response?.data?.message || "Failed to save travel enquiry."
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this enquiry?"
    );
    if (!confirmed) return;

    try {
      setError("");
      setMessage("");
      setViewEnquiry(null);
      await api.delete(`/enquiries/${id}`);
      setMessage("Travel enquiry deleted successfully.");
      await fetchEnquiries();
    } catch (err) {
      console.error("Delete enquiry error:", err);
      setError(
        err.response?.data?.message || "Failed to delete travel enquiry."
      );
    }
  };

  /* HELPERS */
  const getDisplayName = (enquiry) => {
    const customer = enquiry?.customer;
    if (customer) {
      if (customer.name) return customer.name;
      const full = [customer.firstName, customer.lastName]
        .filter(Boolean)
        .join(" ");
      if (full) return full;
    }

    const lead = enquiry?.lead;
    if (lead) {
      if (lead.name) return lead.name;
      const full = [lead.firstName, lead.lastName]
        .filter(Boolean)
        .join(" ");
      if (full) return full;
    }

    return enquiry?.title || "Travel Enquiry";
  };

  /* FILTERED */
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((e) => {
      const s = search.toLowerCase().trim();
      const text = [
        e.enquiryNumber,
        e.title,
        e.destination,
        e.departureCity,
        e.travelType,
        e.source,
        e.status,
        e.priority,
        e.lead?.firstName,
        e.lead?.lastName,
        e.lead?.phone,
        e.lead?.email,
        e.customer?.firstName,
        e.customer?.lastName,
        e.customer?.name,
        e.customer?.phone,
        e.customer?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!s || text.includes(s)) &&
        (!statusFilter || e.status === statusFilter) &&
        (!priorityFilter || e.priority === priorityFilter) &&
        (!travelTypeFilter || e.travelType === travelTypeFilter)
      );
    });
  }, [enquiries, search, statusFilter, priorityFilter, travelTypeFilter]);

  /* FORMAT */
  const formatShortDate = (date) => {
    if (!date) return null;
    const p = new Date(date);
    if (Number.isNaN(p.getTime())) return null;
    return p.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount, currency = "INR") => {
    if (amount === null || amount === undefined || amount === "") return "—";
    const num = Number(amount);
    if (!num) return "—";
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(num);
    } catch {
      return `₹${num.toLocaleString("en-IN")}`;
    }
  };

  const getTravellerCount = (e) =>
    Number(e.adults || 0) + Number(e.children || 0) + Number(e.infants || 0);

  const getTravellerLabel = (e) => {
    const parts = [];
    if (e.adults) parts.push(`${e.adults}A`);
    if (e.children) parts.push(`${e.children}C`);
    if (e.infants) parts.push(`${e.infants}I`);
    return parts.join(" · ") || null;
  };

  /* ====================================================
     STATUS & PRIORITY (brand matched)
  ==================================================== */

  const getStatusDot = (status) => {
    const map = {
      New: "bg-brand-blue",
      "In Progress": "bg-brand-blue",
      "Waiting for Customer": "bg-brand-gold",
      "Quotation Prepared": "bg-brand-blue",
      "Quotation Sent": "bg-brand-blue",
      Confirmed: "bg-brand-gold",
      Cancelled: "bg-red-500",
      Closed: "bg-gray-400",
    };
    return map[status] || "bg-gray-400";
  };

  const getStatusText = (status) => {
    const map = {
      Cancelled: "text-red-600",
      Confirmed: "text-brand-blue-dark font-semibold",
      "Quotation Prepared": "text-brand-blue-dark font-semibold",
      "Quotation Sent": "text-brand-blue-dark font-semibold",
    };
    return map[status] || "text-gray-700";
  };

  const getPriorityText = (priority) => {
    const map = {
      Low: "text-gray-500",
      Medium: "text-gray-700",
      High: "text-brand-gold-dark font-semibold",
      Urgent: "text-red-600 font-semibold",
    };
    return map[priority] || "text-gray-600";
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setTravelTypeFilter("");
  };

  const activeFilterCount = [
    search,
    statusFilter,
    priorityFilter,
    travelTypeFilter,
  ].filter(Boolean).length;

  const hasFilters = activeFilterCount > 0;
  const canDelete = user?.role === "admin";

  /* ====================================================
     RENDER
  ==================================================== */

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-4">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Enquiries</h1>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-brand-blue px-4 text-sm font-medium text-white transition hover:bg-brand-blue-dark active:scale-[0.98] shadow-brand"
        >
          <FiPlus size={15} />
          New Enquiry
        </button>
      </div>

      {/* SEARCH + FILTER */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <FiSearch
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search enquiries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-700"
            >
              <FiX size={12} />
            </button>
          )}
        </div>

        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => setShowFilters((p) => !p)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition ${
              hasFilters
                ? "border-brand-blue/30 bg-brand-blue-50 text-brand-blue-dark"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <FiFilter size={13} />
            Filters
            {hasFilters && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-brand-blue text-[10px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {showFilters && (
            <div className="absolute right-0 top-11 z-30 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition"
                  >
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Priority
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition"
                  >
                    <option value="">All priorities</option>
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Travel Type
                  </label>
                  <select
                    value={travelTypeFilter}
                    onChange={(e) => setTravelTypeFilter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition"
                  >
                    <option value="">All types</option>
                    {TRAVEL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue-dark transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SUCCESS */}
      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <FiCheckCircle size={15} />
          <span className="flex-1">{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <FiX size={13} />
          </button>
        </div>
      )}

      {/* ERROR */}
      {error && !showForm && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <FiAlertCircle size={15} />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-red-600 hover:text-red-800"
          >
            <FiX size={13} />
          </button>
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Customer
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Destination
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Travel Dates
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Travellers
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Budget
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Priority
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-16 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-brand-blue" />
                      <span className="text-sm text-gray-500">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-16 text-center">
                    <p className="text-sm font-medium text-gray-700">
                      No enquiries found
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {hasFilters
                        ? "Try changing your filters."
                        : "Create your first enquiry to get started."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((enquiry) => {
                  const displayName = getDisplayName(enquiry);
                  const travelDate = formatShortDate(enquiry.travelDate);
                  const returnDate = formatShortDate(enquiry.returnDate);
                  const travellerLabel = getTravellerLabel(enquiry);

                  return (
                    <tr
                      key={enquiry._id}
                      onClick={() => handleRowClick(enquiry)}
                      className="cursor-pointer transition-colors hover:bg-brand-blue-50/40 group"
                    >
                      {/* CUSTOMER */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[220px]">
                          {displayName}
                        </p>
                        {enquiry.enquiryNumber && (
                          <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                            {enquiry.enquiryNumber}
                          </p>
                        )}
                      </td>

                      {/* DESTINATION */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-gray-800">
                          {enquiry.destination || "—"}
                        </p>
                      </td>

                      {/* TRAVEL DATES */}
                      <td className="px-4 py-3.5">
                        {travelDate ? (
                          <p className="text-sm text-gray-800">
                            {travelDate}
                            {returnDate ? ` → ${returnDate}` : ""}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400">—</p>
                        )}
                      </td>

                      {/* TRAVELLERS */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-gray-800">
                          {getTravellerCount(enquiry)}
                        </p>
                        {travellerLabel && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {travellerLabel}
                          </p>
                        )}
                      </td>

                      {/* BUDGET */}
                      <td className="px-4 py-3.5 text-right">
                        <p className="text-sm text-gray-800 font-medium">
                          {formatCurrency(
                            enquiry.budgetMax || enquiry.budgetMin,
                            enquiry.currency
                          )}
                        </p>
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${getStatusText(
                            enquiry.status
                          )}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${getStatusDot(
                              enquiry.status
                            )}`}
                          />
                          {enquiry.status || "New"}
                        </span>
                      </td>

                      {/* PRIORITY */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-xs font-medium ${getPriorityText(
                            enquiry.priority
                          )}`}
                        >
                          {enquiry.priority || "Medium"}
                        </span>
                      </td>

                      {/* ACTION — Clean text button */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateQuotation(enquiry);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:text-brand-blue-dark transition-colors"
                        >
                          <FiFileText size={13} />
                          Create Quote
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredEnquiries.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-500">
            {filteredEnquiries.length} of {enquiries.length} enquiries
          </div>
        )}
      </div>

      {/* FORM */}
      <EnquiryForm
        isOpen={showForm}
        onClose={closeForm}
        onSubmit={handleSubmit}
        editingEnquiry={editingEnquiry}
        loading={saving}
        currentUser={user}
        assignableUsers={assignableUsers}
      />

      {/* VIEW MODAL */}
      <ViewEnquiry
        enquiry={viewEnquiry}
        onClose={() => setViewEnquiry(null)}
        onEdit={(enquiry) => {
          setViewEnquiry(null);
          openEditForm(enquiry);
        }}
        onDelete={(enquiry) => {
          handleDelete(enquiry._id);
        }}
        canDelete={canDelete}
        formatDate={formatShortDate}
        formatCurrency={formatCurrency}
        getTravellerCount={getTravellerCount}
        getStatusStyle={() => ""}
        getPriorityStyle={() => ""}
      />
    </div>
  );
}

export default Enquiries;