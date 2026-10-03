import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiSearch,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiEye,
  FiTrash2,
  FiInbox,
  FiUser,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
} from "react-icons/fi";
import { createPortal } from "react-dom";
import api from "../api";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [page, setPage] = useState(1);
  const RECORDS_PER_PAGE = 50;

  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const user = storedUser?.user || storedUser;

  const fetchCustomers = async (requestedPage = page) => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/customers", {
        params: {
          search,
          status,
          page: requestedPage,
          limit: RECORDS_PER_PAGE,
        },
      });

      setCustomers(response.data.customers || []);
      setTotalCustomers(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      console.error("Fetch customers error:", err);
      setError(err.response?.data?.message || "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(page);
  }, [page, search, status]);

  useEffect(() => {
    if (!success && !error) return;

    const timer = setTimeout(() => {
      setSuccess("");
      setError("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [success, error]);

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

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedCustomer(null);
        setShowFilters(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleStatusChange = async (customerId, newStatus) => {
    try {
      setError("");
      setSuccess("");

      await api.put(`/customers/${customerId}`, { status: newStatus });

      setSuccess("Customer status updated successfully");
      await fetchCustomers(page);
    } catch (err) {
      console.error("Update customer status error:", err);
      setError(err.response?.data?.message || "Failed to update customer");
    }
  };

  const handleDelete = async (customerId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this customer?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/customers/${customerId}`);

      setSuccess("Customer deleted successfully");

      if (customers.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchCustomers(page);
      }
    } catch (err) {
      console.error("Delete customer error:", err);
      setError(err.response?.data?.message || "Failed to delete customer");
    }
  };

  const getStatusStyle = (customerStatus) => {
    const styles = {
      Active: "bg-green-50 text-green-700 border-green-200",
      Inactive: "bg-gray-50 text-gray-600 border-gray-200",
      Potential: "bg-amber-50 text-amber-700 border-amber-200",
      Churned: "bg-red-50 text-red-700 border-red-200",
    };

    return styles[customerStatus] || "bg-gray-50 text-gray-600 border-gray-200";
  };

  const getAvatarColor = (name) => {
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-purple-100 text-purple-700",
      "bg-green-100 text-green-700",
      "bg-pink-100 text-pink-700",
      "bg-amber-100 text-amber-700",
      "bg-cyan-100 text-cyan-700",
      "bg-indigo-100 text-indigo-700",
    ];

    const value = String(name || "?");
    const index = value
      .split("")
      .reduce((total, character) => total + character.charCodeAt(0), 0);

    return colors[index % colors.length];
  };

  const getInitials = (name) => {
    if (!name) return "?";

    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  };

  /* =========================================================
     GET CUSTOMER NAME — ab contact nahi, direct fields use
  ========================================================= */
  const getCustomerName = (customer) => {
    if (!customer) return "Unknown";

    /* Direct customer fields */
    const firstName = customer.firstName || "";
    const lastName = customer.lastName || "";

    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName) return fullName;

    /* Fallback: Lead se */
    if (customer.lead) {
      const leadName = `${customer.lead.firstName || ""} ${
        customer.lead.lastName || ""
      }`.trim();
      if (leadName) return leadName;
    }

    return "Unknown";
  };

  const getCustomerEmail = (customer) => {
    if (!customer) return "";
    return customer.email || customer.lead?.email || "";
  };

  const getCustomerPhone = (customer) => {
    if (!customer) return "";
    return customer.phone || customer.lead?.phone || "";
  };

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const activeFilterCount = useMemo(() => {
    return [search, status].filter(Boolean).length;
  }, [search, status]);

  const dropdownFilterCount = useMemo(() => {
    return [status].filter(Boolean).length;
  }, [status]);

  const handleClearFilters = () => {
    setSearch("");
    setStatus("");
    setPage(1);
  };

  const canDelete = user?.role === "admin";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <FiSearch
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              placeholder="Search customers..."
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm text-gray-800 outline-none placeholder:text-gray-400 transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:text-gray-600"
              >
                <FiX size={13} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setShowFilters((previous) => !previous)}
              className={`inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition sm:w-auto ${
                dropdownFilterCount > 0
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FiFilter size={14} />
              <span>Filters</span>

              {dropdownFilterCount > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
                  {dropdownFilterCount}
                </span>
              )}
            </button>

            {showFilters && (
              <div className="absolute left-0 top-11 z-30 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-900/10 sm:left-auto sm:right-0">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900">Filters</p>

                  {dropdownFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="text-xs font-medium text-gray-500 transition hover:text-red-600"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="space-y-4 p-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-500">
                      Status
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                      {["Active", "Inactive", "Potential"].map((customerStatus) => (
                        <button
                          type="button"
                          key={customerStatus}
                          onClick={() => {
                            setStatus(
                              status === customerStatus ? "" : customerStatus
                            );
                            setPage(1);
                          }}
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                            status === customerStatus
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {customerStatus}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    disabled={dropdownFilterCount === 0}
                    className="text-xs font-medium text-gray-600 transition hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Clear all
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearFilters}
              title="Clear all filters"
              className="inline-flex h-9 w-9 items-center justify-center text-gray-400 transition hover:text-red-600"
            >
              <FiX size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <FiCheckCircle size={18} className="mt-0.5 flex-shrink-0" />
          <p className="flex-1">{success}</p>
          <button
            type="button"
            onClick={() => setSuccess("")}
            className="flex-shrink-0 text-green-600 hover:text-green-800"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <FiAlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            className="flex-shrink-0 text-red-600 hover:text-red-800"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between px-1 text-xs text-gray-500">
        <p>
          Showing{" "}
          <span className="font-semibold text-gray-700">{customers.length}</span>{" "}
          of{" "}
          <span className="font-semibold text-gray-700">{totalCustomers}</span>{" "}
          {totalCustomers === 1 ? "customer" : "customers"}

          {activeFilterCount > 0 && (
            <span className="ml-1">
              · {activeFilterCount}{" "}
              {activeFilterCount === 1 ? "filter" : "filters"} applied
            </span>
          )}
        </p>

        <p>
          Page <span className="font-semibold text-gray-700">{page}</span> of{" "}
          <span className="font-semibold text-gray-700">{totalPages}</span>
        </p>
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white lg:block">
        {loading ? (
          <LoadingState />
        ) : customers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Customer Since</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {customers.map((customer) => {
                  const fullName = getCustomerName(customer);
                  const email = getCustomerEmail(customer);
                  const phone = getCustomerPhone(customer);

                  return (
                    <tr
                      key={customer._id}
                      className="transition-colors hover:bg-gray-50/70"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex min-w-[210px] items-center gap-3">
                          <div
                            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${getAvatarColor(
                              fullName
                            )}`}
                          >
                            {getInitials(fullName)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-800">
                              {fullName}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {email || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-gray-700">
                        <span className="text-xs">{phone || "—"}</span>
                      </td>

                      <td className="px-4 py-3.5 text-gray-700">
                        {customer.company?.name || "—"}
                      </td>

                      <td className="px-4 py-3.5">
                        {customer.owner?.name ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">
                              {getInitials(customer.owner.name)}
                            </div>
                            <span className="max-w-[150px] truncate text-gray-700">
                              {customer.owner.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-gray-700">
                        <span className="text-xs">
                          {formatDate(customer.customerSince)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <select
                          value={customer.status || "Active"}
                          onChange={(event) =>
                            handleStatusChange(customer._id, event.target.value)
                          }
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-blue-100 ${getStatusStyle(
                            customer.status
                          )}`}
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Potential">Potential</option>
                        </select>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <ActionButton
                            title="View"
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <FiEye size={15} />
                          </ActionButton>

                          {canDelete && (
                            <ActionButton
                              title="Delete"
                              variant="red"
                              onClick={() => handleDelete(customer._id)}
                            >
                              <FiTrash2 size={15} />
                            </ActionButton>
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

      {/* Mobile Cards */}
      <div className="space-y-3 lg:hidden">
        {loading ? (
          <LoadingState />
        ) : customers.length === 0 ? (
          <EmptyState />
        ) : (
          customers.map((customer) => {
            const fullName = getCustomerName(customer);
            const email = getCustomerEmail(customer);
            const phone = getCustomerPhone(customer);

            return (
              <div
                key={customer._id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${getAvatarColor(
                        fullName
                      )}`}
                    >
                      {getInitials(fullName)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">
                        {fullName}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {email || "No email"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusStyle(
                      customer.status
                    )}`}
                  >
                    {customer.status || "Active"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                  <MobileInfo label="Company" value={customer.company?.name} />
                  <MobileInfo label="Phone" value={phone} />
                  <MobileInfo label="Owner" value={customer.owner?.name} />
                  <MobileInfo
                    label="Customer Since"
                    value={formatDate(customer.customerSince)}
                  />
                </div>

                <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-gray-100 pt-3">
                  <ActionButton
                    title="View"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <FiEye size={15} />
                  </ActionButton>

                  {canDelete && (
                    <ActionButton
                      title="Delete"
                      variant="red"
                      onClick={() => handleDelete(customer._id)}
                    >
                      <FiTrash2 size={15} />
                    </ActionButton>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!loading && totalCustomers > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page <span className="font-semibold text-gray-700">{page}</span> of{" "}
            <span className="font-semibold text-gray-700">{totalPages}</span>
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((previous) => Math.max(previous - 1, 1))}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FiChevronLeft size={16} />
            </button>

            <span className="inline-flex h-8 items-center px-3 text-sm font-medium text-gray-700">
              {page}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((previous) => Math.min(previous + 1, totalPages))
              }
              disabled={page >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Customer View Modal */}
      {selectedCustomer &&
        createPortal(
          <CustomerViewModal
            customer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
            formatDate={formatDate}
            getCustomerName={getCustomerName}
            getCustomerEmail={getCustomerEmail}
            getCustomerPhone={getCustomerPhone}
            getInitials={getInitials}
            getAvatarColor={getAvatarColor}
            getStatusStyle={getStatusStyle}
          />,
          document.body
        )}
    </div>
  );
}

function TableHead({ children, align = "left" }) {
  return (
    <th
      className={`px-4 py-3.5 text-${align} text-xs font-medium uppercase tracking-wider text-gray-500`}
    >
      {children}
    </th>
  );
}

function ActionButton({ children, onClick, title, variant = "default" }) {
  const styles = {
    default: "text-gray-500 hover:text-blue-600 hover:bg-blue-50",
    red: "text-gray-500 hover:text-red-600 hover:bg-red-50",
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

function MobileInfo({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-gray-800">
        {value || "—"}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600" />
      <p className="mt-3 text-sm text-gray-500">Loading customers...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <FiInbox size={24} className="text-gray-400" />
      </div>

      <h3 className="mt-4 text-base font-semibold text-gray-800">
        No customers found
      </h3>

      <p className="mt-1 max-w-sm text-sm text-gray-500">
        Try adjusting your filters or convert a deal to create a customer.
      </p>
    </div>
  );
}

function ReadOnlyField({ label, value, icon }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </label>

      <div className="flex min-h-[38px] w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
        {icon && <span className="flex-shrink-0 text-gray-400">{icon}</span>}
        <span className="truncate">{value || "—"}</span>
      </div>
    </div>
  );
}

function CustomerViewModal({
  customer,
  onClose,
  formatDate,
  getCustomerName,
  getCustomerEmail,
  getCustomerPhone,
  getInitials,
  getAvatarColor,
  getStatusStyle,
}) {
  const fullName = getCustomerName(customer);
  const initials = getInitials(fullName);
  const email = getCustomerEmail(customer);
  const phone = getCustomerPhone(customer);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/40 p-4 backdrop-blur-[2px] animate-[fadeIn_.15s_ease-out]"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="my-auto flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-gray-900/20 animate-[popIn_.18s_ease-out]">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Customer Details
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              View complete customer information
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Profile Header */}
          <div className="mb-4 flex items-center gap-3.5 border-b border-gray-100 pb-4">
            <div
              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold ${getAvatarColor(
                fullName
              )}`}
            >
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-gray-900">
                {fullName}
              </h3>

              <p className="mt-0.5 truncate text-xs text-gray-500">
                {email || "No email"}
              </p>

              <div className="mt-2">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusStyle(
                    customer.status
                  )}`}
                >
                  {customer.status || "Active"}
                </span>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField
                label="First Name"
                value={customer.firstName || customer.lead?.firstName}
                icon={<FiUser size={13} />}
              />

              <ReadOnlyField
                label="Last Name"
                value={customer.lastName || customer.lead?.lastName}
                icon={<FiUser size={13} />}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField
                label="Email"
                value={email}
                icon={<FiMail size={13} />}
              />

              <ReadOnlyField
                label="Phone"
                value={phone}
                icon={<FiPhone size={13} />}
              />
            </div>

            <ReadOnlyField
              label="WhatsApp"
              value={customer.whatsapp}
              icon={<FiPhone size={13} />}
            />

            <ReadOnlyField
              label="Alternate Phone"
              value={customer.alternatePhone}
              icon={<FiPhone size={13} />}
            />

            <ReadOnlyField
              label="Company"
              value={customer.company?.name}
              icon={<FiBriefcase size={13} />}
            />

            <ReadOnlyField
              label="Customer Type"
              value={customer.customerType || "Individual"}
              icon={<FiUser size={13} />}
            />

            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField
                label="Owner"
                value={customer.owner?.name}
                icon={<FiUser size={13} />}
              />

              <ReadOnlyField
                label="Customer Since"
                value={formatDate(customer.customerSince)}
                icon={<FiCalendar size={13} />}
              />
            </div>

            {/* Address */}
            {customer.address &&
              (customer.address.street ||
                customer.address.city ||
                customer.address.state) && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Address
                  </label>
                  <div className="min-h-[60px] w-full whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-800">
                    {[
                      customer.address.street,
                      customer.address.city,
                      customer.address.state,
                      customer.address.country,
                      customer.address.postalCode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
              )}

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Notes
              </label>

              <div className="min-h-[72px] w-full whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-800">
                {customer.notes || (
                  <span className="italic text-gray-400">
                    No notes available
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-end border-t border-gray-100 bg-gray-50/60 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(6px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default Customers;