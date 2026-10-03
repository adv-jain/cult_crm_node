import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import UserForm from "../components/UserForm";

import {
  FiPlus,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiEdit2,
  FiTrash2,
  FiUserCheck,
  FiUserX,
  FiInbox,
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiFilter,
} from "react-icons/fi";

function Users() {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // SEARCH & FILTERS
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  // PAGINATION
  const [page, setPage] = useState(1);
  const RECORDS_PER_PAGE = 50;
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // FETCH USERS
  const fetchUsers = async (requestedPage = page) => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await api.get("/users", {
        params: {
          page: requestedPage,
          limit: RECORDS_PER_PAGE,
        },
      });

      setUsers(response.data.users || []);
      setTotalUsers(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error(
        "Fetch users error:",
        error.response?.data || error.message
      );
      setErrorMessage(
        error.response?.data?.message || "Failed to fetch users"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page);
  }, [page]);

  // Auto-dismiss messages
  useEffect(() => {
    if (!successMessage && !errorMessage) return;
    const t = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 4000);
    return () => clearTimeout(t);
  }, [successMessage, errorMessage]);

  // Close filter popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };
    if (showFilters) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);

  // HANDLERS
  const handleAddUser = () => {
    setEditingUser(null);
    setSuccessMessage("");
    setErrorMessage("");
    setShowForm(true);
  };

  const handleEditUser = (selectedUser) => {
    setEditingUser(selectedUser);
    setSuccessMessage("");
    setErrorMessage("");
    setShowForm(true);
  };

  const handleSubmit = async (formData) => {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, formData);
        setSuccessMessage("User updated successfully");
      } else {
        await api.post("/users", formData);
        setSuccessMessage("User created successfully");
      }

      setShowForm(false);
      setEditingUser(null);
      await fetchUsers(page);
    } catch (error) {
      console.error(
        "Save user error:",
        error.response?.data || error.message
      );
      setErrorMessage(
        error.response?.data?.message || "Failed to save user"
      );
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (selectedUser) => {
    const newStatus = !selectedUser.isActive;
    const action = newStatus ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${selectedUser.name}?`
    );
    if (!confirmed) return;

    try {
      setErrorMessage("");
      setSuccessMessage("");

      await api.patch(`/users/${selectedUser._id}/status`, {
        isActive: newStatus,
      });

      setSuccessMessage(
        newStatus
          ? "User activated successfully"
          : "User deactivated successfully"
      );

      await fetchUsers(page);
    } catch (error) {
      console.error(
        "Update user status error:",
        error.response?.data || error.message
      );
      setErrorMessage(
        error.response?.data?.message || "Failed to update user status"
      );
    }
  };

  const handleDelete = async (selectedUser) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedUser.name}?`
    );
    if (!confirmed) return;

    try {
      setDeletingId(selectedUser._id);
      setErrorMessage("");
      setSuccessMessage("");

      await api.delete(`/users/${selectedUser._id}`);
      setSuccessMessage("User deleted successfully");

      if (users.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchUsers(page);
      }
    } catch (error) {
      console.error(
        "Delete user error:",
        error.response?.data || error.message
      );
      setErrorMessage(
        error.response?.data?.message || "Failed to delete user"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const resetFilters = () => {
    setSearch("");
    setRole("");
    setStatus("");
  };

  // HELPERS
  const getRoleStyle = (role) => {
    const r = (role || "").toLowerCase();
    const map = {
      admin: "bg-red-50 text-red-700 ring-red-200",
      manager: "bg-purple-50 text-purple-700 ring-purple-200",
      sales: "bg-brand-blue-50 text-brand-blue-dark ring-brand-blue/20",
    };
    return map[r] || "bg-gray-50 text-gray-600 ring-gray-200";
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      "bg-brand-blue-100 text-brand-blue-dark",
      "bg-purple-100 text-purple-700",
      "bg-green-100 text-green-700",
      "bg-pink-100 text-pink-700",
      "bg-amber-100 text-amber-700",
      "bg-cyan-100 text-cyan-700",
      "bg-indigo-100 text-indigo-700",
    ];
    const str = String(name || "?");
    const idx = str.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return colors[idx % colors.length];
  };

  // CLIENT-SIDE FILTERED USERS
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesSearch =
          (u.name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.phone || "").toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      if (role && (u.role || "").toLowerCase() !== role.toLowerCase()) {
        return false;
      }

      if (status === "active" && !u.isActive) return false;
      if (status === "inactive" && u.isActive) return false;

      return true;
    });
  }, [users, search, role, status]);

  const stats = useMemo(() => {
    return {
      total: totalUsers,
      active: users.filter((u) => u.isActive).length,
      admins: users.filter((u) => u.role === "admin").length,
      managers: users.filter((u) => u.role === "manager").length,
    };
  }, [users, totalUsers]);

  // FILTER COUNTS
  const activeFilterCount = useMemo(() => {
    return [search, role, status].filter(Boolean).length;
  }, [search, role, status]);

  const dropdownFilterCount = useMemo(() => {
    return [role, status].filter(Boolean).length;
  }, [role, status]);

  // RENDER
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
              placeholder="Search users..."
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

          {/* FILTER BUTTON + POPOVER */}
          <div className="relative" ref={filterRef}>
            <button
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
                      onClick={resetFilters}
                      className="text-xs font-medium text-gray-500 hover:text-red-600 transition"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  {/* ROLE CHIPS */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Role
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {["admin", "manager", "sales"].map((r) => (
                        <button
                          key={r}
                          onClick={() => setRole(role === r ? "" : r)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition capitalize ${
                            role === r
                              ? "bg-brand-blue text-white border-brand-blue"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* STATUS CHIPS */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Status
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "Active", value: "active" },
                        { label: "Inactive", value: "inactive" },
                      ].map((s) => (
                        <button
                          key={s.value}
                          onClick={() =>
                            setStatus(status === s.value ? "" : s.value)
                          }
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                            status === s.value
                              ? "bg-brand-blue text-white border-brand-blue"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {s.label}
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

        {/* RIGHT: ADD BUTTON */}
        <button
          onClick={handleAddUser}
          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap self-start lg:self-auto"
        >
          <FiPlus size={15} />
          Add User
        </button>
      </div>

      {/* STATS CARDS */}
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
              Active
            </p>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {loading ? "—" : stats.active}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Admins
            </p>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {loading ? "—" : stats.admins}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Managers
            </p>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {loading ? "—" : stats.managers}
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
              <p className="text-sm text-gray-500">Loading users...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FiInbox size={24} className="text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-800">
              No users found
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              {activeFilterCount > 0
                ? "Try changing your search or filters."
                : 'Click "Add User" to create the first CRM user.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-5 py-3.5">
                    User
                  </th>
                  <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5 hidden lg:table-cell">
                    Phone
                  </th>
                  <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5">
                    Role
                  </th>
                  <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5">
                    Status
                  </th>
                  <th className="text-right font-medium text-xs uppercase tracking-wider text-gray-500 px-5 py-3.5">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-brand-blue-50/40 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getAvatarColor(
                            item.name
                          )}`}
                        >
                          {getInitials(item.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">
                            {item.name}
                            {user?._id === item._id && (
                              <span className="ml-2 text-[10px] text-brand-blue font-semibold">
                                (You)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {item.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-gray-700 hidden lg:table-cell">
                      {item.phone || "—"}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset capitalize ${getRoleStyle(
                          item.role
                        )}`}
                      >
                        {item.role}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${
                          item.isActive
                            ? "bg-green-50 text-green-700 ring-green-200"
                            : "bg-gray-50 text-gray-600 ring-gray-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isActive ? "bg-green-500" : "bg-gray-400"
                          }`}
                        ></span>
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditUser(item)}
                          title="Edit"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition"
                        >
                          <FiEdit2 size={16} />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(item)}
                          title={item.isActive ? "Deactivate" : "Activate"}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${
                            item.isActive
                              ? "text-gray-500 hover:text-orange-600 hover:bg-orange-50"
                              : "text-gray-500 hover:text-green-600 hover:bg-green-50"
                          }`}
                        >
                          {item.isActive ? (
                            <FiUserX size={16} />
                          ) : (
                            <FiUserCheck size={16} />
                          )}
                        </button>

                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item._id}
                          title="Delete"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <FiTrash2 size={16} />
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

      {/* FOOTER */}
      {!loading && totalUsers > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">
              {filteredUsers.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">{totalUsers}</span> users
            {activeFilterCount > 0 && (
              <span className="ml-1">
                · {activeFilterCount}{" "}
                {activeFilterCount === 1 ? "filter" : "filters"} applied
              </span>
            )}
          </p>

          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500">
              Page <span className="font-medium text-gray-700">{page}</span> of{" "}
              <span className="font-medium text-gray-700">{totalPages}</span>
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={page >= totalPages}
                  className="w-8 h-8 inline-flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* USER FORM MODAL */}
      <UserForm
        isOpen={showForm}
        onOpenChange={setShowForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        editingUser={editingUser}
        loading={saving}
      />
    </div>
  );
}

export default Users;