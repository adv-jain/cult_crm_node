import React, { useEffect } from "react";
import {
  FiCalendar,
  FiCheck,
  FiClock,
  FiDownload,
  FiHome,
  FiMapPin,
  FiActivity,
  FiTruck,
  FiCoffee,
  FiX,
  FiXCircle,
  FiUser,
  FiFileText,
  FiInfo,
  FiUsers,
  FiPackage,
} from "react-icons/fi";

import { TbCurrencyRupee } from "react-icons/tb";

import {
  formatCurrency,
  formatDate,
  getName,
  STATUS_STYLES,
} from "../../utils/quotationUtils";

import { generateQuotationPDF } from "./QuotationPDF";

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status, size = "md" }) {
  const statusKey = status || "Draft";
  const styleClass =
    STATUS_STYLES[statusKey] || STATUS_STYLES.Draft;

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px]"
      : "px-2.5 py-1 text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${styleClass} ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {statusKey}
    </span>
  );
}

/* =========================================================
   SECTION
========================================================= */

function ViewSection({
  title,
  icon,
  iconColor = "blue",
  children,
  className = "",
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    pink: "bg-pink-50 text-pink-600",
    indigo: "bg-indigo-50 text-indigo-600",
    cyan: "bg-cyan-50 text-cyan-600",
  };

  return (
    <div
      className={`overflow-hidden rounded-lg border border-gray-200 bg-white ${className}`}
    >
      <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white px-4 py-2.5">
        {icon && (
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              colorMap[iconColor] || colorMap.blue
            }`}
          >
            {icon}
          </div>
        )}

        <h3 className="text-xs font-bold text-gray-900 tracking-tight">
          {title}
        </h3>
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}

/* =========================================================
   SAFE VALUE HELPERS
========================================================= */

function getItineraryHotelName(hotel) {
  if (!hotel) return "Hotel";
  return hotel.hotel?.name || hotel.name || "Hotel";
}

function getItineraryTransportName(transport) {
  if (!transport) return "Transport";
  return (
    transport.transport?.name ||
    transport.name ||
    transport.type ||
    "Transport"
  );
}

function getMealsText(meals) {
  if (!meals) return "";
  if (typeof meals === "string") return meals;
  if (Array.isArray(meals)) {
    return meals
      .map((m) => (typeof m === "string" ? m : m?.type))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof meals === "object") {
    const result = [];
    if (meals.breakfast) result.push("Breakfast");
    if (meals.lunch) result.push("Lunch");
    if (meals.dinner) result.push("Dinner");
    return result.join(", ");
  }
  return "";
}

function getFreeTimeText(freeTime) {
  if (!freeTime) return "";
  if (typeof freeTime === "string") return freeTime;
  if (Array.isArray(freeTime)) {
    return freeTime.filter(Boolean).join(", ");
  }
  if (typeof freeTime === "object") {
    return Object.entries(freeTime)
      .map(([key, value]) => {
        if (value === null || value === undefined || value === "")
          return null;
        return `${key}: ${value}`;
      })
      .filter(Boolean)
      .join(", ");
  }
  return String(freeTime);
}

/* =========================================================
   QUOTATION VIEW (READ-ONLY)
========================================================= */

export default function QuotationView({ quotation, onClose }) {
  useEffect(() => {
    if (!quotation) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
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
  }, [quotation, onClose]);

  const handleDownloadPDF = async () => {
    if (!quotation) return;

    try {
      await generateQuotationPDF(quotation);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Unable to generate PDF. Please try again.");
    }
  };

  if (!quotation) return null;

  const currency = quotation.currency || "INR";

  const travellerCount =
    Number(quotation.adults || 0) +
    Number(quotation.children || 0) +
    Number(quotation.infants || 0);

  const itinerary = quotation.itinerary;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-3 sm:p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-[slideUp_0.25s_ease-out]">

        {/* HEADER */}
        <div className="relative shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 right-16 w-20 h-20 rounded-full bg-white/5" />

          <div className="relative flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 shrink-0">
                <FiFileText size={18} className="text-white" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-white tracking-tight truncate max-w-[300px]">
                    {quotation.title || "Quotation"}
                  </h2>

                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    {quotation.status || "Draft"}
                  </span>
                </div>

                <p className="text-[11px] text-blue-100 mt-0.5 truncate">
                  {quotation.quotationNumber ||
                    "Quotation number not generated"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition shrink-0"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* SUMMARY */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCard
              icon={<FiMapPin size={14} />}
              label="Destination"
              value={quotation.destination}
              color="blue"
            />
            <SummaryCard
              icon={<FiCalendar size={14} />}
              label="Travel Date"
              value={formatDate(quotation.travelDate)}
              color="purple"
            />
            <SummaryCard
              icon={<FiUsers size={14} />}
              label="Travellers"
              value={travellerCount}
              color="indigo"
            />
            <SummaryCard
              icon={<TbCurrencyRupee size={16} />}
              label="Total"
              value={formatCurrency(
                quotation.totalAmount,
                currency
              )}
              color="green"
              highlight
            />
          </div>

          {/* CUSTOMER & TRAVEL */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ViewSection
              title="Customer & Assignment"
              icon={<FiUser size={14} />}
              iconColor="blue"
            >
              <div className="space-y-2.5 text-xs">
                <DetailRow
                  label="Customer"
                  value={getName(quotation.customer)}
                />
                <DetailRow
                  label="Lead"
                  value={getName(quotation.lead)}
                />
                <DetailRow
                  label="Enquiry"
                  value={getName(quotation.enquiry)}
                />
                <DetailRow
                  label="Prepared By"
                  value={getName(quotation.preparedBy)}
                />
              </div>
            </ViewSection>

            <ViewSection
              title="Travel Details"
              icon={<FiCalendar size={14} />}
              iconColor="purple"
            >
              <div className="space-y-2.5 text-xs">
                <DetailRow
                  label="Destination"
                  value={quotation.destination || "—"}
                />
                <DetailRow
                  label="Travel Date"
                  value={formatDate(quotation.travelDate)}
                />
                <DetailRow
                  label="Return Date"
                  value={formatDate(quotation.returnDate)}
                />
                <DetailRow
                  label="Adults"
                  value={quotation.adults ?? 0}
                />
                <DetailRow
                  label="Children"
                  value={quotation.children ?? 0}
                />
                <DetailRow
                  label="Infants"
                  value={quotation.infants ?? 0}
                />
              </div>
            </ViewSection>
          </div>

          {/* ==========================================
              SELECTED PACKAGE
          ========================================== */}
          {quotation.package && (
            <ViewSection
              title="Selected Package"
              icon={<FiPackage size={14} />}
              iconColor="emerald"
            >
              <div className="rounded-lg border border-green-100 bg-green-50/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900">
                      {quotation.package.name || "Package"}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-1">
                      {quotation.package.packageCode
                        ? `${quotation.package.packageCode} • `
                        : ""}
                      {quotation.package.destination || "—"}
                      {quotation.package.duration
                        ? ` • ${quotation.package.duration.days}D/${quotation.package.duration.nights}N`
                        : ""}
                    </p>
                    {quotation.package.pricing?.adultPrice > 0 && (
                      <p className="text-xs font-semibold text-green-700 mt-1">
                        ₹
                        {Number(
                          quotation.package.pricing.adultPrice
                        ).toLocaleString("en-IN")}{" "}
                        / adult
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {quotation.package.hotelCategory && (
                    <div className="rounded-lg border border-green-100 bg-white px-2.5 py-1.5">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-green-600">
                        Hotel
                      </p>
                      <p className="text-[11px] font-semibold text-gray-800 mt-0.5 truncate">
                        {quotation.package.hotelCategory}
                      </p>
                    </div>
                  )}
                  {quotation.package.mealPlan && (
                    <div className="rounded-lg border border-green-100 bg-white px-2.5 py-1.5">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-green-600">
                        Meals
                      </p>
                      <p className="text-[11px] font-semibold text-gray-800 mt-0.5 truncate">
                        {quotation.package.mealPlan}
                      </p>
                    </div>
                  )}
                  {quotation.package.transportation && (
                    <div className="rounded-lg border border-green-100 bg-white px-2.5 py-1.5">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-green-600">
                        Transport
                      </p>
                      <p className="text-[11px] font-semibold text-gray-800 mt-0.5 truncate">
                        {quotation.package.transportation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ViewSection>
          )}

          {/* ==========================================
              ITINERARY (only if NO package)
          ========================================== */}
          {itinerary && !quotation.package && (
            <ViewSection
              title="Travel Itinerary"
              icon={<FiMapPin size={14} />}
              iconColor="emerald"
            >
              <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/60 p-3.5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white shrink-0">
                      <FiMapPin size={15} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {itinerary.title || "Travel Itinerary"}
                      </p>

                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {itinerary.itineraryNumber ||
                          "Itinerary number not generated"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge
                      status={itinerary.status || "Draft"}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                  <OverviewItem
                    label="Destination"
                    value={
                      itinerary.destination ||
                      quotation.destination ||
                      "—"
                    }
                  />
                  <OverviewItem
                    label="Start Date"
                    value={formatDate(itinerary.startDate)}
                  />
                  <OverviewItem
                    label="End Date"
                    value={formatDate(itinerary.endDate)}
                  />
                  <OverviewItem
                    label="Duration"
                    value={`${itinerary.totalDays || 0} D / ${
                      itinerary.totalNights || 0
                    } N`}
                  />
                </div>
              </div>

              {Array.isArray(itinerary.days) &&
              itinerary.days.length > 0 ? (
                <div className="space-y-3">
                  {itinerary.days.map((day, index) => (
                    <DayCard
                      key={day._id || `${day.dayNumber}-${index}`}
                      day={day}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
                  <FiCalendar
                    size={20}
                    className="mx-auto text-gray-400"
                  />
                  <p className="text-xs font-semibold text-gray-700 mt-2">
                    Day-wise itinerary not added yet
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    The itinerary has been created, but daily plans
                    are still empty.
                  </p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {Array.isArray(itinerary.inclusions) &&
                  itinerary.inclusions.length > 0 && (
                    <ArrayCard
                      title="Itinerary Inclusions"
                      items={itinerary.inclusions}
                      variant="success"
                    />
                  )}

                {Array.isArray(itinerary.exclusions) &&
                  itinerary.exclusions.length > 0 && (
                    <ArrayCard
                      title="Itinerary Exclusions"
                      items={itinerary.exclusions}
                      variant="danger"
                    />
                  )}
              </div>

              {Array.isArray(itinerary.importantNotes) &&
                itinerary.importantNotes.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 p-3">
                    <p className="text-[11px] font-bold text-amber-800 mb-2">
                      Important Notes
                    </p>

                    <ul className="space-y-1">
                      {itinerary.importantNotes.map((note, i) => (
                        <li
                          key={i}
                          className="text-xs text-amber-700 flex gap-2"
                        >
                          <span className="shrink-0">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {itinerary.emergencyContact?.name && (
                <div className="mt-3 rounded-lg border border-red-100 bg-red-50/60 p-3">
                  <p className="text-[11px] font-bold text-red-800 mb-1">
                    Emergency Contact
                  </p>

                  <p className="text-xs text-red-700">
                    {[
                      itinerary.emergencyContact.name,
                      itinerary.emergencyContact.phone,
                      itinerary.emergencyContact.email,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              )}

              {itinerary.notes && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-[11px] font-bold text-gray-700 mb-1">
                    Itinerary Notes
                  </p>

                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-5">
                    {itinerary.notes}
                  </p>
                </div>
              )}
            </ViewSection>
          )}

          {/* PRICING */}
          <ViewSection
            title="Pricing"
            icon={<TbCurrencyRupee size={16} />}
            iconColor="amber"
          >
            <div className="space-y-2.5 text-xs">
              <DetailRow
                label="Base Amount"
                value={formatCurrency(
                  quotation.baseAmount,
                  currency
                )}
              />
              <DetailRow
                label="Markup"
                value={formatCurrency(
                  quotation.markupAmount,
                  currency
                )}
              />
              <DetailRow
                label="Discount"
                value={formatCurrency(
                  quotation.discountAmount,
                  currency
                )}
              />
              <DetailRow
                label="Tax"
                value={formatCurrency(
                  quotation.taxAmount,
                  currency
                )}
              />

              <div className="border-t border-gray-100 pt-2.5">
                <DetailRow
                  label="Total"
                  value={formatCurrency(
                    quotation.totalAmount,
                    currency
                  )}
                  highlight
                />
              </div>

              <DetailRow
                label="Cost Amount"
                value={formatCurrency(
                  quotation.costAmount,
                  currency
                )}
              />

              <DetailRow
                label="Estimated Profit"
                value={formatCurrency(
                  quotation.estimatedProfit,
                  currency
                )}
                success={
                  Number(quotation.estimatedProfit || 0) >= 0
                }
                danger={
                  Number(quotation.estimatedProfit || 0) < 0
                }
              />
            </div>
          </ViewSection>

          {/* HOTELS */}
          {Array.isArray(quotation.hotels) &&
            quotation.hotels.length > 0 && (
              <ViewSection
                title="Hotels"
                icon={<FiHome size={14} />}
                iconColor="blue"
              >
                <div className="space-y-2">
                  {quotation.hotels.map((hotel, index) => (
                    <ItemRow
                      key={index}
                      title={hotel.name || "Hotel"}
                      subtitle={`${hotel.city || "—"} · ${
                        hotel.category || "—"
                      } · ${hotel.roomType || "Room"}`}
                      meta={`${hotel.nights || 0} nights · ${
                        hotel.rooms || 1
                      } room${Number(hotel.rooms) === 1 ? "" : "s"}`}
                      amount={formatCurrency(
                        hotel.amount,
                        currency
                      )}
                      icon={<FiHome size={14} />}
                      iconColor="blue"
                    />
                  ))}
                </div>
              </ViewSection>
            )}

          {/* TRANSPORT */}
          {Array.isArray(quotation.transport) &&
            quotation.transport.length > 0 && (
              <ViewSection
                title="Transport"
                icon={<FiTruck size={14} />}
                iconColor="orange"
              >
                <div className="space-y-2">
                  {quotation.transport.map((item, index) => (
                    <ItemRow
                      key={index}
                      title={item.type || "Transport"}
                      subtitle={`${item.provider || "—"} · ${
                        item.route || "—"
                      }`}
                      meta={formatDate(item.travelDate)}
                      amount={formatCurrency(
                        item.amount,
                        currency
                      )}
                      icon={<FiTruck size={14} />}
                      iconColor="orange"
                    />
                  ))}
                </div>
              </ViewSection>
            )}

          {/* ACTIVITIES */}
          {Array.isArray(quotation.activities) &&
            quotation.activities.length > 0 && (
              <ViewSection
                title="Activities"
                icon={<FiActivity size={14} />}
                iconColor="purple"
              >
                <div className="space-y-2">
                  {quotation.activities.map((item, index) => (
                    <ItemRow
                      key={index}
                      title={item.name || "Activity"}
                      subtitle={`${item.location || "—"} · Qty ${
                        item.quantity || 1
                      }`}
                      meta={formatDate(item.date)}
                      amount={formatCurrency(
                        item.amount,
                        currency
                      )}
                      icon={<FiActivity size={14} />}
                      iconColor="purple"
                    />
                  ))}
                </div>
              </ViewSection>
            )}

          {/* OTHER SERVICES */}
          {Array.isArray(quotation.otherServices) &&
            quotation.otherServices.length > 0 && (
              <ViewSection
                title="Other Services"
                icon={<FiFileText size={14} />}
                iconColor="indigo"
              >
                <div className="space-y-2">
                  {quotation.otherServices.map((item, index) => (
                    <ItemRow
                      key={index}
                      title={item.name || "Service"}
                      subtitle={item.description || "—"}
                      amount={formatCurrency(
                        item.amount,
                        currency
                      )}
                      icon={<FiFileText size={14} />}
                      iconColor="indigo"
                    />
                  ))}
                </div>
              </ViewSection>
            )}

          {/* INCLUSIONS */}
          {Array.isArray(quotation.inclusions) &&
            quotation.inclusions.length > 0 && (
              <ViewSection
                title="Inclusions"
                icon={<FiCheck size={14} />}
                iconColor="emerald"
              >
                <ul className="space-y-1.5">
                  {quotation.inclusions.map((item, index) => (
                    <li
                      key={index}
                      className="text-xs text-gray-600 flex gap-2"
                    >
                      <FiCheck
                        size={13}
                        className="text-green-500 mt-0.5 shrink-0"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </ViewSection>
            )}

          {/* EXCLUSIONS */}
          {Array.isArray(quotation.exclusions) &&
            quotation.exclusions.length > 0 && (
              <ViewSection
                title="Exclusions"
                icon={<FiXCircle size={14} />}
                iconColor="pink"
              >
                <ul className="space-y-1.5">
                  {quotation.exclusions.map((item, index) => (
                    <li
                      key={index}
                      className="text-xs text-gray-600 flex gap-2"
                    >
                      <FiXCircle
                        size={13}
                        className="text-red-500 mt-0.5 shrink-0"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </ViewSection>
            )}

          {/* TERMS */}
          {quotation.termsAndConditions && (
            <ViewSection
              title="Terms & Conditions"
              icon={<FiInfo size={14} />}
              iconColor="indigo"
            >
              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-5">
                {quotation.termsAndConditions}
              </p>
            </ViewSection>
          )}

          {/* NOTES */}
          {quotation.notes && (
            <ViewSection
              title="Notes"
              icon={<FiFileText size={14} />}
              iconColor="indigo"
            >
              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-5">
                {quotation.notes}
              </p>
            </ViewSection>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30 px-5 py-3">
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 h-9 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98]"
          >
            <FiDownload size={14} />
            Download PDF
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 hover:border-gray-300"
          >
            Close
          </button>
        </div>
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
   SUB COMPONENTS
========================================================= */

function SummaryCard({
  icon,
  label,
  value,
  color = "blue",
  highlight = false,
}) {
  const colorMap = {
    blue: "bg-blue-50/60 border-blue-100 text-blue-600",
    purple: "bg-purple-50/60 border-purple-100 text-purple-600",
    indigo: "bg-indigo-50/60 border-indigo-100 text-indigo-600",
    green: "bg-green-50/60 border-green-100 text-green-600",
  };

  const valueColorMap = {
    blue: "text-blue-900",
    purple: "text-purple-900",
    indigo: "text-indigo-900",
    green: "text-green-900",
  };

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        colorMap[color] || colorMap.blue
      }`}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80">
          {label}
        </p>
      </div>

      <p
        className={`mt-1 text-sm ${
          highlight ? "font-bold" : "font-semibold"
        } ${valueColorMap[color] || valueColorMap.blue} truncate`}
        title={String(value || "")}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function OverviewItem({ label, value }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white px-2.5 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-blue-500">
        {label}
      </p>
      <p className="text-xs font-semibold text-gray-800 mt-1 truncate">
        {value || "—"}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight = false,
  success = false,
  danger = false,
}) {
  let valueClass = "text-gray-800";
  if (highlight) valueClass = "text-blue-700 font-bold";
  else if (success) valueClass = "text-green-600 font-semibold";
  else if (danger) valueClass = "text-red-600 font-semibold";

  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className={`text-xs font-medium text-right ${valueClass}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function ItemRow({
  icon,
  iconColor = "blue",
  title,
  subtitle,
  meta,
  amount,
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
          colorMap[iconColor] || colorMap.blue
        }`}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">
              {title}
            </p>
            <p className="text-[11px] text-gray-500 truncate mt-0.5">
              {subtitle}
            </p>
            {meta && (
              <p className="text-[10px] text-gray-400 mt-0.5">{meta}</p>
            )}
          </div>

          <span className="text-xs font-bold text-gray-800 whitespace-nowrap">
            {amount}
          </span>
        </div>
      </div>
    </div>
  );
}

function DayCard({ day, index }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gradient-to-r from-blue-50/60 to-white px-3.5 py-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-[11px] font-bold shrink-0">
          {day.dayNumber || index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-900 truncate">
            Day {day.dayNumber || index + 1}
            {day.title ? ` — ${day.title}` : ""}
          </p>

          {day.date && (
            <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
              <FiCalendar size={10} />
              {formatDate(day.date)}
            </p>
          )}
        </div>

        {(day.city || day.location) && (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 shrink-0">
            <FiMapPin size={9} />
            {[day.city, day.location].filter(Boolean).join(", ")}
          </span>
        )}
      </div>

      <div className="p-3.5 space-y-2.5">
        {day.description && (
          <p className="text-xs text-gray-600 leading-5">
            {day.description}
          </p>
        )}

        {Array.isArray(day.activities) && day.activities.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <FiActivity size={11} className="text-blue-600" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-600">
                Activities
              </span>
            </div>

            <div className="space-y-1.5">
              {day.activities.map((a, i) => (
                <div
                  key={a._id || i}
                  className="rounded-md border border-gray-100 bg-gray-50/60 px-2.5 py-1.5"
                >
                  <p className="text-xs font-semibold text-gray-800">
                    {a.name || a.title || "Activity"}
                  </p>
                  {a.location && (
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {a.location}
                    </p>
                  )}
                  {a.description && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {a.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {day.hotel && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <FiHome size={11} className="text-emerald-600" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-600">
                Hotel
              </span>
            </div>
            <p className="text-xs text-gray-700">
              {getItineraryHotelName(day.hotel)}
              {day.hotel.roomType && ` — ${day.hotel.roomType}`}
            </p>
          </div>
        )}

        {day.transport && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <FiTruck size={11} className="text-orange-600" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-600">
                Transport
              </span>
            </div>
            <p className="text-xs text-gray-700">
              {getItineraryTransportName(day.transport)}
            </p>
          </div>
        )}

        {getMealsText(day.meals) && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <FiCoffee size={11} className="text-amber-600" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-600">
                Meals
              </span>
            </div>
            <p className="text-xs text-gray-700">
              {getMealsText(day.meals)}
            </p>
          </div>
        )}

        {getFreeTimeText(day.freeTime) && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <FiClock size={11} className="text-purple-600" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-600">
                Free Time
              </span>
            </div>
            <p className="text-xs text-gray-700">
              {getFreeTimeText(day.freeTime)}
            </p>
          </div>
        )}

        {day.notes && (
          <div className="border-t border-gray-100 pt-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600 mb-1">
              Notes
            </p>
            <p className="text-xs text-gray-600 whitespace-pre-wrap leading-5">
              {day.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ArrayCard({ title, items, variant = "success" }) {
  const isSuccess = variant === "success";

  return (
    <div
      className={`rounded-lg border p-3 ${
        isSuccess
          ? "bg-green-50/60 border-green-100"
          : "bg-red-50/60 border-red-100"
      }`}
    >
      <p
        className={`text-[11px] font-bold mb-2 ${
          isSuccess ? "text-green-800" : "text-red-800"
        }`}
      >
        {title}
      </p>

      <ul className="space-y-1">
        {items.map((item, i) => (
          <li
            key={i}
            className={`text-xs flex gap-2 ${
              isSuccess ? "text-green-700" : "text-red-700"
            }`}
          >
            {isSuccess ? (
              <FiCheck size={12} className="mt-0.5 shrink-0" />
            ) : (
              <FiXCircle size={12} className="mt-0.5 shrink-0" />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}