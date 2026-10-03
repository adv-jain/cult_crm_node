import { useEffect, useState } from "react";
import {
  FiX,
  FiAlertCircle,
  FiMapPin,
  FiUser,
  FiUsers,
  FiDollarSign,
  FiCheck,
} from "react-icons/fi";
import api from "../../api";
import {
  INITIAL_BOOKING_FORM,
  TRAVEL_TYPES,
  formatDateInput,
  formatCurrency,
  getQuotationLabel,
} from "./bookingHelpers";

/* =========================================================
   FIELD
========================================================= */

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 outline-none transition focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10 ${className}`}
    />
  );
}

function Textarea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 outline-none resize-none transition focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10 ${className}`}
    />
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none transition focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10 ${className}`}
    >
      {children}
    </select>
  );
}

function SectionHeading({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function BookingFormModal({
  open,
  editingBooking,
  initialForm: prefillForm = null,
  onClose,
  onSuccess,
}) {
  const [form, setForm] = useState(INITIAL_BOOKING_FORM);
  const [acceptedQuotations, setAcceptedQuotations] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [error, setError] = useState("");

  /* =====================================================
     FETCH DATA
  ===================================================== */

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoadingQuotations(true);

      try {
        const [quotationsRes, usersRes] = await Promise.all([
          api.get("/quotations", {
            params: { status: "Accepted", page: 1, limit: 100 },
          }),
          api.get("/users", { params: { limit: 100 } }).catch(() => ({
            data: { users: [] },
          })),
        ]);

        const quotationsData = quotationsRes.data || {};
        const usersData = usersRes.data || {};

        setAcceptedQuotations(quotationsData.quotations || []);
        setUsers(Array.isArray(usersData) ? usersData : usersData.users || []);
      } catch (err) {
        console.error("Fetch form data error:", err);
      } finally {
        setLoadingQuotations(false);
      }
    };

    fetchData();
  }, [open]);

  /* =====================================================
     INITIALIZE FORM
     Priority: editingBooking > prefillForm > INITIAL
  ===================================================== */

  useEffect(() => {
    if (!open) return;

    if (editingBooking) {
      setForm({
        quotation:
          editingBooking.quotation?._id || editingBooking.quotation || "",
        destination: editingBooking.destination || "",
        departureCity: editingBooking.departureCity || "",
        travelDate: formatDateInput(editingBooking.travelDate),
        returnDate: formatDateInput(editingBooking.returnDate),
        adults: Number(editingBooking.adults ?? 1),
        children: Number(editingBooking.children ?? 0),
        infants: Number(editingBooking.infants ?? 0),
        travelType: editingBooking.travelType || "Other",
        currency: editingBooking.currency || "INR",
        totalAmount: Number(editingBooking.totalAmount ?? 0),
        totalCost: Number(editingBooking.totalCost ?? 0),
        discountAmount: Number(editingBooking.discountAmount ?? 0),
        taxAmount: Number(editingBooking.taxAmount ?? 0),
        salesOwner:
          editingBooking.salesOwner?._id || editingBooking.salesOwner || "",
        operationsOwner:
          editingBooking.operationsOwner?._id ||
          editingBooking.operationsOwner ||
          "",
        specialRequests: editingBooking.specialRequests || "",
        internalNotes: editingBooking.internalNotes || "",
      });
    } else if (prefillForm) {
      /* Convert-to-booking flow: prefilled data */
      setForm({
        ...INITIAL_BOOKING_FORM,
        ...prefillForm,
      });
    } else {
      setForm({ ...INITIAL_BOOKING_FORM });
    }

    setError("");
  }, [open, editingBooking, prefillForm]);

  /* =====================================================
     ESC CLOSE
  ===================================================== */

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, saving, onClose]);

  if (!open) return null;

  /* =====================================================
     HANDLERS
  ===================================================== */

  const handleChange = (event) => {
    const { name, value, type } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const handleQuotationChange = (quotationId) => {
    const quotation = acceptedQuotations.find((q) => q._id === quotationId);

    if (!quotation) {
      setForm((prev) => ({ ...prev, quotation: quotationId }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      quotation: quotationId,
      destination:
        quotation.destination || quotation.enquiry?.destination || prev.destination,
      travelDate:
        formatDateInput(quotation.travelDate || quotation.enquiry?.travelDate) ||
        prev.travelDate,
      returnDate:
        formatDateInput(quotation.returnDate || quotation.enquiry?.returnDate) ||
        prev.returnDate,
      adults: Number(quotation.adults ?? prev.adults),
      children: Number(quotation.children ?? prev.children),
      infants: Number(quotation.infants ?? prev.infants),
      currency: quotation.currency || prev.currency,
      totalAmount: Number(quotation.totalAmount ?? prev.totalAmount),
      totalCost: Number(quotation.costAmount ?? prev.totalCost),
      discountAmount: Number(quotation.discountAmount ?? prev.discountAmount),
      taxAmount: Number(quotation.taxAmount ?? prev.taxAmount),
    }));
  };

  /* =====================================================
     SUBMIT
  ===================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (!editingBooking && !form.quotation) {
        setError("Please select an accepted quotation.");
        return;
      }

      const payload = {
        destination: form.destination.trim(),
        departureCity: form.departureCity.trim(),
        travelDate: form.travelDate || null,
        returnDate: form.returnDate || null,
        adults: Number(form.adults || 1),
        children: Number(form.children || 0),
        infants: Number(form.infants || 0),
        travelType: form.travelType || "Other",
        currency: form.currency || "INR",
        totalAmount: Number(form.totalAmount || 0),
        totalCost: Number(form.totalCost || 0),
        discountAmount: Number(form.discountAmount || 0),
        taxAmount: Number(form.taxAmount || 0),
        salesOwner: form.salesOwner || undefined,
        operationsOwner: form.operationsOwner || undefined,
        specialRequests: form.specialRequests.trim(),
        internalNotes: form.internalNotes.trim(),
      };

      if (!editingBooking) {
        payload.quotation = form.quotation;
      }

      let response;
      if (editingBooking) {
        response = await api.put(`/bookings/${editingBooking._id}`, payload);
      } else {
        response = await api.post("/bookings", payload);
      }

      onSuccess?.(
        response?.data?.booking || null,
        editingBooking ? "updated" : "created"
      );
      onClose();
    } catch (err) {
      console.error("Save booking error:", err);
      setError(err.response?.data?.message || "Failed to save booking");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     RENDER
  ===================================================== */

  const profit = Number(form.totalAmount || 0) - Number(form.totalCost || 0);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-[720px] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {editingBooking ? "Edit Booking" : "New Booking"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {editingBooking
                ? "Update booking details"
                : "Create a booking from an accepted quotation"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-5">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                <FiAlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* QUOTATION */}
            <section>
              <SectionHeading
                icon={<FiCheck size={16} className="text-brand-blue" />}
                title="Quotation"
              />

              {!editingBooking ? (
                <Field label="Accepted Quotation" required>
                  <Select
                    name="quotation"
                    value={form.quotation}
                    onChange={(e) => handleQuotationChange(e.target.value)}
                    disabled={loadingQuotations || saving}
                    required
                  >
                    <option value="">
                      {loadingQuotations
                        ? "Loading accepted quotations..."
                        : "Select accepted quotation"}
                    </option>
                    {acceptedQuotations.map((q) => (
                      <option key={q._id} value={q._id}>
                        {getQuotationLabel(q)} —{" "}
                        {q.title || q.destination || "Quotation"}
                      </option>
                    ))}
                  </Select>

                  {acceptedQuotations.length === 0 && !loadingQuotations && (
                    <p className="text-[11px] text-brand-gold-dark mt-1.5">
                      No accepted quotations available. Please accept a
                      quotation first.
                    </p>
                  )}
                </Field>
              ) : (
                <div className="bg-brand-blue-50 border border-brand-blue/20 rounded-lg px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-brand-blue-dark uppercase tracking-wide">
                    Quotation
                  </p>
                  <p className="text-sm font-semibold text-brand-blue-dark mt-0.5">
                    {getQuotationLabel(editingBooking.quotation)}
                  </p>
                </div>
              )}
            </section>

            {/* TRIP DETAILS */}
            <section>
              <SectionHeading
                icon={<FiMapPin size={16} className="text-brand-blue" />}
                title="Trip Details"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Destination">
                  <Input
                    type="text"
                    name="destination"
                    value={form.destination}
                    onChange={handleChange}
                    placeholder="e.g. Dubai"
                  />
                </Field>

                <Field label="Departure City">
                  <Input
                    type="text"
                    name="departureCity"
                    value={form.departureCity}
                    onChange={handleChange}
                    placeholder="e.g. Delhi"
                  />
                </Field>

                <Field label="Travel Date">
                  <Input
                    type="date"
                    name="travelDate"
                    value={form.travelDate}
                    onChange={handleChange}
                  />
                </Field>

                <Field label="Return Date">
                  <Input
                    type="date"
                    name="returnDate"
                    value={form.returnDate}
                    onChange={handleChange}
                  />
                </Field>

                <Field label="Travel Type">
                  <Select
                    name="travelType"
                    value={form.travelType}
                    onChange={handleChange}
                  >
                    {TRAVEL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Currency">
                  <Input
                    type="text"
                    name="currency"
                    value={form.currency}
                    onChange={handleChange}
                    maxLength="5"
                    className="uppercase"
                  />
                </Field>
              </div>
            </section>

            {/* TRAVELLERS */}
            <section>
              <SectionHeading
                icon={<FiUsers size={16} className="text-brand-blue" />}
                title="Travellers"
              />

              <div className="grid grid-cols-3 gap-3">
                <Field label="Adults">
                  <Input
                    type="number"
                    min="1"
                    name="adults"
                    value={form.adults}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Children">
                  <Input
                    type="number"
                    min="0"
                    name="children"
                    value={form.children}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Infants">
                  <Input
                    type="number"
                    min="0"
                    name="infants"
                    value={form.infants}
                    onChange={handleChange}
                  />
                </Field>
              </div>
            </section>

            {/* FINANCIALS */}
            <section>
              <SectionHeading
                icon={<FiDollarSign size={16} className="text-brand-blue" />}
                title="Financials"
              />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Total Amount">
                  <Input
                    type="number"
                    min="0"
                    name="totalAmount"
                    value={form.totalAmount}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Total Cost">
                  <Input
                    type="number"
                    min="0"
                    name="totalCost"
                    value={form.totalCost}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Discount">
                  <Input
                    type="number"
                    min="0"
                    name="discountAmount"
                    value={form.discountAmount}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Tax">
                  <Input
                    type="number"
                    min="0"
                    name="taxAmount"
                    value={form.taxAmount}
                    onChange={handleChange}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-brand-blue-50 border border-brand-blue/20 rounded-lg px-3 py-2.5">
                  <p className="text-[11px] text-brand-blue-dark">
                    Estimated profit
                  </p>
                  <p className="text-sm font-semibold text-brand-blue-dark mt-0.5">
                    {formatCurrency(profit, form.currency || "INR")}
                  </p>
                </div>
                <div className="bg-brand-gold-50 border border-brand-gold/30 rounded-lg px-3 py-2.5">
                  <p className="text-[11px] text-brand-gold-dark">
                    Initial amount due
                  </p>
                  <p className="text-sm font-semibold text-brand-gold-dark mt-0.5">
                    {formatCurrency(form.totalAmount, form.currency || "INR")}
                  </p>
                </div>
              </div>
            </section>

            {/* OWNERS */}
            <section>
              <SectionHeading
                icon={<FiUser size={16} className="text-brand-blue" />}
                title="Ownership"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Sales Owner">
                  <Select
                    name="salesOwner"
                    value={form.salesOwner}
                    onChange={handleChange}
                  >
                    <option value="">Auto (You)</option>
                    {users
                      .filter((u) =>
                        ["admin", "manager", "sales"].includes(u.role)
                      )
                      .map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name || u.email} ({u.role})
                        </option>
                      ))}
                  </Select>
                </Field>

                <Field label="Operations Owner">
                  <Select
                    name="operationsOwner"
                    value={form.operationsOwner}
                    onChange={handleChange}
                  >
                    <option value="">Unassigned</option>
                    {users
                      .filter((u) => u.role === "operations")
                      .map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name || u.email}
                        </option>
                      ))}
                  </Select>
                </Field>
              </div>
            </section>

            {/* NOTES */}
            <section>
              <Field label="Special Requests">
                <Textarea
                  name="specialRequests"
                  value={form.specialRequests}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Any customer requests or travel preferences..."
                />
              </Field>

              <div className="mt-3">
                <Field label="Internal Notes">
                  <Textarea
                    name="internalNotes"
                    value={form.internalNotes}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Internal notes for the team..."
                  />
                </Field>
              </div>
            </section>
          </div>

          {/* FOOTER */}
          <div className="px-5 py-3.5 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-brand-blue-50/30 flex items-center justify-end gap-2">
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
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition disabled:opacity-60 min-w-[120px] shadow-brand"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving
                </>
              ) : editingBooking ? (
                "Update Booking"
              ) : (
                "Create Booking"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}