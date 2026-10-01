import { useEffect, useState } from "react";
import {
  FiX,
  FiUser,
  FiPhone,
  FiMail,
  FiMapPin,
  FiTag,
  FiFileText,
  FiUsers,
} from "react-icons/fi";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  destination: "",
  source: "Website",
  priority: "Medium",
  assignedTo: "",
  notes: "",
};

function LeadForm({
  isOpen,
  onClose,
  onSubmit,
  editingLead,
  loading = false,
  currentUser,
  assignableUsers = [],
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  // =====================================================
  // EDIT DATA
  // =====================================================

  useEffect(() => {
    if (!isOpen) return;

    if (editingLead) {
      setForm({
        firstName: editingLead.firstName || "",
        lastName: editingLead.lastName || "",
        email: editingLead.email || "",
        phone: editingLead.phone || "",
        destination: editingLead.destination || "",
        source: editingLead.source || "Website",
        priority: editingLead.priority || "Medium",
        assignedTo:
          editingLead.assignedTo?._id ||
          editingLead.assignedTo ||
          "",
        notes: editingLead.notes || "",
      });
    } else {
      setForm({
        ...initialForm,
        assignedTo:
          currentUser?.role === "sales"
            ? currentUser?._id || currentUser?.id || ""
            : "",
      });
    }

    setError("");
  }, [isOpen, editingLead, currentUser]);

  // =====================================================
  // HANDLE CHANGE
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const destination = form.destination.trim();
    const notes = form.notes.trim();

    // ---------------------------------------------------
    // NAME
    // ---------------------------------------------------

    if (!firstName) {
      setError("Name is required.");
      return;
    }

    // ---------------------------------------------------
    // CONTACT
    // ---------------------------------------------------

    if (!phone && !email) {
      setError("Please provide mobile number or email.");
      return;
    }

    // ---------------------------------------------------
    // EMAIL
    // ---------------------------------------------------

    if (email) {
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        setError("Please enter a valid email address.");
        return;
      }
    }

    // ---------------------------------------------------
    // DESTINATION
    // ---------------------------------------------------

    if (!destination) {
      setError("Destination is required.");
      return;
    }

    // ---------------------------------------------------
    // PHONE
    // ---------------------------------------------------

    if (phone) {
      const phoneDigits = phone.replace(/\D/g, "");

      if (phoneDigits.length < 10) {
        setError("Please enter a valid mobile number.");
        return;
      }
    }

    // ---------------------------------------------------
    // ASSIGNMENT
    // ---------------------------------------------------

    let assignedTo = form.assignedTo;

    if (currentUser?.role === "sales") {
      assignedTo =
        currentUser?._id ||
        currentUser?.id ||
        "";
    }

    const payload = {
      firstName,
      lastName,
      email,
      phone,
      destination,
      source: form.source || "Website",
      priority: form.priority || "Medium",
      notes,
    };

    if (assignedTo) {
      payload.assignedTo = assignedTo;
    }

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to save lead."
      );
    }
  };

  if (!isOpen) return null;

  const isEditing = Boolean(editingLead);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[620px] max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">

          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEditing ? "Edit Lead" : "Create Lead"}
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              {isEditing
                ? "Update lead information"
                : "Add a new travel lead"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
          >
            <FiX size={18} />
          </button>

        </div>

        {/* =================================================
            BODY
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto"
        >

          <div className="px-5 py-5 space-y-6">

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div className="px-3.5 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* =================================================
                CONTACT INFORMATION
            ================================================= */}

            <FormSection
              title="Contact Information"
              description="Basic information about the lead"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <InputField
                label="Name"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder="Rahul Sharma"
                icon={<FiUser size={14} />}
                required
              />

              <InputField
                label="Last Name"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Optional"
                icon={<FiUser size={14} />}
              />

              <InputField
                label="Mobile"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="9876543210"
                icon={<FiPhone size={14} />}
                type="tel"
              />

              <InputField
                label="Email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="rahul@example.com"
                icon={<FiMail size={14} />}
                type="email"
              />

            </div>

            {/* =================================================
                LEAD INFORMATION
            ================================================= */}

            <div>
              <FormSection
                title="Lead Information"
                description="Basic information about the travel requirement"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">

                <InputField
                  label="Destination"
                  name="destination"
                  value={form.destination}
                  onChange={handleChange}
                  placeholder="Manali"
                  icon={<FiMapPin size={14} />}
                  required
                />

                <SelectField
                  label="Source"
                  name="source"
                  value={form.source}
                  onChange={handleChange}
                  icon={<FiTag size={14} />}
                  options={[
                    "Website",
                    "Facebook",
                    "Instagram",
                    "Google Ads",
                    "LinkedIn",
                    "Referral",
                    "Cold Call",
                    "Email Campaign",
                    "WhatsApp",
                    "Walk In",
                    "Other",
                  ]}
                />

                <SelectField
                  label="Priority"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  options={[
                    "Low",
                    "Medium",
                    "High",
                  ]}
                />

              </div>
            </div>

            {/* =================================================
                ASSIGNMENT
            ================================================= */}

            {currentUser?.role !== "sales" && (
              <div>
                <FormSection
                  title="Assignment"
                  description="Assign this lead to a sales user"
                />

                <div className="mt-4">

                  <SelectField
                    label="Assigned To"
                    name="assignedTo"
                    value={form.assignedTo}
                    onChange={handleChange}
                    icon={<FiUsers size={14} />}
                    options={assignableUsers.map((user) => ({
                      value: user._id,
                      label:
                        user.name ||
                        user.email ||
                        "User",
                    }))}
                    placeholder="Select sales person"
                    objectOptions
                  />

                </div>
              </div>
            )}

            {/* =================================================
                NOTES
            ================================================= */}

            <div>

              <FormSection
                title="Notes"
                description="Optional notes about this lead"
              />

              <div className="mt-4">

                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Notes
                </label>

                <div className="relative">

                  <div className="absolute left-3 top-3 text-gray-400">
                    <FiFileText size={14} />
                  </div>

                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Add any additional information..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm text-gray-800 bg-white border border-gray-200 rounded-lg outline-none resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />

                </div>

              </div>

            </div>

          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}

              {loading
                ? "Saving..."
                : isEditing
                ? "Update Lead"
                : "Create Lead"}
            </button>

          </div>

        </form>

      </div>
    </div>
  );
}

// =====================================================
// FORM SECTION
// =====================================================

function FormSection({
  title,
  description,
}) {
  return (
    <div className="flex items-start gap-2">

      <div className="w-1 h-5 rounded-full bg-blue-600 mt-0.5 flex-shrink-0" />

      <div>
        <h3 className="text-sm font-semibold text-gray-800">
          {title}
        </h3>

        {description && (
          <p className="text-[11px] text-gray-400 mt-0.5">
            {description}
          </p>
        )}
      </div>

    </div>
  );
}

// =====================================================
// INPUT FIELD
// =====================================================

function InputField({
  label,
  name,
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
  required = false,
}) {
  return (
    <div>

      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}

        {required && (
          <span className="text-red-500 ml-0.5">
            *
          </span>
        )}
      </label>

      <div className="relative">

        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}

        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full ${
            icon ? "pl-9" : "pl-3"
          } pr-3 py-2.5 text-sm text-gray-800 bg-white border border-gray-200 rounded-lg outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition`}
        />

      </div>

    </div>
  );
}

// =====================================================
// SELECT FIELD
// =====================================================

function SelectField({
  label,
  name,
  value,
  onChange,
  options = [],
  icon,
  placeholder,
  objectOptions = false,
}) {
  return (
    <div>

      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
      </label>

      <div className="relative">

        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}

        <select
          name={name}
          value={value}
          onChange={onChange}
          className={`w-full ${
            icon ? "pl-9" : "pl-3"
          } pr-8 py-2.5 text-sm text-gray-800 bg-white border border-gray-200 rounded-lg outline-none appearance-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition`}
        >

          {placeholder && (
            <option value="">
              {placeholder}
            </option>
          )}

          {options.map((option) => {
            if (objectOptions) {
              return (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              );
            }

            return (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            );
          })}

        </select>

        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
          ▼
        </div>

      </div>

    </div>
  );
}

export default LeadForm;