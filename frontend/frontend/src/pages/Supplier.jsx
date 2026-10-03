import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiX,
  FiRefreshCw,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import api from "../api";

// =====================================================
// CONSTANTS
// =====================================================

const SUPPLIER_TYPES = [
  "Hotel",
  "Transport",
  "Flight",
  "Activity",
  "Tour Operator",
  "DMC",
  "Visa Service",
  "Travel Insurance",
  "Cruise",
  "Restaurant",
  "Guide",
  "Other",
];

const SUPPLIER_STATUSES = [
  "Active",
  "Inactive",
  "Blacklisted",
  "Pending",
];

const RECORDS_PER_PAGE = 50;

const initialForm = {
  name: "",
  supplierType: "Hotel",
  company: "",
  contactPerson: {
    name: "",
    designation: "",
    phone: "",
    alternatePhone: "",
    email: "",
    whatsapp: "",
  },
  address: {
    street: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
  },
  website: "",
  destinations: "",
  services: "",
  currency: "INR",
  paymentTerms: "",
  cancellationPolicy: "",
  creditLimit: 0,
  rating: 0,
  status: "Active",
  notes: "",
  owner: "",
};

// =====================================================
// HELPERS
// =====================================================

const getStatusClass = (status) => {
  switch (status) {
    case "Active":
      return "bg-green-50 text-green-700 border-green-200";
    case "Inactive":
      return "bg-gray-100 text-gray-600 border-gray-200";
    case "Blacklisted":
      return "bg-red-50 text-red-700 border-red-200";
    case "Pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

// =====================================================
// MAIN PAGE
// =====================================================

function Supplier() {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierTypes, setSupplierTypes] = useState([]);
  const [supplierStatuses, setSupplierStatuses] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSuppliers, setTotalSuppliers] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);

  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================
  // FETCH
  // =========================

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/suppliers", {
        params: {
          search: search || undefined,
          supplierType: typeFilter || undefined,
          status: statusFilter || undefined,
          page,
          limit: RECORDS_PER_PAGE,
        },
      });

      const data = response.data || {};

      const list =
        data.suppliers ||
        data.data ||
        (Array.isArray(data) ? data : []);

      setSuppliers(list);
      setTotalSuppliers(
        Number(data.total ?? data.count ?? list.length) || 0
      );
      setTotalPages(
        Math.max(
          1,
          Number(
            data.totalPages ??
              data.pages ??
              Math.ceil(list.length / RECORDS_PER_PAGE)
          )
        )
      );
    } catch (err) {
      console.error("Error fetching suppliers:", err);

      setError(
        err.response?.data?.message || "Failed to fetch suppliers"
      );

      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierMeta = async () => {
    try {
      const [typesResponse, statusesResponse, usersResponse] =
        await Promise.all([
          api.get("/suppliers/types").catch(() => null),
          api.get("/suppliers/statuses").catch(() => null),
          api.get("/suppliers/assignable-users").catch(() => null),
        ]);

      setSupplierTypes(
        typesResponse?.data?.types ||
          typesResponse?.data?.data ||
          []
      );

      setSupplierStatuses(
        statusesResponse?.data?.statuses ||
          statusesResponse?.data?.data ||
          []
      );

      setAssignableUsers(
        usersResponse?.data?.users ||
          usersResponse?.data?.data ||
          []
      );
    } catch (err) {
      console.error("Error fetching supplier metadata:", err);
    }
  };

  useEffect(() => {
    fetchSupplierMeta();
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [page, typeFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchSuppliers();
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

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
  // ALERT AUTO-DISMISS
  // =========================

  useEffect(() => {
    if (!success && !error) return;

    const timer = setTimeout(() => {
      setSuccess("");
      setError("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [success, error]);

  // =========================
  // FILTER COUNTS
  // =========================

  const activeFilterCount = useMemo(() => {
    return [search, typeFilter, statusFilter].filter(Boolean).length;
  }, [search, typeFilter, statusFilter]);

  const dropdownFilterCount = useMemo(() => {
    return [typeFilter, statusFilter].filter(Boolean).length;
  }, [typeFilter, statusFilter]);

  const handleClearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setPage(1);
    setShowFilters(false);
  };

  // =========================
  // FORM HANDLERS
  // =========================

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNestedChange = (section, field, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const openCreateForm = () => {
    setEditingSupplier(null);
    setForm({
      ...initialForm,
      contactPerson: { ...initialForm.contactPerson },
      address: { ...initialForm.address },
    });
    setError("");
    setShowForm(true);
  };

  const openEditForm = (supplier) => {
    setEditingSupplier(supplier);
    setError("");

    setForm({
      name: supplier.name || "",
      supplierType: supplier.supplierType || "Hotel",
      company: supplier.company?._id || supplier.company || "",
      contactPerson: {
        name: supplier.contactPerson?.name || "",
        designation: supplier.contactPerson?.designation || "",
        phone: supplier.contactPerson?.phone || "",
        alternatePhone: supplier.contactPerson?.alternatePhone || "",
        email: supplier.contactPerson?.email || "",
        whatsapp: supplier.contactPerson?.whatsapp || "",
      },
      address: {
        street: supplier.address?.street || "",
        city: supplier.address?.city || "",
        state: supplier.address?.state || "",
        country: supplier.address?.country || "India",
        postalCode: supplier.address?.postalCode || "",
      },
      website: supplier.website || "",
      destinations: Array.isArray(supplier.destinations)
        ? supplier.destinations.join(", ")
        : "",
      services: Array.isArray(supplier.services)
        ? supplier.services.join(", ")
        : "",
      currency: supplier.currency || "INR",
      paymentTerms: supplier.paymentTerms || "",
      cancellationPolicy: supplier.cancellationPolicy || "",
      creditLimit: supplier.creditLimit || 0,
      rating: supplier.rating || 0,
      status: supplier.status || "Active",
      notes: supplier.notes || "",
      owner: supplier.owner?._id || supplier.owner || "",
    });

    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Supplier name is required");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        supplierType: form.supplierType,
        company: form.company || null,

        contactPerson: {
          name: form.contactPerson.name.trim(),
          designation: form.contactPerson.designation.trim(),
          phone: form.contactPerson.phone.trim(),
          alternatePhone: form.contactPerson.alternatePhone.trim(),
          email: form.contactPerson.email.trim(),
          whatsapp: form.contactPerson.whatsapp.trim(),
        },

        address: {
          street: form.address.street.trim(),
          city: form.address.city.trim(),
          state: form.address.state.trim(),
          country: form.address.country.trim() || "India",
          postalCode: form.address.postalCode.trim(),
        },

        website: form.website.trim(),

        destinations: form.destinations
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),

        services: form.services
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),

        currency: form.currency.trim().toUpperCase(),

        paymentTerms: form.paymentTerms.trim(),
        cancellationPolicy: form.cancellationPolicy.trim(),

        creditLimit: Number(form.creditLimit) || 0,
        rating: Number(form.rating) || 0,

        status: form.status,
        notes: form.notes.trim(),
        owner: form.owner || null,
      };

      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier._id}`, payload);
        setSuccess("Supplier updated successfully");
      } else {
        await api.post("/suppliers", payload);
        setSuccess("Supplier created successfully");
      }

      setShowForm(false);
      setEditingSupplier(null);
      setForm(initialForm);

      await fetchSuppliers();
    } catch (err) {
      console.error("Supplier save error:", err);

      setError(
        err.response?.data?.message || "Failed to save supplier"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this supplier?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/suppliers/${id}`);

      setSuccess("Supplier deleted successfully");

      if (suppliers.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchSuppliers();
      }
    } catch (err) {
      console.error("Delete supplier error:", err);

      setError(
        err.response?.data?.message || "Failed to delete supplier"
      );
    }
  };

  const handleView = async (supplier) => {
    try {
      const response = await api.get(`/suppliers/${supplier._id}`);

      setSelectedSupplier(
        response.data?.supplier ||
          response.data?.data ||
          response.data
      );

      setShowView(true);
    } catch (err) {
      console.error("View supplier error:", err);

      setSelectedSupplier(supplier);
      setShowView(true);
    }
  };

  // =========================
  // RENDER
  // =========================

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
              placeholder="Search suppliers..."
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
                  {/* TYPE */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Type
                    </label>

                    <select
                      value={typeFilter}
                      onChange={(e) => {
                        setTypeFilter(e.target.value);
                        setPage(1);
                      }}
                      className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue cursor-pointer"
                    >
                      <option value="">All Types</option>

                      {(supplierTypes.length > 0
                        ? supplierTypes
                        : SUPPLIER_TYPES
                      ).map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* STATUS */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Status
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                      {(supplierStatuses.length > 0
                        ? supplierStatuses
                        : SUPPLIER_STATUSES
                      ).map((status) => (
                        <button
                          type="button"
                          key={status}
                          onClick={() =>
                            setStatusFilter(
                              statusFilter === status ? "" : status
                            )
                          }
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                            statusFilter === status
                              ? "bg-brand-blue text-white border-brand-blue"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {status}
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSuppliers}
            disabled={loading}
            className="w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50 flex items-center justify-center transition disabled:opacity-50"
            title="Refresh"
          >
            <FiRefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap"
          >
            <FiPlus size={15} />
            Add Supplier
          </button>
        </div>
      </div>

      {/* ACTIVE FILTERS */}
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

      {/* SUCCESS */}
      {success && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
          <FiAlertCircle className="flex-shrink-0 mt-0.5" size={18} />
          <p className="flex-1">{success}</p>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="text-green-600 hover:text-green-800 flex-shrink-0"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* ERROR */}
      {error && !showForm && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">
          <FiAlertCircle className="flex-shrink-0 mt-0.5" size={18} />
          <p className="flex-1">{error}</p>

          <button
            type="button"
            onClick={() => setError("")}
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

              <p className="text-sm text-gray-500">
                Loading suppliers...
              </p>
            </div>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <FiSearch size={24} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-gray-800">
              No suppliers found
            </h3>

            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              Add your first supplier to start managing your travel
              inventory.
            </p>

            <button
              type="button"
              onClick={openCreateForm}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition"
            >
              <FiPlus size={15} />
              Add Supplier
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Supplier
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Contact
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Destination
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Rating
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
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier._id}
                    className="hover:bg-brand-blue-50/40 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate max-w-[220px]">
                          {supplier.name}
                        </p>

                        {supplier.supplierCode && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {supplier.supplierCode}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold bg-brand-blue-50 text-brand-blue-dark border-brand-blue/20">
                        {supplier.supplierType || "Other"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="text-xs font-medium text-gray-700">
                        {supplier.contactPerson?.name || "—"}
                      </p>

                      <p className="text-xs text-gray-500 mt-0.5">
                        {supplier.contactPerson?.phone || "No phone"}
                      </p>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="text-xs text-gray-700">
                        {supplier.destinations?.length
                          ? supplier.destinations.slice(0, 2).join(", ")
                          : "—"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-gray-700">
                        {supplier.rating || 0}/5
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getStatusClass(
                          supplier.status
                        )}`}
                      >
                        {supplier.status || "Active"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleView(supplier)}
                          title="View"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 bg-gray-50 hover:text-brand-blue-dark hover:bg-brand-blue-50 transition"
                        >
                          <FiEye size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditForm(supplier)}
                          title="Edit"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 bg-gray-50 hover:text-amber-600 hover:bg-amber-50 transition"
                        >
                          <FiEdit2 size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(supplier._id)}
                          title="Delete"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 bg-gray-50 hover:text-red-600 hover:bg-red-50 transition"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {!loading && totalSuppliers > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">
              {suppliers.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">
              {totalSuppliers}
            </span>{" "}
            {totalSuppliers === 1 ? "supplier" : "suppliers"}
          </p>

          {totalPages > 1 && (
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
          )}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowForm(false);
            }
          }}
        >
          <div className="w-full max-w-[900px] max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {editingSupplier ? "Edit Supplier" : "Add Supplier"}
                </h2>

                <p className="text-xs text-gray-500 mt-0.5">
                  {editingSupplier
                    ? "Update supplier information."
                    : "Enter supplier information."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <FiX size={17} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto"
            >
              <div className="px-5 py-5">
                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-lg mb-4">
                    <FiAlertCircle className="mt-0.5 shrink-0" size={14} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* BASIC */}
                  <FormSection title="Basic Information">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Field label="Supplier Name" required>
                        <input
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          placeholder="e.g. Hotel Snow Valley"
                          required
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Supplier Type" required>
                        <select
                          name="supplierType"
                          value={form.supplierType}
                          onChange={handleChange}
                          required
                          className={inputClass}
                        >
                          {(supplierTypes.length > 0
                            ? supplierTypes
                            : SUPPLIER_TYPES
                          ).map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Status">
                        <select
                          name="status"
                          value={form.status}
                          onChange={handleChange}
                          className={inputClass}
                        >
                          {(supplierStatuses.length > 0
                            ? supplierStatuses
                            : SUPPLIER_STATUSES
                          ).map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Currency">
                        <input
                          name="currency"
                          value={form.currency}
                          onChange={handleChange}
                          placeholder="INR"
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Credit Limit">
                        <input
                          type="number"
                          name="creditLimit"
                          value={form.creditLimit}
                          onChange={handleChange}
                          min="0"
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Rating">
                        <input
                          type="number"
                          name="rating"
                          value={form.rating}
                          onChange={handleChange}
                          min="0"
                          max="5"
                          step="0.1"
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </FormSection>

                  {/* CONTACT */}
                  <FormSection title="Contact Person">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        ["name", "Name"],
                        ["designation", "Designation"],
                        ["phone", "Phone"],
                        ["alternatePhone", "Alternate Phone"],
                        ["email", "Email"],
                        ["whatsapp", "WhatsApp"],
                      ].map(([field, label]) => (
                        <Field key={field} label={label}>
                          <input
                            type={field === "email" ? "email" : "text"}
                            value={form.contactPerson[field]}
                            onChange={(e) =>
                              handleNestedChange(
                                "contactPerson",
                                field,
                                e.target.value
                              )
                            }
                            className={inputClass}
                          />
                        </Field>
                      ))}
                    </div>
                  </FormSection>

                  {/* ADDRESS */}
                  <FormSection title="Address">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        ["street", "Street"],
                        ["city", "City"],
                        ["state", "State"],
                        ["country", "Country"],
                        ["postalCode", "Postal Code"],
                      ].map(([field, label]) => (
                        <Field key={field} label={label}>
                          <input
                            value={form.address[field]}
                            onChange={(e) =>
                              handleNestedChange(
                                "address",
                                field,
                                e.target.value
                              )
                            }
                            className={inputClass}
                          />
                        </Field>
                      ))}
                    </div>
                  </FormSection>

                  {/* TRAVEL INFO */}
                  <FormSection title="Travel Information">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Destinations">
                        <input
                          name="destinations"
                          value={form.destinations}
                          onChange={handleChange}
                          placeholder="Manali, Shimla, Kasol"
                          className={inputClass}
                        />

                        <p className="text-[11px] text-gray-400 mt-1">
                          Separate destinations with commas.
                        </p>
                      </Field>

                      <Field label="Services">
                        <input
                          name="services"
                          value={form.services}
                          onChange={handleChange}
                          placeholder="Hotel Booking, Cab, Sightseeing"
                          className={inputClass}
                        />

                        <p className="text-[11px] text-gray-400 mt-1">
                          Separate services with commas.
                        </p>
                      </Field>

                      <Field label="Owner">
                        <select
                          name="owner"
                          value={form.owner}
                          onChange={handleChange}
                          className={inputClass}
                        >
                          <option value="">Select Owner</option>

                          {assignableUsers.map((user) => (
                            <option key={user._id} value={user._id}>
                              {user.name} ({user.role})
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Website">
                        <input
                          name="website"
                          value={form.website}
                          onChange={handleChange}
                          placeholder="https://..."
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </FormSection>

                  {/* PAYMENT */}
                  <FormSection title="Payment & Cancellation">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Payment Terms">
                        <textarea
                          name="paymentTerms"
                          value={form.paymentTerms}
                          onChange={handleChange}
                          rows={4}
                          placeholder="Enter payment terms..."
                          className={`${inputClass} resize-none`}
                        />
                      </Field>

                      <Field label="Cancellation Policy">
                        <textarea
                          name="cancellationPolicy"
                          value={form.cancellationPolicy}
                          onChange={handleChange}
                          rows={4}
                          placeholder="Enter cancellation policy..."
                          className={`${inputClass} resize-none`}
                        />
                      </Field>
                    </div>
                  </FormSection>

                  {/* NOTES */}
                  <FormSection title="Notes">
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Additional supplier notes..."
                      className={`${inputClass} resize-none`}
                    />
                  </FormSection>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition disabled:opacity-60 min-w-[100px]"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Saving
                    </>
                  ) : editingSupplier ? (
                    "Update Supplier"
                  ) : (
                    "Create Supplier"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {showView && selectedSupplier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowView(false);
            }
          }}
        >
          <div className="w-full max-w-[700px] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 truncate">
                  {selectedSupplier.name}
                </h2>

                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedSupplier.supplierCode || "Supplier Details"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowView(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <FiX size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Info
                  label="Supplier Type"
                  value={selectedSupplier.supplierType}
                />

                <Info label="Status" value={selectedSupplier.status} />

                <Info
                  label="Currency"
                  value={selectedSupplier.currency}
                />

                <Info
                  label="Rating"
                  value={`${selectedSupplier.rating || 0}/5`}
                />
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-3">
                  Contact Person
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Info
                    label="Name"
                    value={selectedSupplier.contactPerson?.name}
                  />

                  <Info
                    label="Designation"
                    value={selectedSupplier.contactPerson?.designation}
                  />

                  <Info
                    label="Phone"
                    value={selectedSupplier.contactPerson?.phone}
                  />

                  <Info
                    label="Email"
                    value={selectedSupplier.contactPerson?.email}
                  />

                  <Info
                    label="WhatsApp"
                    value={selectedSupplier.contactPerson?.whatsapp}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-3">
                  Address
                </h3>

                <Info
                  label="Address"
                  value={[
                    selectedSupplier.address?.street,
                    selectedSupplier.address?.city,
                    selectedSupplier.address?.state,
                    selectedSupplier.address?.country,
                    selectedSupplier.address?.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-2">
                  Destinations
                </h3>

                <div className="flex flex-wrap gap-2">
                  {selectedSupplier.destinations?.length ? (
                    selectedSupplier.destinations.map(
                      (destination, index) => (
                        <span
                          key={index}
                          className="bg-brand-blue-50 text-brand-blue-dark px-3 py-1 rounded-full text-xs font-medium"
                        >
                          {destination}
                        </span>
                      )
                    )
                  ) : (
                    <span className="text-xs text-gray-400">
                      No destinations
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-2">
                  Services
                </h3>

                <div className="flex flex-wrap gap-2">
                  {selectedSupplier.services?.length ? (
                    selectedSupplier.services.map((service, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        {service}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">
                      No services
                    </span>
                  )}
                </div>
              </div>

              {selectedSupplier.notes && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">
                    Notes
                  </h3>

                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    {selectedSupplier.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex justify-end">
              <button
                type="button"
                onClick={() => setShowView(false)}
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

// =====================================================
// SHARED PRIMITIVES
// =====================================================

const inputClass =
  "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 placeholder:text-gray-400";

function Field({ label, required = false, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>

      {children}
    </label>
  );
}

function FormSection({ title, children }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        {title}
      </h3>

      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">
        {label}
      </p>

      <p className="text-sm font-medium text-gray-700">
        {value || "—"}
      </p>
    </div>
  );
}

export default Supplier;