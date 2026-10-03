import { useEffect, useState, useMemo, useRef } from "react";

import api from "../api";

import ActivityTable from "../components/ActivityTable";
import ActivityForm from "../components/ActivityForm";
import ViewActivity from "../components/ViewActivity";

import { useAuth } from "../context/AuthContext";
import {
  FiPlus,
  FiSearch,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
} from "react-icons/fi";

function Activities() {
  const { user } = useAuth();

  const [activities, setActivities] = useState([]);

  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [trips, setTrips] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);

  const [editingActivity, setEditingActivity] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [outcome, setOutcome] = useState("");

  // PAGINATION
  const [page, setPage] = useState(1);
  const LIMIT = 50;
  const [totalActivities, setTotalActivities] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // FILTER POPOVER
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  // =========================================================
  // FETCH ACTIVITIES
  // =========================================================

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const params = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      if (type) {
        params.type = type;
      }

      if (outcome) {
        params.outcome = outcome;
      }

      params.page = page;
      params.limit = LIMIT;

      const response = await api.get("/activities", {
        params,
      });

      setActivities(response.data.activities || []);
      setTotalActivities(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error(
        "Fetch activities error:",
        error.response?.data || error.message
      );

      setErrorMessage(
        error.response?.data?.message ||
          "Failed to fetch activities"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FETCH CRM DATA
  // =========================================================

  const fetchRelatedData = async () => {
    try {
      const [
        leadsResponse,
        contactsResponse,
        companiesResponse,
        tripsResponse,
      ] = await Promise.all([
        api.get("/leads"),
        api.get("/contacts"),
        api.get("/companies"),
        api.get("/trips"),
      ]);

      setLeads(leadsResponse.data.leads || []);
      setContacts(contactsResponse.data.contacts || []);
      setCompanies(companiesResponse.data.companies || []);
      setTrips(tripsResponse.data.trips || []);
    } catch (error) {
      console.error(
        "Related data error:",
        error.response?.data || error.message
      );
    }
  };

  // =========================================================
  // EFFECTS
  // =========================================================

  useEffect(() => {
    fetchRelatedData();
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [page, type, outcome]);

  useEffect(() => {
    if (!successMessage && !errorMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(e.target)
      ) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener(
        "mousedown",
        handleClickOutside
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [showFilters]);

  // =========================================================
  // HANDLERS
  // =========================================================

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleCreate = () => {
    setEditingActivity(null);
    setShowForm(true);
  };

  const handleEdit = (activity) => {
    setEditingActivity(activity);
    setShowForm(true);
  };

  const handleView = (activity) => {
    setSelectedActivity(activity);
    setShowView(true);
  };

  const handleDelete = async (activity) => {
    if (user?.role !== "admin") {
      return;
    }

    const confirmed = window.confirm(
      `Delete activity "${activity.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");

      await api.delete(`/activities/${activity._id}`);

      setSuccessMessage("Activity deleted successfully");

      if (activities.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchActivities();
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Failed to delete activity"
      );
    }
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingActivity(null);
    fetchActivities();
  };

  const resetFilters = () => {
    setSearch("");
    setType("");
    setOutcome("");
    setPage(1);
  };

  // =========================================================
  // STATS
  // =========================================================

  const stats = useMemo(() => {
    return {
      total: totalActivities,

      calls: activities.filter(
        (activity) => activity.type === "Call"
      ).length,

      meetings: activities.filter(
        (activity) => activity.type === "Meeting"
      ).length,

      positive: activities.filter(
        (activity) => activity.outcome === "Positive"
      ).length,
    };
  }, [activities, totalActivities]);

  // =========================================================
  // FILTER COUNTS
  // =========================================================

  const activeFilterCount = useMemo(() => {
    return [search, type, outcome].filter(Boolean).length;
  }, [search, type, outcome]);

  const dropdownFilterCount = useMemo(() => {
    return [type, outcome].filter(Boolean).length;
  }, [type, outcome]);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto w-full">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* LEFT: SEARCH + FILTER */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            {/* SEARCH */}
            <form
              onSubmit={handleSearch}
              className="relative w-full sm:w-64"
            >
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                size={15}
              />

              <input
                type="text"
                placeholder="Search activities..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
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
            </form>

            {/* FILTER */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() =>
                  setShowFilters((prev) => !prev)
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
                <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/60 z-30 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Filters
                    </h3>

                    {dropdownFilterCount > 0 && (
                      <button
                        onClick={resetFilters}
                        className="text-xs font-medium text-gray-500 hover:text-red-600 transition"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                    {/* TYPE */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">
                        Type
                      </label>

                      <select
                        value={type}
                        onChange={(e) => {
                          setType(e.target.value);
                          setPage(1);
                        }}
                        className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue cursor-pointer"
                      >
                        <option value="">All Types</option>
                        <option value="Call">Call</option>
                        <option value="Email">Email</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Note">Note</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="SMS">SMS</option>
                        <option value="Quotation">Quotation</option>
                        <option value="Booking">Booking</option>
                        <option value="Payment">Payment</option>
                        <option value="Hotel">Hotel</option>
                        <option value="Transport">Transport</option>
                        <option value="Itinerary">Itinerary</option>
                        <option value="Document">Document</option>
                        <option value="Customer Support">Customer Support</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* OUTCOME */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">
                        Outcome
                      </label>

                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Positive",
                          "Neutral",
                          "Negative",
                          "No Response",
                          "Completed",
                          "Pending",
                        ].map((o) => (
                          <button
                            key={o}
                            onClick={() => {
                              setOutcome(outcome === o ? "" : o);
                              setPage(1);
                            }}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                              outcome === o
                                ? "bg-brand-blue text-white border-brand-blue"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <button
                      onClick={resetFilters}
                      disabled={dropdownFilterCount === 0}
                      className="text-xs font-medium text-gray-600 hover:text-gray-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Clear all
                    </button>

                    <button
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

          {/* ADD */}
          <button
            onClick={handleCreate}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap self-start lg:self-auto"
          >
            <FiPlus size={15} />
            Add Activity
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Total
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {loading ? "—" : stats.total}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Calls
              </p>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-blue"></span>
            </div>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {loading ? "—" : stats.calls}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Meetings
              </p>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            </div>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {loading ? "—" : stats.meetings}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Positive
              </p>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            </div>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {loading ? "—" : stats.positive}
            </p>
          </div>
        </div>

        {/* ALERTS */}
        {successMessage && (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
            <FiCheckCircle className="flex-shrink-0 mt-0.5" size={18} />
            <p className="flex-1">{successMessage}</p>
            <button
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
              onClick={() => setErrorMessage("")}
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
                <div className="w-7 h-7 border-[3px] border-brand-blue-50 border-t-brand-blue rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500">
                  Loading activities...
                </p>
              </div>
            </div>
          ) : (
            <ActivityTable
              activities={activities}
              user={user}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* PAGINATION */}
        {!loading && totalActivities > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-700">
                {activities.length}
              </span>{" "}
              {activities.length === 1 ? "activity" : "activities"}
              {totalActivities > 0 && (
                <span className="ml-1">of {totalActivities}</span>
              )}
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
                <span className="font-medium text-gray-700">{page}</span> of{" "}
                <span className="font-medium text-gray-700">{totalPages}</span>
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((prev) => prev - 1)}
                    className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FiChevronLeft size={16} />
                  </button>

                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((prev) => prev + 1)}
                    className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ACTIVITY FORM */}
      {showForm && (
        <ActivityForm
          user={user}
          editingActivity={editingActivity}
          leads={leads}
          contacts={contacts}
          companies={companies}
          trips={trips}
          onClose={() => {
            setShowForm(false);
            setEditingActivity(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {/* VIEW ACTIVITY */}
      {showView && selectedActivity && (
        <ViewActivity
          activity={selectedActivity}
          onClose={() => {
            setShowView(false);
            setSelectedActivity(null);
          }}
        />
      )}
    </>
  );
}

export default Activities;