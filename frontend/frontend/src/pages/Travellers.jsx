import { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import {
  FiPlus,
  FiSearch,
  FiX,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiUsers,
  FiAlertCircle,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

const API_URL = "http://localhost:5000/api/travellers";
const CUSTOMER_API_URL = "http://localhost:5000/api/customers";

const initialForm = {
  firstName: "",
  lastName: "",
  customer: "",
  email: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  nationality: "Indian",
  passportNumber: "",
  passportIssueDate: "",
  passportExpiryDate: "",
  visaNumber: "",
  visaType: "",
  visaExpiryDate: "",
  relationship: "",
  specialRequirements: "",
  status: "Active",
};

function getToken() {
  return localStorage.getItem("token");
}

function getCustomerName(customer) {
  if (!customer) return "—";
  if (typeof customer === "string") return customer;

  return (
    `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
    customer.name ||
    customer.email ||
    "—"
  );
}

function formatDate(date) {
  if (!date) return "—";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusStyle(status) {
  const styles = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return styles[status] || "bg-gray-100 text-gray-600 border-gray-200";
}

function getInitials(firstName, lastName) {
  const first = firstName?.charAt(0) || "";
  const last = lastName?.charAt(0) || "";

  return `${first}${last}`.toUpperCase() || "TR";
}

/* =====================================================
   TRAVELLER FORM
===================================================== */

function TravellerForm({
  isOpen,
  onClose,
  onSubmit,
  editingTraveller,
  loading,
  customers,
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (editingTraveller) {
      setForm({
        firstName: editingTraveller.firstName || "",
        lastName: editingTraveller.lastName || "",
        customer:
          editingTraveller.customer?._id || editingTraveller.customer || "",
        email: editingTraveller.email || "",
        phone: editingTraveller.phone || "",
        gender: editingTraveller.gender || "",
        dateOfBirth: editingTraveller.dateOfBirth
          ? String(editingTraveller.dateOfBirth).slice(0, 10)
          : "",
        nationality: editingTraveller.nationality || "Indian",
        passportNumber: editingTraveller.passportNumber || "",
        passportIssueDate: editingTraveller.passportIssueDate
          ? String(editingTraveller.passportIssueDate).slice(0, 10)
          : "",
        passportExpiryDate: editingTraveller.passportExpiryDate
          ? String(editingTraveller.passportExpiryDate).slice(0, 10)
          : "",
        visaNumber: editingTraveller.visaNumber || "",
        visaType: editingTraveller.visaType || "",
        visaExpiryDate: editingTraveller.visaExpiryDate
          ? String(editingTraveller.visaExpiryDate).slice(0, 10)
          : "",
        relationship: editingTraveller.relationship || "",
        specialRequirements: editingTraveller.specialRequirements || "",
        status: editingTraveller.status || "Active",
      });
    } else {
      setForm(initialForm);
    }

    setError("");
  }, [isOpen, editingTraveller]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }

    if (!form.customer) {
      setError("Customer is required.");
      return;
    }

    if (
      form.passportIssueDate &&
      form.passportExpiryDate &&
      new Date(form.passportExpiryDate) < new Date(form.passportIssueDate)
    ) {
      setError("Passport expiry date cannot be before issue date.");
      return;
    }

    if (form.visaExpiryDate && form.dateOfBirth) {
      const visaExpiry = new Date(form.visaExpiryDate);

      if (Number.isNaN(visaExpiry.getTime())) {
        setError("Invalid visa expiry date.");
        return;
      }
    }

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      customer: form.customer,
      email: form.email.trim(),
      phone: form.phone.trim(),
      gender: form.gender,
      dateOfBirth: form.dateOfBirth || null,
      nationality: form.nationality.trim(),
      passportNumber: form.passportNumber.trim(),
      passportIssueDate: form.passportIssueDate || null,
      passportExpiryDate: form.passportExpiryDate || null,
      visaNumber: form.visaNumber.trim(),
      visaType: form.visaType,
      visaExpiryDate: form.visaExpiryDate || null,
      relationship: form.relationship.trim(),
      specialRequirements: form.specialRequirements.trim(),
      status: form.status,
    };

    try {
      await onSubmit(payload);
    } catch (submitError) {
      setError(
        submitError?.response?.data?.message ||
          submitError?.message ||
          "Failed to save traveller."
      );
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue focus:bg-white transition";

  const labelClass = "block mb-1.5 text-xs font-semibold text-gray-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px] animate-[fadeIn_.15s_ease-out]">
      <div className="w-full max-w-[620px] max-h-[90vh] bg-white rounded-2xl shadow-2xl shadow-gray-900/20 flex flex-col overflow-hidden animate-[popIn_.18s_ease-out]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {editingTraveller ? "Edit Traveller" : "Add Traveller"}
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              {editingTraveller
                ? "Update traveller information"
                : "Add traveller details to a customer"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition disabled:opacity-50"
          >
            <FiX size={17} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4"
        >
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-4">
              <FiAlertCircle className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Customer *</label>
              <select
                name="customer"
                value={form.customer}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Select customer</option>

                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {getCustomerName(customer)}
                    {customer.email ? ` — ${customer.email}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="traveller@email.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Phone number"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Gender</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Nationality</label>
                <input
                  type="text"
                  name="nationality"
                  value={form.nationality}
                  onChange={handleChange}
                  placeholder="Nationality"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Relationship</label>
                <input
                  type="text"
                  name="relationship"
                  value={form.relationship}
                  onChange={handleChange}
                  placeholder="e.g. Spouse, Child"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Passport Details */}
            <div className="pt-1">
              <p className="text-xs font-bold text-gray-800 mb-2">
                Passport Details
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Passport Number</label>
                  <input
                    type="text"
                    name="passportNumber"
                    value={form.passportNumber}
                    onChange={handleChange}
                    placeholder="Passport number"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Passport Issue Date</label>
                  <input
                    type="date"
                    name="passportIssueDate"
                    value={form.passportIssueDate}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className={labelClass}>Passport Expiry Date</label>
                <input
                  type="date"
                  name="passportExpiryDate"
                  value={form.passportExpiryDate}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Visa Details */}
            <div className="pt-1">
              <p className="text-xs font-bold text-gray-800 mb-2">
                Visa Details
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Visa Number</label>
                  <input
                    type="text"
                    name="visaNumber"
                    value={form.visaNumber}
                    onChange={handleChange}
                    placeholder="Visa number"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Visa Type</label>
                  <input
                    type="text"
                    name="visaType"
                    value={form.visaType}
                    onChange={handleChange}
                    placeholder="e.g. Tourist"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className={labelClass}>Visa Expiry Date</label>
                <input
                  type="date"
                  name="visaExpiryDate"
                  value={form.visaExpiryDate}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Special Requirements</label>
              <textarea
                name="specialRequirements"
                value={form.specialRequirements}
                onChange={handleChange}
                placeholder="Food, accessibility or other requirements"
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition disabled:opacity-60 min-w-[110px] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Saving...
              </>
            ) : editingTraveller ? (
              "Update"
            ) : (
              "Add Traveller"
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

/* =====================================================
   TRAVELLERS PAGE
===================================================== */

function Travellers() {
  const { user } = useAuth();

  const [travellers, setTravellers] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingTraveller, setEditingTraveller] = useState(null);
  const [viewTraveller, setViewTraveller] = useState(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTravellers, setTotalTravellers] = useState(0);

  const limit = 50;

  const canDelete = user?.role === "admin";

  /* =========================
     FETCH TRAVELLERS
  ========================= */

  const fetchTravellers = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const token = getToken();

      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          search: search.trim(),
          status,
          page,
          limit,
        },
      });

      const data = response.data;

      setTravellers(data.travellers || data.data || []);
      setTotalPages(
        Number(data.totalPages || data.pagination?.totalPages || 1)
      );
      setTotalTravellers(
        Number(data.total || data.pagination?.total || 0)
      );
    } catch (error) {
      console.error(
        "Fetch travellers error:",
        error.response?.data || error.message
      );

      setErrorMessage(
        error.response?.data?.message || "Failed to fetch travellers"
      );

      setTravellers([]);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FETCH CUSTOMERS
  ========================= */

  const fetchCustomers = async () => {
    try {
      const token = getToken();

      const response = await axios.get(CUSTOMER_API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          limit: 100,
          page: 1,
        },
      });

      setCustomers(response.data.customers || response.data.data || []);
    } catch (error) {
      console.error(
        "Fetch customers error:",
        error.response?.data || error.message
      );
    }
  };

  /* =========================
     EFFECTS
  ========================= */

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchTravellers();
  }, [page, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchTravellers();
      } else {
        setPage(1);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilters]);

  /* =========================
     HANDLERS
  ========================= */

  const handleCreate = () => {
    setEditingTraveller(null);
    setShowForm(true);
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleEdit = (traveller) => {
    setEditingTraveller(traveller);
    setShowForm(true);
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const token = getToken();

      if (editingTraveller) {
        await axios.put(`${API_URL}/${editingTraveller._id}`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setSuccessMessage("Traveller updated successfully.");
      } else {
        await axios.post(API_URL, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setSuccessMessage("Traveller added successfully.");
      }

      setShowForm(false);
      setEditingTraveller(null);

      await fetchTravellers();
    } catch (error) {
      console.error(
        "Save traveller error:",
        error.response?.data || error.message
      );

      setErrorMessage(
        error.response?.data?.message || "Failed to save traveller."
      );

      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (traveller) => {
    const name =
      `${traveller.firstName || ""} ${traveller.lastName || ""}`.trim() ||
      "this traveller";

    const confirmed = window.confirm(
      `Are you sure you want to delete ${name}?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(traveller._id);
      setErrorMessage("");
      setSuccessMessage("");

      const token = getToken();

      await axios.delete(`${API_URL}/${traveller._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSuccessMessage("Traveller deleted successfully.");

      if (travellers.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchTravellers();
      }
    } catch (error) {
      console.error(
        "Delete traveller error:",
        error.response?.data || error.message
      );

      setErrorMessage(
        error.response?.data?.message || "Failed to delete traveller."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus("");
    setPage(1);
    setShowFilters(false);
  };

  const activeFilterCount = useMemo(() => {
    return [search, status].filter(Boolean).length;
  }, [search, status]);

  const dropdownFilterCount = useMemo(() => {
    return [status].filter(Boolean).length;
  }, [status]);

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">
      {/* HEADER */}

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
              placeholder="Search travellers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 h-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue transition"
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
              <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/60 z-30 overflow-hidden">
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
                      {["Active", "Inactive"].map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() =>
                            setStatus(status === item ? "" : item)
                          }
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                            status === item
                              ? "bg-brand-blue text-white border-brand-blue"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
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
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
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

        {/* ADD BUTTON */}

        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap self-start lg:self-auto"
        >
          <FiPlus size={15} />
          Add Traveller
        </button>
      </div>

      {/* ACTIVE FILTER SUMMARY */}

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            {activeFilterCount} filter
            {activeFilterCount > 1 ? "s" : ""} active
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

      {/* TRAVELLERS TABLE */}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-[3px] border-brand-blue-50 border-t-brand-blue rounded-full animate-spin" />

              <p className="text-sm text-gray-500">
                Loading travellers...
              </p>
            </div>
          </div>
        ) : travellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <FiUsers size={24} className="text-gray-400" />
            </div>

            <h3 className="mt-4 text-base font-semibold text-gray-800">
              No travellers found
            </h3>

            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Try adjusting your filters or add a new traveller.
            </p>

            <button
              type="button"
              onClick={handleCreate}
              className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition"
            >
              <FiPlus size={14} />
              Add Traveller
            </button>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/60">
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Traveller
                    </th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Customer
                    </th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Contact
                    </th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Passport
                    </th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Passport Expiry
                    </th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {travellers.map((traveller) => {
                    const name =
                      `${traveller.firstName || ""} ${
                        traveller.lastName || ""
                      }`.trim() || "Unnamed Traveller";

                    return (
                      <tr
                        key={traveller._id}
                        className="border-b border-gray-100 last:border-b-0 hover:bg-brand-blue-50/40 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-blue-50 text-brand-blue-dark flex items-center justify-center text-xs font-bold shrink-0">
                              {getInitials(
                                traveller.firstName,
                                traveller.lastName
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate">
                                {name}
                              </p>

                              {traveller.nationality && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {traveller.nationality}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-gray-700">
                          {getCustomerName(traveller.customer)}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="text-gray-700">
                            {traveller.email || "—"}
                          </div>

                          {traveller.phone && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {traveller.phone}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-gray-700">
                          {traveller.passportNumber || "—"}
                        </td>

                        <td className="px-5 py-3.5 text-gray-600">
                          {formatDate(traveller.passportExpiryDate)}
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-md border text-[11px] font-semibold ${getStatusStyle(
                              traveller.status
                            )}`}
                          >
                            {traveller.status || "Inactive"}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewTraveller(traveller)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-brand-blue-dark hover:bg-brand-blue-50 transition"
                              title="View"
                            >
                              <FiEye size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEdit(traveller)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-amber-700 hover:bg-amber-50 transition"
                              title="Edit"
                            >
                              <FiEdit2 size={15} />
                            </button>

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(traveller)}
                                disabled={deletingId === traveller._id}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-700 hover:bg-red-50 transition disabled:opacity-40"
                                title="Delete"
                              >
                                {deletingId === traveller._id ? (
                                  <svg
                                    className="w-4 h-4 animate-spin"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    />
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                    />
                                  </svg>
                                ) : (
                                  <FiTrash2 size={15} />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}

            <div className="lg:hidden divide-y divide-gray-100">
              {travellers.map((traveller) => {
                const name =
                  `${traveller.firstName || ""} ${
                    traveller.lastName || ""
                  }`.trim() || "Unnamed Traveller";

                return (
                  <div key={traveller._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-brand-blue-50 text-brand-blue-dark flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(
                            traveller.firstName,
                            traveller.lastName
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">
                            {name}
                          </p>

                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {getCustomerName(traveller.customer)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 inline-flex items-center px-2 py-1 rounded-md border text-[10px] font-semibold ${getStatusStyle(
                          traveller.status
                        )}`}
                      >
                        {traveller.status || "Inactive"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4 text-xs">
                      <div>
                        <p className="text-gray-400 mb-0.5">Email</p>
                        <p className="text-gray-700 truncate">
                          {traveller.email || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400 mb-0.5">Phone</p>
                        <p className="text-gray-700">
                          {traveller.phone || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400 mb-0.5">Passport</p>
                        <p className="text-gray-700">
                          {traveller.passportNumber || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400 mb-0.5">
                          Passport Expiry
                        </p>
                        <p className="text-gray-700">
                          {formatDate(traveller.passportExpiryDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 mt-4">
                      <button
                        type="button"
                        onClick={() => setViewTraveller(traveller)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-brand-blue-dark hover:bg-brand-blue-50 transition"
                        title="View"
                      >
                        <FiEye size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEdit(traveller)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-amber-700 hover:bg-amber-50 transition"
                        title="Edit"
                      >
                        <FiEdit2 size={15} />
                      </button>

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(traveller)}
                          disabled={deletingId === traveller._id}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-700 hover:bg-red-50 transition disabled:opacity-40"
                          title="Delete"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* PAGINATION */}

      {!loading && totalTravellers > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">
              {travellers.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">
              {totalTravellers}
            </span>{" "}
            {totalTravellers === 1 ? "traveller" : "travellers"}
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1 || loading}
              className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FiChevronLeft size={16} />
            </button>

            <span className="px-3 h-8 inline-flex items-center text-sm font-medium text-gray-700">
              {page} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={page === totalPages || loading}
              className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* TRAVELLER FORM */}

      <TravellerForm
        isOpen={showForm}
        onClose={() => {
          if (!saving) {
            setShowForm(false);
            setEditingTraveller(null);
          }
        }}
        onSubmit={handleSubmit}
        editingTraveller={editingTraveller}
        loading={saving}
        customers={customers}
      />

      {/* VIEW TRAVELLER */}

      {viewTraveller && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewTraveller(null);
            }
          }}
        >
          <div className="w-full max-w-[560px] max-h-[88vh] bg-white rounded-2xl shadow-2xl shadow-gray-900/20 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Traveller Details
                </h2>

                <p className="text-xs text-gray-500 mt-0.5">
                  Complete traveller profile
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewTraveller(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition"
              >
                <FiX size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-full bg-brand-blue-50 text-brand-blue-dark flex items-center justify-center text-sm font-bold">
                  {getInitials(
                    viewTraveller.firstName,
                    viewTraveller.lastName
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {`${viewTraveller.firstName || ""} ${
                      viewTraveller.lastName || ""
                    }`.trim() || "Unnamed Traveller"}
                  </h3>

                  <p className="text-xs text-gray-500">
                    {getCustomerName(viewTraveller.customer)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Email", viewTraveller.email || "—"],
                  ["Phone", viewTraveller.phone || "—"],
                  ["Gender", viewTraveller.gender || "—"],
                  ["Date of Birth", formatDate(viewTraveller.dateOfBirth)],
                  ["Nationality", viewTraveller.nationality || "—"],
                  ["Relationship", viewTraveller.relationship || "—"],
                  ["Passport Number", viewTraveller.passportNumber || "—"],
                  [
                    "Passport Issue",
                    formatDate(viewTraveller.passportIssueDate),
                  ],
                  [
                    "Passport Expiry",
                    formatDate(viewTraveller.passportExpiryDate),
                  ],
                  ["Visa Number", viewTraveller.visaNumber || "—"],
                  ["Visa Type", viewTraveller.visaType || "—"],
                  ["Visa Expiry", formatDate(viewTraveller.visaExpiryDate)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="bg-gray-50 rounded-lg px-3 py-2.5"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      {label}
                    </p>

                    <p className="text-xs text-gray-700 mt-1 break-words">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 bg-gray-50 rounded-lg px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Special Requirements
                </p>

                <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">
                  {viewTraveller.specialRequirements ||
                    "No special requirements added."}
                </p>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex justify-end">
              <button
                type="button"
                onClick={() => setViewTraveller(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
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

export default Travellers;