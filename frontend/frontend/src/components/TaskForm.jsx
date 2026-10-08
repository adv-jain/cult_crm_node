import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiX, FiAlertCircle } from "react-icons/fi";
import api from "../api";

function TaskForm({
  user,
  editingTask,
  leads = [],
  contacts = [],
  companies = [],
  trips = [],
  users = [],
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "Follow-up",
    assignedTo: "",
    startDate: "",
    dueDate: "",
    priority: "Medium",
    status: "Pending",
    reminderEnabled: false,
    reminderAt: "",
    relatedLead: "",
    relatedContact: "",
    relatedCompany: "",
    relatedTrip: "",
    notes: "",
    tags: "",
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // ============================================
  // DEFAULT FORM
  // ============================================

  const getDefaultForm = () => ({
    title: "",
    description: "",
    type: "Follow-up",
    assignedTo:
      user?.role === "sales" ? user?.id || user?._id || "" : "",
    startDate: "",
    dueDate: "",
    priority: "Medium",
    status: "Pending",
    reminderEnabled: false,
    reminderAt: "",
    relatedLead: "",
    relatedContact: "",
    relatedCompany: "",
    relatedTrip: "",
    notes: "",
    tags: "",
  });

  // ============================================
  // FORMAT DATE FOR DATETIME-LOCAL
  // ============================================

  const formatDateTime = (date) => {
    if (!date) return "";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "";
    }

    const offset = d.getTimezoneOffset() * 60000;

    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  // ============================================
  // LOAD EDIT / DEFAULT DATA
  // ============================================

  useEffect(() => {
    if (!editingTask) {
      setForm(getDefaultForm());
      setFormError("");
      return;
    }

    setForm({
      title: editingTask.title || "",
      description: editingTask.description || "",
      type: editingTask.type || "Follow-up",
      assignedTo: editingTask.assignedTo?._id || editingTask.assignedTo || "",
      startDate: formatDateTime(editingTask.startDate),
      dueDate: formatDateTime(editingTask.dueDate),
      priority: editingTask.priority || "Medium",
      status: editingTask.status || "Pending",
      reminderEnabled: editingTask.reminder?.enabled || false,
      reminderAt: formatDateTime(editingTask.reminder?.reminderAt),
      relatedLead: editingTask.relatedLead?._id || editingTask.relatedLead || "",
      relatedContact:
        editingTask.relatedContact?._id || editingTask.relatedContact || "",
      relatedCompany:
        editingTask.relatedCompany?._id || editingTask.relatedCompany || "",
      relatedTrip: editingTask.relatedTrip?._id || editingTask.relatedTrip || "",
      notes: editingTask.notes || "",
      tags: editingTask.tags?.join(", ") || "",
    });

    setFormError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTask, user]);

  // ============================================
  // ESC CLOSE
  // ============================================

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  // ============================================
  // BODY SCROLL LOCK
  // ============================================

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // ============================================
  // HANDLE CHANGE
  // ============================================

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ============================================
  // HANDLE SUBMIT
  // ============================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setFormError("");

    if (!form.title.trim()) {
      setFormError("Task title is required");
      return;
    }

    if (!form.dueDate) {
      setFormError("Due date is required");
      return;
    }

    if (form.startDate && new Date(form.startDate) > new Date(form.dueDate)) {
      setFormError("Start date cannot be after due date");
      return;
    }

    if (user?.role !== "sales" && !form.assignedTo) {
      setFormError("Please select an assignee");
      return;
    }

    if (form.reminderEnabled && !form.reminderAt) {
      setFormError("Please select reminder date and time");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        assignedTo: form.assignedTo || undefined,
        startDate: form.startDate || null,
        dueDate: form.dueDate,
        priority: form.priority,
        status: form.status,
        reminder: {
          enabled: form.reminderEnabled,
          reminderAt:
            form.reminderEnabled && form.reminderAt ? form.reminderAt : null,
        },
        relatedLead: form.relatedLead || null,
        relatedContact: form.relatedContact || null,
        relatedCompany: form.relatedCompany || null,
        relatedTrip: form.relatedTrip || null,
        notes: form.notes.trim(),
        tags: form.tags
          ? form.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
      };

      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, payload);
      } else {
        await api.post("/tasks", payload);
      }

      await onSaved();
    } catch (error) {
      console.error("Save task error:", error.response?.data || error.message);
      setFormError(
        error.response?.data?.message || "Failed to save task"
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // CLASSES
  // ============================================

  const inputClass =
    "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue focus:bg-white transition";

  const selectClass =
    "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue focus:bg-white transition cursor-pointer";

  const labelClass = "block text-xs font-medium text-gray-600 mb-1";

  const sectionTitleClass =
    "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3";

  const canAssign = user?.role === "admin" || user?.role === "manager";

  // ============================================
  // RENDER
  // ============================================

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[560px] max-h-[88vh] bg-white rounded-2xl shadow-2xl shadow-gray-900/20 flex flex-col overflow-hidden my-auto">
        {/* ========================================
            HEADER
        ======================================== */}

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {editingTask ? "Edit Task" : "New Task"}
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              {editingTask
                ? "Update task details"
                : "Add and manage CRM activities"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-40"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* ========================================
            FORM BODY
        ======================================== */}

        <form
          id="task-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
        >
          {/* ERROR */}

          {formError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
              <FiAlertCircle className="flex-shrink-0 mt-0.5" size={14} />
              <span>{formError}</span>
            </div>
          )}

          {/* ========================================
              BASIC INFORMATION
          ======================================== */}

          <section>
            <h3 className={sectionTitleClass}>Basic Information</h3>

            <div className="space-y-3.5">
              <div>
                <label className={labelClass}>
                  Task Title <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Follow up with Rahul"
                  maxLength="150"
                  autoFocus
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Description</label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe what needs to be done..."
                  rows="2"
                  maxLength="2000"
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Task Type</label>

                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="Call">Call</option>
                    <option value="Email">Email</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Quotation">Quotation</option>
                    <option value="Booking">Booking</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Transport">Transport</option>
                    <option value="Visa">Visa</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Payment">Payment</option>
                    <option value="Itinerary">Itinerary</option>
                    <option value="Customer Support">Customer Support</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Priority</label>

                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================
              ASSIGNMENT & SCHEDULE
          ======================================== */}

          <section>
            <h3 className={sectionTitleClass}>Assignment & Schedule</h3>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                {canAssign && (
                  <div>
                    <label className={labelClass}>
                      Assigned To <span className="text-red-500">*</span>
                    </label>

                    <select
                      name="assignedTo"
                      value={form.assignedTo}
                      onChange={handleChange}
                      required
                      className={selectClass}
                    >
                      <option value="">Select user</option>
                      {users.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name} ({item.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={canAssign ? "" : "col-span-2"}>
                  <label className={labelClass}>Status</label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Start Date</label>

                  <input
                    type="datetime-local"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Due Date <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="datetime-local"
                    name="dueDate"
                    value={form.dueDate}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ========================================
              REMINDER
          ======================================== */}

          <section>
            <h3 className={sectionTitleClass}>Reminder</h3>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                name="reminderEnabled"
                checked={form.reminderEnabled}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30 cursor-pointer"
              />

              <span className="text-sm text-gray-700">Enable reminder</span>
            </label>

            {form.reminderEnabled && (
              <div className="mt-3">
                <label className={labelClass}>Reminder At</label>

                <input
                  type="datetime-local"
                  name="reminderAt"
                  value={form.reminderAt}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            )}
          </section>

          {/* ========================================
              CRM RELATIONSHIPS
          ======================================== */}

          <section>
            <h3 className={sectionTitleClass}>CRM Relationships</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Related Lead</label>

                <select
                  name="relatedLead"
                  value={form.relatedLead}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="">None</option>
                  {leads.map((lead) => (
                    <option key={lead._id} value={lead._id}>
                      {lead.firstName} {lead.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Related Contact</label>

                <select
                  name="relatedContact"
                  value={form.relatedContact}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="">None</option>
                  {contacts.map((contact) => (
                    <option key={contact._id} value={contact._id}>
                      {contact.firstName} {contact.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Related Company</label>

                <select
                  name="relatedCompany"
                  value={form.relatedCompany}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="">None</option>
                  {companies.map((company) => (
                    <option key={company._id} value={company._id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Related Trip</label>

                <select
                  name="relatedTrip"
                  value={form.relatedTrip}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="">None</option>
                  {trips.map((trip) => (
                    <option key={trip._id} value={trip._id}>
                      {trip.tripCode
                        ? `${trip.tripCode} - ${trip.title}`
                        : trip.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ========================================
              ADDITIONAL INFORMATION
          ======================================== */}

          <section>
            <h3 className={sectionTitleClass}>Additional Information</h3>

            <div className="space-y-3.5">
              <div>
                <label className={labelClass}>Notes</label>

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Additional notes..."
                  rows="2"
                  maxLength="2000"
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label className={labelClass}>Tags</label>

                <input
                  type="text"
                  name="tags"
                  value={form.tags}
                  onChange={handleChange}
                  placeholder="crm, follow-up, important"
                  className={inputClass}
                />

                <p className="text-xs text-gray-500 mt-1.5">
                  Separate multiple tags with commas.
                </p>
              </div>
            </div>
          </section>
        </form>

        {/* ========================================
            FOOTER
        ======================================== */}

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="task-form"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark active:bg-brand-blue-dark rounded-lg transition shadow-brand disabled:opacity-60 min-w-[110px]"
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin h-3.5 w-3.5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Saving
              </>
            ) : editingTask ? (
              "Update"
            ) : (
              "Create"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default TaskForm;