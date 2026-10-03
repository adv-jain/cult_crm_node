import { useEffect, useState, useMemo, useRef } from "react";
import api from "../api";

import TripTable from "../components/TripTable";
import TripForm from "../components/TripForm";
import ViewTrip from "../components/ViewTrip";

import { useAuth } from "../context/AuthContext";

import {
  FiSearch,
  FiPlus,
  FiX,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiGrid,
  FiList,
} from "react-icons/fi";

const TRIP_STATUSES = [
  "Planning",
  "Quotation",
  "Confirmed",
  "Upcoming",
  "Ongoing",
  "Completed",
  "Cancelled",
];

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

const CANCELLATION_REASONS = [
  "Customer Cancelled",
  "Payment Issue",
  "Schedule Change",
  "Destination Issue",
  "Supplier Issue",
  "Personal Reason",
  "Other",
];

function Trips() {
  const { user } = useAuth();

  // ==========================================
  // DATA
  // ==========================================
  const [trips, setTrips] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);

  // ==========================================
  // PAGINATION
  // ==========================================
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTrips, setTotalTrips] = useState(0);

  const RECORDS_PER_PAGE = 50;

  // ==========================================
  // FILTERS
  // ==========================================
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [travelType, setTravelType] = useState("");
  const [company, setCompany] = useState("");
  const [owner, setOwner] = useState("");

  // ==========================================
  // VIEW MODE
  // ==========================================
  const [viewMode, setViewMode] = useState("table");

  // ==========================================
  // FORM
  // ==========================================
  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [viewTrip, setViewTrip] = useState(null);

  // ==========================================
  // LOADING
  // ==========================================
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [changingStatusId, setChangingStatusId] = useState(null);

  // ==========================================
  // CANCEL REASON MODAL
  // ==========================================
  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelTrip, setCancelTrip] = useState(null);

  // ==========================================
  // MESSAGES
  // ==========================================
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ==========================================
  // FILTER POPOVER
  // ==========================================
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  // ==========================================
  // FETCH TRIPS
  // ==========================================
  const fetchTrips = async (page = 1) => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await api.get("/trips", {
        params: {
          search,
          status,
          travelType,
          company,
          owner,
          page,
          limit: RECORDS_PER_PAGE,
        },
      });

      const data = response.data;

      setTrips(data.trips || []);
      setCurrentPage(Number(data.page) || page);
      setTotalPages(Math.max(Number(data.totalPages) || 1, 1));
      setTotalTrips(Number(data.total) || 0);
    } catch (error) {
      console.error(
        "Fetch trips error:",
        error.response?.data || error.message
      );

      setErrorMessage(
        error.response?.data?.message || "Failed to fetch trips"
      );

      setTrips([]);
      setTotalTrips(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FETCH COMPANIES
  // ==========================================
  const fetchCompanies = async () => {
    try {
      const response = await api.get("/companies");
      setCompanies(response.data.companies || []);
    } catch (error) {
      console.error(
        "Fetch companies error:",
        error.response?.data || error.message
      );
    }
  };

  // ==========================================
  // FETCH CUSTOMERS
  // ==========================================
  const fetchCustomers = async () => {
    try {
      const response = await api.get("/customers", {
        params: { page: 1, limit: RECORDS_PER_PAGE },
      });
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error(
        "Fetch customers error:",
        error.response?.data || error.message
      );
    }
  };

  // ==========================================
  // FETCH LEADS
  // ==========================================
  const fetchLeads = async () => {
    try {
      const response = await api.get("/leads", {
        params: { page: 1, limit: RECORDS_PER_PAGE },
      });
      setLeads(response.data.leads || []);
    } catch (error) {
      console.error(
        "Fetch leads error:",
        error.response?.data || error.message
      );
    }
  };

  // ==========================================
  // FETCH ASSIGNABLE USERS
  // ==========================================
  const fetchUsers = async () => {
    if (user?.role !== "admin" && user?.role !== "manager") {
      setUsers([]);
      return;
    }

    try {
      const response = await api.get("/trips/assignable-users");
      setUsers(response.data.users || []);
    } catch (error) {
      console.error(
        "Fetch assignable users error:",
        error.response?.data || error.message
      );
      setUsers([]);
    }
  };

  // ==========================================
  // EFFECTS
  // ==========================================
  useEffect(() => {
    if (!user) return;
    fetchCompanies();
    fetchCustomers();
    fetchLeads();
    fetchUsers();
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, travelType, company, owner]);

  useEffect(() => {
    if (!user) return;
    fetchTrips(currentPage);
  }, [user, currentPage, search, status, travelType, company, owner]);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 4000);
    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
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

  // ==========================================
  // PAGINATION
  // ==========================================
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // ==========================================
  // ADD TRIP
  // ==========================================
  const handleAddTrip = () => {
    setEditingTrip(null);
    setShowForm(true);
    setSuccessMessage("");
    setErrorMessage("");
  };

  // ==========================================
  // EDIT TRIP
  // ==========================================
  const handleEditTrip = (trip) => {
    setEditingTrip(trip);
    setShowForm(true);
    setSuccessMessage("");
    setErrorMessage("");
  };

  // ==========================================
  // SUBMIT TRIP
  // ==========================================
  const handleSubmitTrip = async (formData) => {
    try {
      setSaving(true);
      setErrorMessage("");

      if (editingTrip) {
        await api.put(`/trips/${editingTrip._id}`, formData);
        setSuccessMessage("Trip updated successfully");
      } else {
        await api.post("/trips", formData);
        setSuccessMessage("Trip created successfully");
      }

      setShowForm(false);
      setEditingTrip(null);
      await fetchTrips(currentPage);
    } catch (error) {
      console.error(
        "Save trip error:",
        error.response?.data || error.message
      );
      setErrorMessage(
        error.response?.data?.message || "Failed to save trip"
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // CANCEL REASON MODAL
  // ==========================================
  const openCancelReasonModal = (trip) => {
    setCancelTrip(trip);
    setCancelReason("");
    setShowCancelReasonModal(true);
    setErrorMessage("");
  };

  const closeCancelReasonModal = () => {
    if (changingStatusId) return;
    setShowCancelReasonModal(false);
    setCancelTrip(null);
    setCancelReason("");
  };

  // ==========================================
  // CONFIRM CANCELLED TRIP
  // ==========================================
  const confirmCancelledTrip = async () => {
    if (!cancelTrip) return;

    if (!cancelReason) {
      setErrorMessage("Please select a cancellation reason");
      return;
    }

    try {
      setChangingStatusId(cancelTrip._id);
      setErrorMessage("");
      setSuccessMessage("");

      await api.put(`/trips/${cancelTrip._id}`, {
        status: "Cancelled",
        cancellationReason: cancelReason,
      });

      setShowCancelReasonModal(false);
      setSuccessMessage(`Trip "${cancelTrip.title}" marked as Cancelled`);
      setCancelTrip(null);
      setCancelReason("");
      await fetchTrips(currentPage);
    } catch (error) {
      console.error(
        "Cancel trip error:",
        error.response?.data || error.message
      );
      setErrorMessage(
        error.response?.data?.message || "Failed to cancel trip"
      );
    } finally {
      setChangingStatusId(null);
    }
  };

  // ==========================================
  // STATUS CHANGE
  // ==========================================
  const handleStatusChange = async (trip, newStatus) => {
    if (!newStatus || newStatus === trip.status) return;

    if (newStatus === "Cancelled") {
      openCancelReasonModal(trip);
      return;
    }

    if (newStatus === "Completed") {
      const confirmed = window.confirm(
        `Are you sure you want to mark "${trip.title}" as Completed?`
      );
      if (!confirmed) return;
    }

    try {
      setChangingStatusId(trip._id);
      setErrorMessage("");
      setSuccessMessage("");

      await api.put(`/trips/${trip._id}`, { status: newStatus });
      setSuccessMessage(`Trip moved to ${newStatus} successfully`);
      await fetchTrips(currentPage);
    } catch (error) {
      console.error(
        "Change trip status error:",
        error.response?.data || error.message
      );
      setErrorMessage(
        error.response?.data?.message || "Failed to change trip status"
      );
    } finally {
      setChangingStatusId(null);
    }
  };

  // ==========================================
  // DELETE TRIP
  // ==========================================
  const handleDeleteTrip = async (id) => {
    if (user?.role !== "admin") {
      setErrorMessage("Only admin can delete trips");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this trip?"
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setErrorMessage("");
      setSuccessMessage("");

      await api.delete(`/trips/${id}`);
      setSuccessMessage("Trip deleted successfully");

      if (trips.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        await fetchTrips(currentPage);
      }
    } catch (error) {
      console.error(
        "Delete trip error:",
        error.response?.data || error.message
      );
      setErrorMessage(
        error.response?.data?.message || "Failed to delete trip"
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ==========================================
  // VIEW TRIP
  // ==========================================
  const handleViewTrip = async (trip) => {
    try {
      const response = await api.get(`/trips/${trip._id}`);
      setViewTrip(response.data.trip);
    } catch (error) {
      console.error(
        "View trip error:",
        error.response?.data || error.message
      );
      setErrorMessage(
        error.response?.data?.message || "Failed to fetch trip"
      );
    }
  };

  // ==========================================
  // CLOSE FORM
  // ==========================================
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTrip(null);
  };

  // ==========================================
  // CLEAR FILTERS
  // ==========================================
  const handleClearFilters = () => {
    setSearch("");
    setStatus("");
    setTravelType("");
    setCompany("");
    setOwner("");
  };

  // ==========================================
  // PIPELINE HELPERS
  // ==========================================
  const getTripsByStatus = (statusName) =>
    trips.filter((trip) => trip.status === statusName);

  const getStatusAccent = (statusName) => {
    const map = {
      Planning: "border-t-gray-500",
      Quotation: "border-t-purple-500",
      Confirmed: "border-t-brand-blue",
      Upcoming: "border-t-cyan-600",
      Ongoing: "border-t-brand-gold",
      Completed: "border-t-green-600",
      Cancelled: "border-t-red-600",
    };
    return map[statusName] || "border-t-gray-400";
  };

  const getStatusHeaderColor = (statusName) => {
    const map = {
      Planning: "text-gray-700",
      Quotation: "text-purple-600",
      Confirmed: "text-brand-blue",
      Upcoming: "text-cyan-600",
      Ongoing: "text-brand-gold-dark",
      Completed: "text-green-600",
      Cancelled: "text-red-600",
    };
    return map[statusName] || "text-gray-700";
  };

  // ==========================================
  // FILTER COUNTS
  // ==========================================
  const activeFilterCount = useMemo(() => {
    return [search, status, travelType, company, owner].filter(Boolean).length;
  }, [search, status, travelType, company, owner]);

  const dropdownFilterCount = useMemo(() => {
    return [status, travelType, company, owner].filter(Boolean).length;
  }, [status, travelType, company, owner]);

  // ==========================================
  // FORMAT CURRENCY
  // ==========================================
  const formatCurrency = (value) => {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  };

  // ==========================================
  // FORMAT DATE
  // ==========================================
  const formatDate = (date) => {
    if (!date) return "—";
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return "—";
    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ==========================================
  // RENDER
  // ==========================================
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
              placeholder="Search trips..."
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

            {/* FILTER POPOVER */}
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
                      {TRIP_STATUSES.map((item) => (
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

                  {/* TRAVEL TYPE */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Travel Type
                    </label>

                    <select
                      value={travelType}
                      onChange={(e) => setTravelType(e.target.value)}
                      className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue cursor-pointer"
                    >
                      <option value="">All Travel Types</option>
                      {TRAVEL_TYPES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* COMPANY */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Company
                    </label>

                    <select
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue cursor-pointer"
                    >
                      <option value="">All Companies</option>
                      {companies.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* OWNER */}
                  {(user?.role === "admin" || user?.role === "manager") && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">
                        Owner
                      </label>

                      <select
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                        className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue cursor-pointer"
                      >
                        <option value="">All Owners</option>
                        {users.map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.name} ({item.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
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

        {/* RIGHT */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          {/* VIEW TOGGLE */}
          <button
            type="button"
            onClick={() =>
              setViewMode(viewMode === "table" ? "pipeline" : "table")
            }
            title={
              viewMode === "table"
                ? "Switch to Pipeline"
                : "Switch to Table"
            }
            className="inline-flex items-center justify-center gap-1.5 px-3 h-9 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition whitespace-nowrap"
          >
            {viewMode === "table" ? (
              <>
                <FiGrid size={14} />
                <span className="hidden sm:inline">Pipeline</span>
              </>
            ) : (
              <>
                <FiList size={14} />
                <span className="hidden sm:inline">Table</span>
              </>
            )}
          </button>

          {/* ADD TRIP */}
          <button
            type="button"
            onClick={handleAddTrip}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap"
          >
            <FiPlus size={15} />
            Add Trip
          </button>
        </div>
      </div>

      {/* SUCCESS */}
      {successMessage && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
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

      {/* ERROR */}
      {errorMessage && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">
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

      {/* CONTENT */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-[3px] border-brand-blue-50 border-t-brand-blue rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading trips...</p>
          </div>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <TripTable
            trips={trips}
            onView={handleViewTrip}
            onEdit={handleEditTrip}
            onDelete={handleDeleteTrip}
            deletingId={deletingId}
            user={user}
          />
        </div>
      ) : (
        /* PIPELINE VIEW */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {TRIP_STATUSES.map((statusName) => {
            const statusTrips = getTripsByStatus(statusName);

            const totalValue = statusTrips.reduce(
              (sum, trip) =>
                sum + Number(trip.totalAmount || trip.estimatedValue || 0),
              0
            );

            return (
              <div
                key={statusName}
                className={`w-[320px] flex-shrink-0 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden border-t-4 ${getStatusAccent(
                  statusName
                )} flex flex-col`}
              >
                {/* COLUMN HEADER */}
                <div className="px-4 py-4 bg-white border-b border-gray-200">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-sm font-bold ${getStatusHeaderColor(
                        statusName
                      )}`}
                    >
                      {statusName}
                    </h3>

                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-gray-100 text-gray-700 text-[11px] font-bold rounded-full">
                      {statusTrips.length}
                    </span>
                  </div>

                  <strong className="block mt-2 text-base font-bold text-gray-800">
                    {formatCurrency(totalValue)}
                  </strong>
                </div>

                {/* COLUMN BODY */}
                <div className="p-3 min-h-[180px] space-y-3 flex-1">
                  {statusTrips.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400 italic">
                      No trips
                    </div>
                  ) : (
                    statusTrips.map((trip) => (
                      <div
                        key={trip._id}
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-semibold text-gray-900 leading-snug">
                            {trip.title}
                          </h4>

                          {trip.tripCode && (
                            <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap">
                              {trip.tripCode}
                            </span>
                          )}
                        </div>

                        <div className="text-lg font-bold text-gray-900 mb-3">
                          {formatCurrency(
                            trip.totalAmount || trip.estimatedValue
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5 mb-3">
                          <span className="text-xs text-gray-500 truncate">
                            📍 {trip.destination || "No destination"}
                          </span>

                          <span className="text-xs text-gray-500 truncate">
                            👤 {trip.customer?.name || "No customer"}
                          </span>

                          <span className="text-xs text-gray-500 truncate">
                            🧳 {trip.travelType || "Other"}
                          </span>

                          <span className="text-xs text-gray-500 truncate">
                            👨‍💼 {trip.owner?.name || "No owner"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                              Start
                            </p>
                            <p className="text-xs font-semibold text-gray-700">
                              {formatDate(trip.startDate)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                              End
                            </p>
                            <p className="text-xs font-semibold text-gray-700">
                              {formatDate(trip.endDate)}
                            </p>
                          </div>
                        </div>

                        {/* STATUS */}
                        <div className="pt-3 border-t border-gray-100 mb-3">
                          <label className="block mb-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                            Change Status
                          </label>

                          <select
                            value={trip.status}
                            disabled={changingStatusId === trip._id}
                            onChange={(event) =>
                              handleStatusChange(trip, event.target.value)
                            }
                            className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-md text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            {TRIP_STATUSES.map((statusOption) => (
                              <option
                                key={statusOption}
                                value={statusOption}
                              >
                                {statusOption}
                              </option>
                            ))}
                          </select>

                          {changingStatusId === trip._id && (
                            <small className="block mt-1.5 text-[11px] text-gray-500">
                              Updating...
                            </small>
                          )}
                        </div>

                        {/* ACTIONS */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewTrip(trip)}
                            className="flex-1 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-md transition"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditTrip(trip)}
                            className="flex-1 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-md transition"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FOOTER */}
      {!loading && totalTrips > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">{trips.length}</span> of{" "}
            <span className="font-medium text-gray-700">{totalTrips}</span>{" "}
            {totalTrips === 1 ? "trip" : "trips"}

            {activeFilterCount > 0 && (
              <span className="ml-1">
                · {activeFilterCount}{" "}
                {activeFilterCount === 1 ? "filter" : "filters"} applied
              </span>
            )}
          </p>

          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500">
              Page{" "}
              <span className="font-medium text-gray-700">{currentPage}</span>{" "}
              of <span className="font-medium text-gray-700">{totalPages}</span>
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={handlePreviousPage}
                  className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={handleNextPage}
                  className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TRIP FORM */}
      <TripForm
        isOpen={showForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmitTrip}
        editingTrip={editingTrip}
        loading={saving}
        companies={companies}
        customers={customers}
        leads={leads}
        users={users}
        user={user}
      />

      {/* VIEW TRIP */}
      {viewTrip && (
        <ViewTrip trip={viewTrip} onClose={() => setViewTrip(null)} />
      )}

      {/* CANCEL REASON MODAL */}
      {showCancelReasonModal && cancelTrip && (
        <div className="fixed inset-0 z-[9999] bg-black/55 flex items-center justify-center p-4">
          <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between px-5 sm:px-6 py-5 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Cancel Trip
                </h2>
                <p className="mt-1 text-sm text-gray-500 truncate">
                  {cancelTrip.title}
                </p>
              </div>

              <button
                type="button"
                onClick={closeCancelReasonModal}
                disabled={changingStatusId === cancelTrip._id}
                className="text-3xl leading-none text-gray-500 hover:text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                ×
              </button>
            </div>

            <div className="px-5 sm:px-6 py-5">
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Cancellation Reason <span className="text-red-600">*</span>
              </label>

              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full h-11 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue cursor-pointer"
              >
                <option value="">Select Cancellation Reason</option>
                {CANCELLATION_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-gray-500">
                Please select why this trip was cancelled.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={closeCancelReasonModal}
                disabled={changingStatusId === cancelTrip._id}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmCancelledTrip}
                disabled={changingStatusId === cancelTrip._id}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {changingStatusId === cancelTrip._id
                  ? "Saving..."
                  : "Cancel Trip"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Trips;