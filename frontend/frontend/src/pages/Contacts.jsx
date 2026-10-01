import { useEffect, useState, useMemo, useRef } from "react";

import api from "../api";

import ContactTable from "../components/ContactTable";
import ContactForm from "../components/ContactForm";
import ViewContact from "../components/ViewContact";
import TripForm from "../components/TripForm";

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

function Contacts() {
  const { user } = useAuth();

  const [contacts, setContacts] = useState([]);

  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("");
  const [designation, setDesignation] = useState("");

  const [companies, setCompanies] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [assignableUsers, setAssignableUsers] = useState([]);

  const [tripCompanies, setTripCompanies] = useState([]);
  const [tripContacts, setTripContacts] = useState([]);
  const [tripLeads, setTripLeads] = useState([]);
  const [tripUsers, setTripUsers] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [viewContact, setViewContact] = useState(null);

  const [showTripForm, setShowTripForm] = useState(false);
  const [creatingTripContact, setCreatingTripContact] = useState(null);
  const [creatingTripId, setCreatingTripId] = useState(null);
  const [savingTrip, setSavingTrip] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);

  const RECORDS_PER_PAGE = 50;

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const fetchContacts = async (page = currentPage) => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await api.get("/contacts", {
        params: {
          search,
          company,
          designation,
          page,
          limit: RECORDS_PER_PAGE,
        },
      });

      const data = response.data;

      setContacts(data.contacts || []);
      setCurrentPage(data.page || page);
      setTotalPages(data.totalPages || 1);
      setTotalContacts(data.total || 0);
    } catch (error) {
      console.error(
        "Fetch contacts error:",
        error.response?.data || error.message
      );

      setErrorMessage(
        error.response?.data?.message || "Failed to fetch contacts"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get("/contacts", {
        params: {
          page: 1,
          limit: 50,
        },
      });

      const allContacts = response.data.contacts || [];

      const companyMap = new Map();

      allContacts.forEach((contact) => {
        if (contact.company?._id) {
          companyMap.set(contact.company._id, contact.company.name);
        }
      });

      setCompanies(
        Array.from(companyMap, ([id, name]) => ({
          id,
          name,
        }))
      );

      const uniqueDesignations = [
        ...new Set(
          allContacts
            .map((contact) => contact.designation)
            .filter(Boolean)
        ),
      ];

      setDesignations(uniqueDesignations);
    } catch (error) {
      console.error(
        "Fetch filter options error:",
        error.response?.data || error.message
      );
    }
  };

  const fetchAssignableUsers = async () => {
    if (user?.role !== "admin" && user?.role !== "manager") {
      setAssignableUsers([]);
      return;
    }

    try {
      const response = await api.get("/contacts/assignable-users");
      setAssignableUsers(response.data.users || []);
    } catch (error) {
      console.error(
        "Fetch assignable users error:",
        error.response?.data || error.message
      );

      setAssignableUsers([]);
    }
  };

  const fetchTripData = async () => {
    try {
      const companyResponse = await api.get("/companies");

      setTripCompanies(companyResponse.data.companies || []);

      const contactResponse = await api.get("/contacts", {
        params: {
          page: 1,
          limit: 50,
        },
      });

      setTripContacts(contactResponse.data.contacts || []);

      const leadResponse = await api.get("/leads", {
        params: {
          page: 1,
          limit: 50,
        },
      });

      setTripLeads(leadResponse.data.leads || []);

      if (user?.role === "admin" || user?.role === "manager") {
        const userResponse = await api.get("/trips/assignable-users");
        setTripUsers(userResponse.data.users || []);
      } else {
        setTripUsers([]);
      }
    } catch (error) {
      console.error(
        "Fetch trip data error:",
        error.response?.data || error.message
      );
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchFilterOptions();
    fetchAssignableUsers();
    fetchTripData();
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, company, designation]);

  useEffect(() => {
    if (!user) return;

    fetchContacts(currentPage);
  }, [currentPage, search, company, designation, user]);

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

  const handleAddContact = () => {
    setEditingContact(null);
    setShowForm(true);
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setShowForm(true);
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleSubmitContact = async (formData) => {
    try {
      setSaving(true);
      setErrorMessage("");

      if (editingContact) {
        await api.put(`/contacts/${editingContact._id}`, formData);
        setSuccessMessage("Contact updated successfully");
      } else {
        await api.post("/contacts", formData);
        setSuccessMessage("Contact created successfully");
      }

      setShowForm(false);
      setEditingContact(null);

      await fetchContacts(currentPage);
      await fetchFilterOptions();
      await fetchTripData();
    } catch (error) {
      console.error(
        "Save contact error:",
        error.response?.data || error.message
      );

      setErrorMessage(
        error.response?.data?.message || "Failed to save contact"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this contact?"
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(id);
      setErrorMessage("");
      setSuccessMessage("");

      await api.delete(`/contacts/${id}`);

      setSuccessMessage("Contact deleted successfully");

      if (contacts.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        await fetchContacts(currentPage);
      }

      await fetchFilterOptions();
      await fetchTripData();
    } catch (error) {
      console.error(
        "Delete contact error:",
        error.response?.data || error.message
      );

      setErrorMessage(
        error.response?.data?.message || "Failed to delete contact"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewContact = (contact) => {
    setViewContact(contact);
  };

  const handleCreateTrip = async (contact) => {
    try {
      setCreatingTripId(contact._id);
      setSuccessMessage("");
      setErrorMessage("");

      await fetchTripData();

      setCreatingTripContact(contact);
      setShowTripForm(true);
    } catch (error) {
      console.error("Open create trip error:", error);
      setErrorMessage("Failed to open trip form");
    } finally {
      setCreatingTripId(null);
    }
  };

  const handleSubmitTrip = async (formData) => {
    try {
      setSavingTrip(true);
      setErrorMessage("");
      setSuccessMessage("");

      await api.post("/trips", formData);

      setSuccessMessage("Trip created successfully");
      setShowTripForm(false);
      setCreatingTripContact(null);
    } catch (error) {
      console.error(
        "Create trip error:",
        error.response?.data || error.message
      );

      setErrorMessage(
        error.response?.data?.message || "Failed to create trip"
      );

      throw error;
    } finally {
      setSavingTrip(false);
    }
  };

  const tripFormEditingData = creatingTripContact
    ? {
        title:
          `${creatingTripContact.firstName || ""} ${
            creatingTripContact.lastName || ""
          } Trip`.trim(),

        tripCode: "",

        destination: "",

        startDate: "",
        endDate: "",

        travelType: "Other",

        adults: 1,
        children: 0,
        infants: 0,

        status: "Planning",

        estimatedValue: "",
        totalAmount: "",
        totalCost: "",

        customer:
          creatingTripContact.customer?._id ||
          creatingTripContact.customer ||
          "",

        company:
          creatingTripContact.company?._id ||
          creatingTripContact.company ||
          "",

        lead:
          creatingTripContact.lead?._id ||
          creatingTripContact.lead ||
          "",

        owner:
          creatingTripContact.owner?._id ||
          creatingTripContact.owner ||
          "",

        description: "",
        cancellationReason: "",
      }
    : null;

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingContact(null);
  };

  const handleCloseTripForm = () => {
    setShowTripForm(false);
    setCreatingTripContact(null);
  };

  const handleClearFilters = () => {
    setSearch("");
    setCompany("");
    setDesignation("");
  };

  const handlePreviousPage = () => {
    if (currentPage > 1 && !loading) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && !loading) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const activeFilterCount = useMemo(() => {
    return [search, company, designation].filter(Boolean).length;
  }, [search, company, designation]);

  const dropdownFilterCount = useMemo(() => {
    return [company, designation].filter(Boolean).length;
  }, [company, designation]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={15}
            />

            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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

              <span className="hidden sm:inline">
                Filters
              </span>

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
                      className="text-xs font-medium text-gray-500 hover:text-red-600 transition"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Company
                    </label>

                    <select
                      value={company}
                      onChange={(event) =>
                        setCompany(event.target.value)
                      }
                      className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 cursor-pointer"
                    >
                      <option value="">
                        All Companies
                      </option>

                      {companies.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Designation
                    </label>

                    {designations.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {designations.map((item) => (
                          <button
                            type="button"
                            key={item}
                            onClick={() =>
                              setDesignation(
                                designation === item ? "" : item
                              )
                            }
                            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                              designation === item
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        No designations available
                      </p>
                    )}
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
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition"
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
          onClick={handleAddContact}
          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm whitespace-nowrap self-start lg:self-auto"
        >
          <FiPlus size={15} />
          Add Contact
        </button>
      </div>

      {successMessage && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
          <FiCheckCircle
            className="flex-shrink-0 mt-0.5"
            size={18}
          />

          <p className="flex-1">
            {successMessage}
          </p>

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
          <FiAlertCircle
            className="flex-shrink-0 mt-0.5"
            size={18}
          />

          <p className="flex-1">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="text-red-600 hover:text-red-800 flex-shrink-0"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">
                Loading contacts...
              </p>
            </div>
          </div>
        ) : (
          <ContactTable
            contacts={contacts}
            onView={handleViewContact}
            onEdit={handleEditContact}
            onDelete={handleDeleteContact}
            onCreateDeal={handleCreateTrip}
            deletingId={deletingId}
            creatingDealId={creatingTripId}
            user={user}
          />
        )}
      </div>

      {!loading && totalContacts > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">
              {contacts.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">
              {totalContacts}
            </span>{" "}
            {totalContacts === 1 ? "contact" : "contacts"}
            {activeFilterCount > 0 && (
              <span className="ml-1">
                · {activeFilterCount}{" "}
                {activeFilterCount === 1
                  ? "filter"
                  : "filters"}{" "}
                applied
              </span>
            )}
          </p>

          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500">
              Page{" "}
              <span className="font-medium text-gray-700">
                {currentPage}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-700">
                {totalPages}
              </span>
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1 || loading}
                  className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={
                    currentPage === totalPages || loading
                  }
                  className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <ContactForm
        isOpen={showForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmitContact}
        editingContact={editingContact}
        loading={saving}
        currentUser={user}
        assignableUsers={assignableUsers}
      />

      <TripForm
        isOpen={showTripForm}
        onClose={handleCloseTripForm}
        onSubmit={handleSubmitTrip}
        editingTrip={tripFormEditingData}
        loading={savingTrip}
        companies={tripCompanies}
        contacts={tripContacts}
        leads={tripLeads}
        users={tripUsers}
        user={user}
      />

      {viewContact && (
        <ViewContact
          contact={viewContact}
          onClose={() => setViewContact(null)}
        />
      )}
    </div>
  );
}

export default Contacts;