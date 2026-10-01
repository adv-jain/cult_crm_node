import { useEffect, useState } from "react";
import { FiX, FiAlertCircle } from "react-icons/fi";
import api from "../api";

/* =====================================================
   CONSTANTS
===================================================== */

const initialForm = {
  name: "",
  code: "",
  type: "Private Cab",
  provider: "",
  providerCode: "",
  duration: "",
  class: "",
  fare: "",
  currency: "INR",
  cancellationPolicy: "",
  baggageAllowance: "",
  amenities: "",
  supplier: "",
  status: "Active",
  notes: "",
  departure: { location: "", date: "", time: "" },
  arrival: { location: "", date: "", time: "" },
  vehicleDetails: {
    vehicleType: "",
    vehicleNumber: "",
    driverName: "",
    driverPhone: "",
  },
  contactPerson: { name: "", phone: "", email: "" },
};

const transportTypes = [
  "Flight",
  "Train",
  "Bus",
  "Private Cab",
  "Rental Car",
  "Cruise",
  "Other",
];

const statusOptions = ["Active", "Inactive"];

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10";

/* =====================================================
   FIELD
===================================================== */

function Field({ label, required = false, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

/* =====================================================
   TRANSPORT FORM (extracted, reusable)
===================================================== */

export default function TransportForm({ transport, onClose, onSuccess }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!transport) {
      setForm(initialForm);
      return;
    }

    setForm({
      name: transport.name || "",
      code: transport.code || "",
      type: transport.type || "Private Cab",
      provider: transport.provider || "",
      providerCode: transport.providerCode || "",
      duration: transport.duration || "",
      class: transport.class || "",
      fare: transport.fare ?? "",
      currency: transport.currency || "INR",
      cancellationPolicy: transport.cancellationPolicy || "",
      baggageAllowance: transport.baggageAllowance || "",
      amenities: Array.isArray(transport.amenities)
        ? transport.amenities.join(", ")
        : "",
      supplier: transport.supplier?._id || transport.supplier || "",
      status: transport.status || "Active",
      notes: transport.notes || "",
      departure: {
        location: transport.departure?.location || "",
        date: transport.departure?.date
          ? new Date(transport.departure.date).toISOString().split("T")[0]
          : "",
        time: transport.departure?.time || "",
      },
      arrival: {
        location: transport.arrival?.location || "",
        date: transport.arrival?.date
          ? new Date(transport.arrival.date).toISOString().split("T")[0]
          : "",
        time: transport.arrival?.time || "",
      },
      vehicleDetails: {
        vehicleType: transport.vehicleDetails?.vehicleType || "",
        vehicleNumber: transport.vehicleDetails?.vehicleNumber || "",
        driverName: transport.vehicleDetails?.driverName || "",
        driverPhone: transport.vehicleDetails?.driverPhone || "",
      },
      contactPerson: {
        name: transport.contactPerson?.name || "",
        phone: transport.contactPerson?.phone || "",
        email: transport.contactPerson?.email || "",
      },
    });
  }, [transport]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNestedChange = (section, field, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Transport name is required");
      return;
    }
    if (!form.type) {
      setError("Transport type is required");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        fare: form.fare === "" ? 0 : Number(form.fare),
        amenities: form.amenities
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        supplier: form.supplier || null,
      };

      let response;
      if (transport?._id) {
        response = await api.put(`/transports/${transport._id}`, payload);
      } else {
        response = await api.post("/transports", payload);
      }

      // Extract new/updated transport for parent
      const savedTransport =
        response?.data?.transport || response?.data?.data || null;

      onSuccess?.(savedTransport);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to save transport record"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[720px] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {transport ? "Edit Transport" : "Add Transport"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {transport
                ? "Update transport service details."
                : "Add a new transport service."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <FiX size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {error && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                <FiAlertCircle size={15} />
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* BASIC */}
              <section>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Basic Information
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Main transport details.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Field label="Transport Name" required>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="e.g. Delhi to Jaipur Cab"
                        className={inputClass}
                        required
                      />
                    </Field>
                  </div>

                  <Field label="Code">
                    <input
                      type="text"
                      name="code"
                      value={form.code}
                      onChange={handleChange}
                      placeholder="TRN-001"
                      className={`${inputClass} uppercase`}
                    />
                  </Field>

                  <Field label="Type" required>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      {transportTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Provider">
                    <input
                      type="text"
                      name="provider"
                      value={form.provider}
                      onChange={handleChange}
                      placeholder="Provider / airline / operator"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Provider Code">
                    <input
                      type="text"
                      name="providerCode"
                      value={form.providerCode}
                      onChange={handleChange}
                      placeholder="Provider code"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </section>

              {/* ROUTE */}
              <section className="border-t border-gray-100 pt-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Route & Schedule
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Departure Location">
                    <input
                      type="text"
                      value={form.departure.location}
                      onChange={(e) =>
                        handleNestedChange(
                          "departure",
                          "location",
                          e.target.value
                        )
                      }
                      placeholder="Departure location"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Arrival Location">
                    <input
                      type="text"
                      value={form.arrival.location}
                      onChange={(e) =>
                        handleNestedChange("arrival", "location", e.target.value)
                      }
                      placeholder="Arrival location"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Departure Date">
                    <input
                      type="date"
                      value={form.departure.date}
                      onChange={(e) =>
                        handleNestedChange("departure", "date", e.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Arrival Date">
                    <input
                      type="date"
                      value={form.arrival.date}
                      onChange={(e) =>
                        handleNestedChange("arrival", "date", e.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Departure Time">
                    <input
                      type="time"
                      value={form.departure.time}
                      onChange={(e) =>
                        handleNestedChange("departure", "time", e.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Arrival Time">
                    <input
                      type="time"
                      value={form.arrival.time}
                      onChange={(e) =>
                        handleNestedChange("arrival", "time", e.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Duration">
                    <input
                      type="text"
                      name="duration"
                      value={form.duration}
                      onChange={handleChange}
                      placeholder="e.g. 5 hours"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Class">
                    <input
                      type="text"
                      name="class"
                      value={form.class}
                      onChange={handleChange}
                      placeholder="e.g. Economy"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </section>

              {/* PRICING */}
              <section className="border-t border-gray-100 pt-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Pricing
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Fare">
                    <input
                      type="number"
                      min="0"
                      name="fare"
                      value={form.fare}
                      onChange={handleChange}
                      placeholder="0"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Currency">
                    <input
                      type="text"
                      name="currency"
                      value={form.currency}
                      onChange={handleChange}
                      placeholder="INR"
                      className={`${inputClass} uppercase`}
                    />
                  </Field>

                  <Field label="Status">
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </section>

              {/* SERVICE */}
              <section className="border-t border-gray-100 pt-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Service Details
                  </h3>
                </div>

                <div className="space-y-3">
                  <Field label="Baggage Allowance">
                    <input
                      type="text"
                      name="baggageAllowance"
                      value={form.baggageAllowance}
                      onChange={handleChange}
                      placeholder="e.g. 15 KG"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Amenities">
                    <input
                      type="text"
                      name="amenities"
                      value={form.amenities}
                      onChange={handleChange}
                      placeholder="WiFi, AC, Water, Charging..."
                      className={inputClass}
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      Separate multiple amenities with commas.
                    </p>
                  </Field>

                  <Field label="Cancellation Policy">
                    <textarea
                      name="cancellationPolicy"
                      value={form.cancellationPolicy}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Cancellation terms..."
                      className={`${inputClass} resize-none`}
                    />
                  </Field>
                </div>
              </section>

              {/* VEHICLE + CONTACT */}
              <section className="border-t border-gray-100 pt-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Vehicle & Contact
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Vehicle Type">
                    <input
                      type="text"
                      value={form.vehicleDetails.vehicleType}
                      onChange={(e) =>
                        handleNestedChange(
                          "vehicleDetails",
                          "vehicleType",
                          e.target.value
                        )
                      }
                      placeholder="e.g. Sedan"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Vehicle Number">
                    <input
                      type="text"
                      value={form.vehicleDetails.vehicleNumber}
                      onChange={(e) =>
                        handleNestedChange(
                          "vehicleDetails",
                          "vehicleNumber",
                          e.target.value
                        )
                      }
                      placeholder="Vehicle number"
                      className={`${inputClass} uppercase`}
                    />
                  </Field>

                  <Field label="Driver Name">
                    <input
                      type="text"
                      value={form.vehicleDetails.driverName}
                      onChange={(e) =>
                        handleNestedChange(
                          "vehicleDetails",
                          "driverName",
                          e.target.value
                        )
                      }
                      placeholder="Driver name"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Driver Phone">
                    <input
                      type="text"
                      value={form.vehicleDetails.driverPhone}
                      onChange={(e) =>
                        handleNestedChange(
                          "vehicleDetails",
                          "driverPhone",
                          e.target.value
                        )
                      }
                      placeholder="Driver phone"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Contact Person">
                    <input
                      type="text"
                      value={form.contactPerson.name}
                      onChange={(e) =>
                        handleNestedChange(
                          "contactPerson",
                          "name",
                          e.target.value
                        )
                      }
                      placeholder="Contact name"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Contact Phone">
                    <input
                      type="text"
                      value={form.contactPerson.phone}
                      onChange={(e) =>
                        handleNestedChange(
                          "contactPerson",
                          "phone",
                          e.target.value
                        )
                      }
                      placeholder="Contact phone"
                      className={inputClass}
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <Field label="Contact Email">
                      <input
                        type="email"
                        value={form.contactPerson.email}
                        onChange={(e) =>
                          handleNestedChange(
                            "contactPerson",
                            "email",
                            e.target.value
                          )
                        }
                        placeholder="contact@example.com"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>
              </section>

              {/* NOTES */}
              <section className="border-t border-gray-100 pt-4">
                <Field label="Notes">
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Additional notes..."
                    className={`${inputClass} resize-none`}
                  />
                </Field>
              </section>
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition disabled:opacity-60 min-w-[100px]"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving
                </>
              ) : transport ? (
                "Update Transport"
              ) : (
                "Create Transport"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}