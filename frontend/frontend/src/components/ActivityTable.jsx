import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiInbox,
  FiPhone,
  FiMail,
  FiUsers,
  FiFileText,
  FiRefreshCw,
  FiMessageCircle,
  FiTag,
  FiCreditCard,
  FiMap,
  FiTruck,
  FiCalendar,
  FiCheckSquare,
  FiHeadphones,
  FiDollarSign,
} from "react-icons/fi";

function ActivityTable({
  activities,
  user,
  onView,
  onEdit,
  onDelete,
}) {
  // =========================
  // DATE FORMAT
  // =========================
  const formatDate = (date) => {
    if (!date) return "—";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return "—";

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
      "customer support":
        "bg-red-50 text-red-700 ring-red-200",
      other: "bg-gray-50 text-gray-600 ring-gray-200",
    };

    return (
      map[t] ||
      "bg-gray-50 text-gray-700 ring-gray-200"
    );
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
      positive:
        "bg-green-50 text-green-700 ring-green-200",

      neutral:
        "bg-gray-50 text-gray-600 ring-gray-200",

      negative:
        "bg-red-50 text-red-700 ring-red-200",

      "no response":
        "bg-amber-50 text-amber-700 ring-amber-200",

      completed:
        "bg-emerald-50 text-emerald-700 ring-emerald-200",

      pending:
        "bg-yellow-50 text-yellow-700 ring-yellow-200",
    };

    return (
      map[o] ||
      "bg-gray-50 text-gray-600 ring-gray-200"
    );
  };

  // =========================
  // AVATAR COLOR
  // =========================
  const getAvatarColor = (name) => {
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-purple-100 text-purple-700",
      "bg-green-100 text-green-700",
      "bg-pink-100 text-pink-700",
      "bg-amber-100 text-amber-700",
      "bg-cyan-100 text-cyan-700",
      "bg-indigo-100 text-indigo-700",
    ];

    const str = String(name || "?");

    const idx = str
      .split("")
      .reduce(
        (acc, ch) => acc + ch.charCodeAt(0),
        0
      );

    return colors[idx % colors.length];
  };

  // =========================
  // INITIALS
  // =========================
  const getInitials = (name) => {
    if (!name) return "?";

    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // =========================
  // RELATED LABELS
  // =========================
  const getRelatedItems = (activity) => {
    const items = [];

    if (activity.lead) {
      items.push({
        label: "Lead",
        value: `${activity.lead.firstName || ""} ${
          activity.lead.lastName || ""
        }`.trim(),
      });
    }

    if (activity.contact) {
      items.push({
        label: "Contact",
        value: `${activity.contact.firstName || ""} ${
          activity.contact.lastName || ""
        }`.trim(),
      });
    }

    if (activity.company) {
      items.push({
        label: "Company",
        value: activity.company.name,
      });
    }

    // =========================
    // TRIP — OLD DEAL REMOVED
    // =========================
    if (activity.trip) {
      items.push({
        label: "Trip",
        value:
          activity.trip.title ||
          activity.trip.tripCode ||
          activity.trip.destination ||
          "—",
      });
    }

    return items;
  };

  // =========================
  // EMPTY STATE
  // =========================
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <FiInbox
            size={28}
            className="text-gray-400"
          />
        </div>

        <h3 className="text-base font-semibold text-gray-800">
          No activities found
        </h3>

        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Try adjusting your filters or create a new
          activity to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">

        {/* =========================
            TABLE HEADER
        ========================= */}
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/60">

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-5 py-3.5">
              Activity
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5">
              Type
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5 hidden lg:table-cell">
              Related To
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5 hidden md:table-cell">
              Date
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5">
              Outcome
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5 hidden lg:table-cell">
              Created By
            </th>

            <th className="text-right font-medium text-xs uppercase tracking-wider text-gray-500 px-5 py-3.5">
              Actions
            </th>

          </tr>
        </thead>

        {/* =========================
            TABLE BODY
        ========================= */}
        <tbody className="divide-y divide-gray-100">

          {activities.map((activity) => {
            const relatedItems =
              getRelatedItems(activity);

            return (
              <tr
                key={activity._id}
                className="hover:bg-gray-50/70 transition-colors"
              >

                {/* ACTIVITY */}
                <td className="px-5 py-3.5">
                  <div className="min-w-0 max-w-[280px]">

                    <p className="font-medium text-gray-800 truncate">
                      {activity.title}
                    </p>

                    {activity.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {activity.description.length > 60
                          ? `${activity.description.substring(
                              0,
                              60
                            )}...`
                          : activity.description}
                      </p>
                    )}

                  </div>
                </td>

                {/* TYPE */}
                <td className="px-4 py-3.5">

                  {activity.type ? (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${getTypeStyle(
                        activity.type
                      )}`}
                    >
                      {getTypeIcon(activity.type)}

                      {activity.type}
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      —
                    </span>
                  )}

                </td>

                {/* RELATED TO */}
                <td className="px-4 py-3.5 hidden lg:table-cell">

                  {relatedItems.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">
                      No relation
                    </span>
                  ) : (
                    <div className="flex flex-col gap-0.5">

                      {relatedItems
                        .slice(0, 2)
                        .map((item, i) => (
                          <span
                            key={i}
                            className="text-xs text-gray-600 truncate"
                          >
                            <span className="text-gray-400">
                              {item.label}:{" "}
                            </span>

                            {item.value}
                          </span>
                        ))}

                      {relatedItems.length > 2 && (
                        <span className="text-[10px] text-gray-400">
                          +
                          {relatedItems.length - 2}{" "}
                          more
                        </span>
                      )}

                    </div>
                  )}

                </td>

                {/* DATE */}
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <span className="text-xs text-gray-700">
                    {formatDate(
                      activity.activityDate
                    )}
                  </span>
                </td>

                {/* OUTCOME */}
                <td className="px-4 py-3.5">

                  {activity.outcome ? (
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${getOutcomeStyle(
                        activity.outcome
                      )}`}
                    >
                      {activity.outcome}
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      —
                    </span>
                  )}

                </td>

                {/* CREATED BY */}
                <td className="px-4 py-3.5 hidden lg:table-cell">

                  {activity.createdBy?.name ? (
                    <div className="flex items-center gap-2">

                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${getAvatarColor(
                          activity.createdBy.name
                        )}`}
                      >
                        {getInitials(
                          activity.createdBy.name
                        )}
                      </div>

                      <span className="text-xs text-gray-700 truncate">
                        {activity.createdBy.name}
                      </span>

                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">
                      Unknown
                    </span>
                  )}

                </td>

                {/* ACTIONS */}
                <td className="px-5 py-3.5">

                  <div className="flex items-center justify-end gap-1">

                    {/* VIEW */}
                    <button
                      onClick={() =>
                        onView(activity)
                      }
                      title="View"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
                    >
                      <FiEye size={16} />
                    </button>

                    {/* EDIT */}
                    <button
                      onClick={() =>
                        onEdit(activity)
                      }
                      title="Edit"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition"
                    >
                      <FiEdit2 size={16} />
                    </button>

                    {/* DELETE — ADMIN ONLY */}
                    {user?.role === "admin" && (
                      <button
                        onClick={() =>
                          onDelete(activity)
                        }
                        title="Delete"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    )}

                  </div>

                </td>

              </tr>
            );
          })}

        </tbody>
      </table>
    </div>
  );
}

export default ActivityTable;