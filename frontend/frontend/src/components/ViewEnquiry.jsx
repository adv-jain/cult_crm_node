import React from "react";
import {
  FiX,
  FiUser,
  FiMapPin,
  FiCalendar,
  FiUsers,
  FiDollarSign,
  FiTruck,
  FiHome,
  FiFlag,
  FiFileText,
  FiEdit2,
  FiTrash2,
  FiCoffee,
  FiZap,
} from "react-icons/fi";

/* =========================================================
   SECTION CARD
========================================================= */

function SectionCard({
  icon,
  iconColor = "blue",
  title,
  description,
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
      <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white px-4 py-3">
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

      <div className="p-4">{children}</div>
    </section>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({ label, value, icon }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-gray-400">{icon}</span>}
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
      </div>

      <p className="text-sm font-medium text-gray-800 truncate">
        {value || "—"}
      </p>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

function ViewEnquiry({
  enquiry,
  onClose,
  onEdit,
  onDelete,
  canDelete = false,
  formatDate,
  formatCurrency,
  getTravellerCount,
  getStatusStyle,
  getPriorityStyle,
}) {
  if (!enquiry) return null;

  const travellerCount = getTravellerCount
    ? getTravellerCount(enquiry)
    : (enquiry.adults || 0) +
      (enquiry.children || 0) +
      (enquiry.infants || 0);

  const formatDateValue = (date) => {
    if (!date) return "—";
    if (formatDate) return formatDate(date);
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrencyValue = (amount) => {
    if (amount === undefined || amount === null || amount === "") {
      return "—";
    }
    if (formatCurrency) return formatCurrency(amount);
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  const statusStyle = getStatusStyle
    ? getStatusStyle(enquiry.status)
    : "bg-gray-100 text-gray-700 border-gray-200";

  const priorityStyle = getPriorityStyle
    ? getPriorityStyle(enquiry.priority)
    : "bg-gray-100 text-gray-700 border-gray-200";

  /* Contact name from customer/lead */
  const getContactName = () => {
    const customer = enquiry.customer;
    if (customer) {
      if (customer.name) return customer.name;
      const full = [customer.firstName, customer.lastName]
        .filter(Boolean)
        .join(" ");
      if (full) return full;
    }

    const lead = enquiry.lead;
    if (lead) {
      if (lead.name) return lead.name;
      const full = [lead.firstName, lead.lastName]
        .filter(Boolean)
        .join(" ");
      if (full) return full;
    }

    return "";
  };

  const contactName = getContactName();

  const getInitials = (value) => {
    if (!value) return "TE";
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-3 backdrop-blur-sm sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* HEADER */}
        <div className="relative shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 right-16 h-20 w-20 rounded-full bg-white/5" />

          <div className="relative flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm shrink-0">
                <FiFileText size={18} className="text-white" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold tracking-tight text-white truncate max-w-[320px]">
                    {enquiry.title || "Enquiry Details"}
                  </h2>

                  {enquiry.status && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      {enquiry.status}
                    </span>
                  )}
                </div>

                {enquiry.enquiryNumber && (
                  <p className="text-[11px] text-blue-100 mt-0.5 truncate">
                    {enquiry.enquiryNumber}
                  </p>
                )}
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

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCard
              icon={<FiMapPin size={13} />}
              label="Destination"
              value={enquiry.destination}
              color="blue"
            />
            <SummaryCard
              icon={<FiCalendar size={13} />}
              label="Travel Date"
              value={formatDateValue(enquiry.travelDate)}
              color="purple"
            />
            <SummaryCard
              icon={<FiUsers size={13} />}
              label="Travellers"
              value={travellerCount}
              color="indigo"
            />
            <SummaryCard
              icon={<FiDollarSign size={13} />}
              label="Budget"
              value={formatCurrencyValue(
                enquiry.budgetMax || enquiry.budgetMin
              )}
              color="emerald"
            />
          </div>

          {/* CONTACT + PRIORITY */}
          {(contactName || enquiry.priority) && (
            <SectionCard
              icon={<FiUser size={15} />}
              iconColor="blue"
              title="Contact & Priority"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {contactName && (
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm shrink-0">
                      {getInitials(contactName)}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {contactName}
                      </p>

                      {(enquiry.customer?.phone ||
                        enquiry.lead?.phone ||
                        enquiry.customer?.email ||
                        enquiry.lead?.email) && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {enquiry.customer?.phone ||
                            enquiry.lead?.phone ||
                            enquiry.customer?.email ||
                            enquiry.lead?.email}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {enquiry.priority && (
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priorityStyle}`}
                    >
                      {enquiry.priority} Priority
                    </span>
                  )}
                </div>
              </div>
            </SectionCard>
          )}

          {/* TRAVEL INFORMATION */}
          <SectionCard
            icon={<FiMapPin size={15} />}
            iconColor="purple"
            title="Travel Information"
            description="Trip overview and dates"
          >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <InfoItem
                label="Destination"
                value={enquiry.destination}
              />
              <InfoItem
                label="Departure City"
                value={enquiry.departureCity}
              />
              <InfoItem
                label="Travel Date"
                value={formatDateValue(enquiry.travelDate)}
                icon={<FiCalendar size={11} />}
              />
              <InfoItem
                label="Return Date"
                value={formatDateValue(enquiry.returnDate)}
                icon={<FiCalendar size={11} />}
              />
            </div>
          </SectionCard>

          {/* TRAVELLERS */}
          <SectionCard
            icon={<FiUsers size={15} />}
            iconColor="indigo"
            title="Travellers"
            description="Group composition"
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <TravellerStat label="Adults" value={enquiry.adults || 0} />
              <TravellerStat
                label="Children"
                value={enquiry.children || 0}
              />
              <TravellerStat
                label="Infants"
                value={enquiry.infants || 0}
              />
              <TravellerStat
                label="Total"
                value={travellerCount}
                highlight
              />
            </div>
          </SectionCard>

          {/* TRIP PREFERENCES */}
          <SectionCard
            icon={<FiFlag size={15} />}
            iconColor="amber"
            title="Trip Preferences"
            description="Hotel, transport and meals"
          >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <InfoItem
                label="Travel Type"
                value={enquiry.travelType}
                icon={<FiFlag size={11} />}
              />
              <InfoItem
                label="Hotel Category"
                value={enquiry.hotelCategory}
                icon={<FiHome size={11} />}
              />
              <InfoItem
                label="Transportation"
                value={enquiry.transportation}
                icon={<FiTruck size={11} />}
              />
              <InfoItem
                label="Meal Preference"
                value={enquiry.mealPreference}
                icon={<FiCoffee size={11} />}
              />
            </div>

            {enquiry.roomPreference && (
              <div className="pt-4 mt-4 border-t border-gray-100">
                <InfoItem
                  label="Room Preference"
                  value={enquiry.roomPreference}
                />
              </div>
            )}
          </SectionCard>

          {/* BUDGET */}
          <SectionCard
            icon={<FiDollarSign size={15} />}
            iconColor="green"
            title="Budget"
            description="Estimated price range"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <InfoItem
                label="Minimum Budget"
                value={formatCurrencyValue(enquiry.budgetMin)}
              />
              <InfoItem
                label="Maximum Budget"
                value={formatCurrencyValue(enquiry.budgetMax)}
              />
              <InfoItem
                label="Currency"
                value={enquiry.currency || "INR"}
              />
            </div>
          </SectionCard>

          {/* ENQUIRY META */}
          <SectionCard
            icon={<FiZap size={15} />}
            iconColor="cyan"
            title="Enquiry Details"
            description="Source and assignment"
          >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <InfoItem
                label="Source"
                value={enquiry.source}
              />
              <InfoItem
                label="Assigned To"
                value={
                  enquiry.assignedTo?.name ||
                  enquiry.assignedTo?.email
                }
                icon={<FiUser size={11} />}
              />
              <InfoItem
                label="Quotation Required"
                value={enquiry.quotationRequired ? "Yes" : "No"}
              />
            </div>
          </SectionCard>

          {/* SPECIAL REQUIREMENTS */}
          {enquiry.specialRequirements && (
            <SectionCard
              icon={<FiFileText size={15} />}
              iconColor="pink"
              title="Special Requirements"
              description="Customer preferences"
            >
              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-5">
                {enquiry.specialRequirements}
              </p>
            </SectionCard>
          )}

          {/* NOTES */}
          {enquiry.notes && (
            <SectionCard
              icon={<FiFileText size={15} />}
              iconColor="indigo"
              title="Notes"
              description="Internal notes"
            >
              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-5">
                {enquiry.notes}
              </p>
            </SectionCard>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30 px-5 py-3">

          {/* LEFT — Delete */}
          <div>
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(enquiry)}
                className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50"
              >
                <FiTrash2 size={14} />
                Delete
              </button>
            )}
          </div>

          {/* RIGHT — Edit */}
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(enquiry)}
                className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]"
              >
                <FiEdit2 size={14} />
                Edit Enquiry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SUB COMPONENTS
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

function TravellerStat({ label, value, highlight = false }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-bold ${
          highlight ? "text-blue-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default ViewEnquiry;