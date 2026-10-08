import { createPortal } from "react-dom";
import {
  FiX,
  FiPhone,
  FiMail,
  FiUsers,
  FiFileText,
  FiRefreshCw,
  FiMessageCircle,
  FiTag,
  FiUser,
  FiLink,
  FiBriefcase,
  FiCalendar,
  FiDollarSign,
  FiMap,
  FiTruck,
  FiHeadphones,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";

function ViewActivity({
  activity,
  user,
  onClose,
  onEdit,
  onDelete,
}) {
  if (!activity) return null;

  // =========================
  // DATE FORMAT
  // =========================
  const formatDate = (date) => {
    if (!date) return "Not available";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "Not available";
    }

    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =========================
  // TYPE PILL STYLE
  // =========================
  const getTypeStyle = (type) => {
    const t = (type || "").toLowerCase();

    const map = {
      call: "bg-blue-50 text-blue-700 ring-blue-200",
      email: "bg-purple-50 text-purple-700 ring-purple-200",
      meeting: "bg-cyan-50 text-cyan-700 ring-cyan-200",
      note: "bg-gray-50 text-gray-700 ring-gray-200",
      "follow-up": "bg-amber-50 text-amber-700 ring-amber-200",
      whatsapp: "bg-green-50 text-green-700 ring-green-200",
      sms: "bg-green-50 text-green-700 ring-green-200",
      quotation: "bg-indigo-50 text-indigo-700 ring-indigo-200",
      booking: "bg-blue-50 text-blue-700 ring-blue-200",
      payment: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      hotel: "bg-orange-50 text-orange-700 ring-orange-200",
      transport: "bg-sky-50 text-sky-700 ring-sky-200",
      itinerary: "bg-violet-50 text-violet-700 ring-violet-200",
      document: "bg-gray-50 text-gray-700 ring-gray-200",
      "customer support": "bg-red-50 text-red-700 ring-red-200",
      other: "bg-gray-50 text-gray-600 ring-gray-200",
    };

    return map[t] || "bg-gray-50 text-gray-700 ring-gray-200";
  };

  // =========================
  // TYPE ICON
  // =========================
  const getTypeIcon = (type) => {
    const t = (type || "").toLowerCase();

    const map = {
      call: <FiPhone size={13} />,
      email: <FiMail size={13} />,
      meeting: <FiUsers size={13} />,
      note: <FiFileText size={13} />,
      "follow-up": <FiRefreshCw size={13} />,
      whatsapp: <FiMessageCircle size={13} />,
      sms: <FiMessageCircle size={13} />,
      quotation: <FiFileText size={13} />,
      booking: <FiCalendar size={13} />,
      payment: <FiDollarSign size={13} />,
      hotel: <FiMap size={13} />,
      transport: <FiTruck size={13} />,
      itinerary: <FiMap size={13} />,
      document: <FiFileText size={13} />,
      "customer support": <FiHeadphones size={13} />,
      other: <FiTag size={13} />,
    };

    return map[t] || <FiTag size={13} />;
  };

  // =========================
  // OUTCOME PILL STYLE
  // =========================
  const getOutcomeStyle = (outcome) => {
    const o = (outcome || "").toLowerCase();

    const map = {
      positive: "bg-green-50 text-green-700 ring-green-200",
      neutral: "bg-gray-50 text-gray-600 ring-gray-200",
      negative: "bg-red-50 text-red-700 ring-red-200",
      "no response": "bg-amber-50 text-amber-700 ring-amber-200",
      completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      pending: "bg-yellow-50 text-yellow-700 ring-yellow-200",
    };

    return map[o] || "bg-gray-50 text-gray-600 ring-gray-200";
  };

  // =========================
  // INITIALS
  // =========================
  const initials = (activity.title || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // =========================
  // RELATED NAMES
  // =========================
  const leadName = activity.lead
    ? `${activity.lead.firstName || ""} ${activity.lead.lastName || ""}`.trim()
    : "";

  const contactName = activity.contact
    ? `${activity.contact.firstName || ""} ${activity.contact.lastName || ""}`.trim()
    : "";

  // =========================
  // TRIP NAME
  // =========================
  const tripName = activity.trip
    ? activity.trip.title ||
      activity.trip.tripCode ||
      activity.trip.destination ||
      ""
    : "";

  const canDelete = user?.role === "admin";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[560px] max-h-[88vh] bg-white rounded-2xl shadow-2xl shadow-gray-900/20 flex flex-col overflow-hidden my-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Activity Details
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              View complete information
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* AVATAR + TITLE + PILLS */}
          <div className="flex items-center gap-3.5 pb-4 mb-4 border-b border-gray-100">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 uppercase shadow-sm">
              {initials || "?"}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {activity.title}
              </h3>

              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {formatDate(activity.activityDate)}
              </p>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {activity.type && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${getTypeStyle(
                      activity.type
                    )}`}
                  >
                    {getTypeIcon(activity.type)}
                    {activity.type}
                  </span>
                )}

                {activity.outcome && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${getOutcomeStyle(
                      activity.outcome
                    )}`}
                  >
                    {activity.outcome}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* FIELDS */}
          <div className="space-y-3.5">
            {/* DESCRIPTION */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description
              </label>

              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 min-h-[60px] whitespace-pre-wrap leading-relaxed">
                {activity.description || (
                  <span className="text-gray-400 italic">
                    No description available
                  </span>
                )}
              </div>
            </div>

            {/* CREATED BY */}
            <ReadOnlyField
              label="Created By"
              value={activity.createdBy?.name}
              subvalue={activity.createdBy?.email}
              icon={<FiUser size={13} />}
            />

            {/* CRM RELATIONSHIPS */}
            <section>
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 mt-4">
                CRM Relationships
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <ReadOnlyField
                  label="Lead"
                  value={leadName}
                  icon={<FiLink size={13} />}
                />

                <ReadOnlyField
                  label="Contact"
                  value={contactName}
                  icon={<FiUser size={13} />}
                />

                <ReadOnlyField
                  label="Company"
                  value={activity.company?.name}
                  icon={<FiBriefcase size={13} />}
                />

                <ReadOnlyField
                  label="Trip"
                  value={tripName}
                  subvalue={
                    activity.trip?.destination
                      ? activity.trip.destination
                      : activity.trip?.tripCode
                  }
                  icon={<FiTag size={13} />}
                />
              </div>
            </section>

            {/* NOTES */}
            <section>
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 mt-4">
                Notes
              </h3>

              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 min-h-[60px] whitespace-pre-wrap leading-relaxed">
                {activity.notes || (
                  <span className="text-gray-400 italic">
                    No notes available
                  </span>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* FOOTER — Delete left, Edit right */}
        <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">
          {/* LEFT — Delete */}
          <div>
            {onDelete && canDelete && (
              <button
                type="button"
                onClick={() => onDelete(activity)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
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
                onClick={() => onEdit(activity)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition"
              >
                <FiEdit2 size={14} />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// =====================================================
// READ-ONLY FIELD
// =====================================================
function ReadOnlyField({ label, value, subvalue, icon, highlight }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>

      <div
        className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm flex items-start gap-2 min-h-[38px] ${
          highlight ? "font-semibold text-gray-900" : "text-gray-800"
        }`}
      >
        {icon && (
          <span className="text-gray-400 flex-shrink-0 mt-0.5">{icon}</span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate">{value || "—"}</p>

          {subvalue && (
            <p className="text-[10px] text-gray-500 truncate mt-0.5">
              {subvalue}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewActivity;