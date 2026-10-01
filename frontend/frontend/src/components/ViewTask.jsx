import { createPortal } from "react-dom";
import {
  FiX,
  FiCheckCircle,
  FiClock,
  FiUser,
  FiMail,
  FiCalendar,
  FiLink,
  FiBriefcase,
  FiTag,
  FiBell,
  FiFileText,
  FiPhone,
  FiUsers,
  FiRefreshCw,
  FiHome,
  FiTruck,
  FiCreditCard,
  FiMap,
  FiHelpCircle,
  FiBookOpen,
} from "react-icons/fi";

function ViewTask({ task, onClose }) {
  if (!task) return null;

  // =========================
  // DATE FORMAT
  // =========================
  const formatDate = (date) => {
    if (!date) return "Not set";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "Not set";
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
  // SIMPLE DATE FORMAT
  // =========================
  const formatTripDate = (date) => {
    if (!date) return "Not set";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "Not set";
    }

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // =========================
  // STATUS STYLE
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
  // PRIORITY STYLE
  // =========================
  const getPriorityStyle = (priority) => {
    const p = (priority || "").toLowerCase();

    const map = {
      low:
        "bg-gray-50 text-gray-600 ring-gray-200",

      medium:
        "bg-amber-50 text-amber-700 ring-amber-200",

      high:
        "bg-orange-50 text-orange-700 ring-orange-200",

      urgent:
        "bg-red-50 text-red-700 ring-red-200",
    };

    return (
      map[p] ||
      "bg-gray-50 text-gray-600 ring-gray-200"
    );
  };

  // =========================
  // TASK TYPE ICON
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
  // TASK INITIALS
  // =========================
  const initials = (task.title || "?")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // =========================
  // LEAD NAME
  // =========================
  const leadName = task.relatedLead
    ? `${task.relatedLead.firstName || ""} ${
        task.relatedLead.lastName || ""
      }`.trim()
    : "";

  // =========================
  // CONTACT NAME
  // =========================
  const contactName = task.relatedContact
    ? `${task.relatedContact.firstName || ""} ${
        task.relatedContact.lastName || ""
      }`.trim()
    : "";

  // =========================
  // TRIP
  // =========================
  const trip = task.relatedTrip || null;

  const tripTitle =
    trip?.title ||
    "";

  const tripCode =
    trip?.tripCode ||
    "";

  const tripDestination =
    trip?.destination ||
    "";

  const tripTravelType =
    trip?.travelType ||
    "";

  const tripStatus =
    trip?.status ||
    "";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto animate-[fadeIn_.15s_ease-out]"
      onClick={(e) => {
        if (
          e.target === e.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[560px] max-h-[88vh] bg-white rounded-2xl shadow-2xl shadow-gray-900/20 flex flex-col overflow-hidden animate-[popIn_.18s_ease-out] my-auto">

        {/* =========================
            HEADER
        ========================= */}

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">

          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Task Details
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

        {/* =========================
            BODY
        ========================= */}

        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* =========================
              AVATAR + TITLE
          ========================= */}

          <div className="flex items-center gap-3.5 pb-4 mb-4 border-b border-gray-100">

            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 uppercase shadow-sm">
              {initials || "?"}
            </div>

            <div className="min-w-0 flex-1">

              <h3 className="text-base font-semibold text-gray-900 truncate">
                {task.title}
              </h3>

              <p className="text-xs text-gray-500 mt-0.5 truncate inline-flex items-center gap-1.5">

                {task.type && (
                  <>
                    <span className="text-gray-400">
                      {getTypeIcon(
                        task.type
                      )}
                    </span>

                    {task.type}
                  </>
                )}

              </p>

              <div className="flex items-center gap-2 mt-2 flex-wrap">

                {task.status && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${getStatusStyle(
                      task.status
                    )}`}
                  >
                    {task.status}
                  </span>
                )}

                {task.priority && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${getPriorityStyle(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                )}

              </div>

            </div>
          </div>

          {/* =========================
              FIELDS
          ========================= */}

          <div className="space-y-3.5">

            {/* =====================
                DESCRIPTION
            ===================== */}

            <div>

              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description
              </label>

              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 min-h-[60px] whitespace-pre-wrap leading-relaxed">

                {task.description || (
                  <span className="text-gray-400 italic">
                    No description provided
                  </span>
                )}

              </div>

            </div>

            {/* =====================
                ASSIGNMENT
            ===================== */}

            <div className="grid grid-cols-2 gap-3">

              <ReadOnlyField
                label="Assigned To"
                value={
                  task.assignedTo?.name
                }
                subvalue={
                  task.assignedTo?.email
                }
                icon={
                  <FiUser size={13} />
                }
              />

              <ReadOnlyField
                label="Created By"
                value={
                  task.createdBy?.name
                }
                subvalue={
                  task.createdBy?.email
                }
                icon={
                  <FiUser size={13} />
                }
              />

            </div>

            {/* =====================
                SCHEDULE
            ===================== */}

            <div className="grid grid-cols-2 gap-3">

              <ReadOnlyField
                label="Start Date"
                value={formatDate(
                  task.startDate
                )}
                icon={
                  <FiCalendar
                    size={13}
                  />
                }
              />

              <ReadOnlyField
                label="Due Date"
                value={formatDate(
                  task.dueDate
                )}
                icon={
                  <FiClock size={13} />
                }
              />

            </div>

            {/* =====================
                COMPLETED AT
            ===================== */}

            {task.completedAt && (
              <ReadOnlyField
                label="Completed At"
                value={formatDate(
                  task.completedAt
                )}
                icon={
                  <FiCheckCircle
                    size={13}
                  />
                }
                highlight
              />
            )}

            {/* =========================
                CRM RELATIONSHIPS
            ========================= */}

            <section>

              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 mt-4">
                CRM Relationships
              </h3>

              <div className="grid grid-cols-2 gap-3">

                <ReadOnlyField
                  label="Lead"
                  value={leadName}
                  icon={
                    <FiLink size={13} />
                  }
                />

                <ReadOnlyField
                  label="Contact"
                  value={contactName}
                  icon={
                    <FiUser size={13} />
                  }
                />

                <ReadOnlyField
                  label="Company"
                  value={
                    task.relatedCompany
                      ?.name
                  }
                  icon={
                    <FiBriefcase
                      size={13}
                    />
                  }
                />

                {/* TRIP */}

                <ReadOnlyField
                  label="Trip"
                  value={tripTitle}
                  subvalue={
                    tripCode
                      ? tripCode
                      : undefined
                  }
                  icon={
                    <FiMap size={13} />
                  }
                />

                {/* DESTINATION */}

                <ReadOnlyField
                  label="Destination"
                  value={
                    tripDestination
                  }
                  icon={
                    <FiMap size={13} />
                  }
                />

                {/* TRAVEL TYPE */}

                <ReadOnlyField
                  label="Travel Type"
                  value={
                    tripTravelType
                  }
                  icon={
                    <FiBriefcase
                      size={13}
                    />
                  }
                />

                {/* TRIP STATUS */}

                <ReadOnlyField
                  label="Trip Status"
                  value={tripStatus}
                  icon={
                    <FiTag size={13} />
                  }
                />

              </div>

            </section>

            {/* =========================
                TRIP SCHEDULE
            ========================= */}

            {trip && (
              <section>

                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 mt-4">
                  Trip Schedule
                </h3>

                <div className="grid grid-cols-2 gap-3">

                  <ReadOnlyField
                    label="Trip Start"
                    value={formatTripDate(
                      trip.startDate
                    )}
                    icon={
                      <FiCalendar
                        size={13}
                      />
                    }
                  />

                  <ReadOnlyField
                    label="Trip End"
                    value={formatTripDate(
                      trip.endDate
                    )}
                    icon={
                      <FiCalendar
                        size={13}
                      />
                    }
                  />

                </div>

              </section>
            )}

            {/* =========================
                REMINDER
            ========================= */}

            <section>

              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 mt-4">
                Reminder
              </h3>

              {task.reminder?.enabled ? (

                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">

                  <div className="w-9 h-9 rounded-lg bg-white border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <FiBell size={15} />
                  </div>

                  <div className="min-w-0">

                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">
                      Reminder Set
                    </p>

                    <p className="text-sm text-blue-900 font-medium truncate">
                      {formatDate(
                        task.reminder
                          .reminderAt
                      )}
                    </p>

                  </div>

                </div>

              ) : (

                <div className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400 italic">
                  Reminder is disabled
                </div>

              )}

            </section>

            {/* =========================
                NOTES
            ========================= */}

            <section>

              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 mt-4">
                Notes
              </h3>

              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 min-h-[60px] whitespace-pre-wrap leading-relaxed">

                {task.notes || (
                  <span className="text-gray-400 italic">
                    No additional notes
                  </span>
                )}

              </div>

            </section>

            {/* =========================
                TAGS
            ========================= */}

            {task.tags?.length > 0 && (
              <section>

                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 mt-4">
                  Tags
                </h3>

                <div className="flex flex-wrap gap-2">

                  {task.tags.map(
                    (tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full ring-1 ring-inset ring-blue-200"
                      >
                        <FiTag
                          size={10}
                        />

                        {tag}
                      </span>
                    )
                  )}

                </div>

              </section>
            )}

          </div>
        </div>

        {/* =========================
            FOOTER
        ========================= */}

        <div className="flex items-center justify-end px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">

          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition"
          >
            Close
          </button>

        </div>

      </div>

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

    </div>,
    document.body
  );
}

// =========================
// READ ONLY FIELD
// =========================

function ReadOnlyField({
  label,
  value,
  subvalue,
  icon,
  highlight,
}) {
  return (
    <div>

      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>

      <div
        className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm flex items-start gap-2 min-h-[38px] ${
          highlight
            ? "font-semibold text-gray-900"
            : "text-gray-800"
        }`}
      >

        {icon && (
          <span className="text-gray-400 flex-shrink-0 mt-0.5">
            {icon}
          </span>
        )}

        <div className="min-w-0 flex-1">

          <p className="truncate">
            {value || "—"}
          </p>

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

export default ViewTask;