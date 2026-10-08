import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiArchive,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiFilter,
  FiMapPin,
  FiPackage,
  FiPlus,
  FiSearch,
  FiStar,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import api from "../api";

// =====================================================
// CONSTANTS
// =====================================================

const PACKAGE_TYPES = [
  "Domestic",
  "International",
  "Honeymoon",
  "Family",
  "Solo",
  "Corporate",
  "Group",
  "Adventure",
  "Pilgrimage",
  "Luxury",
  "Beach",
  "Wildlife",
  "Other",
];

const HOTEL_CATEGORIES = [
  "Budget",
  "3 Star",
  "4 Star",
  "5 Star",
  "Luxury",
  "Resort",
  "Villa",
  "Apartment",
  "Any",
];

const MEAL_PLANS = [
  "Room Only",
  "Breakfast",
  "Half Board",
  "Full Board",
  "All Inclusive",
];

const TRANSPORTATION_TYPES = [
  "Flight",
  "Train",
  "Bus",
  "Private Cab",
  "Rental Car",
  "Cruise",
  "Mixed",
  "Not Included",
];

const PACKAGE_STATUSES = ["Draft", "Active", "Inactive", "Archived"];

const RECORDS_PER_PAGE = 50;

// =====================================================
// INITIAL STATE
// =====================================================

const initialForm = {
  packageCode: "",
  name: "",
  shortDescription: "",
  description: "",
  destination: "",
  destinations: [],
  country: "",
  packageType: "Domestic",

  duration: { days: 1, nights: 0 },

  suitableFor: [],
  hotelCategory: "3 Star",
  mealPlan: "Breakfast",
  transportation: "Not Included",

  itinerary: [],
  inclusions: [],
  exclusions: [],
  hotels: [],
  transportServices: [],
  activities: [],

  pricing: {
    currency: "INR",
    adultPrice: 0,
    childPrice: 0,
    infantPrice: 0,
    singleSupplement: 0,
    baseCost: 0,
    markupType: "Percentage",
    markupValue: 0,
    discountType: "Fixed",
    discountValue: 0,
  },

  validity: { validFrom: "", validUntil: "" },

  minTravellers: 1,
  maxTravellers: 50,

  images: [],
  tags: [],

  status: "Draft",
  featured: false,

  termsAndConditions: "",
  cancellationPolicy: "",
  notes: "",
};

// =====================================================
// HELPERS
// =====================================================

const getList = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

const getId = (item) => {
  if (!item) return "";
  return item._id || item.id || "";
};

const getDisplayName = (item, fallback = "Unnamed") => {
  if (!item) return fallback;

  return (
    item.name ||
    item.hotelName ||
    item.transportName ||
    item.title ||
    item.code ||
    item.vehicleNumber ||
    item.provider ||
    fallback
  );
};

const getResponseList = (response, key) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;

  return [];
};

const normalizePackage = (pkg) => {
  if (!pkg) return initialForm;

  return {
    ...initialForm,
    ...pkg,

    duration: { ...initialForm.duration, ...(pkg.duration || {}) },
    pricing: { ...initialForm.pricing, ...(pkg.pricing || {}) },

    validity: {
      validFrom: pkg.validity?.validFrom
        ? String(pkg.validity.validFrom).slice(0, 10)
        : "",
      validUntil: pkg.validity?.validUntil
        ? String(pkg.validity.validUntil).slice(0, 10)
        : "",
    },

    destinations: Array.isArray(pkg.destinations) ? pkg.destinations : [],
    suitableFor: Array.isArray(pkg.suitableFor) ? pkg.suitableFor : [],
    inclusions: Array.isArray(pkg.inclusions) ? pkg.inclusions : [],
    exclusions: Array.isArray(pkg.exclusions) ? pkg.exclusions : [],
    images: Array.isArray(pkg.images) ? pkg.images : [],
    tags: Array.isArray(pkg.tags) ? pkg.tags : [],
    itinerary: Array.isArray(pkg.itinerary) ? pkg.itinerary : [],
    hotels: Array.isArray(pkg.hotels) ? pkg.hotels : [],
    transportServices: Array.isArray(pkg.transportServices)
      ? pkg.transportServices
      : [],
    activities: Array.isArray(pkg.activities) ? pkg.activities : [],
  };
};

// =====================================================
// MAIN PAGE
// =====================================================

function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPackages, setTotalPackages] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [viewingPackage, setViewingPackage] = useState(null);

  // =========================
  // FETCH PACKAGES
  // =========================

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError("");

      const params = { page, limit: RECORDS_PER_PAGE };

      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.packageType = typeFilter;
      if (featuredFilter) params.featured = featuredFilter;

      const response = await api.get("/packages", { params });

      const packageList = getResponseList(response, "packages");

      setPackages(packageList);
      setTotalPackages(
        Number(response?.data?.total ?? packageList.length) || 0
      );
      setTotalPages(
        Math.max(
          1,
          Number(
            response?.data?.totalPages ??
              response?.data?.pages ??
              Math.ceil(packageList.length / RECORDS_PER_PAGE)
          )
        )
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load packages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, typeFilter, featuredFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchPackages();
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!error) return;

    const timer = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  // =========================
  // FILTER COUNTS
  // =========================

  const activeFilterCount = useMemo(() => {
    return [search, statusFilter, typeFilter, featuredFilter].filter(Boolean)
      .length;
  }, [search, statusFilter, typeFilter, featuredFilter]);

  const dropdownFilterCount = useMemo(() => {
    return [statusFilter, typeFilter, featuredFilter].filter(Boolean).length;
  }, [statusFilter, typeFilter, featuredFilter]);

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setTypeFilter("");
    setFeaturedFilter("");
    setPage(1);
    setShowFilters(false);
  };

  // =========================
  // ACTIONS
  // =========================

  const handleCreate = () => {
    setEditingPackage(null);
    setShowForm(true);
    setError("");
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setShowForm(true);
    setError("");
  };

  const handleDelete = async (pkg, event) => {
    event?.stopPropagation?.();

    const confirmed = window.confirm(
      `Delete "${pkg.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/packages/${getId(pkg)}`);

      if (packages.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchPackages();
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete package.");
    }
  };

  const handleSaved = async () => {
    setShowForm(false);
    setEditingPackage(null);
    await fetchPackages();
  };

  const handlePreviousPage = () => {
    if (page > 1) setPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage((prev) => prev + 1);
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
              placeholder="Search packages..."
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
                  {/* STATUS */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Status
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                      {PACKAGE_STATUSES.map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() =>
                            setStatusFilter(statusFilter === item ? "" : item)
                          }
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                            statusFilter === item
                              ? "bg-brand-blue text-white border-brand-blue"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* TYPE */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Package type
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
                      {PACKAGE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* FEATURED */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Featured
                    </label>

                    <div className="flex gap-1.5">
                      {[
                        { label: "Featured", value: "true" },
                        { label: "Not Featured", value: "false" },
                      ].map((item) => (
                        <button
                          type="button"
                          key={item.value}
                          onClick={() =>
                            setFeaturedFilter(
                              featuredFilter === item.value ? "" : item.value
                            )
                          }
                          className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition ${
                            featuredFilter === item.value
                              ? "bg-brand-blue text-white border-brand-blue"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {item.label}
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

        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap self-start lg:self-auto"
        >
          <FiPlus size={15} />
          Create Package
        </button>
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

      {/* ERROR */}
      {error && (
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
              <p className="text-sm text-gray-500">Loading packages...</p>
            </div>
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <FiPackage size={24} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-gray-800">
              No packages found
            </h3>

            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              Create your first travel package to get started.
            </p>

            <button
              type="button"
              onClick={handleCreate}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition"
            >
              <FiPlus size={15} />
              Create Package
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Package
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Destination
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Duration
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Price
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
                {packages.map((pkg) => {
                  const id = getId(pkg);

                  return (
                    <tr
                      key={id}
                      onClick={() => setViewingPackage(pkg)}
                      className="hover:bg-brand-blue-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-brand-blue-50 text-brand-blue-dark flex items-center justify-center shrink-0 group-hover:bg-brand-blue-100 transition">
                            <FiPackage size={17} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-800 truncate max-w-[220px]">
                                {pkg.name}
                              </p>

                              {pkg.featured && (
                                <FiStar
                                  size={13}
                                  className="text-amber-500 fill-amber-500 shrink-0"
                                />
                              )}
                            </div>

                            <p className="text-xs text-gray-500 mt-0.5">
                              {pkg.packageCode || "No package code"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                          <FiMapPin size={13} className="text-gray-400" />
                          {pkg.destination || "—"}
                        </div>

                        <p className="text-xs text-gray-500 mt-0.5">
                          {pkg.packageType || "Other"}
                        </p>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-gray-700">
                        {pkg.duration?.days || 0} Days /{" "}
                        {pkg.duration?.nights || 0} Nights
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="text-xs font-bold text-gray-800">
                          {formatCurrency(
                            pkg.pricing?.adultPrice,
                            pkg.pricing?.currency || "INR"
                          )}
                        </p>

                        <p className="text-xs text-gray-500 mt-0.5">
                          Adult price
                        </p>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
                            {
                              Draft:
                                "bg-amber-50 text-amber-700 border-amber-200",
                              Active:
                                "bg-emerald-50 text-emerald-700 border-emerald-200",
                              Inactive:
                                "bg-gray-100 text-gray-600 border-gray-200",
                              Archived:
                                "bg-red-50 text-red-700 border-red-200",
                            }[pkg.status] ||
                            "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {pkg.status || "Draft"}
                        </span>
                      </td>

                      <td
                        className="px-5 py-3.5"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={(event) => handleDelete(pkg, event)}
                            title="Delete"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 bg-transparent hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {!loading && totalPackages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">
              {packages.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">{totalPackages}</span>{" "}
            {totalPackages === 1 ? "package" : "packages"}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePreviousPage}
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
                onClick={handleNextPage}
                disabled={page === totalPages || loading}
                className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* FORM MODAL */}
      {showForm && (
        <PackageForm
          packageData={editingPackage}
          onClose={() => {
            setShowForm(false);
            setEditingPackage(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {/* VIEW MODAL */}
      {viewingPackage && (
        <PackageView
          packageData={viewingPackage}
          onClose={() => setViewingPackage(null)}
          onEdit={() => {
            setViewingPackage(null);
            handleEdit(viewingPackage);
          }}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(.98);
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

// =====================================================
// PACKAGE FORM MODAL
// =====================================================

function PackageForm({ packageData, onClose, onSaved }) {
  const [form, setForm] = useState(normalizePackage(packageData));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const isEditing = Boolean(packageData);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateNested = (section, field, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const addListItem = (field) => {
    setForm((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  };

  const updateListItem = (field, index, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].map((item, itemIndex) =>
        itemIndex === index ? value : item
      ),
    }));
  };

  const removeListItem = (field, index) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addItineraryDay = () => {
    setForm((prev) => ({
      ...prev,
      itinerary: [
        ...prev.itinerary,
        {
          dayNumber: prev.itinerary.length + 1,
          title: "",
          description: "",
          destination: "",
          activities: [],
          meals: [],
          overnightStay: "",
          notes: "",
        },
      ],
    }));
  };

  const updateItineraryDay = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      itinerary: prev.itinerary.map((day, dayIndex) =>
        dayIndex === index ? { ...day, [field]: value } : day
      ),
    }));
  };

  const removeItineraryDay = (index) => {
    setForm((prev) => ({
      ...prev,
      itinerary: prev.itinerary
        .filter((_, dayIndex) => dayIndex !== index)
        .map((day, dayIndex) => ({ ...day, dayNumber: dayIndex + 1 })),
    }));
  };

  const addHotel = () => {
    setForm((prev) => ({
      ...prev,
      hotels: [
        ...prev.hotels,
        { hotel: "", roomType: "", nights: 1, rooms: 1, notes: "" },
      ],
    }));
  };

  const updateHotel = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      hotels: prev.hotels.map((hotel, hotelIndex) =>
        hotelIndex === index ? { ...hotel, [field]: value } : hotel
      ),
    }));
  };

  const removeHotel = (index) => {
    setForm((prev) => ({
      ...prev,
      hotels: prev.hotels.filter((_, hotelIndex) => hotelIndex !== index),
    }));
  };

  const addTransport = () => {
    setForm((prev) => ({
      ...prev,
      transportServices: [
        ...prev.transportServices,
        { transport: "", type: "", description: "", amount: 0 },
      ],
    }));
  };

  const updateTransport = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      transportServices: prev.transportServices.map((transport, i) =>
        i === index ? { ...transport, [field]: value } : transport
      ),
    }));
  };

  const removeTransport = (index) => {
    setForm((prev) => ({
      ...prev,
      transportServices: prev.transportServices.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const addActivity = () => {
    setForm((prev) => ({
      ...prev,
      activities: [
        ...prev.activities,
        {
          name: "",
          description: "",
          location: "",
          duration: 0,
          amount: 0,
          included: true,
          supplier: "",
        },
      ],
    }));
  };

  const updateActivity = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      activities: prev.activities.map((activity, activityIndex) =>
        activityIndex === index
          ? { ...activity, [field]: value }
          : activity
      ),
    }));
  };

  const removeActivity = (index) => {
    setForm((prev) => ({
      ...prev,
      activities: prev.activities.filter(
        (_, activityIndex) => activityIndex !== index
      ),
    }));
  };

  const cleanForm = () => {
    const cleaned = {
      ...form,

      packageCode: form.packageCode?.trim().toUpperCase() || undefined,
      name: form.name.trim(),
      shortDescription: form.shortDescription?.trim() || undefined,
      description: form.description?.trim() || undefined,

      destination: form.destination.trim(),

      destinations: form.destinations.filter(Boolean),
      suitableFor: form.suitableFor.filter(Boolean),
      inclusions: form.inclusions.filter(Boolean),
      exclusions: form.exclusions.filter(Boolean),
      images: form.images.filter(Boolean),
      tags: form.tags.filter(Boolean),

      itinerary: form.itinerary.map((day) => ({
        ...day,
        dayNumber: Number(day.dayNumber),
        title: day.title.trim(),
        description: day.description?.trim() || "",
        destination: day.destination?.trim() || "",
        activities: getList(day.activities),
        meals: getList(day.meals),
        overnightStay: day.overnightStay?.trim() || "",
        notes: day.notes?.trim() || "",
      })),

      hotels: form.hotels
        .filter((item) => item.hotel)
        .map((item) => ({
          ...item,
          nights: Number(item.nights || 0),
          rooms: Number(item.rooms || 1),
        })),

      transportServices: form.transportServices.map((item) => ({
        ...item,
        transport: item.transport || null,
        amount: Number(item.amount || 0),
      })),

      activities: form.activities
        .filter((item) => item.name?.trim())
        .map((item) => ({
          ...item,
          name: item.name.trim(),
          description: item.description?.trim() || "",
          location: item.location?.trim() || "",
          duration: Number(item.duration || 0),
          amount: Number(item.amount || 0),
          supplier: item.supplier || null,
        })),

      duration: {
        days: Number(form.duration.days),
        nights: Number(form.duration.nights),
      },

      pricing: {
        ...form.pricing,
        adultPrice: Number(form.pricing.adultPrice || 0),
        childPrice: Number(form.pricing.childPrice || 0),
        infantPrice: Number(form.pricing.infantPrice || 0),
        singleSupplement: Number(form.pricing.singleSupplement || 0),
        baseCost: Number(form.pricing.baseCost || 0),
        markupValue: Number(form.pricing.markupValue || 0),
        discountValue: Number(form.pricing.discountValue || 0),
      },

      validity: {
        validFrom: form.validity.validFrom || null,
        validUntil: form.validity.validUntil || null,
      },

      minTravellers: Number(form.minTravellers),
      maxTravellers: Number(form.maxTravellers),
    };

    if (!cleaned.packageCode) delete cleaned.packageCode;

    return cleaned;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (!form.name.trim()) throw new Error("Package name is required.");
      if (!form.destination.trim())
        throw new Error("Destination is required.");
      if (Number(form.duration.days) < 1)
        throw new Error("Package duration must be at least 1 day.");
      if (Number(form.minTravellers) > Number(form.maxTravellers))
        throw new Error(
          "Minimum travellers cannot be greater than maximum travellers."
        );

      const payload = cleanForm();

      if (isEditing) {
        await api.put(`/packages/${getId(packageData)}`, payload);
      } else {
        await api.post("/packages", payload);
      }

      await onSaved();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save package."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[900px] max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEditing ? "Edit Package" : "Create Package"}
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              Configure package details, itinerary and pricing.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <FiX size={17} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-5"
        >
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-4">
              <FiAlertCircle size={15} />
              {error}
            </div>
          )}

          <div className="space-y-6">
            <FormSection
              title="Basic Information"
              description="General package information."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Package Name"
                  required
                  value={form.name}
                  onChange={(value) => updateField("name", value)}
                  placeholder="e.g. Kashmir Paradise"
                />

                <Input
                  label="Package Code"
                  value={form.packageCode}
                  onChange={(value) => updateField("packageCode", value)}
                  placeholder="e.g. KASH-001"
                />

                <Input
                  label="Destination"
                  required
                  value={form.destination}
                  onChange={(value) => updateField("destination", value)}
                  placeholder="e.g. Kashmir"
                />

                <Input
                  label="Country"
                  value={form.country}
                  onChange={(value) => updateField("country", value)}
                  placeholder="e.g. India"
                />

                <Select
                  label="Package Type"
                  value={form.packageType}
                  onChange={(value) => updateField("packageType", value)}
                  options={PACKAGE_TYPES}
                />

                <Select
                  label="Status"
                  value={form.status}
                  onChange={(value) => updateField("status", value)}
                  options={PACKAGE_STATUSES}
                />
              </div>

              <Textarea
                label="Short Description"
                value={form.shortDescription}
                onChange={(value) => updateField("shortDescription", value)}
                placeholder="Short package summary..."
              />

              <Textarea
                label="Description"
                rows={4}
                value={form.description}
                onChange={(value) => updateField("description", value)}
                placeholder="Detailed package description..."
              />

              <ListEditor
                label="Destinations"
                values={form.destinations}
                onAdd={() => addListItem("destinations")}
                onChange={(index, value) =>
                  updateListItem("destinations", index, value)
                }
                onRemove={(index) => removeListItem("destinations", index)}
                placeholder="e.g. Srinagar"
              />

              <ListEditor
                label="Suitable For"
                values={form.suitableFor}
                onAdd={() => addListItem("suitableFor")}
                onChange={(index, value) =>
                  updateListItem("suitableFor", index, value)
                }
                onRemove={(index) => removeListItem("suitableFor", index)}
                placeholder="e.g. Couples"
              />
            </FormSection>

            <FormSection
              title="Duration & Travellers"
              description="Package duration and traveller limits."
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <NumberInput
                  label="Days"
                  min={1}
                  value={form.duration.days}
                  onChange={(value) => updateNested("duration", "days", value)}
                />

                <NumberInput
                  label="Nights"
                  min={0}
                  value={form.duration.nights}
                  onChange={(value) =>
                    updateNested("duration", "nights", value)
                  }
                />

                <NumberInput
                  label="Min Travellers"
                  min={1}
                  value={form.minTravellers}
                  onChange={(value) => updateField("minTravellers", value)}
                />

                <NumberInput
                  label="Max Travellers"
                  min={1}
                  value={form.maxTravellers}
                  onChange={(value) => updateField("maxTravellers", value)}
                />
              </div>
            </FormSection>

            <FormSection
              title="Travel Preferences"
              description="Hotel, meals and transportation."
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select
                  label="Hotel Category"
                  value={form.hotelCategory}
                  onChange={(value) => updateField("hotelCategory", value)}
                  options={HOTEL_CATEGORIES}
                />

                <Select
                  label="Meal Plan"
                  value={form.mealPlan}
                  onChange={(value) => updateField("mealPlan", value)}
                  options={MEAL_PLANS}
                />

                <Select
                  label="Transportation"
                  value={form.transportation}
                  onChange={(value) => updateField("transportation", value)}
                  options={TRANSPORTATION_TYPES}
                />
              </div>
            </FormSection>

            <FormSection
              title="Package Itinerary"
              description="Create a day-wise itinerary for this package."
            >
              <div className="space-y-3">
                {form.itinerary.map((day, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-xl p-4 bg-gray-50/50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-brand-blue-50 text-brand-blue-dark flex items-center justify-center text-xs font-semibold">
                          {day.dayNumber}
                        </div>

                        <p className="text-sm font-semibold text-gray-800">
                          Day {day.dayNumber}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItineraryDay(index)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Day Title"
                        required
                        value={day.title}
                        onChange={(value) =>
                          updateItineraryDay(index, "title", value)
                        }
                        placeholder="e.g. Arrival & Srinagar Sightseeing"
                      />

                      <Input
                        label="Destination"
                        value={day.destination}
                        onChange={(value) =>
                          updateItineraryDay(index, "destination", value)
                        }
                        placeholder="e.g. Srinagar"
                      />
                    </div>

                    <div className="mt-3">
                      <Textarea
                        label="Description"
                        value={day.description}
                        onChange={(value) =>
                          updateItineraryDay(index, "description", value)
                        }
                        placeholder="Describe the day's activities..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <Input
                        label="Activities"
                        value={getList(day.activities).join(", ")}
                        onChange={(value) =>
                          updateItineraryDay(index, "activities", value)
                        }
                        placeholder="Sightseeing, Shopping"
                      />

                      <Input
                        label="Meals"
                        value={getList(day.meals).join(", ")}
                        onChange={(value) =>
                          updateItineraryDay(index, "meals", value)
                        }
                        placeholder="Breakfast, Dinner"
                      />

                      <Input
                        label="Overnight Stay"
                        value={day.overnightStay}
                        onChange={(value) =>
                          updateItineraryDay(index, "overnightStay", value)
                        }
                        placeholder="Hotel name"
                      />

                      <Input
                        label="Notes"
                        value={day.notes}
                        onChange={(value) =>
                          updateItineraryDay(index, "notes", value)
                        }
                        placeholder="Special notes"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addItineraryDay}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-brand-blue/40 text-brand-blue hover:bg-brand-blue-50 rounded-lg text-xs font-medium"
                >
                  <FiPlus size={14} />
                  Add Day
                </button>
              </div>
            </FormSection>

            <FormSection
              title="Hotels"
              description="Hotels included in this package."
            >
              <div className="space-y-3">
                {form.hotels.map((hotel, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-semibold text-gray-700">
                        Hotel {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() => removeHotel(index)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Hotel ID"
                        value={getId(hotel.hotel) || hotel.hotel || ""}
                        onChange={(value) =>
                          updateHotel(index, "hotel", value)
                        }
                        placeholder="MongoDB Hotel ID"
                      />

                      <Input
                        label="Room Type"
                        value={hotel.roomType}
                        onChange={(value) =>
                          updateHotel(index, "roomType", value)
                        }
                        placeholder="Deluxe Room"
                      />

                      <NumberInput
                        label="Nights"
                        min={0}
                        value={hotel.nights}
                        onChange={(value) =>
                          updateHotel(index, "nights", value)
                        }
                      />

                      <NumberInput
                        label="Rooms"
                        min={1}
                        value={hotel.rooms}
                        onChange={(value) =>
                          updateHotel(index, "rooms", value)
                        }
                      />
                    </div>

                    <div className="mt-3">
                      <Input
                        label="Notes"
                        value={hotel.notes}
                        onChange={(value) =>
                          updateHotel(index, "notes", value)
                        }
                        placeholder="Hotel notes"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addHotel}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-brand-blue/40 text-brand-blue hover:bg-brand-blue-50 rounded-lg text-xs font-medium"
                >
                  <FiPlus size={14} />
                  Add Hotel
                </button>
              </div>
            </FormSection>

            <FormSection
              title="Transport Services"
              description="Transportation included in this package."
            >
              <div className="space-y-3">
                {form.transportServices.map((transport, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-semibold text-gray-700">
                        Transport {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() => removeTransport(index)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Transport ID"
                        value={
                          getId(transport.transport) ||
                          transport.transport ||
                          ""
                        }
                        onChange={(value) =>
                          updateTransport(index, "transport", value)
                        }
                        placeholder="MongoDB Transport ID"
                      />

                      <Input
                        label="Type"
                        value={transport.type}
                        onChange={(value) =>
                          updateTransport(index, "type", value)
                        }
                        placeholder="Private Cab"
                      />

                      <Input
                        label="Description"
                        value={transport.description}
                        onChange={(value) =>
                          updateTransport(index, "description", value)
                        }
                        placeholder="Airport transfer"
                      />

                      <NumberInput
                        label="Amount"
                        min={0}
                        value={transport.amount}
                        onChange={(value) =>
                          updateTransport(index, "amount", value)
                        }
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addTransport}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-brand-blue/40 text-brand-blue hover:bg-brand-blue-50 rounded-lg text-xs font-medium"
                >
                  <FiPlus size={14} />
                  Add Transport
                </button>
              </div>
            </FormSection>

            <FormSection
              title="Activities"
              description="Activities and experiences included in the package."
            >
              <div className="space-y-3">
                {form.activities.map((activity, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-semibold text-gray-700">
                        Activity {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() => removeActivity(index)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Activity Name"
                        required
                        value={activity.name}
                        onChange={(value) =>
                          updateActivity(index, "name", value)
                        }
                        placeholder="Gondola Ride"
                      />

                      <Input
                        label="Location"
                        value={activity.location}
                        onChange={(value) =>
                          updateActivity(index, "location", value)
                        }
                        placeholder="Gulmarg"
                      />

                      <Input
                        label="Supplier ID"
                        value={
                          getId(activity.supplier) ||
                          activity.supplier ||
                          ""
                        }
                        onChange={(value) =>
                          updateActivity(index, "supplier", value)
                        }
                        placeholder="MongoDB Supplier ID"
                      />

                      <NumberInput
                        label="Duration"
                        min={0}
                        value={activity.duration}
                        onChange={(value) =>
                          updateActivity(index, "duration", value)
                        }
                      />

                      <NumberInput
                        label="Amount"
                        min={0}
                        value={activity.amount}
                        onChange={(value) =>
                          updateActivity(index, "amount", value)
                        }
                      />

                      <label className="flex items-center gap-2 text-xs text-gray-600 pt-7">
                        <input
                          type="checkbox"
                          checked={Boolean(activity.included)}
                          onChange={(event) =>
                            updateActivity(
                              index,
                              "included",
                              event.target.checked
                            )
                          }
                          className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                        />
                        Included in package
                      </label>
                    </div>

                    <div className="mt-3">
                      <Input
                        label="Description"
                        value={activity.description}
                        onChange={(value) =>
                          updateActivity(index, "description", value)
                        }
                        placeholder="Activity description"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addActivity}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-brand-blue/40 text-brand-blue hover:bg-brand-blue-50 rounded-lg text-xs font-medium"
                >
                  <FiPlus size={14} />
                  Add Activity
                </button>
              </div>
            </FormSection>

            <FormSection
              title="Inclusions & Exclusions"
              description="Clearly define what is and isn't included."
            >
              <ListEditor
                label="Inclusions"
                values={form.inclusions}
                onAdd={() => addListItem("inclusions")}
                onChange={(index, value) =>
                  updateListItem("inclusions", index, value)
                }
                onRemove={(index) => removeListItem("inclusions", index)}
                placeholder="Airport transfer"
              />

              <ListEditor
                label="Exclusions"
                values={form.exclusions}
                onAdd={() => addListItem("exclusions")}
                onChange={(index, value) =>
                  updateListItem("exclusions", index, value)
                }
                onRemove={(index) => removeListItem("exclusions", index)}
                placeholder="Personal expenses"
              />
            </FormSection>

            <FormSection
              title="Pricing"
              description="Configure package pricing and markup."
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Input
                  label="Currency"
                  value={form.pricing.currency}
                  onChange={(value) =>
                    updateNested("pricing", "currency", value.toUpperCase())
                  }
                  placeholder="INR"
                />

                <NumberInput
                  label="Adult Price"
                  min={0}
                  value={form.pricing.adultPrice}
                  onChange={(value) =>
                    updateNested("pricing", "adultPrice", value)
                  }
                />

                <NumberInput
                  label="Child Price"
                  min={0}
                  value={form.pricing.childPrice}
                  onChange={(value) =>
                    updateNested("pricing", "childPrice", value)
                  }
                />

                <NumberInput
                  label="Infant Price"
                  min={0}
                  value={form.pricing.infantPrice}
                  onChange={(value) =>
                    updateNested("pricing", "infantPrice", value)
                  }
                />

                <NumberInput
                  label="Single Supplement"
                  min={0}
                  value={form.pricing.singleSupplement}
                  onChange={(value) =>
                    updateNested("pricing", "singleSupplement", value)
                  }
                />

                <NumberInput
                  label="Base Cost"
                  min={0}
                  value={form.pricing.baseCost}
                  onChange={(value) =>
                    updateNested("pricing", "baseCost", value)
                  }
                />

                <Select
                  label="Markup Type"
                  value={form.pricing.markupType}
                  onChange={(value) =>
                    updateNested("pricing", "markupType", value)
                  }
                  options={["Percentage", "Fixed"]}
                />

                <NumberInput
                  label="Markup Value"
                  min={0}
                  value={form.pricing.markupValue}
                  onChange={(value) =>
                    updateNested("pricing", "markupValue", value)
                  }
                />

                <Select
                  label="Discount Type"
                  value={form.pricing.discountType}
                  onChange={(value) =>
                    updateNested("pricing", "discountType", value)
                  }
                  options={["Percentage", "Fixed"]}
                />

                <NumberInput
                  label="Discount Value"
                  min={0}
                  value={form.pricing.discountValue}
                  onChange={(value) =>
                    updateNested("pricing", "discountValue", value)
                  }
                />
              </div>
            </FormSection>

            <FormSection
              title="Validity"
              description="Define when this package can be sold."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Valid From"
                  type="date"
                  value={form.validity.validFrom}
                  onChange={(value) =>
                    updateNested("validity", "validFrom", value)
                  }
                />

                <Input
                  label="Valid Until"
                  type="date"
                  value={form.validity.validUntil}
                  onChange={(value) =>
                    updateNested("validity", "validUntil", value)
                  }
                />
              </div>
            </FormSection>

            <FormSection
              title="Terms & Notes"
              description="Additional package policies and notes."
            >
              <Textarea
                label="Terms & Conditions"
                rows={4}
                value={form.termsAndConditions}
                onChange={(value) =>
                  updateField("termsAndConditions", value)
                }
                placeholder="Package terms and conditions..."
              />

              <Textarea
                label="Cancellation Policy"
                rows={4}
                value={form.cancellationPolicy}
                onChange={(value) =>
                  updateField("cancellationPolicy", value)
                }
                placeholder="Cancellation policy..."
              />

              <Textarea
                label="Internal Notes"
                rows={3}
                value={form.notes}
                onChange={(value) => updateField("notes", value)}
                placeholder="Internal notes..."
              />

              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={Boolean(form.featured)}
                  onChange={(event) =>
                    updateField("featured", event.target.checked)
                  }
                  className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                />
                Mark as featured package
              </label>
            </FormSection>
          </div>

          <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue hover:bg-brand-blue-dark disabled:opacity-60 text-white text-sm font-medium"
            >
              {saving && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}

              {saving
                ? "Saving..."
                : isEditing
                ? "Update Package"
                : "Create Package"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =====================================================
// PACKAGE VIEW MODAL
// =====================================================

function PackageView({ packageData, onClose, onEdit }) {
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const sections = [
    ["overview", "Overview"],
    ["itinerary", "Itinerary"],
    ["hotels", "Hotels"],
    ["transport", "Transport"],
    ["activities", "Activities"],
    ["pricing", "Pricing"],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[1000px] max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {packageData.name}
              </h2>

              {packageData.featured && (
                <FiStar
                  size={14}
                  className="text-amber-500 fill-amber-500"
                />
              )}
            </div>

            <p className="text-xs text-gray-500 mt-0.5">
              {packageData.packageCode || "No package code"} •{" "}
              {packageData.destination}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-medium"
            >
              <FiEdit2 size={14} />
              Edit
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100"
            >
              <FiX size={17} />
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 flex gap-1 overflow-x-auto">
          {sections.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSection(key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                activeSection === key
                  ? "bg-brand-blue-50 text-brand-blue-dark"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeSection === "overview" && (
            <PackageOverview packageData={packageData} />
          )}

          {activeSection === "itinerary" && (
            <ItineraryView packageData={packageData} />
          )}

          {activeSection === "hotels" && (
            <HotelsView packageData={packageData} />
          )}

          {activeSection === "transport" && (
            <TransportView packageData={packageData} />
          )}

          {activeSection === "activities" && (
            <ActivitiesView packageData={packageData} />
          )}

          {activeSection === "pricing" && (
            <PricingView packageData={packageData} />
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// VIEW SECTIONS
// =====================================================

function PackageOverview({ packageData }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ViewStat
          label="Duration"
          value={`${packageData.duration?.days || 0} Days`}
        />

        <ViewStat
          label="Nights"
          value={`${packageData.duration?.nights || 0} Nights`}
        />

        <ViewStat
          label="Adult Price"
          value={formatCurrency(
            packageData.pricing?.adultPrice,
            packageData.pricing?.currency || "INR"
          )}
        />

        <ViewStat label="Status" value={packageData.status || "Draft"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <InfoPanel title="Package Details">
          <InfoRow label="Destination" value={packageData.destination} />
          <InfoRow label="Country" value={packageData.country} />
          <InfoRow label="Package Type" value={packageData.packageType} />
          <InfoRow label="Hotel Category" value={packageData.hotelCategory} />
          <InfoRow label="Meal Plan" value={packageData.mealPlan} />
          <InfoRow
            label="Transportation"
            value={packageData.transportation}
          />
        </InfoPanel>

        <InfoPanel title="Validity & Travellers">
          <InfoRow
            label="Valid From"
            value={formatDate(packageData.validity?.validFrom)}
          />
          <InfoRow
            label="Valid Until"
            value={formatDate(packageData.validity?.validUntil)}
          />
          <InfoRow
            label="Minimum Travellers"
            value={packageData.minTravellers}
          />
          <InfoRow
            label="Maximum Travellers"
            value={packageData.maxTravellers}
          />
          <InfoRow
            label="Featured"
            value={packageData.featured ? "Yes" : "No"}
          />
        </InfoPanel>
      </div>

      {packageData.shortDescription && (
        <InfoPanel title="Short Description">
          <p className="text-sm text-gray-600 leading-6">
            {packageData.shortDescription}
          </p>
        </InfoPanel>
      )}

      {packageData.description && (
        <InfoPanel title="Description">
          <p className="text-sm text-gray-600 leading-6 whitespace-pre-line">
            {packageData.description}
          </p>
        </InfoPanel>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ArrayPanel
          title="Inclusions"
          values={packageData.inclusions}
          positive
        />

        <ArrayPanel title="Exclusions" values={packageData.exclusions} />
      </div>

      {packageData.termsAndConditions && (
        <InfoPanel title="Terms & Conditions">
          <p className="text-sm text-gray-600 leading-6 whitespace-pre-line">
            {packageData.termsAndConditions}
          </p>
        </InfoPanel>
      )}

      {packageData.cancellationPolicy && (
        <InfoPanel title="Cancellation Policy">
          <p className="text-sm text-gray-600 leading-6 whitespace-pre-line">
            {packageData.cancellationPolicy}
          </p>
        </InfoPanel>
      )}
    </div>
  );
}

function ItineraryView({ packageData }) {
  if (!packageData.itinerary?.length) {
    return <EmptyView text="No itinerary added." />;
  }

  return (
    <div className="space-y-3">
      {packageData.itinerary.map((day, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-xl p-4"
        >
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-blue-50 text-brand-blue-dark flex items-center justify-center text-xs font-semibold shrink-0">
              {day.dayNumber}
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-800">
                {day.title}
              </h3>

              {day.destination && (
                <p className="text-xs text-brand-blue mt-1">
                  {day.destination}
                </p>
              )}

              {day.description && (
                <p className="text-xs text-gray-600 mt-2 leading-5">
                  {day.description}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <InfoRow
                  label="Activities"
                  value={getList(day.activities).join(", ") || "—"}
                />

                <InfoRow
                  label="Meals"
                  value={getList(day.meals).join(", ") || "—"}
                />

                <InfoRow
                  label="Overnight"
                  value={day.overnightStay || "—"}
                />
              </div>

              {day.notes && (
                <p className="text-xs text-gray-500 mt-3">
                  <span className="font-medium text-gray-700">Notes:</span>{" "}
                  {day.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HotelsView({ packageData }) {
  if (!packageData.hotels?.length) {
    return <EmptyView text="No hotels added." />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {packageData.hotels.map((item, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <FiMapPin size={16} />
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-800">
                {getDisplayName(item.hotel, "Hotel")}
              </h3>

              <p className="text-[11px] text-gray-400">
                {item.roomType || "Room type not specified"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <InfoRow label="Nights" value={item.nights || 0} />
            <InfoRow label="Rooms" value={item.rooms || 1} />
          </div>

          {item.notes && (
            <p className="text-xs text-gray-500 mt-3">{item.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function TransportView({ packageData }) {
  if (!packageData.transportServices?.length) {
    return <EmptyView text="No transport services added." />;
  }

  return (
    <div className="space-y-3">
      {packageData.transportServices.map((item, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-800">
                {item.type || "Transport Service"}
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                {getDisplayName(item.transport, "Transport")}
              </p>
            </div>

            <p className="text-sm font-semibold text-gray-800">
              {formatCurrency(item.amount)}
            </p>
          </div>

          {item.description && (
            <p className="text-xs text-gray-500 mt-3">
              {item.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function ActivitiesView({ packageData }) {
  if (!packageData.activities?.length) {
    return <EmptyView text="No activities added." />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {packageData.activities.map((activity, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-xl p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-gray-800">
                {activity.name}
              </h3>

              {activity.location && (
                <p className="text-xs text-gray-500 mt-1">
                  {activity.location}
                </p>
              )}
            </div>

            <span
              className={`text-[10px] px-2 py-1 rounded-full ${
                activity.included
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {activity.included ? "Included" : "Optional"}
            </span>
          </div>

          {activity.description && (
            <p className="text-xs text-gray-500 mt-3 leading-5">
              {activity.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 mt-4">
            <InfoRow
              label="Duration"
              value={activity.duration ? `${activity.duration} mins` : "—"}
            />

            <InfoRow
              label="Amount"
              value={formatCurrency(activity.amount)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PricingView({ packageData }) {
  const pricing = packageData.pricing || {};

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <PriceCard
          label="Adult Price"
          value={formatCurrency(
            pricing.adultPrice,
            pricing.currency || "INR"
          )}
        />

        <PriceCard
          label="Child Price"
          value={formatCurrency(
            pricing.childPrice,
            pricing.currency || "INR"
          )}
        />

        <PriceCard
          label="Infant Price"
          value={formatCurrency(
            pricing.infantPrice,
            pricing.currency || "INR"
          )}
        />
      </div>

      <InfoPanel title="Cost & Markup">
        <InfoRow
          label="Base Cost"
          value={formatCurrency(pricing.baseCost, pricing.currency || "INR")}
        />

        <InfoRow
          label="Markup"
          value={`${pricing.markupValue || 0} ${
            pricing.markupType === "Percentage"
              ? "%"
              : pricing.currency || "INR"
          }`}
        />

        <InfoRow
          label="Discount"
          value={`${pricing.discountValue || 0} ${
            pricing.discountType === "Percentage"
              ? "%"
              : pricing.currency || "INR"
          }`}
        />

        <InfoRow
          label="Single Supplement"
          value={formatCurrency(
            pricing.singleSupplement,
            pricing.currency || "INR"
          )}
        />
      </InfoPanel>
    </div>
  );
}

// =====================================================
// FORM PRIMITIVES
// =====================================================

function FormSection({ title, description, children }) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>

        {description && (
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        )}
      </div>

      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>

      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
      />
    </label>
  );
}

function NumberInput({ label, value, onChange, min = 0 }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
      </span>

      <input
        type="number"
        min={min}
        value={value ?? 0}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
      </span>

      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
      </span>

      <textarea
        rows={rows}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none resize-none focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
      />
    </label>
  );
}

function ListEditor({ label, values, onAdd, onChange, onRemove, placeholder }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">{label}</span>

        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-xs text-brand-blue hover:text-brand-blue-dark"
        >
          <FiPlus size={13} />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {values.length === 0 && (
          <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg px-3 py-2.5">
            No items added.
          </p>
        )}

        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={value}
              onChange={(event) => onChange(index, event.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:border-brand-blue"
            />

            <button
              type="button"
              onClick={() => onRemove(index)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// VIEW PRIMITIVES
// =====================================================

function ViewStat({ label, value }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
      <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">
        {label}
      </p>

      <p className="text-sm font-semibold text-gray-800 mt-1">{value}</p>
    </div>
  );
}

function InfoPanel({ title, children }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-400">{label}</span>

      <span className="text-xs font-medium text-gray-700 text-right">
        {value || "—"}
      </span>
    </div>
  );
}

function ArrayPanel({ title, values, positive = false }) {
  return (
    <InfoPanel title={title}>
      {!values?.length ? (
        <p className="text-xs text-gray-400">No items added.</p>
      ) : (
        <div className="space-y-2">
          {values.map((value, index) => (
            <div key={index} className="flex items-start gap-2">
              <span
                className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                  positive
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {positive ? "✓" : "×"}
              </span>

              <span className="text-xs text-gray-600">{value}</span>
            </div>
          ))}
        </div>
      )}
    </InfoPanel>
  );
}

function PriceCard({ label, value }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
      <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">
        {label}
      </p>

      <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function EmptyView({ text }) {
  return (
    <div className="py-16 text-center">
      <div className="w-14 h-14 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
        <FiPackage size={23} />
      </div>

      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

export default Packages;