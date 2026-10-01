import { useEffect, useMemo, useState } from "react";
import {
  FiX,
  FiSave,
  FiUser,
  FiMapPin,
  FiCalendar,
  FiUsers,
  FiHome,
  FiFileText,
  FiUserCheck,
  FiAlertCircle,
  FiCheck,
} from "react-icons/fi";

import { TbCurrencyRupee } from "react-icons/tb";

import DestinationPicker from "./common/DestinationPicker";

/* =========================================================
   CONSTANTS
========================================================= */

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

const HOTEL_CATEGORIES = [
  "Any",
  "Budget",
  "3 Star",
  "4 Star",
  "5 Star",
  "Luxury",
];

const TRANSPORTATION_OPTIONS = [
  "Flight",
  "Train",
  "Bus",
  "Private Cab",
  "Rental Car",
  "Cruise",
  "Mixed",
  "Not Required",
];

const MEAL_OPTIONS = [
  "Room Only",
  "Breakfast",
  "Half Board",
  "Full Board",
  "All Inclusive",
  "Not Specified",
];

const STATUS_OPTIONS = [
  "New",
  "In Progress",
  "Waiting for Customer",
  "Quotation Prepared",
  "Quotation Sent",
  "Confirmed",
  "Cancelled",
  "Closed",
];

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

const SOURCE_OPTIONS = [
  "Website",
  "Facebook",
  "Instagram",
  "Google Ads",
  "LinkedIn",
  "Referral",
  "WhatsApp",
  "Walk In",
  "Cold Call",
  "Email Campaign",
  "Other",
];

const initialForm = {
  lead: "",
  customer: "",
  destination: "",
  departureCity: "",
  travelDate: "",
  returnDate: "",
  flexibleDates: false,
  adults: 1,
  children: 0,
  infants: 0,
  travelType: "Family",
  hotelCategory: "Any",
  roomPreference: "",
  transportation: "Not Required",
  mealPreference: "Not Specified",
  budgetMin: "",
  budgetMax: "",
  currency: "INR",
  specialRequirements: "",
  status: "New",
  priority: "Medium",
  source: "Website",
  assignedTo: "",
  notes: "",
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

function EnquiryForm({
  isOpen,
  onClose,
  onSubmit,
  editingEnquiry,
  loading = false,
  currentUser,
  assignableUsers = [],
}) {
  const [formData, setFormData] = useState(initialForm);
  const [error, setError] = useState("");

  const isEditing = Boolean(editingEnquiry?._id);
  const isAdmin = currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";
  const canAssign = isAdmin || isManager;

  const currentUserId = useMemo(
    () => currentUser?._id || currentUser?.id || "",
    [currentUser]
  );

  useEffect(() => {
    if (!isOpen) return;
    setError("");

    if (editingEnquiry) {
      setFormData({
        lead: editingEnquiry.lead?._id || editingEnquiry.lead || "",
        customer:
          editingEnquiry.customer?._id ||
          editingEnquiry.customer ||
          "",
        destination: editingEnquiry.destination || "",
        departureCity: editingEnquiry.departureCity || "",
        travelDate: formatDateForInput(editingEnquiry.travelDate),
        returnDate: formatDateForInput(editingEnquiry.returnDate),
        flexibleDates: Boolean(editingEnquiry.flexibleDates),
        adults: editingEnquiry.adults ?? 1,
        children: editingEnquiry.children ?? 0,
        infants: editingEnquiry.infants ?? 0,
        travelType: editingEnquiry.travelType || "Family",
        hotelCategory: editingEnquiry.hotelCategory || "Any",
        roomPreference: editingEnquiry.roomPreference || "",
        transportation:
          editingEnquiry.transportation || "Not Required",
        mealPreference:
          editingEnquiry.mealPreference || "Not Specified",
        budgetMin: editingEnquiry.budgetMin ?? "",
        budgetMax: editingEnquiry.budgetMax ?? "",
        currency: editingEnquiry.currency || "INR",
        specialRequirements:
          editingEnquiry.specialRequirements || "",
        status: editingEnquiry.status || "New",
        priority: editingEnquiry.priority || "Medium",
        source: editingEnquiry.source || "Website",
        assignedTo:
          editingEnquiry.assignedTo?._id ||
          editingEnquiry.assignedTo ||
          currentUserId,
        notes: editingEnquiry.notes || "",
      });
      return;
    }

    setFormData({
      ...initialForm,
      assignedTo: currentUserId,
      source: "Website",
      status: "New",
      priority: "Medium",
    });
  }, [isOpen, editingEnquiry, currentUserId]);

  const handleClose = () => {
    if (loading) return;
    setError("");
    onClose();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError("");
  };

  const handleDestinationChange = (destination) => {
    setFormData((prev) => ({ ...prev, destination }));
    if (error) setError("");
  };

  const handleDepartureCityChange = (city) => {
    setFormData((prev) => ({ ...prev, departureCity: city }));
    if (error) setError("");
  };

  const handleNumberChange = (name, value) => {
    const numericValue =
      value === "" ? "" : Math.max(0, Number(value));
    setFormData((prev) => ({ ...prev, [name]: numericValue }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.destination.trim()) {
      setError("Destination is required.");
      return;
    }

    if (!formData.departureCity.trim()) {
      setError("Departure city is required.");
      return;
    }

    if (
      formData.travelDate &&
      formData.returnDate &&
      new Date(formData.returnDate) < new Date(formData.travelDate)
    ) {
      setError("Return date cannot be before travel date.");
      return;
    }

    if (Number(formData.adults) < 1) {
      setError("At least 1 adult is required.");
      return;
    }

    if (
      formData.budgetMin !== "" &&
      formData.budgetMax !== "" &&
      Number(formData.budgetMax) < Number(formData.budgetMin)
    ) {
      setError(
        "Maximum budget cannot be less than minimum budget."
      );
      return;
    }

    const finalAssignedTo = formData.assignedTo || currentUserId;

    if (!finalAssignedTo) {
      setError("Unable to determine assigned user.");
      return;
    }

    const payload = {
      title: formData.destination.trim()
        ? `${formData.destination.trim()} Travel Enquiry`
        : "",
      lead: formData.lead || null,
      customer: formData.customer || null,
      assignedTo: finalAssignedTo,
      destination: formData.destination.trim(),
      departureCity: formData.departureCity.trim(),
      travelDate: formData.travelDate || null,
      returnDate: formData.returnDate || null,
      flexibleDates: Boolean(formData.flexibleDates),
      adults: Number(formData.adults) || 1,
      children: Number(formData.children) || 0,
      infants: Number(formData.infants) || 0,
      travelType: formData.travelType || "Other",
      hotelCategory: formData.hotelCategory || "Any",
      roomPreference: formData.roomPreference.trim(),
      transportation: formData.transportation || "Not Required",
      mealPreference:
        formData.mealPreference || "Not Specified",
      budgetMin:
        formData.budgetMin === "" ? 0 : Number(formData.budgetMin),
      budgetMax:
        formData.budgetMax === "" ? 0 : Number(formData.budgetMax),
      currency: formData.currency || "INR",
      specialRequirements: formData.specialRequirements.trim(),
      status: isEditing ? formData.status || "New" : "New",
      priority: formData.priority || "Medium",
      source: formData.source || "Website",
      quotationRequired: true,
      quotationDueDate: null,
      notes: formData.notes.trim(),
    };

    await onSubmit(payload);
  };

  const contactName = useMemo(() => {
    if (editingEnquiry?.customer) {
      const c = editingEnquiry.customer;
      const name = [c.firstName, c.lastName]
        .filter(Boolean)
        .join(" ");
      return name || c.email || "Customer";
    }
    if (editingEnquiry?.lead) {
      const l = editingEnquiry.lead;
      const name = [l.firstName, l.lastName]
        .filter(Boolean)
        .join(" ");
      return name || l.email || "Lead";
    }
    return "";
  }, [editingEnquiry]);

  const contactPhone = useMemo(
    () =>
      editingEnquiry?.customer?.phone ||
      editingEnquiry?.lead?.phone ||
      "",
    [editingEnquiry]
  );

  const contactEmail = useMemo(
    () =>
      editingEnquiry?.customer?.email ||
      editingEnquiry?.lead?.email ||
      "",
    [editingEnquiry]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-3 sm:p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-[slideUp_0.25s_ease-out]">

        {/* HEADER */}
        <div className="relative shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 right-16 w-20 h-20 rounded-full bg-white/5" />

          <div className="relative flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/20">
                {isEditing ? (
                  <FiFileText size={18} className="text-white" />
                ) : (
                  <FiMapPin size={18} className="text-white" />
                )}
              </div>

              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  {isEditing
                    ? "Edit Travel Enquiry"
                    : "New Travel Enquiry"}
                </h2>

                <p className="text-[11px] text-blue-100 mt-0.5">
                  {isEditing
                    ? "Update travel requirements"
                    : "Capture the customer's travel requirements"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition disabled:opacity-50"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">

            {error && (
              <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                <FiAlertCircle size={15} className="mt-0.5 shrink-0" />
                <span className="pt-0.5">{error}</span>
              </div>
            )}

            {/* LINKED CONTACT */}
            {contactName && (
              <section className="mb-4 overflow-hidden rounded-lg border border-blue-100 bg-blue-50/60">
                <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-blue-100/60">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                    <FiUser size={13} />
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-gray-900">
                      Customer / Lead
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      Auto-linked from previous step
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-3">
                  <InfoBox label="Name" value={contactName} />
                  <InfoBox
                    label="Mobile"
                    value={contactPhone || "—"}
                  />
                  <InfoBox
                    label="Email"
                    value={contactEmail || "—"}
                  />
                </div>
              </section>
            )}

            {/* ============================================
                TRIP DETAILS
            ============================================ */}

            <Section
              icon={<FiMapPin size={15} />}
              iconColor="blue"
              title="Trip Details"
              description="Where is the customer going?"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                {/* DESTINATION — 50% on desktop */}
                <div>
                  <CompactLabel required>
                    Destination
                  </CompactLabel>

                  <DestinationPicker
                    value={formData.destination}
                    onChange={handleDestinationChange}
                    placeholder="Search destination..."
                  />
                </div>

                {/* DEPARTURE CITY — 50% on desktop */}
                <div>
                  <CompactLabel required>
                    Departure City
                  </CompactLabel>

                  <DestinationPicker
                    value={formData.departureCity}
                    onChange={handleDepartureCityChange}
                    placeholder="Search departure city..."
                    showTabs={false}
                  />
                </div>

                {/* TRAVEL TYPE */}
                <SelectField
                  label="Travel Type"
                  name="travelType"
                  value={formData.travelType}
                  onChange={handleChange}
                  options={TRAVEL_TYPES}
                />

                {/* TRAVEL DATES */}
                <div>
                  <CompactLabel>
                    Travel Dates
                  </CompactLabel>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <FiCalendar
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                      <input
                        type="date"
                        name="travelDate"
                        value={formData.travelDate}
                        onChange={handleChange}
                        className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div className="relative">
                      <FiCalendar
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                      <input
                        type="date"
                        name="returnDate"
                        value={formData.returnDate}
                        onChange={handleChange}
                        className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <label className="mt-2 inline-flex items-center gap-2 cursor-pointer">
                    <input
                      id="flexibleDates"
                      type="checkbox"
                      name="flexibleDates"
                      checked={formData.flexibleDates}
                      onChange={handleChange}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-600">
                      Dates are flexible
                    </span>
                  </label>
                </div>
              </div>
            </Section>

            {/* TRAVELLERS */}
            <Section
              icon={<FiUsers size={15} />}
              iconColor="purple"
              title="Travellers"
              description="How many people are travelling?"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <NumberField
                  label="Adults"
                  required
                  value={formData.adults}
                  min={1}
                  onChange={(value) =>
                    handleNumberChange("adults", value)
                  }
                />

                <NumberField
                  label="Children"
                  value={formData.children}
                  min={0}
                  onChange={(value) =>
                    handleNumberChange("children", value)
                  }
                />

                <NumberField
                  label="Infants"
                  value={formData.infants}
                  min={0}
                  onChange={(value) =>
                    handleNumberChange("infants", value)
                  }
                />
              </div>
            </Section>

            {/* TRAVEL PREFERENCES */}
            <Section
              icon={<FiHome size={15} />}
              iconColor="emerald"
              title="Travel Preferences"
              description="Hotel, room, transport and meal preferences."
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <SelectField
                  label="Hotel Category"
                  name="hotelCategory"
                  value={formData.hotelCategory}
                  onChange={handleChange}
                  options={HOTEL_CATEGORIES}
                />

                <InputField
                  label="Room Preference"
                  name="roomPreference"
                  value={formData.roomPreference}
                  onChange={handleChange}
                  placeholder="e.g. Double Room / Twin Sharing"
                />

                <SelectField
                  label="Transportation"
                  name="transportation"
                  value={formData.transportation}
                  onChange={handleChange}
                  options={TRANSPORTATION_OPTIONS}
                />

                <SelectField
                  label="Meal Preference"
                  name="mealPreference"
                  value={formData.mealPreference}
                  onChange={handleChange}
                  options={MEAL_OPTIONS}
                />
              </div>
            </Section>

            {/* BUDGET */}
            <Section
              icon={<TbCurrencyRupee size={17} />}
              iconColor="amber"
              title="Budget"
              description="Approximate budget shared by the customer."
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <InputField
                  label="Minimum Budget"
                  type="number"
                  min="0"
                  name="budgetMin"
                  value={formData.budgetMin}
                  onChange={handleChange}
                  placeholder="50000"
                />

                <InputField
                  label="Maximum Budget"
                  type="number"
                  min="0"
                  name="budgetMax"
                  value={formData.budgetMax}
                  onChange={handleChange}
                  placeholder="70000"
                />

                <SelectField
                  label="Currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  options={[
                    "INR",
                    "USD",
                    "EUR",
                    "GBP",
                    "AED",
                    "SGD",
                  ]}
                />
              </div>
            </Section>

            {/* ADDITIONAL REQUIREMENTS */}
            <Section
              icon={<FiFileText size={15} />}
              iconColor="pink"
              title="Additional Requirements"
              description="Anything else the customer has requested."
            >
              <div className="space-y-3">
                <TextAreaField
                  label="Special Requirements"
                  name="specialRequirements"
                  value={formData.specialRequirements}
                  onChange={handleChange}
                  placeholder="e.g. Honeymoon decoration, vegetarian meals..."
                  rows={2}
                />

                <TextAreaField
                  label="Internal Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Internal notes for the team..."
                  rows={2}
                />
              </div>
            </Section>

            {/* MANAGEMENT */}
            <Section
              icon={<FiUserCheck size={15} />}
              iconColor="indigo"
              title="Enquiry Management"
              description="Priority, source and assignment."
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <SelectField
                  label="Priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  options={PRIORITY_OPTIONS}
                />

                <SelectField
                  label="Source"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  options={SOURCE_OPTIONS}
                />

                {isEditing && (
                  <SelectField
                    label="Status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    options={STATUS_OPTIONS}
                  />
                )}

                {canAssign ? (
                  <SelectField
                    label="Assigned To"
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleChange}
                    options={assignableUsers.map((user) => ({
                      value: user._id,
                      label: `${user.name || user.email} (${user.role})`,
                    }))}
                    valueKey="value"
                    labelKey="label"
                  />
                ) : (
                  <div>
                    <CompactLabel>Assigned To</CompactLabel>
                    <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">
                      {currentUser?.name ||
                        currentUser?.email ||
                        "Current user"}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* WORKFLOW INFO */}
            <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50/50 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 shrink-0">
                  <FiCheck size={14} />
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-800">
                    What happens next?
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-gray-600">
                    This enquiry will start with{" "}
                    <span className="font-semibold text-gray-800">
                      New
                    </span>{" "}
                    status. The sales team can then prepare a
                    quotation and continue the booking process.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30 px-5 py-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave size={14} />
                  {isEditing
                    ? "Update Enquiry"
                    : "Create Enquiry"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(15px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   SECTION
========================================================= */

function Section({ icon, iconColor = "blue", title, description, children }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    pink: "bg-pink-50 text-pink-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <section className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white px-4 py-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            colorMap[iconColor] || colorMap.blue
          }`}
        >
          {icon}
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-900 tracking-tight">
            {title}
          </h3>

          {description && (
            <p className="text-[10px] text-gray-500 mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="p-4">{children}</div>
    </section>
  );
}

/* =========================================================
   COMPACT LABEL
========================================================= */

function CompactLabel({ children, required = false }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-gray-700">
      {children}
      {required && (
        <span className="ml-1 text-red-500">*</span>
      )}
    </label>
  );
}

/* =========================================================
   INPUT FIELD
========================================================= */

function InputField({
  label,
  required = false,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
}) {
  return (
    <div>
      <CompactLabel required={required}>
        {label}
      </CompactLabel>

      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

/* =========================================================
   SELECT FIELD
========================================================= */

function SelectField({
  label,
  name,
  value,
  onChange,
  options = [],
  valueKey,
  labelKey,
}) {
  return (
    <div>
      <CompactLabel>{label}</CompactLabel>

      <select
        name={name}
        value={value ?? ""}
        onChange={onChange}
        className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 cursor-pointer"
      >
        {options.map((option, index) => {
          const isObject = typeof option === "object";
          const optionValue = isObject
            ? option[valueKey]
            : option;
          const optionLabel = isObject
            ? option[labelKey]
            : option;

          return (
            <option
              key={`${optionValue}-${index}`}
              value={optionValue}
            >
              {optionLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
}

/* =========================================================
   NUMBER FIELD
========================================================= */

function NumberField({
  label,
  required = false,
  value,
  min = 0,
  onChange,
}) {
  return (
    <div>
      <CompactLabel required={required}>
        {label}
      </CompactLabel>

      <input
        type="number"
        min={min}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

/* =========================================================
   TEXTAREA FIELD
========================================================= */

function TextAreaField({
  label,
  name,
  value,
  onChange,
  placeholder,
  rows = 3,
}) {
  return (
    <div>
      <CompactLabel>{label}</CompactLabel>

      <textarea
        name={name}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

/* =========================================================
   INFO BOX
========================================================= */

function InfoBox({ label, value }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white/80 px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-blue-500">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-semibold text-gray-800">
        {value || "—"}
      </p>
    </div>
  );
}

/* =========================================================
   DATE FORMATTER
========================================================= */

function formatDateForInput(date) {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default EnquiryForm;