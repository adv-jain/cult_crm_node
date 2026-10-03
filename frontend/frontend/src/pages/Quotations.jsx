import { useEffect, useMemo, useRef, useState } from "react";

import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiFilter,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUsers,
  FiX,
  FiBriefcase,
} from "react-icons/fi";

import { useLocation, useNavigate } from "react-router-dom";

import api from "../api";
import { useAuth } from "../context/AuthContext";

import QuotationForm from "../components/quotation/QuotationForm";
import QuotationView from "../components/quotation/QuotationView";

import {
  STATUS_OPTIONS,
  STATUS_STYLES,
  initialForm,
  getList,
  getName,
  enquiryToForm,
  quotationToForm,
  buildPayload,
  formatDate,
  formatCurrency,
} from "../utils/quotationUtils";

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }) {
  const normalizedStatus = String(status || "Draft")
    .trim()
    .toLowerCase();

  const displayStatus =
    STATUS_OPTIONS.find(
      (item) => item.toLowerCase() === normalizedStatus
    ) ||
    status ||
    "Draft";

  const statusStyle =
    STATUS_STYLES[displayStatus] || STATUS_STYLES.Draft;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${statusStyle}`}
    >
      {displayStatus}
    </span>
  );
}

/* =========================================================
   LOADING SPINNER
========================================================= */

function LoadingSpinner({ small = false }) {
  return (
    <span
      className={`inline-block border-2 border-current border-t-transparent rounded-full animate-spin ${
        small ? "w-3.5 h-3.5" : "w-4 h-4"
      }`}
    />
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function Quotations() {
  const { user } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin =
    String(user?.role || "").trim().toLowerCase() === "admin";

  /* LIST STATE */
  const [quotations, setQuotations] = useState([]);
  const [enquiries, setEnquiries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [enquiriesLoading, setEnquiriesLoading] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /* SEARCH / FILTER */
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filterRef = useRef(null);

  /* PAGINATION */
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 10,
  });

  /* FORM */
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);

  const [form, setForm] = useState(initialForm);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  /* QUOTATION VIEW */
  const [viewQuotation, setViewQuotation] = useState(null);

  /* ACTION LOADING */
  const [actionLoading, setActionLoading] = useState(null);

  /* DELETE */
  const [confirmDelete, setConfirmDelete] = useState(null);

  /* AUTO HIDE SUCCESS */
  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 2000);

    return () => clearTimeout(timer);
  }, [successMessage]);

  /* CLOSE FILTER ON OUTSIDE CLICK */
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target)
      ) {
        setShowFilters(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /* FETCH QUOTATIONS */
  const fetchQuotations = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("limit", "10");

      if (status) params.set("status", status);
      if (search.trim()) params.set("search", search.trim());

      const response = await api.get(
        `/quotations?${params.toString()}`
      );

      const list = getList(response);

      setQuotations(list);

      const data = response?.data || {};

      setPagination({
        total:
          Number(
            data?.pagination?.total ??
              data?.total ??
              list.length
          ) || 0,
        page: Number(data?.pagination?.page ?? page) || page,
        pages: Number(data?.pagination?.pages ?? 1) || 1,
        limit: Number(data?.pagination?.limit ?? 10) || 10,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load quotations."
      );
    } finally {
      setLoading(false);
    }
  };

  /* FETCH ENQUIRIES */
  const fetchEnquiries = async () => {
    try {
      setEnquiriesLoading(true);

      const response = await api.get("/enquiries?limit=100");

      setEnquiries(getList(response));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load enquiries."
      );
    } finally {
      setEnquiriesLoading(false);
    }
  };

  /* INITIAL / FILTER FETCH */
  useEffect(() => {
    fetchQuotations();
  }, [page, status, search]);

  useEffect(() => {
    fetchEnquiries();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const filteredQuotations = useMemo(() => {
    return quotations;
  }, [quotations]);

  /* CREATE */
  const openCreate = (selectedEnquiry = null) => {
    setEditingQuotation(null);

    if (selectedEnquiry) {
      setForm({
        ...enquiryToForm(selectedEnquiry),
        status: "Draft",
      });
    } else {
      setForm({
        ...initialForm,
        status: "Draft",
      });
    }

    setFormError("");
    setFormOpen(true);
  };

  /* CREATE FROM ENQUIRY */
  useEffect(() => {
    const selectedEnquiry =
      location.state?.createQuotationFromEnquiry;

    if (!selectedEnquiry) return;

    openCreate(selectedEnquiry);

    navigate(location.pathname, {
      replace: true,
      state: {},
    });
  }, [location.state, location.pathname, navigate]);

  /* EDIT */
  const openEdit = (quotation) => {
    setEditingQuotation(quotation);
    setForm(quotationToForm(quotation));
    setFormError("");
    setFormOpen(true);
  };

  /* CLOSE FORM */
  const closeForm = () => {
    if (saving) return;

    setFormOpen(false);
    setEditingQuotation(null);
    setFormError("");
  };

  /* SUBMIT */
  const handleSubmit = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }

    if (!form.title?.trim()) {
      setFormError("Quotation title is required.");
      return;
    }

    if (!form.enquiry) {
      setFormError("Please select an enquiry.");
      return;
    }

    if (!form.destination?.trim()) {
      setFormError("Destination is required.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const payload = buildPayload(form);

      payload.status = editingQuotation
        ? form.status || "Draft"
        : "Draft";

      if (editingQuotation) {
        await api.put(
          `/quotations/${editingQuotation._id}`,
          payload
        );

        setSuccessMessage("Quotation updated successfully.");
      } else {
        await api.post("/quotations", payload);

        setSuccessMessage("Quotation created successfully.");
      }

      setFormOpen(false);
      setEditingQuotation(null);
      setFormError("");

      await fetchQuotations();
    } catch (err) {
      console.error("QUOTATION SAVE ERROR:", err);

      setFormError(
        err.response?.data?.message ||
          "Failed to save quotation."
      );
    } finally {
      setSaving(false);
    }
  };

  /* VIEW */
  const handleView = async (quotation) => {
    try {
      setActionLoading(`view-${quotation._id}`);
      setError("");

      const response = await api.get(
        `/quotations/${quotation._id}`
      );

      const fullQuotation =
        response.data?.quotation ||
        response.data?.data ||
        response.data;

      setViewQuotation(fullQuotation);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to open quotation."
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* CONVERT TO BOOKING */
  const handleConvertToBooking = (quotation) => {
    navigate("/bookings", {
      state: { createFromQuotation: quotation },
    });
  };

  /* DELETE */
  const handleDelete = async () => {
    if (!confirmDelete) return;

    if (!isAdmin) {
      setConfirmDelete(null);
      setError("Only admins can delete quotations.");
      return;
    }

    try {
      setActionLoading(`delete-${confirmDelete._id}`);
      setError("");

      await api.delete(`/quotations/${confirmDelete._id}`);

      setConfirmDelete(null);
      setSuccessMessage("Quotation deleted successfully.");

      if (quotations.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await fetchQuotations();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to delete quotation."
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* FILTERS */
  const handleClearFilters = () => {
    setSearch("");
    setStatus("");
    setPage(1);
    setShowFilters(false);
  };

  const activeFilterCount = [search, status].filter(Boolean).length;
  const dropdownFilterCount = [status].filter(Boolean).length;

  /* PAGINATION */
  const handlePreviousPage = () => {
    if (page > 1) {
      setPage((previous) => previous - 1);
    }
  };

  const handleNextPage = () => {
    if (page < pagination.pages) {
      setPage((previous) => previous + 1);
    }
  };

  /* RENDER */
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
              placeholder="Search quotations..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-8 h-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue transition"
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
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
              onClick={() =>
                setShowFilters((previous) => !previous)
              }
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
              <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
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

                <div className="p-4">
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Status
                  </label>

                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map((item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() => {
                          setStatus(status === item ? "" : item);
                          setPage(1);
                        }}
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

                <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    disabled={dropdownFilterCount === 0}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 transition disabled:opacity-40"
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

        {/* NEW QUOTATION */}
        <button
          type="button"
          onClick={() => openCreate()}
          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap self-start lg:self-auto"
        >
          <FiPlus size={15} />
          New Quotation
        </button>
      </div>

      {/* ACTIVE FILTER */}
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
      {successMessage && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-lg">
          <FiCheck
            className="flex-shrink-0 mt-0.5"
            size={18}
          />

          <p className="flex-1">{successMessage}</p>

          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* ERROR */}
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

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <LoadingSpinner />
              <p className="text-sm text-gray-500">
                Loading quotations...
              </p>
            </div>
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <FiFileText size={24} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-gray-800">
              No quotations found
            </h3>

            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              Create a quotation from an enquiry to start managing
              your travel proposals.
            </p>

            <button
              type="button"
              onClick={() => openCreate()}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition"
            >
              <FiPlus size={15} />
              Create Quotation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Quotation
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Destination
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Travel
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Travellers
                  </th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Amount
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
                {filteredQuotations.map((quotation) => {
                  const isActionLoading =
                    actionLoading?.endsWith(quotation._id);

                  const isAccepted =
                    String(quotation.status || "")
                      .trim()
                      .toLowerCase() === "accepted";

                  return (
                    <tr
                      key={quotation._id}
                      onClick={() => handleView(quotation)}
                      className="hover:bg-brand-blue-50/40 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-brand-blue-50 text-brand-blue flex items-center justify-center shrink-0">
                            <FiFileText size={17} />
                          </div>

                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 truncate max-w-[220px]">
                              {quotation.title ||
                                "Untitled Quotation"}
                            </p>

                            <p className="text-xs text-gray-500 mt-0.5">
                              {quotation.quotationNumber ||
                                `ID ${String(
                                  quotation._id
                                ).slice(-6)}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="text-xs font-medium text-gray-700">
                          {getName(
                            quotation.customer ||
                              quotation.enquiry?.customer,
                            "—"
                          )}
                        </p>

                        <p className="text-xs text-gray-500 mt-0.5">
                          {getName(quotation.enquiry, "—")}
                        </p>
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="text-xs font-medium text-gray-700">
                          {quotation.destination || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <FiCalendar
                            size={12}
                            className="text-gray-400"
                          />
                          {formatDate(quotation.travelDate)}
                        </div>

                        {quotation.returnDate && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            to {formatDate(quotation.returnDate)}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <FiUsers
                            size={13}
                            className="text-gray-400"
                          />
                          {Number(quotation.adults || 0) +
                            Number(quotation.children || 0) +
                            Number(quotation.infants || 0)}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <p className="text-xs font-bold text-gray-800">
                          {formatCurrency(
                            quotation.totalAmount,
                            quotation.currency || "INR"
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusBadge status={quotation.status} />
                      </td>

                      <td className="px-5 py-3.5">
                        <div
                          className="flex items-center justify-end gap-1.5 min-w-max"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isAccepted && (
                            <button
                              type="button"
                              title="Convert to Booking"
                              onClick={() =>
                                handleConvertToBooking(quotation)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark transition shadow-sm"
                            >
                              <FiBriefcase size={11} />
                              Convert
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              title="Delete"
                              onClick={() =>
                                setConfirmDelete(quotation)
                              }
                              disabled={isActionLoading}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <FiTrash2 size={14} />
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
        )}
      </div>

      {/* PAGINATION */}
      {!loading && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">
              {filteredQuotations.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">
              {pagination.total}
            </span>{" "}
            {pagination.total === 1 ? "quotation" : "quotations"}
          </p>

          {pagination.pages > 1 && (
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
                {page} / {pagination.pages}
              </span>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={page === pagination.pages || loading}
                className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* QUOTATION FORM */}
      <QuotationForm
        open={formOpen}
        editingQuotation={editingQuotation}
        form={form}
        setForm={setForm}
        enquiries={enquiries}
        saving={saving}
        error={
          formError ||
          (enquiriesLoading ? "Loading enquiries..." : "")
        }
        onClose={closeForm}
        onSubmit={handleSubmit}
        onItineraryUpdated={(updatedItinerary) => {
          console.log("Itinerary updated:", updatedItinerary);
          fetchQuotations();
        }}
      />

      {/* QUOTATION VIEW */}
      <QuotationView
        quotation={viewQuotation}
        onClose={() => setViewQuotation(null)}
        onEdit={(quotation) => {
          setViewQuotation(null);
          openEdit(quotation);
        }}
      />

      {/* DELETE CONFIRMATION */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setConfirmDelete(null);
            }
          }}
        >
          <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
                <FiTrash2 size={18} />
              </div>

              <h3 className="text-sm font-semibold text-gray-900">
                Delete quotation?
              </h3>

              <p className="text-xs text-gray-500 mt-1.5 leading-5">
                This will permanently delete{" "}
                <span className="font-semibold text-gray-700">
                  {confirmDelete.title || "this quotation"}
                </span>
                . This action cannot be undone.
              </p>
            </div>

            <div className="px-5 py-3.5 bg-gray-50/60 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-200 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={
                  actionLoading ===
                  `delete-${confirmDelete._id}`
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition disabled:opacity-60"
              >
                {actionLoading ===
                `delete-${confirmDelete._id}` ? (
                  <>
                    <LoadingSpinner small />
                    Deleting...
                  </>
                ) : (
                  <>
                    <FiTrash2 size={13} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}