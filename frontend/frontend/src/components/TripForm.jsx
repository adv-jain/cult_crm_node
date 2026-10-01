
import { useEffect, useState } from "react";
import { FiX, FiAlertCircle } from "react-icons/fi";

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

const initialForm = {
  title: "",
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
  customer: "",
  company: "",
  lead: "",
  owner: "",
  description: "",
  cancellationReason: "",
};

function TripForm({
  isOpen,
  onClose,
  onSubmit,
  editingTrip,
  loading,
  companies = [],
  customers = [],
  leads = [],
  users = [],
  user,
}) {
  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState("");

  // ==========================================
  // LOAD EDIT DATA
  // ==========================================
  useEffect(() => {
    if (editingTrip) {
      setFormData({
        title: editingTrip.title || "",
        tripCode: editingTrip.tripCode || "",
        destination: editingTrip.destination || "",
        startDate: editingTrip.startDate
          ? new Date(editingTrip.startDate)
              .toISOString()
              .split("T")[0]
          : "",
        endDate: editingTrip.endDate
          ? new Date(editingTrip.endDate)
              .toISOString()
              .split("T")[0]
          : "",
        travelType: editingTrip.travelType || "Other",
        adults: editingTrip.adults ?? 1,
        children: editingTrip.children ?? 0,
        infants: editingTrip.infants ?? 0,
        status: editingTrip.status || "Planning",
        estimatedValue: editingTrip.estimatedValue ?? "",
        totalAmount: editingTrip.totalAmount ?? "",
        totalCost: editingTrip.totalCost ?? "",
        customer:
          editingTrip.customer?._id ||
          editingTrip.customer ||
          "",
        company:
          editingTrip.company?._id ||
          editingTrip.company ||
          "",
        lead:
          editingTrip.lead?._id ||
          editingTrip.lead ||
          "",
        owner:
          editingTrip.owner?._id ||
          editingTrip.owner ||
          "",
        description: editingTrip.description || "",
        cancellationReason:
          editingTrip.cancellationReason || "",
      });
    } else {
      setFormData({ ...initialForm });
    }

    setFormError("");
  }, [editingTrip, isOpen]);

  // ==========================================
  // ESC KEY CLOSE
  // ==========================================
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  // ==========================================
  // BODY SCROLL LOCK
  // ==========================================
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // ==========================================
  // HANDLE CHANGE
  // ==========================================
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (
      name === "status" &&
      value !== "Cancelled"
    ) {
      setFormData((previous) => ({
        ...previous,
        status: value,
        cancellationReason: "",
      }));
    }

    // Lead change can automatically select
    // the lead owner for admin/manager.
    if (name === "lead") {
      const selectedLead = leads.find(
        (lead) => lead._id === value
      );

      if (selectedLead?.assignedTo) {
        const leadOwner =
          selectedLead.assignedTo;

        const ownerId =
          typeof leadOwner === "object"
            ? leadOwner._id
            : leadOwner;

        if (
          user?.role === "admin" ||
          user?.role === "manager"
        ) {
          setFormData((previous) => ({
            ...previous,
            lead: value,
            owner: ownerId || "",
          }));
        }
      }
    }
  };

  // ==========================================
  // SUBMIT
  // ==========================================
  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!formData.title.trim()) {
      setFormError("Trip title is required");
      return;
    }

    if (!formData.destination.trim()) {
      setFormError("Destination is required");
      return;
    }

    if (
      formData.startDate &&
      formData.endDate &&
      new Date(formData.endDate) <
        new Date(formData.startDate)
    ) {
      setFormError(
        "End date cannot be before start date"
      );
      return;
    }

    if (Number(formData.adults) < 1) {
      setFormError(
        "At least one adult is required"
      );
      return;
    }

    if (Number(formData.children) < 0) {
      setFormError(
        "Children count cannot be negative"
      );
      return;
    }

    if (Number(formData.infants) < 0) {
      setFormError(
        "Infants count cannot be negative"
      );
      return;
    }

    if (
      formData.status === "Cancelled" &&
      !formData.cancellationReason
    ) {
      setFormError(
        "Please select a cancellation reason"
      );
      return;
    }

    if (
      formData.estimatedValue !== "" &&
      Number(formData.estimatedValue) < 0
    ) {
      setFormError(
        "Estimated value cannot be negative"
      );
      return;
    }

    if (
      formData.totalAmount !== "" &&
      Number(formData.totalAmount) < 0
    ) {
      setFormError(
        "Total amount cannot be negative"
      );
      return;
    }

    if (
      formData.totalCost !== "" &&
      Number(formData.totalCost) < 0
    ) {
      setFormError(
        "Total cost cannot be negative"
      );
      return;
    }

    const submitData = {
      title: formData.title.trim(),
      destination: formData.destination.trim(),
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      travelType: formData.travelType,
      adults: Number(formData.adults) || 1,
      children: Number(formData.children) || 0,
      infants: Number(formData.infants) || 0,
      status: formData.status,
      estimatedValue:
        Number(formData.estimatedValue) || 0,
      totalAmount:
        Number(formData.totalAmount) || 0,
      totalCost:
        Number(formData.totalCost) || 0,
      customer:
        formData.customer || undefined,
      company:
        formData.company || undefined,
      lead:
        formData.lead || undefined,
      description:
        formData.description.trim() || undefined,
      cancellationReason:
        formData.status === "Cancelled"
          ? formData.cancellationReason
          : undefined,
    };

    if (
      user?.role === "admin" ||
      user?.role === "manager"
    ) {
      submitData.owner =
        formData.owner || undefined;
    }

    try {
      await onSubmit(submitData);
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Something went wrong"
      );
    }
  };

  const canAssign =
    user?.role === "admin" ||
    user?.role === "manager";

  // ==========================================
  // UI
  // ==========================================
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px] animate-[fadeIn_.15s_ease-out]"
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[620px] max-h-[90vh] bg-white rounded-2xl shadow-2xl shadow-gray-900/20 flex flex-col overflow-hidden animate-[popIn_.18s_ease-out]">

        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">

          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {editingTrip
                ? "Edit Trip"
                : "New Trip"}
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              {editingTrip
                ? "Update the trip information"
                : "Fill in the trip details below"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-40"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>

        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {formError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-4">
              <FiAlertCircle
                className="flex-shrink-0 mt-0.5"
                size={14}
              />

              <span>{formError}</span>
            </div>
          )}

          <form
            id="trip-form"
            onSubmit={handleSubmit}
            className="space-y-3.5"
          >

            {/* TITLE + DESTINATION */}
            <div className="grid grid-cols-2 gap-3">

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Trip Title{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Kashmir Family Trip"
                  autoFocus
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Destination{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  placeholder="e.g. Kashmir"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                />
              </div>

            </div>

            {/* DATES */}
            <div className="grid grid-cols-2 gap-3">

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Start Date
                </label>

                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  End Date
                </label>

                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                />
              </div>

            </div>

            {/* TRAVEL TYPE + STATUS */}
            <div className="grid grid-cols-2 gap-3">

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Travel Type
                </label>

                <select
                  name="travelType"
                  value={formData.travelType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition cursor-pointer"
                >
                  {TRAVEL_TYPES.map((type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Status
                </label>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition cursor-pointer"
                >
                  {TRIP_STATUSES.map((status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* TRAVELLERS */}
            <div>

              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Travellers
              </label>

              <div className="grid grid-cols-3 gap-3">

                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">
                    Adults
                  </label>

                  <input
                    type="number"
                    name="adults"
                    value={formData.adults}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">
                    Children
                  </label>

                  <input
                    type="number"
                    name="children"
                    value={formData.children}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">
                    Infants
                  </label>

                  <input
                    type="number"
                    name="infants"
                    value={formData.infants}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                  />
                </div>

              </div>

            </div>

            {/* AMOUNTS */}
            <div className="grid grid-cols-3 gap-3">

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Estimated Value
                </label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    ₹
                  </span>

                  <input
                    type="number"
                    name="estimatedValue"
                    value={formData.estimatedValue}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Total Amount
                </label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    ₹
                  </span>

                  <input
                    type="number"
                    name="totalAmount"
                    value={formData.totalAmount}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Total Cost
                </label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    ₹
                  </span>

                  <input
                    type="number"
                    name="totalCost"
                    value={formData.totalCost}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition"
                  />
                </div>
              </div>

            </div>

            {/* CUSTOMER */}
            <div>

              <label className="block text-xs font-medium text-gray-600 mb-1">
                Customer
              </label>

              <select
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition cursor-pointer"
              >
                <option value="">
                  Select Customer
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer._id}
                    value={customer._id}
                  >
                    {customer.name ||
                      `${customer.firstName || ""} ${
                        customer.lastName || ""
                      }`.trim() ||
                      customer.email ||
                      "Unnamed Customer"}
                  </option>
                ))}
              </select>

            </div>

            {/* COMPANY */}
            <div>

              <label className="block text-xs font-medium text-gray-600 mb-1">
                Company
              </label>

              <select
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition cursor-pointer"
              >
                <option value="">
                  Select Company
                </option>

                {companies.map((company) => (
                  <option
                    key={company._id}
                    value={company._id}
                  >
                    {company.name}
                  </option>
                ))}
              </select>

            </div>

            {/* LEAD */}
            <div>

              <label className="block text-xs font-medium text-gray-600 mb-1">
                Lead
              </label>

              <select
                name="lead"
                value={formData.lead}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition cursor-pointer"
              >
                <option value="">
                  Select Lead
                </option>

                {leads.map((lead) => (
                  <option
                    key={lead._id}
                    value={lead._id}
                  >
                    {lead.firstName}{" "}
                    {lead.lastName || ""}
                  </option>
                ))}
              </select>

            </div>

            {/* ASSIGNED TO */}
            {canAssign && (
              <div>

                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Assigned To
                </label>

                <select
                  name="owner"
                  value={formData.owner}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition cursor-pointer"
                >
                  <option value="">
                    Select User
                  </option>

                  {users.map((item) => (
                    <option
                      key={item._id}
                      value={item._id}
                    >
                      {item.name} ({item.role})
                    </option>
                  ))}
                </select>

                <p className="text-xs text-gray-500 mt-1.5">
                  By default, the lead owner will be assigned.
                </p>

              </div>
            )}

            {/* SALES OWNER INFO */}
            {user?.role === "sales" && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                <p className="text-xs text-blue-700">
                  This trip will be assigned to you automatically.
                </p>
              </div>
            )}

            {/* CANCELLATION REASON */}
            {formData.status === "Cancelled" && (
              <div>

                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cancellation Reason{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <select
                  name="cancellationReason"
                  value={formData.cancellationReason}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition cursor-pointer"
                >
                  <option value="">
                    Select Cancellation Reason
                  </option>

                  {CANCELLATION_REASONS.map(
                    (reason) => (
                      <option
                        key={reason}
                        value={reason}
                      >
                        {reason}
                      </option>
                    )
                  )}
                </select>

              </div>
            )}

            {/* DESCRIPTION */}
            <div>

              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description
              </label>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter trip description..."
                rows="3"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition resize-none"
              />

            </div>

          </form>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">

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
            form="trip-form"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition shadow-sm shadow-blue-600/20 disabled:opacity-60 min-w-[100px]"
          >
            {loading ? (
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
            ) : editingTrip ? (
              "Update"
            ) : (
              "Create"
            )}
          </button>

        </div>
      </div>

      {/* ANIMATIONS */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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

export default TripForm;

