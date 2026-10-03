import { useEffect, useState } from "react";
import api from "../api";
import LeadTable from "../components/LeadTable";
import LeadForm from "../components/LeadForm";
import ViewLead from "../components/ViewLead";
import { useAuth } from "../context/AuthContext";

import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
} from "react-icons/fi";

function Leads() {
  const { user } = useAuth();

  // =====================================================
  // DATA
  // =====================================================

  const [leads, setLeads] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);

  // =====================================================
  // FILTERS
  // =====================================================

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("");

  // =====================================================
  // PAGINATION
  // =====================================================

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });

  // =====================================================
  // UI
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const [editingLead, setEditingLead] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  const [showFilters, setShowFilters] = useState(false);

  // =====================================================
  // ACTION LOADING
  // =====================================================

  const [deletingId, setDeletingId] = useState(null);
  const [convertingId, setConvertingId] = useState(null);

  // =====================================================
  // MESSAGES
  // =====================================================

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // FETCH LEADS
  // =====================================================

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/leads", {
        params: {
          search: search || undefined,
          status: status || undefined,
          source: source || undefined,
          priority: priority || undefined,
          page,
          limit: 50,
        },
      });

      const data = response.data;

      setLeads(data?.leads || data?.data || []);

      setPagination({
        page: data?.pagination?.page || page,
        limit: data?.pagination?.limit || 50,
        total: data?.pagination?.total || 0,
        totalPages: data?.pagination?.totalPages || 1,
      });
    } catch (err) {
      console.error("Fetch leads error:", err);
      setError(err?.response?.data?.message || "Unable to load leads.");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FETCH ASSIGNABLE USERS
  // =====================================================

  const fetchAssignableUsers = async () => {
    if (user?.role !== "admin" && user?.role !== "manager") return;

    try {
      const response = await api.get("/leads/assignable-users");
      setAssignableUsers(response.data?.users || response.data?.data || []);
    } catch (err) {
      console.error("Fetch assignable users error:", err);
      setAssignableUsers([]);
    }
  };

  // =====================================================
  // EFFECTS
  // =====================================================

  useEffect(() => {
    fetchAssignableUsers();
  }, [user?.role]);

  useEffect(() => {
    fetchLeads();
  }, [page, status, source, priority]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchLeads();
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // Auto dismiss success
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  // Auto dismiss error
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  // =====================================================
  // DERIVED
  // =====================================================

  const activeFilterCount = [status, source, priority].filter(Boolean).length;
  const canGoPrevious = page > 1;
  const canGoNext = page < (pagination.totalPages || 1);

  // =====================================================
  // ACTIONS
  // =====================================================

  const handleAddLead = () => {
    setEditingLead(null);
    setFormOpen(true);
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setFormOpen(true);
  };

  const handleViewLead = async (lead) => {
    try {
      const response = await api.get(`/leads/${lead._id}`);
      setSelectedLead(
        response.data?.lead || response.data?.data || response.data
      );
      setViewOpen(true);
    } catch (err) {
      console.error("View lead error:", err);
      setError(err?.response?.data?.message || "Unable to load lead details.");
    }
  };

  const handleSubmitLead = async (formData) => {
    try {
      setError("");

      if (editingLead?._id) {
        await api.put(`/leads/${editingLead._id}`, formData);
        setSuccess("Lead updated successfully.");
      } else {
        await api.post("/leads", formData);
        setSuccess("Lead created successfully.");
      }

      setFormOpen(false);
      setEditingLead(null);
      await fetchLeads();
    } catch (err) {
      console.error("Submit lead error:", err);
      setError(err?.response?.data?.message || "Unable to save lead.");
    }
  };

  const handleDeleteLead = async (lead) => {
    const fullName =
      [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
      "this lead";

    if (!window.confirm(`Delete "${fullName}"?`)) return;

    try {
      setDeletingId(lead._id);
      setError("");

      await api.delete(`/leads/${lead._id}`);
      setSuccess("Lead deleted successfully.");

      if (leads.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await fetchLeads();
      }
    } catch (err) {
      console.error("Delete lead error:", err);
      setError(err?.response?.data?.message || "Unable to delete lead.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleConvertLead = async (lead) => {
    const fullName =
      [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
      "this lead";

    if (!window.confirm(`Create an enquiry from "${fullName}"?`)) return;

    try {
      setConvertingId(lead._id);
      setError("");

      const response = await api.post(`/leads/${lead._id}/convert`);
      setSuccess(response.data?.message || "Enquiry created successfully.");
      await fetchLeads();
    } catch (err) {
      console.error("Create enquiry error:", err);
      setError(err?.response?.data?.message || "Unable to create enquiry.");
    } finally {
      setConvertingId(null);
    }
  };

  const handleClearFilters = () => {
    setStatus("");
    setSource("");
    setPriority("");
    setPage(1);
    setShowFilters(false);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingLead(null);
  };

  const handleCloseView = () => {
    setViewOpen(false);
    setSelectedLead(null);
  };

  const handlePreviousPage = () => {
    if (canGoPrevious) setPage((current) => current - 1);
  };

  const handleNextPage = () => {
    if (canGoNext) setPage((current) => current + 1);
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">
      {/* MESSAGES */}

      {success && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm text-green-700">{success}</p>
          <button
            type="button"
            onClick={() => setSuccess("")}
            className="text-green-500 hover:text-green-700"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-red-500 hover:text-red-700"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* TOOLBAR — Search + Filters + Refresh + Add Lead */}

      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        {/* SEARCH */}

        <div className="relative w-full sm:w-72">
          <FiSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full h-10 pl-9 pr-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX size={15} />
            </button>
          )}
        </div>

        {/* FILTER BUTTON */}

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border text-sm font-medium transition whitespace-nowrap ${
              showFilters || activeFilterCount > 0
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FiFilter size={15} />
            <span>Filters</span>

            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-semibold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* FILTER DROPDOWN */}

          {showFilters && (
            <div className="absolute left-0 top-12 z-30 w-72 bg-white border border-gray-200 rounded-xl shadow-xl shadow-gray-900/10 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">
                  Filters
                </h3>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* STATUS */}

              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                >
                  <option value="">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              {/* SOURCE */}

              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Source
                </label>

                <select
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                >
                  <option value="">All Sources</option>
                  <option value="Website">Website</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Referral">Referral</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="Email Campaign">Email Campaign</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Walk In">Walk In</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* PRIORITY */}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Priority
                </label>

                <select
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                >
                  <option value="">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* SPACER */}

        <div className="hidden sm:block flex-1" />

        {/* REFRESH */}

        <button
          type="button"
          onClick={fetchLeads}
          disabled={loading}
          title="Refresh"
          className="hidden sm:inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition"
        >
          <FiRefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>

        {/* ADD LEAD */}

        <button
          type="button"
          onClick={handleAddLead}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow-sm whitespace-nowrap"
        >
          <FiPlus size={16} />
          <span>Add Lead</span>
        </button>
      </div>

      {/* TABLE */}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs text-gray-500 mt-3">Loading leads...</p>
          </div>
        </div>
      ) : (
        <LeadTable
          leads={leads}
          onView={handleViewLead}
          onEdit={handleEditLead}
          onDelete={handleDeleteLead}
          onConvert={handleConvertLead}
          deletingId={deletingId}
          convertingId={convertingId}
          user={user}
        />
      )}

      {/* PAGINATION */}

      {!loading && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">
              {Math.min((page - 1) * pagination.limit + 1, pagination.total)}
            </span>{" "}
            to{" "}
            <span className="font-medium text-gray-700">
              {Math.min(page * pagination.limit, pagination.total)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">
              {pagination.total}
            </span>{" "}
            leads
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreviousPage}
              disabled={!canGoPrevious}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <FiChevronLeft size={14} />
              Previous
            </button>

            <span className="text-xs text-gray-500 px-2">
              Page <span className="font-medium text-gray-700">{page}</span> of{" "}
              <span className="font-medium text-gray-700">
                {pagination.totalPages || 1}
              </span>
            </span>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={!canGoNext}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
              <FiChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* LEAD FORM */}

      <LeadForm
        isOpen={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmitLead}
        editingLead={editingLead}
        loading={loading}
        currentUser={user}
        assignableUsers={assignableUsers}
      />

      {/* VIEW LEAD */}

      <ViewLead
        isOpen={viewOpen}
        onClose={handleCloseView}
        lead={selectedLead}
      />
    </div>
  );
}

export default Leads;