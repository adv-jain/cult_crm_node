
import {
  FiX,
  FiDollarSign,
  FiTag,
  FiUser,
  FiBriefcase,
  FiLink,
  FiCalendar,
  FiMapPin,
  FiUsers,
  FiHash,
} from "react-icons/fi";

function ViewTrip({ trip, onClose }) {
  if (!trip) return null;

  // =========================
  // STATUS PILL STYLE
  // =========================
  const getStatusStyle = (status) => {
    const s = (status || "").toLowerCase();

    const map = {
      planning: "bg-gray-50 text-gray-700 ring-gray-200",
      quotation: "bg-purple-50 text-purple-700 ring-purple-200",
      confirmed: "bg-blue-50 text-blue-700 ring-blue-200",
      upcoming: "bg-amber-50 text-amber-700 ring-amber-200",
      ongoing: "bg-cyan-50 text-cyan-700 ring-cyan-200",
      completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      cancelled: "bg-red-50 text-red-700 ring-red-200",
    };

    return (
      map[s] || "bg-gray-50 text-gray-700 ring-gray-200"
    );
  };

  // =========================
  // TRAVEL TYPE STYLE
  // =========================
  const getTravelTypeStyle = (travelType) => {
    const type = (travelType || "").toLowerCase();

    const map = {
      domestic: "bg-blue-50 text-blue-700 ring-blue-200",
      international: "bg-indigo-50 text-indigo-700 ring-indigo-200",
      honeymoon: "bg-pink-50 text-pink-700 ring-pink-200",
      family: "bg-green-50 text-green-700 ring-green-200",
      solo: "bg-purple-50 text-purple-700 ring-purple-200",
      corporate: "bg-gray-50 text-gray-700 ring-gray-200",
      group: "bg-orange-50 text-orange-700 ring-orange-200",
      adventure: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      pilgrimage: "bg-amber-50 text-amber-700 ring-amber-200",
      other: "bg-gray-50 text-gray-600 ring-gray-200",
    };

    return (
      map[type] || "bg-gray-50 text-gray-600 ring-gray-200"
    );
  };

  // =========================
  // FORMAT DATE
  // =========================
  const formatDate = (date) => {
    if (!date) return "—";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "—";
    }

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // =========================
  // FORMAT CURRENCY
  // =========================
  const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  // =========================
  // AVATAR INITIALS
  // =========================
  const initials = (trip.title || "T")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // =========================
  // TRAVELLER COUNT
  // =========================
  const totalTravellers =
    Number(trip.adults || 0) +
    Number(trip.children || 0) +
    Number(trip.infants || 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px] animate-[fadeIn_.15s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[560px] max-h-[88vh] bg-white rounded-2xl shadow-2xl shadow-gray-900/20 flex flex-col overflow-hidden animate-[popIn_.18s_ease-out]">
        {/* =====================================================
            HEADER
        ===================================================== */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Trip Details
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              View complete trip information
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* =====================================================
            BODY
        ===================================================== */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* =====================================================
              AVATAR + TITLE + STATUS
          ===================================================== */}
          <div className="flex items-center gap-3.5 pb-4 mb-4 border-b border-gray-100">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 uppercase shadow-sm">
              {initials || "T"}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {trip.title || "Untitled Trip"}
              </h3>

              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {trip.destination || "No destination"}
              </p>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${getStatusStyle(
                    trip.status
                  )}`}
                >
                  {trip.status || "Planning"}
                </span>

                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${getTravelTypeStyle(
                    trip.travelType
                  )}`}
                >
                  {trip.travelType || "Other"}
                </span>
              </div>
            </div>
          </div>

          {/* =====================================================
              FIELDS
          ===================================================== */}
          <div className="space-y-3.5">
            {/* TRIP CODE + DESTINATION */}
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField
                label="Trip Code"
                value={trip.tripCode}
                icon={<FiHash size={13} />}
              />

              <ReadOnlyField
                label="Destination"
                value={trip.destination}
                icon={<FiMapPin size={13} />}
              />
            </div>

            {/* TRAVEL TYPE + STATUS */}
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField
                label="Travel Type"
                value={trip.travelType}
                pill="travelType"
              />

              <ReadOnlyField
                label="Status"
                value={trip.status}
                pill="status"
              />
            </div>

            {/* START + END DATE */}
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField
                label="Start Date"
                value={formatDate(trip.startDate)}
                icon={<FiCalendar size={13} />}
              />

              <ReadOnlyField
                label="End Date"
                value={formatDate(trip.endDate)}
                icon={<FiCalendar size={13} />}
              />
            </div>

            {/* TRAVELLERS */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Travellers
              </label>

              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[38px] flex items-center gap-4">
                <span className="text-gray-400 flex-shrink-0">
                  <FiUsers size={13} />
                </span>

                <div className="flex items-center gap-4 text-xs text-gray-700">
                  <span>
                    <strong>{trip.adults || 0}</strong> Adults
                  </span>

                  <span>
                    <strong>{trip.children || 0}</strong> Children
                  </span>

                  <span>
                    <strong>{trip.infants || 0}</strong> Infants
                  </span>

                  <span className="text-gray-400">
                    Total:{" "}
                    <strong className="text-gray-700">
                      {totalTravellers}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* AMOUNT + ESTIMATED VALUE */}
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField
                label="Estimated Value"
                value={formatCurrency(trip.estimatedValue)}
                icon={<FiDollarSign size={13} />}
                highlight
              />

              <ReadOnlyField
                label="Total Amount"
                value={formatCurrency(trip.totalAmount)}
                icon={<FiDollarSign size={13} />}
                highlight
              />
            </div>

            {/* COST + PROFIT */}
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField
                label="Total Cost"
                value={formatCurrency(trip.totalCost)}
                icon={<FiDollarSign size={13} />}
              />

              <ReadOnlyField
                label="Profit"
                value={formatCurrency(trip.profit)}
                icon={<FiDollarSign size={13} />}
                highlight
              />
            </div>

            {/* CUSTOMER + COMPANY */}
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField
                label="Customer"
                value={trip.customer?.name}
                icon={<FiUser size={13} />}
              />

              <ReadOnlyField
                label="Company"
                value={trip.company?.name}
                icon={<FiBriefcase size={13} />}
              />
            </div>

            {/* RELATED LEAD + OWNER */}
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField
                label="Related Lead"
                value={
                  trip.lead
                    ? `${trip.lead.firstName || ""} ${
                        trip.lead.lastName || ""
                      }`.trim()
                    : ""
                }
                icon={<FiLink size={13} />}
              />

              <ReadOnlyField
                label="Owner"
                value={trip.owner?.name}
                icon={<FiUser size={13} />}
              />
            </div>

            {/* CANCELLATION REASON */}
            {trip.status === "Cancelled" &&
              trip.cancellationReason && (
                <ReadOnlyField
                  label="Cancellation Reason"
                  value={trip.cancellationReason}
                  icon={<FiTag size={13} />}
                />
              )}

            {/* DESCRIPTION */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description
              </label>

              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 min-h-[72px] whitespace-pre-wrap leading-relaxed">
                {trip.description || (
                  <span className="text-gray-400 italic">
                    No description available
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            FOOTER
        ===================================================== */}
        <div className="flex items-center justify-end px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* =====================================================
          ANIMATIONS
      ===================================================== */}
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

// =====================================================
// READ-ONLY FIELD
// =====================================================
function ReadOnlyField({
  label,
  value,
  icon,
  highlight,
  pill,
}) {
  // =========================
  // STATUS / TRAVEL TYPE PILL
  // =========================
  if (pill) {
    const statusStyles = {
      planning: "bg-gray-50 text-gray-700 ring-gray-200",
      quotation: "bg-purple-50 text-purple-700 ring-purple-200",
      confirmed: "bg-blue-50 text-blue-700 ring-blue-200",
      upcoming: "bg-amber-50 text-amber-700 ring-amber-200",
      ongoing: "bg-cyan-50 text-cyan-700 ring-cyan-200",
      completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      cancelled: "bg-red-50 text-red-700 ring-red-200",

      domestic: "bg-blue-50 text-blue-700 ring-blue-200",
      international: "bg-indigo-50 text-indigo-700 ring-indigo-200",
      honeymoon: "bg-pink-50 text-pink-700 ring-pink-200",
      family: "bg-green-50 text-green-700 ring-green-200",
      solo: "bg-purple-50 text-purple-700 ring-purple-200",
      corporate: "bg-gray-50 text-gray-700 ring-gray-200",
      group: "bg-orange-50 text-orange-700 ring-orange-200",
      adventure: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      pilgrimage: "bg-amber-50 text-amber-700 ring-amber-200",
      other: "bg-gray-50 text-gray-600 ring-gray-200",
    };

    const key = (value || "").toLowerCase();

    const cls =
      statusStyles[key] ||
      "bg-gray-50 text-gray-700 ring-gray-200";

    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {label}
        </label>

        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[38px] flex items-center">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${cls}`}
          >
            {value || "—"}
          </span>
        </div>
      </div>
    );
  }

  // =========================
  // REGULAR FIELD
  // =========================
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>

      <div
        className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm flex items-center gap-2 min-h-[38px] ${
          highlight
            ? "font-semibold text-gray-900"
            : "text-gray-800"
        }`}
      >
        {icon && (
          <span className="text-gray-400 flex-shrink-0">
            {icon}
          </span>
        )}

        <span className="truncate">
          {value || "—"}
        </span>
      </div>
    </div>
  );
}

export default ViewTrip;

