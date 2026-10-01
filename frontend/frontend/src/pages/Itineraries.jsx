import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiX,
  FiAlertCircle,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiCalendar,
  FiMapPin,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiDownload,
  FiLink,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import api from "../api";
import { useAuth } from "../context/AuthContext";

import {
  STATUS_OPTIONS,
  RECORDS_PER_PAGE,
  statusClasses,
  formatDate,
  generateItineraryPDF,
} from "../utils/itineraryUtils";

import ViewItinerary from "../components/itinerary/ItineraryView";
import ItineraryEditModal from "../components/quotation/ItineraryEditModal";

// =====================================================
// MAIN PAGE
// =====================================================

export default function Itineraries() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ===================================================
  // DATA
  // ===================================================

  const [itineraries, setItineraries] = useState([]);

  // ===================================================
  // UI STATE
  // ===================================================

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItineraries, setTotalItineraries] = useState(0);

  // ===================================================
  // MODALS
  // ===================================================

  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // ===================================================
  // PERMISSION
  // ===================================================

  const canDelete = user?.role === "admin";

  // ===================================================
  // FETCH ITINERARIES
  // ===================================================

  const fetchItineraries = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/itineraries", {
        params: {
          page,
          limit: RECORDS_PER_PAGE,
          search: search.trim() || undefined,
          status: status || undefined,
        },
      });

      const list =
        response.data?.itineraries ||
        response.data?.data ||
        [];

      setItineraries(list);

      const total =
        Number(
          response.data?.total ??
            response.data?.pagination?.total ??
            list.length
        ) || 0;

      setTotalItineraries(total);

      const pages =
        Number(
          response.data?.totalPages ??
            response.data?.pagination?.totalPages ??
            Math.ceil(total / RECORDS_PER_PAGE)
        ) || 1;

      setTotalPages(Math.max(1, pages));
    } catch (err) {
      console.error("Fetch itineraries error:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load itineraries."
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // INITIAL + REFETCH
  // ===================================================

  useEffect(() => {
    fetchItineraries();
  }, [page, status]);

  // ===================================================
  // SEARCH DEBOUNCE
  // ===================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        fetchItineraries();
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // ===================================================
  // CLOSE FILTER ON OUTSIDE CLICK
  // ===================================================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target)
      ) {
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

  // ===================================================
  // ERROR AUTO-DISMISS
  // ===================================================

  useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => setError(""), 4000);

    return () => clearTimeout(timer);
  }, [error]);

  // ===================================================
  // FILTER COUNTS
  // ===================================================

  const activeFilterCount = useMemo(
    () => [search, status].filter(Boolean).length,
    [search, status]
  );

  const dropdownFilterCount = useMemo(
    () => [status].filter(Boolean).length,
    [status]
  );

  // ===================================================
  // CLEAR FILTERS
  // ===================================================

  const handleClearFilters = () => {
    setSearch("");
    setStatus("");
    setPage(1);
    setShowFilters(false);
  };

  // ===================================================
  // EDIT ITINERARY
  // ===================================================

  const handleEdit = (itinerary) => {
    setEditError("");
    setEditing(itinerary);
  };

  const handleCloseEdit = () => {
    if (saving) return;

    setEditing(null);
    setEditError("");
  };

  const handleSaveItinerary = async (payload) => {
    if (!editing?._id) return;

    try {
      setSaving(true);
      setEditError("");

      await api.put(`/itineraries/${editing._id}`, payload);

      setEditing(null);
      await fetchItineraries();
    } catch (err) {
      setEditError(
        err?.response?.data?.message ||
          "Unable to update itinerary."
      );
    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // DELETE
  // ===================================================

  const handleDelete = async (itinerary) => {
    const confirmed = window.confirm(
      `Delete itinerary "${itinerary.title}"?`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/itineraries/${itinerary._id}`);

      if (itineraries.length === 1 && page > 1) {
        setPage((value) => value - 1);
      } else {
        await fetchItineraries();
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to delete itinerary."
      );
    }
  };

  // ===================================================
  // DOWNLOAD PDF
  // ===================================================

  const handleDownloadPDF = async (itinerary) => {
    try {
      await generateItineraryPDF(itinerary);
    } catch (err) {
      console.error("PDF generation error:", err);
      setError("Unable to generate PDF. Please try again.");
    }
  };

  // ===================================================
  // NAVIGATE TO QUOTATIONS
  // ===================================================

  const handleGoToQuotations = () => {
    navigate("/quotations");
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">

      {/* =================================================
          INFO BANNER — How it works
      ================================================= */}

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <FiFileText size={16} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-900">
            How itineraries work
          </p>

          <p className="text-xs text-blue-700 mt-0.5 leading-5">
            Itineraries are automatically created when you create a
            quotation. Open any itinerary below to view details, edit
            day-wise plans, or download the PDF.
          </p>
        </div>
      </div>

      {/* =================================================
          HEADER
      ================================================= */}

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
              placeholder="Search itineraries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 h-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
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
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <FiFilter size={14} />

              <span className="hidden sm:inline">Filters</span>

              {dropdownFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-semibold bg-blue-600 text-white rounded-full">
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
                            setStatus(status === item ? "" : item)
                          }
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                            status === item
                              ? "bg-blue-600 text-white border-blue-600"
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
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40"
                  >
                    Clear all
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* NO CREATE BUTTON — itineraries auto-create hote hain */}
      </div>

      {/* =================================================
          ACTIVE FILTERS
      ================================================= */}

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            {activeFilterCount} filter
            {activeFilterCount > 1 ? "s" : ""} active
          </span>

          <button
            type="button"
            onClick={handleClearFilters}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">
          <FiAlertCircle
            className="flex-shrink-0 mt-0.5"
            size={18}
          />

          <p className="flex-1">{error}</p>

          <button
            type="button"
            onClick={() => setError("")}
            className="text-red-600 hover:text-red-800"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">
                Loading itineraries...
              </p>
            </div>
          </div>
        ) : itineraries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <FiCalendar size={24} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-gray-800">
              No itineraries found
            </h3>

            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              Itineraries are automatically created when you create a
              quotation. Go to Quotations to create one.
            </p>

            <button
              type="button"
              onClick={handleGoToQuotations}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              <FiLink size={15} />
              Go to Quotations
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Itinerary
                  </th>

                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Quotation
                  </th>

                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Destination
                  </th>

                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Dates
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
                {itineraries.map((itinerary) => (
                  <tr
                    key={itinerary._id}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    {/* ITINERARY */}

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <FiFileText size={17} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate max-w-[220px]">
                            {itinerary.title}
                          </p>

                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {itinerary.itineraryNumber || "Auto"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* QUOTATION */}

                    <td className="px-5 py-3.5">
                      {itinerary.quotation ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                          <FiLink
                            size={12}
                            className="text-gray-400"
                          />

                          {itinerary.quotation.quotationNumber ||
                            "Linked"}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          —
                        </span>
                      )}
                    </td>

                    {/* DESTINATION */}

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <FiMapPin
                          size={13}
                          className="text-gray-400"
                        />

                        {itinerary.destination || "—"}
                      </div>
                    </td>

                    {/* DATES */}

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <FiCalendar
                          size={13}
                          className="text-gray-400"
                        />

                        {formatDate(itinerary.startDate)}

                        {itinerary.endDate
                          ? ` - ${formatDate(itinerary.endDate)}`
                          : ""}
                      </div>
                    </td>

                    {/* STATUS */}

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
                          statusClasses[itinerary.status] ||
                          "bg-gray-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        {itinerary.status || "Draft"}
                      </span>
                    </td>

                    {/* ACTIONS */}

                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* VIEW */}

                        <button
                          type="button"
                          onClick={() => setViewing(itinerary)}
                          title="View"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 bg-gray-50 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <FiEye size={15} />
                        </button>

                        {/* PDF */}

                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(itinerary)}
                          title="Download PDF"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 bg-gray-50 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <FiDownload size={15} />
                        </button>

                        {/* EDIT */}

                        <button
                          type="button"
                          onClick={() => handleEdit(itinerary)}
                          title="Edit"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 bg-gray-50 hover:text-amber-600 hover:bg-amber-50"
                        >
                          <FiEdit2 size={15} />
                        </button>

                        {/* DELETE */}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(itinerary)}
                            title="Delete"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 bg-gray-50 hover:text-red-600 hover:bg-red-50"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =================================================
          PAGINATION
      ================================================= */}

      {!loading && totalItineraries > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">
              {itineraries.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">
              {totalItineraries}
            </span>{" "}
            itineraries
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setPage((prev) => Math.max(1, prev - 1))
              }
              disabled={page === 1 || loading}
              className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
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
              className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* =================================================
          VIEW ITINERARY MODAL
      ================================================= */}

      {viewing && (
        <ViewItinerary
          itinerary={viewing}
          onClose={() => setViewing(null)}
          onDownloadPDF={handleDownloadPDF}
        />
      )}

      {/* =================================================
          EDIT ITINERARY MODAL
      ================================================= */}

      <ItineraryEditModal
        open={Boolean(editing)}
        itinerary={editing}
        saving={saving}
        error={editError}
        onClose={handleCloseEdit}
        onSave={handleSaveItinerary}
      />
    </div>
  );
}