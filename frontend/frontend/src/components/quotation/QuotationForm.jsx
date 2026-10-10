import React, { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCheck,
  FiFileText,
  FiUsers,
  FiX,
  FiMap,
  FiEdit2,
  FiTrendingUp,
  FiPackage,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

import { TbCurrencyRupee } from "react-icons/tb";

import api from "../../api";

import QuotationItems from "./QuotationItems";
import ItineraryEditModal from "./ItineraryEditModal";

import {
  calculatePricing,
  formatCurrency,
  getId,
  getName,
  enquiryToForm,
  STATUS_OPTIONS,
  buildItineraryDays,
} from "../../utils/quotationUtils";

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function CompactLabel({ children, required = false }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-gray-700">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 ${className}`}
    />
  );
}

function Textarea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 resize-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 ${className}`}
    />
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select
      {...props}
      className={`h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </select>
  );
}

function Section({ icon, iconColor = "blue", title, description, children }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    pink: "bg-pink-50 text-pink-600",
    indigo: "bg-indigo-50 text-indigo-600",
    cyan: "bg-cyan-50 text-cyan-600",
    green: "bg-green-50 text-green-600",
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
            <p className="mt-0.5 text-[10px] text-gray-500">{description}</p>
          )}
        </div>
      </div>

      <div className="p-4">{children}</div>
    </section>
  );
}

function LoadingSpinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

/* =========================================================
   QUOTATION FORM
========================================================= */

export default function QuotationForm({
  open,
  editingQuotation,
  form,
  setForm,
  enquiries = [],
  saving = false,
  error = "",
  onClose,
  onSubmit,
}) {
  const pricing = useMemo(() => calculatePricing(form), [form]);

  /* =======================================================
     ITINERARY / PACKAGE STATE
  ======================================================= */

  const [itineraryMode, setItineraryMode] = useState(
    editingQuotation?.package ? "package" : "itinerary"
  );

  const [itineraryModalOpen, setItineraryModalOpen] = useState(false);
  const [itinerarySaving, setItinerarySaving] = useState(false);
  const [itineraryError, setItineraryError] = useState("");

  const [currentItinerary, setCurrentItinerary] = useState(null);

  const [selectedPackage, setSelectedPackage] = useState(
    editingQuotation?.package || null
  );

  /* Package list state */
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packageSearch, setPackageSearch] = useState("");
  const [packageError, setPackageError] = useState("");

  /* =======================================================
     SYNC STATE WHEN editingQuotation CHANGES
  ======================================================= */

  useEffect(() => {
    if (editingQuotation) {
      setSelectedPackage(editingQuotation.package || null);
      setItineraryMode(editingQuotation.package ? "package" : "itinerary");
    } else {
      setSelectedPackage(null);
      setItineraryMode("itinerary");
    }
  }, [editingQuotation]);

  /* =======================================================
     AUTO-BUILD itineraryDays FROM TRAVEL DATES
  ======================================================= */

  useEffect(() => {
    if (!form.travelDate || !form.returnDate) return;

    setForm((prev) => {
      const currentDays = Array.isArray(prev.itineraryDays)
        ? prev.itineraryDays
        : [];

      const rebuilt = buildItineraryDays(
        form.travelDate,
        form.returnDate,
        currentDays
      );

      const isSame =
        currentDays.length === rebuilt.length &&
        currentDays.every(
          (day, i) =>
            day.date === rebuilt[i]?.date &&
            day.dayNumber === rebuilt[i]?.dayNumber
        );

      if (isSame) return prev;

      return { ...prev, itineraryDays: rebuilt };
    });
  }, [form.travelDate, form.returnDate, setForm]);

  /* =======================================================
     FETCH PACKAGES
  ======================================================= */

  useEffect(() => {
    if (itineraryMode !== "package") return;
    if (packages.length > 0) return;

    const fetchPackages = async () => {
      try {
        setPackagesLoading(true);
        setPackageError("");

        const res = await api.get("/packages", {
          params: { limit: 100, status: "Active" },
        });

        const list = res.data?.packages || res.data?.data || res.data || [];

        setPackages(Array.isArray(list) ? list : []);
      } catch (err) {
        setPackageError(
          err?.response?.data?.message || "Failed to load packages."
        );
      } finally {
        setPackagesLoading(false);
      }
    };

    fetchPackages();
  }, [itineraryMode, packages.length]);

  /* =======================================================
     FILTERED PACKAGES
  ======================================================= */

  const filteredPackages = useMemo(() => {
    if (!packageSearch.trim()) return packages;

    const q = packageSearch.toLowerCase();

    return packages.filter(
      (p) =>
        String(p.name || "").toLowerCase().includes(q) ||
        String(p.destination || "").toLowerCase().includes(q) ||
        String(p.packageCode || "").toLowerCase().includes(q)
    );
  }, [packages, packageSearch]);

  /* =======================================================
     SYNC SELECTED PACKAGE + AUTO-FILL
  ======================================================= */

  useEffect(() => {
    setForm((prev) => ({ ...prev, package: selectedPackage?._id || null }));

    if (selectedPackage) {
      setForm((prev) => ({
        ...prev,
        package: selectedPackage._id,
        destination: prev.destination || selectedPackage.destination || "",
        currency:
          prev.currency || selectedPackage.pricing?.currency || "INR",
        baseAmount:
          prev.baseAmount ||
          (selectedPackage.pricing?.adultPrice || 0) *
            (Number(prev.adults) || 2),
        inclusionsText:
          prev.inclusionsText ||
          (selectedPackage.inclusions || []).join("\n"),
        exclusionsText:
          prev.exclusionsText ||
          (selectedPackage.exclusions || []).join("\n"),
        hotels:
          prev.hotels?.length > 0
            ? prev.hotels
            : (selectedPackage.hotels || []).map((h) => ({
                name: h.hotel?.name || "",
                city: h.hotel?.city || "",
                category: h.hotel?.category || "",
                roomType: h.roomType || "",
                nights: Number(h.nights) || 0,
                rooms: Number(h.rooms) || 1,
                amount: 0,
                inclusions: [],
                notes: h.notes || "",
              })),
        activities:
          prev.activities?.length > 0
            ? prev.activities
            : (selectedPackage.activities || []).map((a) => ({
                name: a.name || "",
                location: a.location || "",
                date: "",
                quantity: 1,
                amount: Number(a.amount) || 0,
                notes: a.description || "",
              })),
      }));
    }
  }, [selectedPackage, setForm]);

  /* =======================================================
     ESCAPE + BODY SCROLL
  ======================================================= */

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event) => {
      if (event.key === "Escape" && !saving && !itineraryModalOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, saving, onClose, itineraryModalOpen]);

  if (!open) return null;

  /* =======================================================
     FIELD UPDATE
  ======================================================= */

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  /* =======================================================
     ENQUIRY CHANGE
  ======================================================= */

  const handleEnquiryChange = (event) => {
    const enquiryId = event.target.value;

    const selectedEnquiry = enquiries.find(
      (item) => getId(item) === enquiryId
    );

    if (!selectedEnquiry) {
      updateField("enquiry", enquiryId);
      return;
    }

    const enquiryForm = enquiryToForm(selectedEnquiry);

    setForm((previous) => ({
      ...previous,
      ...enquiryForm,
      title: previous.title || selectedEnquiry.title || "",
      currency: previous.currency || "INR",
      status: editingQuotation ? previous.status || "Draft" : "Draft",
    }));
  };

  /* =======================================================
     OPEN ITINERARY MODAL
  ======================================================= */

  const openItineraryModal = () => {
    setItineraryError("");

    const itineraryData = {
      _id: editingQuotation?.itinerary?._id || null,
      title: form.title || "Travel Itinerary",
      destination: form.destination || "",
      startDate: form.travelDate || "",
      endDate: form.returnDate || "",
      days: Array.isArray(form.itineraryDays) ? form.itineraryDays : [],
      inclusions: (form.inclusionsText || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      exclusions: (form.exclusionsText || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      importantNotes: [],
      emergencyContact: {
        name: "",
        phone: "",
        relation: "",
      },
      notes: form.notes || "",
    };

    setCurrentItinerary(itineraryData);
    setItineraryModalOpen(true);
  };

  /* =======================================================
     SAVE ITINERARY FROM MODAL
  ======================================================= */

  const handleSaveItinerary = async (payload) => {
    try {
      setItinerarySaving(true);
      setItineraryError("");

      // Save to form state (backend save hoga jab quotation save hoga)
      setForm((prev) => ({
        ...prev,
        itineraryDays: payload.days || [],
      }));

      // If editing existing quotation with itinerary, save to backend
      if (editingQuotation?.itinerary?._id) {
        await api.put(
          `/itineraries/${editingQuotation.itinerary._id}`,
          payload
        );
      }

      setItineraryModalOpen(false);
      setCurrentItinerary(null);
    } catch (err) {
      setItineraryError(
        err?.response?.data?.message || "Failed to save itinerary."
      );
    } finally {
      setItinerarySaving(false);
    }
  };

  /* =======================================================
     FORM SUBMIT
  ======================================================= */

  const handleSubmit = (event) => {
    event.preventDefault();

    setForm((previous) => ({
      ...previous,
      status: editingQuotation ? previous.status || "Draft" : "Draft",
    }));

    onSubmit(event);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-3 backdrop-blur-sm sm:p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-[slideUp_0.25s_ease-out]">

        {/* HEADER */}
        <div className="relative shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 right-16 h-20 w-20 rounded-full bg-white/5" />

          <div className="relative flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm">
                <FiFileText size={18} className="text-white" />
              </div>

              <div>
                <h2 className="text-base font-bold tracking-tight text-white">
                  {editingQuotation ? "Edit Quotation" : "New Quotation"}
                </h2>

                <p className="mt-0.5 text-[11px] text-blue-100">
                  {editingQuotation
                    ? "Update quotation and save changes"
                    : "Create a quotation from an enquiry"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">

            {/* ERROR */}
            {error && (
              <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                <FiAlertCircle size={15} className="mt-0.5 shrink-0" />
                <span className="pt-0.5">{error}</span>
              </div>
            )}

            {/* BASIC INFORMATION */}
            <Section
              icon={<FiFileText size={15} />}
              iconColor="blue"
              title="Basic Information"
              description="Select enquiry and add main quotation details."
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <CompactLabel required>Quotation Title</CompactLabel>
                  <Input
                    value={form.title || ""}
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
                    placeholder="e.g. Goa Family Holiday Package"
                    required
                  />
                </div>

                <div>
                  <CompactLabel required>Enquiry</CompactLabel>
                  <Select
                    value={form.enquiry || ""}
                    onChange={handleEnquiryChange}
                    required
                  >
                    <option value="">Select enquiry</option>
                    {enquiries.map((enquiry) => (
                      <option key={getId(enquiry)} value={getId(enquiry)}>
                        {enquiry.enquiryNumber
                          ? `${enquiry.enquiryNumber} - `
                          : ""}
                        {getName(enquiry, "Untitled Enquiry")}
                      </option>
                    ))}
                  </Select>

                  {enquiries.length === 0 && (
                    <p className="mt-1 text-[10px] text-gray-400">
                      No enquiries available.
                    </p>
                  )}
                </div>

                <div>
                  <CompactLabel required>Destination</CompactLabel>
                  <Input
                    value={form.destination || ""}
                    onChange={(event) =>
                      updateField("destination", event.target.value)
                    }
                    placeholder="e.g. Dubai"
                    required
                  />
                </div>

                <div>
                  <CompactLabel>Currency</CompactLabel>
                  <Input
                    value={form.currency || "INR"}
                    maxLength={3}
                    onChange={(event) =>
                      updateField("currency", event.target.value.toUpperCase())
                    }
                    placeholder="INR"
                  />
                </div>

                <div>
                  <CompactLabel>Travel Date</CompactLabel>
                  <Input
                    type="date"
                    value={form.travelDate || ""}
                    onChange={(event) =>
                      updateField("travelDate", event.target.value)
                    }
                  />
                </div>

                <div>
                  <CompactLabel>Return Date</CompactLabel>
                  <Input
                    type="date"
                    value={form.returnDate || ""}
                    onChange={(event) =>
                      updateField("returnDate", event.target.value)
                    }
                  />
                </div>

                <div>
                  <CompactLabel>Valid Until</CompactLabel>
                  <Input
                    type="date"
                    value={form.validUntil || ""}
                    onChange={(event) =>
                      updateField("validUntil", event.target.value)
                    }
                  />
                </div>

                {editingQuotation && (
                  <div>
                    <CompactLabel>Status</CompactLabel>
                    <Select
                      value={form.status || "Draft"}
                      onChange={(event) =>
                        updateField("status", event.target.value)
                      }
                      disabled={saving}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            </Section>

            {/* TRAVELLERS */}
            <Section
              icon={<FiUsers size={15} />}
              iconColor="purple"
              title="Travellers"
              description="Number of adults, children and infants."
            >
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <CompactLabel>Adults</CompactLabel>
                  <Input
                    type="number"
                    min="1"
                    value={form.adults ?? 1}
                    onChange={(event) =>
                      updateField("adults", event.target.value)
                    }
                  />
                </div>

                <div>
                  <CompactLabel>Children</CompactLabel>
                  <Input
                    type="number"
                    min="0"
                    value={form.children ?? 0}
                    onChange={(event) =>
                      updateField("children", event.target.value)
                    }
                  />
                </div>

                <div>
                  <CompactLabel>Infants</CompactLabel>
                  <Input
                    type="number"
                    min="0"
                    value={form.infants ?? 0}
                    onChange={(event) =>
                      updateField("infants", event.target.value)
                    }
                  />
                </div>
              </div>
            </Section>

            {/* TRAVEL PLAN */}
            <section className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <FiMap size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-tight text-gray-900">
                    Travel Plan
                  </h3>
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    Choose how you want to build this quotation
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-4 pt-4">
                <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => setItineraryMode("itinerary")}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition ${
                      itineraryMode === "itinerary"
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <FiMap size={12} />
                    Build Itinerary
                  </button>

                  <button
                    type="button"
                    onClick={() => setItineraryMode("package")}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition ${
                      itineraryMode === "package"
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <FiPackage size={12} />
                    Use Package
                  </button>
                </div>
              </div>

              <div className="p-4">
                {/* TAB 1: BUILD ITINERARY */}
                {itineraryMode === "itinerary" && (
                  <>
                    <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 mb-3">
                      <div className="grid grid-cols-3 gap-3 items-end">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-blue-500">
                            Days
                          </p>
                          <p className="text-sm font-semibold text-gray-800 mt-0.5">
                            {form.itineraryDays?.length || 0} days
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-blue-500">
                            Travel Dates
                          </p>
                          <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">
                            {form.travelDate || "—"} → {form.returnDate || "—"}
                          </p>
                        </div>

                        <div className="text-right">
                          <button
                            type="button"
                            onClick={openItineraryModal}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                          >
                            <FiEdit2 size={11} />
                            {form.itineraryDays?.length > 0
                              ? "Edit Itinerary"
                              : "Build Itinerary"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    {Array.isArray(form.itineraryDays) &&
                    form.itineraryDays.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {form.itineraryDays.map((day, index) => (
                          <div
                            key={index}
                            className="rounded-lg border border-gray-200 bg-gray-50/50 p-3"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white text-[10px] font-bold">
                                {day.dayNumber || index + 1}
                              </span>
                              <p className="text-xs font-semibold text-gray-800 truncate">
                                {day.title || `Day ${index + 1}`}
                              </p>
                            </div>

                            {day.description && (
                              <p className="text-[11px] text-gray-500 line-clamp-2 ml-8">
                                {day.description}
                              </p>
                            )}

                            {day.activities?.length > 0 && (
                              <p className="text-[10px] text-gray-400 ml-8 mt-1">
                                {day.activities.length} activities
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                        <FiMap size={18} className="mx-auto text-gray-400" />
                        <p className="text-xs text-gray-500 mt-2">
                          {form.travelDate && form.returnDate
                            ? 'Click "Build Itinerary" to add day-wise plan.'
                            : "Select travel dates first to generate days."}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* TAB 2: USE PACKAGE */}
                {itineraryMode === "package" && (
                  <>
                    {selectedPackage && (
                      <div className="mb-3 rounded-lg border border-green-200 bg-green-50/60 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-white shrink-0">
                              <FiPackage size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {selectedPackage.name || "Package"}
                              </p>
                              <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                                {selectedPackage.destination || "—"}
                                {selectedPackage.duration
                                  ? ` • ${selectedPackage.duration.days}D/${selectedPackage.duration.nights}N`
                                  : ""}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedPackage(null)}
                            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Remove package"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="relative mb-3">
                      <FiSearch
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        size={14}
                      />
                      <input
                        type="text"
                        placeholder="Search packages..."
                        value={packageSearch}
                        onChange={(e) => setPackageSearch(e.target.value)}
                        className="w-full pl-9 pr-3 h-9 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                      />
                    </div>

                    {packagesLoading ? (
                      <div className="py-8 text-center text-xs text-gray-500">
                        Loading packages...
                      </div>
                    ) : packageError ? (
                      <div className="py-4 text-center text-xs text-red-600">
                        {packageError}
                      </div>
                    ) : filteredPackages.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                        <FiPackage size={18} className="mx-auto text-gray-400" />
                        <p className="text-xs text-gray-500 mt-2">
                          {packages.length === 0
                            ? "No active packages available."
                            : "No packages match your search."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {filteredPackages.map((pkg) => {
                          const isSelected = selectedPackage?._id === pkg._id;
                          return (
                            <button
                              key={pkg._id}
                              type="button"
                              onClick={() =>
                                setSelectedPackage(isSelected ? null : pkg)
                              }
                              className={`w-full text-left rounded-lg border p-3 transition ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                                  : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-gray-900 truncate">
                                    {pkg.name || "Unnamed Package"}
                                  </p>
                                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                                    {pkg.packageCode
                                      ? `${pkg.packageCode} • `
                                      : ""}
                                    {pkg.destination || "—"}
                                    {pkg.duration
                                      ? ` • ${pkg.duration.days}D/${pkg.duration.nights}N`
                                      : ""}
                                  </p>
                                  {pkg.pricing?.adultPrice > 0 && (
                                    <p className="text-[10px] font-semibold text-green-700 mt-1">
                                      ₹
                                      {Number(
                                        pkg.pricing.adultPrice
                                      ).toLocaleString("en-IN")}{" "}
                                      / adult
                                    </p>
                                  )}
                                </div>
                                {isSelected && (
                                  <FiCheck
                                    size={16}
                                    className="text-blue-600 shrink-0 mt-1"
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* QUOTATION ITEMS */}
            <QuotationItems form={form} setForm={setForm} />

            {/* PRICING */}
            <Section
              icon={<TbCurrencyRupee size={17} />}
              iconColor="amber"
              title="Pricing"
              description="Configure base amount, markup, discount and tax."
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <CompactLabel>Base Amount</CompactLabel>
                  <Input
                    type="number"
                    min="0"
                    value={form.baseAmount ?? 0}
                    onChange={(event) =>
                      updateField("baseAmount", event.target.value)
                    }
                  />
                </div>

                <div>
                  <CompactLabel>Markup Type</CompactLabel>
                  <Select
                    value={form.markupType || "Percentage"}
                    onChange={(event) =>
                      updateField("markupType", event.target.value)
                    }
                  >
                    <option value="Percentage">Percentage</option>
                    <option value="Fixed">Fixed</option>
                  </Select>
                </div>

                <div>
                  <CompactLabel>Markup Value</CompactLabel>
                  <Input
                    type="number"
                    min="0"
                    value={form.markupValue ?? 0}
                    onChange={(event) =>
                      updateField("markupValue", event.target.value)
                    }
                  />
                </div>

                <div>
                  <CompactLabel>Discount Type</CompactLabel>
                  <Select
                    value={form.discountType || "Fixed"}
                    onChange={(event) =>
                      updateField("discountType", event.target.value)
                    }
                  >
                    <option value="Fixed">Fixed</option>
                    <option value="Percentage">Percentage</option>
                  </Select>
                </div>

                <div>
                  <CompactLabel>Discount Value</CompactLabel>
                  <Input
                    type="number"
                    min="0"
                    value={form.discountValue ?? 0}
                    onChange={(event) =>
                      updateField("discountValue", event.target.value)
                    }
                  />
                </div>

                <div>
                  <CompactLabel>Tax Percentage</CompactLabel>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={form.taxPercentage ?? 0}
                    onChange={(event) =>
                      updateField("taxPercentage", event.target.value)
                    }
                  />
                </div>

                <div>
                  <CompactLabel>Cost Amount</CompactLabel>
                  <Input
                    type="number"
                    min="0"
                    value={form.costAmount ?? 0}
                    onChange={(event) =>
                      updateField("costAmount", event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-5">
                <PriceCard
                  label="Base"
                  value={formatCurrency(pricing.baseAmount, form.currency)}
                  color="gray"
                />
                <PriceCard
                  label="Markup"
                  value={formatCurrency(pricing.markupAmount, form.currency)}
                  color="blue"
                />
                <PriceCard
                  label="Discount"
                  value={formatCurrency(pricing.discountAmount, form.currency)}
                  color="orange"
                />
                <PriceCard
                  label="Tax"
                  value={formatCurrency(pricing.taxAmount, form.currency)}
                  color="purple"
                />
                <PriceCard
                  label="Total"
                  value={formatCurrency(pricing.totalAmount, form.currency)}
                  color="green"
                  bold
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3">
                <div className="flex items-center gap-2">
                  <FiTrendingUp size={14} className="text-green-400" />
                  <span className="text-xs font-medium text-gray-300">
                    Estimated Profit
                  </span>
                </div>

                <span
                  className={`text-sm font-bold ${
                    pricing.estimatedProfit >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {formatCurrency(pricing.estimatedProfit, form.currency)}
                </span>
              </div>
            </Section>

            {/* QUOTATION DETAILS */}
            {/* <Section
              icon={<FiCheck size={15} />}
              iconColor="emerald"
              title="Quotation Details"
              description="Define what is included, excluded and terms."
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <CompactLabel>Inclusions</CompactLabel>
                  <Textarea
                    rows={4}
                    value={form.inclusionsText || ""}
                    onChange={(event) =>
                      updateField("inclusionsText", event.target.value)
                    }
                    placeholder={`Breakfast\nAirport transfer\nSightseeing`}
                  />
                </div>

                <div>
                  <CompactLabel>Exclusions</CompactLabel>
                  <Textarea
                    rows={4}
                    value={form.exclusionsText || ""}
                    onChange={(event) =>
                      updateField("exclusionsText", event.target.value)
                    }
                    placeholder={`Flight tickets\nPersonal expenses\nTips`}
                  />
                </div>

                <div>
                  <CompactLabel>Terms & Conditions</CompactLabel>
                  <Textarea
                    rows={4}
                    value={form.termsAndConditions || ""}
                    onChange={(event) =>
                      updateField("termsAndConditions", event.target.value)
                    }
                    placeholder="Enter quotation terms..."
                    maxLength={10000}
                  />
                </div>

                <div>
                  <CompactLabel>Notes</CompactLabel>
                  <Textarea
                    rows={4}
                    value={form.notes || ""}
                    onChange={(event) =>
                      updateField("notes", event.target.value)
                    }
                    placeholder="Internal notes..."
                    maxLength={5000}
                  />
                </div>
              </div>
            </Section> */}
          </div>

          {/* FOOTER */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <LoadingSpinner />
                  Saving...
                </>
              ) : (
                <>
                  <FiCheck size={14} />
                  {editingQuotation ? "Update Quotation" : "Create Quotation"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ITINERARY EDIT MODAL */}
      <ItineraryEditModal
        open={itineraryModalOpen}
        itinerary={currentItinerary}
        saving={itinerarySaving}
        error={itineraryError}
        onClose={() => {
          if (itinerarySaving) return;
          setItineraryModalOpen(false);
          setCurrentItinerary(null);
          setItineraryError("");
        }}
        onSave={handleSaveItinerary}
      />

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
   SUB COMPONENTS
========================================================= */

function PriceCard({ label, value, color = "gray", bold = false }) {
  const colorMap = {
    gray: "bg-gray-50 border-gray-100",
    blue: "bg-blue-50 border-blue-100",
    orange: "bg-orange-50 border-orange-100",
    purple: "bg-purple-50 border-purple-100",
    green: "bg-green-50 border-green-100",
  };

  const textMap = {
    gray: "text-gray-900",
    blue: "text-blue-700",
    orange: "text-orange-700",
    purple: "text-purple-700",
    green: "text-green-700",
  };

  const labelMap = {
    gray: "text-gray-500",
    blue: "text-blue-600",
    orange: "text-orange-600",
    purple: "text-purple-600",
    green: "text-green-600",
  };

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        colorMap[color] || colorMap.gray
      }`}
    >
      <p
        className={`text-[10px] font-medium ${
          labelMap[color] || labelMap.gray
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-1 text-sm ${
          bold ? "font-bold" : "font-semibold"
        } ${textMap[color] || textMap.gray}`}
      >
        {value}
      </p>
    </div>
  );
}