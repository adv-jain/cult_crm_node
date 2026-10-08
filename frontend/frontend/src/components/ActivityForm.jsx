import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiX, FiAlertCircle } from "react-icons/fi";
import api from "../api";

function ActivityForm({
  user,
  editingActivity,
  leads = [],
  contacts = [],
  companies = [],
  trips = [],
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    type: "Call",
    title: "",
    description: "",
    activityDate: "",
    outcome: "Completed",
    lead: "",
    contact: "",
    company: "",
    trip: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // ==========================================
  // LOAD EDIT / DEFAULT DATA
  // ==========================================
  useEffect(() => {
    if (!editingActivity) {
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const localNow = new Date(now.getTime() - offset)
        .toISOString()
        .slice(0, 16);

      setForm({
        type: "Call",
        title: "",
        description: "",
        activityDate: localNow,
        outcome: "Completed",
        lead: "",
        contact: "",
        company: "",
        trip: "",
        notes: "",
      });

      setFormError("");
      return;
    }

    const formatDateTime = (date) => {
      if (!date) return "";

      const d = new Date(date);
      const offset = d.getTimezoneOffset() * 60000;

      return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    };

    setForm({
      type: editingActivity.type || "Call",
      title: editingActivity.title || "",
      description: editingActivity.description || "",
      activityDate: formatDateTime(editingActivity.activityDate),
      outcome: editingActivity.outcome || "Completed",
      lead: editingActivity.lead?._id || "",
      contact: editingActivity.contact?._id || "",
      company: editingActivity.company?._id || "",
      trip: editingActivity.trip?._id || "",
      notes: editingActivity.notes || "",
    });

    setFormError("");
  }, [editingActivity]);

  // ==========================================
  // ESC CLOSE
  // ==========================================
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [saving, onClose]);

  // ==========================================
  // BODY SCROLL LOCK
  // ==========================================
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ==========================================
  // CHANGE
  // ==========================================
  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ==========================================
  // SUBMIT
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.title.trim()) {
      setFormError("Activity title is required");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        type: form.type,
        title: form.title.trim(),
        description: form.description,
        activityDate: form.activityDate || new Date(),
        outcome: form.outcome,
        lead: form.lead || null,
        contact: form.contact || null,
        company: form.company || null,
        trip: form.trip || null,
        notes: form.notes,
      };

      if (editingActivity) {
        await api.put(`/activities/${editingActivity._id}`, payload);
      } else {
        await api.post("/activities", payload);
      }

      await onSaved();
    } catch (error) {
      console.error(
        "Save activity error:",
        error.response?.data || error.message
      );

      setFormError(
        error.response?.data?.message || "Failed to save activity"
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // HELPERS
  // ==========================================
  const inputClass =
    "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue focus:bg-white transition";

  const selectClass =
    "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue focus:bg-white transition cursor-pointer";

  const labelClass = "block text-xs font-medium text-gray-600 mb-1";

  const sectionTitleClass =
    "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3";

  // ==========================================
  // RENDER — WITH PORTAL
  // ==========================================
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
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {editingActivity ? "Edit Activity" : "New Activity"}
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              {editingActivity
                ? "Update activity details"
                : "Record customer interaction and sales activity"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-40"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <form
          id="activity-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
        >
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
              <FiAlertCircle className="flex-shrink-0 mt-0.5" size={14} />
              <span>{formError}</span>
            </div>
          )}

          {/* SECTION: ACTIVITY INFORMATION */}
          <section>
            <h3 className={sectionTitleClass}>Activity Information</h3>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>
                    Activity Type <span className="text-red-500">*</span>
                  </label>

                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className={selectClass}
                  >
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

                <div>
                  <label className={labelClass}>Outcome</label>

                  <select
                    name="outcome"
                    value={form.outcome}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="Positive">Positive</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Negative">Negative</option>
                    <option value="No Response">No Response</option>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Activity Title <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Initial discussion with Rahul"
                  autoFocus
                  required
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Activity Date</label>

                  <input
                    type="datetime-local"
                    name="activityDate"
                    value={form.activityDate}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Description</label>

                  <input
                    type="text"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Short description"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* SECTION: CRM RELATIONSHIPS */}
          <section>
            <h3 className={sectionTitleClass}>CRM Relationships</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Lead</label>

                <select
                  name="lead"
                  value={form.lead}
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
                <label className={labelClass}>Contact</label>

                <select
                  name="contact"
                  value={form.contact}
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
                <label className={labelClass}>Company</label>

                <select
                  name="company"
                  value={form.company}
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
                <label className={labelClass}>Trip</label>

                <select
                  name="trip"
                  value={form.trip}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="">None</option>
                  {trips.map((trip) => (
                    <option key={trip._id} value={trip._id}>
                      {trip.title}
                      {trip.destination ? ` — ${trip.destination}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* SECTION: NOTES */}
          <section>
            <h3 className={sectionTitleClass}>Notes</h3>

            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Add additional information..."
              rows="3"
              className={`${inputClass} resize-none`}
            />
          </section>
        </form>

        {/* FOOTER */}
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
            form="activity-form"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark rounded-lg transition shadow-brand disabled:opacity-60 min-w-[110px]"
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
            ) : editingActivity ? (
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

export default ActivityForm;