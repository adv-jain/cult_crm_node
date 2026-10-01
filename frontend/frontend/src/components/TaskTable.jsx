import {
  FiEye,
  FiEdit2,
  FiCheckCircle,
  FiTrash2,
  FiInbox,
  FiPhone,
  FiMail,
  FiUsers,
  FiRefreshCw,
  FiFileText,
  FiTag,
  FiBriefcase,
  FiHome,
  FiTruck,
  FiCreditCard,
  FiMap,
  FiHelpCircle,
  FiBookOpen,
} from "react-icons/fi";

function TaskTable({
  tasks,
  user,
  onView,
  onEdit,
  onDelete,
  onComplete,
}) {
  // =========================
  // DATE FORMAT
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
  // PRIORITY PILL STYLE
  // =========================
  const getPriorityStyle = (priority) => {
    const p = (priority || "").toLowerCase();

    const map = {
      low: "bg-gray-50 text-gray-600 ring-gray-200",
      medium: "bg-amber-50 text-amber-700 ring-amber-200",
      high: "bg-orange-50 text-orange-700 ring-orange-200",
      urgent: "bg-red-50 text-red-700 ring-red-200",
    };

    return (
      map[p] ||
      "bg-gray-50 text-gray-600 ring-gray-200"
    );
  };

  // =========================
  // STATUS PILL STYLE
  // =========================
  const getStatusStyle = (status) => {
    const s = (status || "").toLowerCase();

    const map = {
      pending:
        "bg-amber-50 text-amber-700 ring-amber-200",

      "in progress":
        "bg-blue-50 text-blue-700 ring-blue-200",

      completed:
        "bg-green-50 text-green-700 ring-green-200",

      cancelled:
        "bg-gray-50 text-gray-600 ring-gray-200",
    };

    return (
      map[s] ||
      "bg-gray-50 text-gray-600 ring-gray-200"
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

      "follow-up": <FiRefreshCw size={13} />,

      quotation: <FiFileText size={13} />,

      booking: <FiBriefcase size={13} />,

      hotel: <FiHome size={13} />,

      transport: <FiTruck size={13} />,

      visa: <FiBookOpen size={13} />,

      documentation: <FiFileText size={13} />,

      payment: <FiCreditCard size={13} />,

      itinerary: <FiMap size={13} />,

      "customer support": (
        <FiHelpCircle size={13} />
      ),

      other: <FiTag size={13} />,
    };

    return (
      map[t] || <FiTag size={13} />
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
        (acc, ch) =>
          acc + ch.charCodeAt(0),
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
  // TRIP DISPLAY
  // =========================
  const getTripName = (trip) => {
    if (!trip) return null;

    if (trip.tripCode && trip.title) {
      return `${trip.tripCode} · ${trip.title}`;
    }

    return (
      trip.title ||
      trip.tripCode ||
      trip.destination ||
      null
    );
  };

  // =========================
  // EMPTY STATE
  // =========================
  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">

        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <FiInbox
            size={28}
            className="text-gray-400"
          />
        </div>

        <h3 className="text-base font-semibold text-gray-800">
          No tasks found
        </h3>

        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Try adjusting your filters or
          create a new task to get started.
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
              Task
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5 hidden md:table-cell">
              Type
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5 hidden lg:table-cell">
              Trip
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5 hidden xl:table-cell">
              Assigned To
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5">
              Priority
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5 hidden md:table-cell">
              Due Date
            </th>

            <th className="text-left font-medium text-xs uppercase tracking-wider text-gray-500 px-4 py-3.5">
              Status
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

          {tasks.map((task) => {
            const tripName =
              getTripName(
                task.relatedTrip
              );

            return (
              <tr
                key={task._id}
                className="hover:bg-gray-50/70 transition-colors"
              >

                {/* =====================
                    TASK
                ===================== */}

                <td className="px-5 py-3.5">

                  <div className="min-w-0 max-w-[280px]">

                    <p className="font-medium text-gray-800 truncate">
                      {task.title}
                    </p>

                    {task.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {task.description.length >
                        55
                          ? `${task.description.substring(
                              0,
                              55
                            )}...`
                          : task.description}
                      </p>
                    )}

                  </div>

                </td>

                {/* =====================
                    TYPE
                ===================== */}

                <td className="px-4 py-3.5 hidden md:table-cell">

                  {task.type ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-700">

                      <span className="text-gray-400">
                        {getTypeIcon(
                          task.type
                        )}
                      </span>

                      {task.type}

                    </span>
                  ) : (
                    <span className="text-gray-400">
                      —
                    </span>
                  )}

                </td>

                {/* =====================
                    TRIP
                ===================== */}

                <td className="px-4 py-3.5 hidden lg:table-cell">

                  {tripName ? (
                    <div className="min-w-0 max-w-[220px]">

                      <p
                        className="text-xs font-medium text-gray-800 truncate"
                        title={tripName}
                      >
                        {tripName}
                      </p>

                      {task.relatedTrip
                        ?.destination && (
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">
                          {
                            task
                              .relatedTrip
                              .destination
                          }
                        </p>
                      )}

                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">
                      —
                    </span>
                  )}

                </td>

                {/* =====================
                    ASSIGNED TO
                ===================== */}

                <td className="px-4 py-3.5 hidden xl:table-cell">

                  {task.assignedTo?.name ? (
                    <div className="flex items-center gap-2">

                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${getAvatarColor(
                          task.assignedTo.name
                        )}`}
                      >
                        {getInitials(
                          task.assignedTo.name
                        )}
                      </div>

                      <div className="min-w-0">

                        <p className="text-xs font-medium text-gray-800 truncate">
                          {
                            task
                              .assignedTo
                              .name
                          }
                        </p>

                        {task
                          .assignedTo
                          .role && (
                          <p className="text-[10px] text-gray-500 capitalize truncate">
                            {
                              task
                                .assignedTo
                                .role
                            }
                          </p>
                        )}

                      </div>

                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">
                      Unassigned
                    </span>
                  )}

                </td>

                {/* =====================
                    PRIORITY
                ===================== */}

                <td className="px-4 py-3.5">

                  {task.priority ? (
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${getPriorityStyle(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      —
                    </span>
                  )}

                </td>

                {/* =====================
                    DUE DATE
                ===================== */}

                <td className="px-4 py-3.5 hidden md:table-cell">

                  <span className="text-gray-700 text-xs">
                    {formatDate(
                      task.dueDate
                    )}
                  </span>

                </td>

                {/* =====================
                    STATUS
                ===================== */}

                <td className="px-4 py-3.5">

                  {task.status ? (
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${getStatusStyle(
                        task.status
                      )}`}
                    >
                      {task.status}
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      —
                    </span>
                  )}

                </td>

                {/* =====================
                    ACTIONS
                ===================== */}

                <td className="px-5 py-3.5">

                  <div className="flex items-center justify-end gap-1">

                    {/* VIEW */}

                    <button
                      onClick={() =>
                        onView(task)
                      }
                      title="View"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
                    >
                      <FiEye size={16} />
                    </button>

                    {/* EDIT */}

                    <button
                      onClick={() =>
                        onEdit(task)
                      }
                      title="Edit"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition"
                    >
                      <FiEdit2 size={16} />
                    </button>

                    {/* COMPLETE */}

                    {task.status !==
                      "Completed" && (
                      <button
                        onClick={() =>
                          onComplete(
                            task
                          )
                        }
                        title="Mark Complete"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition"
                      >
                        <FiCheckCircle
                          size={16}
                        />
                      </button>
                    )}

                    {/* DELETE */}

                    {user?.role ===
                      "admin" && (
                      <button
                        onClick={() =>
                          onDelete(task)
                        }
                        title="Delete"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <FiTrash2
                          size={16}
                        />
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

export default TaskTable;