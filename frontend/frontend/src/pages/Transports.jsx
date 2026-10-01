import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiEdit2,
  FiTrash2,
  FiX,
  FiAlertCircle,
  FiTruck,
  FiMapPin,
  FiClock,
  FiDollarSign,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import api from "../api";
import TransportForm from "../components/TransportForm";
import TransportView from "../components/TransportView";

// =====================================================
// CONSTANTS
// =====================================================

const transportTypes = [
  "Flight",
  "Train",
  "Bus",
  "Private Cab",
  "Rental Car",
  "Cruise",
  "Other",
];

const statusOptions = ["Active", "Inactive"];

const RECORDS_PER_PAGE = 50;

const formatFare = (fare, currency = "INR") => {
  if (fare === undefined || fare === null || fare === "") return "—";
  return `${currency} ${Number(fare).toLocaleString("en-IN")}`;
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

// =====================================================
// MAIN PAGE
// =====================================================

function Transports() {
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransports, setTotalTransports] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingTransport, setEditingTransport] = useState(null);
  const [viewingTransport, setViewingTransport] = useState(null);

  /* =========================
     FETCH
  ========================= */

  const fetchTransports = async () => {
    try {
      setLoading(true);
      setError("");

      const params = { page, limit: RECORDS_PER_PAGE };

      if (search.trim()) params.search = search.trim();
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get("/transports", { params });
      const list = response.data.transports || [];

      setTransports(list);
      setTotalTransports(Number(response.data?.total ?? list.length) || 0);
      setTotalPages(
        Math.max(
          1,
          Number(
            response.data?.totalPages ??
              response.data?.pages ??
              Math.ceil(list.length / RECORDS_PER_PAGE)
          )
        )
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to fetch transport records"));
      setTransports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransports();
  }, [page, typeFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchTransports();
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  /* =========================
     CLOSE FILTER OUTSIDE CLICK
  ========================= */

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
     ALERT AUTO-DISMISS
  ========================= */

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  /* =========================
     FILTER COUNTS
  ========================= */

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

  /* =========================
     ACTIONS
  ========================= */

  const openCreateForm = () => {
    setEditingTransport(null);
    setError("");
    setShowForm(true);
  };

  const openEditForm = (transport) => {
    setEditingTransport(transport);
    setError("");
    setViewingTransport(null);
    setShowForm(true);
  };

  const handleRowClick = (transport) => {
    setViewingTransport(transport);
  };

  const handleDelete = async (transport) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${transport.name}"?`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/transports/${transport._id}`);
      if (transports.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchTransports();
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete transport record"));
    }
  };

  /* =========================
     RENDER
  ========================= */

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
              placeholder="Search transports..."
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
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Type
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {transportTypes.map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() =>
                            setTypeFilter(typeFilter === item ? "" : item)
                          }
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                            typeFilter === item
                              ? "bg-brand-blue text-white border-brand-blue"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Status
                    </label>
                    <div className="flex gap-1.5">
                      {statusOptions.map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() =>
                            setStatusFilter(statusFilter === item ? "" : item)
                          }
                          className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition ${
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
          onClick={openCreateForm}
          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap self-start lg:self-auto"
        >
          <FiPlus size={15} />
          Add Transport
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
                Loading transport records...
              </p>
            </div>
          </div>
        ) : transports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <FiTruck size={24} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-gray-800">
              No transport records found
            </h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              Add your first transport service to start managing travel
              operations.
            </p>

            <button
              type="button"
              onClick={openCreateForm}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition"
            >
              <FiPlus size={15} />
              Add Transport
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Transport
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Route
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Duration
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Fare
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
                {transports.map((transport) => (
                  <tr
                    key={transport._id}
                    onClick={() => handleRowClick(transport)}
                    className="cursor-pointer hover:bg-brand-blue-50/30 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-blue-50 text-brand-blue flex items-center justify-center shrink-0">
                          <FiTruck size={17} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate max-w-[220px]">
                            {transport.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {transport.code || "No code"}
                            {transport.provider
                              ? ` • ${transport.provider}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold bg-brand-blue-50 text-brand-blue-dark border-brand-blue/20">
                        {transport.type || "Other"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <FiMapPin
                          size={13}
                          className="text-gray-400 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-700">
                            {transport.departure?.location || "—"}
                          </p>
                          <p className="text-[10px] uppercase text-gray-400 my-0.5">
                            to
                          </p>
                          <p className="truncate font-medium text-gray-700">
                            {transport.arrival?.location || "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <FiClock size={13} className="text-gray-400" />
                        {transport.duration || "—"}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                        <FiDollarSign size={13} className="text-gray-400" />
                        {formatFare(
                          transport.fare,
                          transport.currency || "INR"
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
                          transport.status === "Active"
                            ? "bg-brand-gold-50 text-brand-gold-dark border-brand-gold/30"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {transport.status || "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openEditForm(transport)}
                          title="Edit"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 bg-gray-50 hover:text-brand-gold-dark hover:bg-brand-gold-50 transition"
                        >
                          <FiEdit2 size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(transport)}
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
      {!loading && totalTransports > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">
              {transports.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">
              {totalTransports}
            </span>{" "}
            {totalTransports === 1 ? "transport" : "transports"}
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

      {/* FORM MODAL */}
      {showForm && (
        <TransportForm
          transport={editingTransport}
          onClose={() => {
            setShowForm(false);
            setEditingTransport(null);
          }}
          onSuccess={fetchTransports}
        />
      )}

      {/* VIEW MODAL */}
      {viewingTransport && (
        <TransportView
          transport={viewingTransport}
          onClose={() => setViewingTransport(null)}
        />
      )}
    </div>
  );
}

export default Transports;