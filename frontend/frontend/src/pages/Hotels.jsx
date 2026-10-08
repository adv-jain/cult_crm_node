import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiX,
  FiPlus,
  FiSearch,
  FiFilter,
  FiTrash2,
  FiStar,
  FiMapPin,
  FiHome,
  FiUsers,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import HotelForm from "../components/HotelForm";
import HotelView from "../components/HotelView";

// =====================================================
// CONSTANTS
// =====================================================

const categories = [
  "Budget",
  "2 Star",
  "3 Star",
  "4 Star",
  "5 Star",
  "Luxury",
  "Resort",
  "Boutique",
  "Villa",
  "Apartment",
  "Hostel",
  "Other",
];

const RECORDS_PER_PAGE = 50;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

// =====================================================
// MAIN PAGE
// =====================================================

function Hotels() {
  const { user } = useAuth();

  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [destination, setDestination] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalHotelsCount, setTotalHotelsCount] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [viewingHotel, setViewingHotel] = useState(null);

  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canManage = ["admin", "manager", "operations"].includes(user?.role);
  const canDelete = canManage;

  // =========================
  // FETCH HOTELS
  // =========================

  const fetchHotels = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) params.set("search", search.trim());
      if (category) params.set("category", category);
      if (status) params.set("status", status);
      if (destination.trim()) params.set("destination", destination.trim());

      params.set("page", page);
      params.set("limit", RECORDS_PER_PAGE);

      const response = await api.get(`/hotels?${params.toString()}`);
      const list = response.data?.hotels || [];

      setHotels(list);
      setTotalHotelsCount(Number(response.data?.total ?? list.length) || 0);
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
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to fetch hotels."));
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, status, destination]);

  // =========================
  // DEBOUNCED SEARCH
  // =========================

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchHotels();
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
    return [search, category, status, destination].filter(Boolean).length;
  }, [search, category, status, destination]);

  const dropdownFilterCount = useMemo(() => {
    return [category, status, destination].filter(Boolean).length;
  }, [category, status, destination]);

  const handleClearFilters = () => {
    setSearch("");
    setCategory("");
    setStatus("");
    setDestination("");
    setPage(1);
    setShowFilters(false);
  };

  // =========================
  // ACTIONS
  // =========================

  const handleDelete = async (hotel, event) => {
    event?.stopPropagation?.();

    const confirmed = window.confirm(
      `Delete "${hotel.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeleteLoading(true);
      await api.delete(`/hotels/${hotel._id}`);

      if (hotels.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchHotels();
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to delete hotel."));
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  const openCreate = () => {
    setEditingHotel(null);
    setShowForm(true);
  };

  const openEdit = (hotel) => {
    setEditingHotel(hotel);
    setShowForm(true);
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
              placeholder="Search hotels..."
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
                      Destination
                    </label>
                    <input
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Filter destination..."
                      className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue cursor-pointer"
                    >
                      <option value="">All Categories</option>
                      {categories.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Status
                    </label>
                    <div className="flex gap-1.5">
                      {["Active", "Inactive"].map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() => setStatus(status === item ? "" : item)}
                          className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition ${
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

        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap self-start lg:self-auto"
          >
            <FiPlus size={15} />
            Add Hotel
          </button>
        )}
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
              <p className="text-sm text-gray-500">Loading hotels...</p>
            </div>
          </div>
        ) : hotels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <FiHome size={24} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-gray-800">
              No hotels found
            </h3>

            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              Add your first hotel to start building your accommodation
              inventory.
            </p>

            {canManage && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition"
              >
                <FiPlus size={15} />
                Add Hotel
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Hotel
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Destination
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Rooms
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Rating
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  {canDelete && (
                    <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {hotels.map((hotel) => (
                  <tr
                    key={hotel._id}
                    onClick={() => setViewingHotel(hotel)}
                    className="hover:bg-brand-blue-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-blue-50 text-brand-blue flex items-center justify-center shrink-0 group-hover:bg-brand-blue-100 transition">
                          <FiHome size={17} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate max-w-[190px]">
                            {hotel.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {hotel.code || "No code"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                        <FiMapPin size={13} className="text-gray-400" />
                        {hotel.destination || "—"}
                      </div>

                      {hotel.city && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {hotel.city}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold bg-brand-blue-50 text-brand-blue-dark border-brand-blue/20">
                        {hotel.category || "Other"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <FiUsers size={13} className="text-gray-400" />
                        {hotel.roomTypes?.length || 0} types
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <FiStar size={13} className="text-brand-gold" />
                        <span className="text-xs font-semibold text-gray-700">
                          {Number(hotel.rating || 0).toFixed(1)}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
                          hotel.status === "Active"
                            ? "bg-brand-gold-50 text-brand-gold-dark border-brand-gold/30"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {hotel.status}
                      </span>
                    </td>

                    {canDelete && (
                      <td
                        className="px-5 py-3.5"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={(event) => handleDelete(hotel, event)}
                            title="Delete"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 bg-transparent hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {!loading && totalHotelsCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">{hotels.length}</span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">
              {totalHotelsCount}
            </span>{" "}
            {totalHotelsCount === 1 ? "hotel" : "hotels"}
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
        <HotelForm
          hotel={editingHotel}
          onClose={() => {
            setShowForm(false);
            setEditingHotel(null);
          }}
          onSuccess={fetchHotels}
        />
      )}

      {/* VIEW MODAL */}
      {viewingHotel && (
        <HotelView
          hotel={viewingHotel}
          onClose={() => setViewingHotel(null)}
          onEdit={
            canManage
              ? () => {
                  setViewingHotel(null);
                  openEdit(viewingHotel);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

export default Hotels;