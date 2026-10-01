
import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiInbox,
  FiMapPin,
  FiUsers,
  FiCalendar,
} from "react-icons/fi";

function TripTable({
  trips,
  onView,
  onEdit,
  onDelete,
  deletingId,
  user,
}) {
  // =========================
  // STATUS BADGE STYLE
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
      domestic: "bg-blue-50 text-blue-700",
      international: "bg-indigo-50 text-indigo-700",
      honeymoon: "bg-pink-50 text-pink-700",
      family: "bg-green-50 text-green-700",
      solo: "bg-purple-50 text-purple-700",
      corporate: "bg-gray-50 text-gray-700",
      group: "bg-orange-50 text-orange-700",
      adventure: "bg-emerald-50 text-emerald-700",
      pilgrimage: "bg-amber-50 text-amber-700",
      other: "bg-gray-50 text-gray-600",
    };

    return (
      map[type] || "bg-gray-50 text-gray-600"
    );
  };

  // =========================
  // FORMAT DATE
  // =========================
  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // =========================
  // TRAVELLER COUNT
  // =========================
  const getTravellerCount = (trip) => {
    return (
      Number(trip.adults || 0) +
      Number(trip.children || 0) +
      Number(trip.infants || 0)
    );
  };

  // =========================
  // OWNER INITIALS
  // =========================
  const getInitials = (name) => {
    if (!name) {
      return "";
    }

    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // =========================
  // EMPTY STATE
  // =========================
  if (!trips || trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <FiInbox size={28} className="text-gray-400" />
        </div>

        <h3 className="text-base font-semibold text-gray-800">
          No trips found
        </h3>

        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Try adjusting your filters or add a new trip to get started.
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
              Trip
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5">
              Destination
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5 hidden lg:table-cell">
              Travel Type
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5">
              Travellers
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5">
              Amount
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5">
              Status
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5 hidden xl:table-cell">
              Travel Dates
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5 hidden lg:table-cell">
              Owner
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
          {trips.map((trip) => (
            <tr
              key={trip._id}
              className="hover:bg-gray-50/70 transition-colors"
            >
              {/* TRIP */}
              <td className="px-5 py-3.5">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate max-w-[190px]">
                    {trip.title || "Untitled Trip"}
                  </p>

                  <div className="flex items-center gap-1.5 mt-1">
                    {trip.tripCode && (
                      <span className="text-xs text-gray-500">
                        {trip.tripCode}
                      </span>
                    )}

                    {trip.customer?.name && (
                      <>
                        <span className="text-gray-300">•</span>

                        <span className="text-xs text-gray-500 truncate max-w-[120px]">
                          {trip.customer.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </td>

              {/* DESTINATION */}
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <FiMapPin size={14} />
                  </div>

                  <span className="text-gray-700 truncate max-w-[150px]">
                    {trip.destination || "—"}
                  </span>
                </div>
              </td>

              {/* TRAVEL TYPE */}
              <td className="px-4 py-3.5 hidden lg:table-cell">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTravelTypeStyle(
                    trip.travelType
                  )}`}
                >
                  {trip.travelType || "Other"}
                </span>
              </td>

              {/* TRAVELLERS */}
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <FiUsers size={14} />
                  </div>

                  <div>
                    <p className="font-medium text-gray-700">
                      {getTravellerCount(trip)}
                    </p>

                    <p className="text-[11px] text-gray-400">
                      {trip.adults || 0} adults
                      {Number(trip.children || 0) > 0
                        ? ` • ${trip.children} children`
                        : ""}
                    </p>
                  </div>
                </div>
              </td>

              {/* AMOUNT */}
              <td className="px-4 py-3.5">
                <div>
                  <span className="font-semibold text-gray-800">
                    ₹
                    {Number(
                      trip.totalAmount || trip.estimatedValue || 0
                    ).toLocaleString("en-IN")}
                  </span>

                  {Number(trip.totalCost || 0) > 0 && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Cost ₹
                      {Number(trip.totalCost).toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              </td>

              {/* STATUS */}
              <td className="px-4 py-3.5">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${getStatusStyle(
                    trip.status
                  )}`}
                >
                  {trip.status || "Planning"}
                </span>
              </td>

              {/* TRAVEL DATES */}
              <td className="px-4 py-3.5 hidden xl:table-cell">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <FiCalendar size={14} />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700">
                      {formatDate(trip.startDate)}
                    </p>

                    <p className="text-[11px] text-gray-400">
                      {trip.endDate
                        ? `to ${formatDate(trip.endDate)}`
                        : "End date not set"}
                    </p>
                  </div>
                </div>
              </td>

              {/* OWNER */}
              <td className="px-4 py-3.5 hidden lg:table-cell">
                {trip.owner?.name ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {getInitials(trip.owner.name)}
                    </div>

                    <span className="text-gray-700 truncate max-w-[120px]">
                      {trip.owner.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>

              {/* ACTIONS */}
              <td className="px-5 py-3.5">
                <div className="flex items-center justify-end gap-1">
                  {/* VIEW */}
                  <button
                    type="button"
                    onClick={() => onView(trip)}
                    title="View"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
                  >
                    <FiEye size={16} />
                  </button>

                  {/* EDIT */}
                  <button
                    type="button"
                    onClick={() => onEdit(trip)}
                    title="Edit"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition"
                  >
                    <FiEdit2 size={16} />
                  </button>

                  {/* DELETE — ADMIN ONLY */}
                  {user?.role === "admin" && (
                    <button
                      type="button"
                      onClick={() => onDelete(trip._id)}
                      disabled={deletingId === trip._id}
                      title="Delete"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {deletingId === trip._id ? (
                        <span className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <FiTrash2 size={16} />
                      )}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TripTable;

