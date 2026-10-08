import {
  FiCalendar,
  FiClock,
  FiDownload,
  FiEdit2,
  FiMapPin,
  FiTruck,
  FiUsers,
  FiX,
  FiCoffee,
  FiHome,
  FiActivity,
  FiFileText,
  FiAlertCircle,
  FiCheck,
  FiXCircle,
  FiPhone,
  FiInfo,
} from "react-icons/fi";

import {
  statusClasses,
  formatDate,
  getCustomerName,
  getHotelName,
} from "../../utils/itineraryUtils";

/* =========================================================
   SECTION CARD
========================================================= */

function SectionCard({
  icon,
  iconColor = "blue",
  title,
  description,
  right,
  children,
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    pink: "bg-pink-50 text-pink-600",
    indigo: "bg-indigo-50 text-indigo-600",
    cyan: "bg-cyan-50 text-cyan-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
              colorMap[iconColor] || colorMap.blue
            }`}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <h3 className="text-xs font-bold text-gray-900 tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-[10px] text-gray-500 truncate">
                {description}
              </p>
            )}
          </div>
        </div>

        {right}
      </div>

      <div className="p-4">{children}</div>
    </section>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({ icon, label, value, color = "blue" }) {
  const colorMap = {
    blue: "bg-blue-50/60 border-blue-100 text-blue-600",
    purple: "bg-purple-50/60 border-purple-100 text-purple-600",
    indigo: "bg-indigo-50/60 border-indigo-100 text-indigo-600",
    emerald: "bg-emerald-50/60 border-emerald-100 text-emerald-600",
  };

  const valueColorMap = {
    blue: "text-blue-900",
    purple: "text-purple-900",
    indigo: "text-indigo-900",
    emerald: "text-emerald-900",
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
        className={`mt-1 text-sm font-semibold truncate ${
          valueColorMap[color] || valueColorMap.blue
        }`}
        title={String(value || "")}
      >
        {value || "—"}
      </p>
    </div>
  );
}

/* =========================================================
   VIEW ITINERARY
========================================================= */

function ViewItinerary({ itinerary, onClose, onDownloadPDF, onEdit }) {
  const days = itinerary?.days || [];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-3 backdrop-blur-sm sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="relative shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600" />

          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 right-16 h-20 w-20 rounded-full bg-white/5" />

          <div className="relative flex items-center justify-between px-5 py-4 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm shrink-0">
                <FiMapPin size={18} className="text-white" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold tracking-tight text-white truncate max-w-[320px]">
                    {itinerary.title || "Itinerary"}
                  </h2>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      statusClasses[itinerary.status] ||
                      "bg-white/15 text-white border-white/20"
                    }`}
                  >
                    {itinerary.status || "Draft"}
                  </span>
                </div>

                <p className="text-[11px] text-blue-100 mt-0.5 truncate">
                  {itinerary.itineraryNumber || "No itinerary number"}
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

        {/* =================================================
            BODY
        ================================================= */}

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCard
              icon={<FiMapPin size={13} />}
              label="Destination"
              value={itinerary.destination || "—"}
              color="blue"
            />

            <SummaryCard
              icon={<FiCalendar size={13} />}
              label="Duration"
              value={`${itinerary.totalDays || days.length || 0} D${
                itinerary.totalNights
                  ? ` / ${itinerary.totalNights} N`
                  : ""
              }`}
              color="purple"
            />

            <SummaryCard
              icon={<FiUsers size={13} />}
              label="Customer"
              value={getCustomerName(itinerary.customer)}
              color="indigo"
            />

            <SummaryCard
              icon={<FiClock size={13} />}
              label="Dates"
              value={`${formatDate(itinerary.startDate)} — ${formatDate(
                itinerary.endDate
              )}`}
              color="emerald"
            />
          </div>

          {/* ==========================================
              DAYS
          ========================================== */}

          {days.length > 0 && (
            <SectionCard
              icon={<FiCalendar size={15} />}
              iconColor="purple"
              title="Day-wise Itinerary"
              description={`${days.length} day${
                days.length === 1 ? "" : "s"
              } planned`}
            >
              <div className="space-y-3">
                {days.map((day, index) => (
                  <div
                    key={day._id || index}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                  >
                    {/* DAY HEADER */}
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
                          {[day.city, day.location]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      )}
                    </div>

                    {/* DAY BODY */}
                    <div className="p-3.5 space-y-3">
                      {day.description && (
                        <p className="text-xs text-gray-600 leading-5">
                          {day.description}
                        </p>
                      )}

                      {/* ACTIVITIES */}
                      {Array.isArray(day.activities) &&
                        day.activities.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <FiActivity
                                size={11}
                                className="text-blue-600"
                              />
                              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-600">
                                Activities
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {day.activities.map((activity, i) => (
                                <div
                                  key={activity._id || i}
                                  className="rounded-md border border-blue-100 bg-blue-50/50 px-2.5 py-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-gray-800">
                                      {activity.name ||
                                        activity.title ||
                                        "Activity"}
                                    </p>

                                    {activity.included !== false && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium shrink-0">
                                        Included
                                      </span>
                                    )}
                                  </div>

                                  {activity.description && (
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                      {activity.description}
                                    </p>
                                  )}

                                  <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-gray-400">
                                    {activity.startTime && (
                                      <span>
                                        {activity.startTime}
                                        {activity.endTime
                                          ? ` - ${activity.endTime}`
                                          : ""}
                                      </span>
                                    )}

                                    {activity.location && (
                                      <span>📍 {activity.location}</span>
                                    )}

                                    {activity.amount > 0 && (
                                      <span>
                                        ₹
                                        {Number(
                                          activity.amount
                                        ).toLocaleString("en-IN")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* HOTEL */}
                      {day.hotel?.hotel && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <FiHome
                              size={11}
                              className="text-emerald-600"
                            />
                            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-600">
                              Hotel
                            </span>
                          </div>

                          <div className="rounded-md border border-emerald-100 bg-emerald-50/50 px-2.5 py-1.5">
                            <p className="text-xs font-semibold text-gray-800">
                              {getHotelName(day.hotel.hotel)}
                            </p>

                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {day.hotel.roomType || "Room"}
                              {day.hotel.nights
                                ? ` • ${day.hotel.nights} nights`
                                : ""}
                            </p>

                            {(day.hotel.checkIn ||
                              day.hotel.checkOut) && (
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                Check-in: {formatDate(day.hotel.checkIn)} •
                                Check-out: {formatDate(day.hotel.checkOut)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* TRANSPORT */}
                      {Array.isArray(day.transport) &&
                        day.transport.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <FiTruck
                                size={11}
                                className="text-orange-600"
                              />
                              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-600">
                                Transport
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {day.transport.map((transport, i) => (
                                <div
                                  key={transport._id || i}
                                  className="rounded-md border border-orange-100 bg-orange-50/50 px-2.5 py-1.5"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <FiTruck
                                      size={10}
                                      className="text-orange-500"
                                    />
                                    <p className="text-xs font-semibold text-gray-800">
                                      {transport.type || "Transport"}
                                    </p>
                                  </div>

                                  {(transport.from || transport.to) && (
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                      {transport.from || "—"} →{" "}
                                      {transport.to || "—"}
                                    </p>
                                  )}

                                  {(transport.departureTime ||
                                    transport.arrivalTime) && (
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                      {transport.departureTime || "—"}{" "}
                                      {" → "}
                                      {transport.arrivalTime || "—"}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* MEALS */}
                      {Array.isArray(day.meals) &&
                        day.meals.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <FiCoffee
                                size={11}
                                className="text-amber-600"
                              />
                              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-600">
                                Meals
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {day.meals.map((meal, i) => (
                                <span
                                  key={meal._id || i}
                                  className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-100"
                                >
                                  {meal.type}
                                  {meal.restaurant
                                    ? ` • ${meal.restaurant}`
                                    : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* FREE TIME */}
                      {day.freeTime && (
                        <div className="rounded-md border border-gray-100 bg-gray-50/60 px-2.5 py-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600 mb-0.5">
                            Free Time
                          </p>
                          <p className="text-xs text-gray-600">
                            {day.freeTime}
                          </p>
                        </div>
                      )}

                      {/* NOTES */}
                      {day.notes && (
                        <div className="rounded-md border border-gray-100 bg-gray-50/60 px-2.5 py-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600 mb-0.5">
                            Notes
                          </p>
                          <p className="text-xs text-gray-600 whitespace-pre-wrap">
                            {day.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ==========================================
              INCLUSIONS / EXCLUSIONS / IMPORTANT NOTES
          ========================================== */}

          {(itinerary.inclusions?.length > 0 ||
            itinerary.exclusions?.length > 0 ||
            itinerary.importantNotes?.length > 0) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* INCLUSIONS */}
              {itinerary.inclusions?.length > 0 && (
                <SectionCard
                  icon={<FiCheck size={15} />}
                  iconColor="green"
                  title="Inclusions"
                  description="What's covered"
                >
                  <ul className="space-y-1.5">
                    {itinerary.inclusions.map((item, i) => (
                      <li
                        key={i}
                        className="text-xs text-gray-600 flex gap-2"
                      >
                        <FiCheck
                          size={12}
                          className="text-green-500 mt-0.5 shrink-0"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {/* EXCLUSIONS */}
              {itinerary.exclusions?.length > 0 && (
                <SectionCard
                  icon={<FiXCircle size={15} />}
                  iconColor="red"
                  title="Exclusions"
                  description="What's not included"
                >
                  <ul className="space-y-1.5">
                    {itinerary.exclusions.map((item, i) => (
                      <li
                        key={i}
                        className="text-xs text-gray-600 flex gap-2"
                      >
                        <FiXCircle
                          size={12}
                          className="text-red-500 mt-0.5 shrink-0"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {/* IMPORTANT NOTES */}
              {itinerary.importantNotes?.length > 0 && (
                <SectionCard
                  icon={<FiAlertCircle size={15} />}
                  iconColor="amber"
                  title="Important Notes"
                  description="Key info"
                >
                  <ul className="space-y-1.5">
                    {itinerary.importantNotes.map((item, i) => (
                      <li
                        key={i}
                        className="text-xs text-gray-600 flex gap-2"
                      >
                        <span className="text-amber-500 mt-0.5 shrink-0">
                          •
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}
            </div>
          )}

          {/* ==========================================
              EMERGENCY CONTACT
          ========================================== */}

          {(itinerary.emergencyContact?.name ||
            itinerary.emergencyContact?.phone ||
            itinerary.emergencyContact?.email) && (
            <SectionCard
              icon={<FiPhone size={15} />}
              iconColor="pink"
              title="Emergency Contact"
              description="Point of contact during travel"
            >
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {itinerary.emergencyContact.name && (
                  <div className="rounded-lg border border-pink-100 bg-pink-50/60 px-3 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-pink-500">
                      Name
                    </p>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">
                      {itinerary.emergencyContact.name}
                    </p>
                  </div>
                )}

                {itinerary.emergencyContact.phone && (
                  <div className="rounded-lg border border-pink-100 bg-pink-50/60 px-3 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-pink-500">
                      Phone
                    </p>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">
                      {itinerary.emergencyContact.phone}
                    </p>
                  </div>
                )}

                {itinerary.emergencyContact.email && (
                  <div className="rounded-lg border border-pink-100 bg-pink-50/60 px-3 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-pink-500">
                      Email
                    </p>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">
                      {itinerary.emergencyContact.email}
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* ==========================================
              ADDITIONAL NOTES
          ========================================== */}

          {itinerary.notes && (
            <SectionCard
              icon={<FiFileText size={15} />}
              iconColor="indigo"
              title="Additional Notes"
              description="General information"
            >
              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-5">
                {itinerary.notes}
              </p>
            </SectionCard>
          )}

          {/* EMPTY STATE */}
          {days.length === 0 &&
            !itinerary.inclusions?.length &&
            !itinerary.exclusions?.length &&
            !itinerary.importantNotes?.length && (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center">
                <FiInfo size={20} className="mx-auto text-gray-400" />
                <p className="text-xs font-semibold text-gray-700 mt-2">
                  No detailed itinerary added yet
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  This itinerary has no day-wise plan.
                </p>
              </div>
            )}
        </div>

        {/* =================================================
            FOOTER — Download PDF + Edit (Close removed)
        ================================================= */}

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30 px-5 py-3">
          <button
            type="button"
            onClick={() => onDownloadPDF(itinerary)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]"
          >
            <FiDownload size={14} />
            Download PDF
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(itinerary)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
            >
              <FiEdit2 size={14} />
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewItinerary;