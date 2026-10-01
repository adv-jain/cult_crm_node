import { useEffect, useState } from "react";
import {
  FiX,
  FiPlus,
  FiTrash2,
  FiHome,
  FiAlertCircle,
} from "react-icons/fi";
import api from "../api";

/* =====================================================
   CONSTANTS
===================================================== */

const initialForm = {
  name: "",
  code: "",
  description: "",
  destination: "",
  city: "",
  state: "",
  country: "India",
  address: "",
  postalCode: "",
  latitude: "",
  longitude: "",
  category: "3 Star",
  rating: 0,
  checkInTime: "14:00",
  checkOutTime: "12:00",
  amenities: "",
  roomTypes: [],
  contactName: "",
  contactDesignation: "",
  contactPhone: "",
  contactEmail: "",
  contactWhatsapp: "",
  cancellationPolicy: "",
  paymentTerms: "",
  website: "",
  images: "",
  status: "Active",
  notes: "",
};

const categories = [
  "Budget",
  "2 Star",
  "3 Star",
  "4 Star",
  "5 Star",
  "Luxury",
  "Resort",
  "Boutique",
  "Villa",
  "Apartment",
  "Hostel",
  "Other",
];

const mealPlans = [
  "Room Only",
  "Breakfast",
  "Half Board",
  "Full Board",
  "All Inclusive",
];

const emptyRoom = {
  name: "",
  description: "",
  maxAdults: 2,
  maxChildren: 1,
  bedType: "",
  mealPlan: "Room Only",
  pricePerNight: 0,
  availableRooms: 0,
};

const inputClass =
  "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400";

const getInitialForm = () => ({ ...initialForm, roomTypes: [] });

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

/* =====================================================
   SHARED PRIMITIVES
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

function FormSection({ title, description, children }) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-[11px] text-gray-500">{description}</p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/* =====================================================
   HOTEL FORM (extracted, reusable)
===================================================== */

export default function HotelForm({ hotel, onClose, onSuccess }) {
  const [form, setForm] = useState(getInitialForm());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hotel) {
      setForm(getInitialForm());
      return;
    }

    setForm({
      name: hotel.name || "",
      code: hotel.code || "",
      description: hotel.description || "",
      destination: hotel.destination || "",
      city: hotel.city || "",
      state: hotel.state || "",
      country: hotel.country || "India",
      address: hotel.address || "",
      postalCode: hotel.postalCode || "",
      latitude:
        hotel.location?.latitude !== null &&
        hotel.location?.latitude !== undefined
          ? hotel.location.latitude
          : "",
      longitude:
        hotel.location?.longitude !== null &&
        hotel.location?.longitude !== undefined
          ? hotel.location.longitude
          : "",
      category: hotel.category || "3 Star",
      rating: hotel.rating || 0,
      checkInTime: hotel.checkInTime || "14:00",
      checkOutTime: hotel.checkOutTime || "12:00",
      amenities: Array.isArray(hotel.amenities)
        ? hotel.amenities.join(", ")
        : "",
      roomTypes: Array.isArray(hotel.roomTypes)
        ? hotel.roomTypes.map((room) => ({
            name: room.name || "",
            description: room.description || "",
            maxAdults: room.maxAdults ?? 2,
            maxChildren: room.maxChildren ?? 1,
            bedType: room.bedType || "",
            mealPlan: room.mealPlan || "Room Only",
            pricePerNight: room.pricePerNight ?? 0,
            availableRooms: room.availableRooms ?? 0,
          }))
        : [],
      contactName: hotel.contactPerson?.name || "",
      contactDesignation: hotel.contactPerson?.designation || "",
      contactPhone: hotel.contactPerson?.phone || "",
      contactEmail: hotel.contactPerson?.email || "",
      contactWhatsapp: hotel.contactPerson?.whatsapp || "",
      cancellationPolicy: hotel.cancellationPolicy || "",
      paymentTerms: hotel.paymentTerms || "",
      website: hotel.website || "",
      images: Array.isArray(hotel.images) ? hotel.images.join(", ") : "",
      status: hotel.status || "Active",
      notes: hotel.notes || "",
    });
  }, [hotel]);

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

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addRoom = () => {
    setForm((prev) => ({
      ...prev,
      roomTypes: [...prev.roomTypes, { ...emptyRoom }],
    }));
  };

  const updateRoom = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      roomTypes: prev.roomTypes.map((room, roomIndex) =>
        roomIndex === index ? { ...room, [field]: value } : room
      ),
    }));
  };

  const removeRoom = (index) => {
    setForm((prev) => ({
      ...prev,
      roomTypes: prev.roomTypes.filter(
        (_, roomIndex) => roomIndex !== index
      ),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Hotel name is required.");
      return;
    }
    if (!form.destination.trim()) {
      setError("Destination is required.");
      return;
    }
    if (!form.country.trim()) {
      setError("Country is required.");
      return;
    }

    const validRooms = form.roomTypes.filter((room) => room.name.trim());

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      description: form.description.trim(),
      destination: form.destination.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: form.country.trim(),
      address: form.address.trim(),
      postalCode: form.postalCode.trim(),
      location: {
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
      },
      category: form.category,
      rating: Number(form.rating) || 0,
      checkInTime: form.checkInTime,
      checkOutTime: form.checkOutTime,
      amenities: form.amenities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      roomTypes: validRooms.map((room) => ({
        name: room.name.trim(),
        description: room.description.trim(),
        maxAdults: Number(room.maxAdults) || 1,
        maxChildren: Number(room.maxChildren) || 0,
        bedType: room.bedType.trim(),
        mealPlan: room.mealPlan,
        pricePerNight: Number(room.pricePerNight) || 0,
        availableRooms: Number(room.availableRooms) || 0,
      })),
      contactPerson: {
        name: form.contactName.trim(),
        designation: form.contactDesignation.trim(),
        phone: form.contactPhone.trim(),
        email: form.contactEmail.trim(),
        whatsapp: form.contactWhatsapp.trim(),
      },
      cancellationPolicy: form.cancellationPolicy.trim(),
      paymentTerms: form.paymentTerms.trim(),
      website: form.website.trim(),
      images: form.images
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      status: form.status,
      notes: form.notes.trim(),
    };

    if (!payload.code) delete payload.code;

    try {
      setLoading(true);

      let response;
      if (hotel?._id) {
        response = await api.put(`/hotels/${hotel._id}`, payload);
      } else {
        response = await api.post("/hotels", payload);
      }

      // Pass back the created/updated hotel to parent
      const savedHotel = response?.data?.hotel || response?.data?.data || null;
      onSuccess?.(savedHotel);
      onClose();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          hotel ? "Failed to update hotel." : "Failed to create hotel."
        )
      );
    } finally {
      setLoading(false);
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
              {hotel ? "Edit Hotel" : "Add Hotel"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {hotel
                ? "Update hotel information and room details."
                : "Add a hotel to your travel inventory."}
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

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-4 flex items-start gap-2">
              <FiAlertCircle className="mt-0.5 shrink-0" size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-6">
            <FormSection
              title="Basic Information"
              description="Main hotel and destination details."
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="Hotel Name" required>
                  <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. Taj Palace"
                    className={inputClass}
                  />
                </Field>

                <Field label="Hotel Code">
                  <input
                    value={form.code}
                    onChange={(e) => updateField("code", e.target.value)}
                    placeholder="e.g. HTL-001"
                    className={`${inputClass} uppercase`}
                  />
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Brief description of the hotel..."
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Destination" required>
                  <input
                    value={form.destination}
                    onChange={(e) =>
                      updateField("destination", e.target.value)
                    }
                    placeholder="Goa"
                    className={inputClass}
                  />
                </Field>

                <Field label="City">
                  <input
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="Panaji"
                    className={inputClass}
                  />
                </Field>

                <Field label="State">
                  <input
                    value={form.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    placeholder="Goa"
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Country" required>
                  <input
                    value={form.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    placeholder="India"
                    className={inputClass}
                  />
                </Field>

                <Field label="Postal Code">
                  <input
                    value={form.postalCode}
                    onChange={(e) =>
                      updateField("postalCode", e.target.value)
                    }
                    placeholder="403001"
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Address">
                <input
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Full hotel address"
                  className={inputClass}
                />
              </Field>
            </FormSection>

            <FormSection title="Classification & Timing">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    className={inputClass}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Rating">
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={form.rating}
                    onChange={(e) => updateField("rating", e.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Check-in">
                  <input
                    type="time"
                    value={form.checkInTime}
                    onChange={(e) =>
                      updateField("checkInTime", e.target.value)
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Check-out">
                  <input
                    type="time"
                    value={form.checkOutTime}
                    onChange={(e) =>
                      updateField("checkOutTime", e.target.value)
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Amenities">
                <input
                  value={form.amenities}
                  onChange={(e) => updateField("amenities", e.target.value)}
                  placeholder="WiFi, Pool, Gym, Parking"
                  className={inputClass}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Separate multiple amenities with commas.
                </p>
              </Field>
            </FormSection>

            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Room Types
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Add rooms, pricing and availability.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addRoom}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100"
                >
                  <FiPlus size={13} />
                  Add Room
                </button>
              </div>

              {form.roomTypes.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl py-8 text-center">
                  <FiHome size={22} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs text-gray-500">
                    No room types added yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.roomTypes.map((room, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-gray-700">
                          Room {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRoom(index)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            value={room.name}
                            onChange={(e) =>
                              updateRoom(index, "name", e.target.value)
                            }
                            placeholder="Room name *"
                            className={`${inputClass} bg-white`}
                          />
                          <input
                            value={room.bedType}
                            onChange={(e) =>
                              updateRoom(index, "bedType", e.target.value)
                            }
                            placeholder="Bed type e.g. King"
                            className={`${inputClass} bg-white`}
                          />
                        </div>

                        <textarea
                          rows={2}
                          value={room.description}
                          onChange={(e) =>
                            updateRoom(index, "description", e.target.value)
                          }
                          placeholder="Room description"
                          className={`${inputClass} bg-white resize-none`}
                        />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <input
                            type="number"
                            min="1"
                            value={room.maxAdults}
                            onChange={(e) =>
                              updateRoom(index, "maxAdults", e.target.value)
                            }
                            placeholder="Max adults"
                            className={`${inputClass} bg-white`}
                          />
                          <input
                            type="number"
                            min="0"
                            value={room.maxChildren}
                            onChange={(e) =>
                              updateRoom(
                                index,
                                "maxChildren",
                                e.target.value
                              )
                            }
                            placeholder="Max children"
                            className={`${inputClass} bg-white`}
                          />
                          <input
                            type="number"
                            min="0"
                            value={room.pricePerNight}
                            onChange={(e) =>
                              updateRoom(
                                index,
                                "pricePerNight",
                                e.target.value
                              )
                            }
                            placeholder="Price/night"
                            className={`${inputClass} bg-white`}
                          />
                          <input
                            type="number"
                            min="0"
                            value={room.availableRooms}
                            onChange={(e) =>
                              updateRoom(
                                index,
                                "availableRooms",
                                e.target.value
                              )
                            }
                            placeholder="Available"
                            className={`${inputClass} bg-white`}
                          />
                        </div>

                        <select
                          value={room.mealPlan}
                          onChange={(e) =>
                            updateRoom(index, "mealPlan", e.target.value)
                          }
                          className={`${inputClass} bg-white`}
                        >
                          {mealPlans.map((mealPlan) => (
                            <option key={mealPlan} value={mealPlan}>
                              {mealPlan}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <FormSection title="Contact Person">
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.contactName}
                  onChange={(e) =>
                    updateField("contactName", e.target.value)
                  }
                  placeholder="Contact name"
                  className={inputClass}
                />
                <input
                  value={form.contactDesignation}
                  onChange={(e) =>
                    updateField("contactDesignation", e.target.value)
                  }
                  placeholder="Designation"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.contactPhone}
                  onChange={(e) =>
                    updateField("contactPhone", e.target.value)
                  }
                  placeholder="Phone"
                  className={inputClass}
                />
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) =>
                    updateField("contactEmail", e.target.value)
                  }
                  placeholder="Email"
                  className={inputClass}
                />
              </div>

              <input
                value={form.contactWhatsapp}
                onChange={(e) =>
                  updateField("contactWhatsapp", e.target.value)
                }
                placeholder="WhatsApp number"
                className={inputClass}
              />
            </FormSection>

            <FormSection title="Location">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => updateField("latitude", e.target.value)}
                  placeholder="Latitude"
                  className={inputClass}
                />
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => updateField("longitude", e.target.value)}
                  placeholder="Longitude"
                  className={inputClass}
                />
              </div>
            </FormSection>

            <FormSection title="Policies & Additional Information">
              <textarea
                rows={3}
                value={form.cancellationPolicy}
                onChange={(e) =>
                  updateField("cancellationPolicy", e.target.value)
                }
                placeholder="Cancellation policy"
                className={`${inputClass} resize-none`}
              />
              <textarea
                rows={3}
                value={form.paymentTerms}
                onChange={(e) => updateField("paymentTerms", e.target.value)}
                placeholder="Payment terms"
                className={`${inputClass} resize-none`}
              />
              <input
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
                placeholder="Website URL"
                className={inputClass}
              />
              <input
                value={form.images}
                onChange={(e) => updateField("images", e.target.value)}
                placeholder="Image URLs separated by commas"
                className={inputClass}
              />
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Internal notes"
                className={`${inputClass} resize-none`}
              />
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className={inputClass}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </Field>
            </FormSection>
          </div>
        </form>

        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-60 min-w-[100px]"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving
              </>
            ) : hotel ? (
              "Update Hotel"
            ) : (
              "Create Hotel"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}