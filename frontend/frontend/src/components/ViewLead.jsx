import {
  FiX,
  FiMail,
  FiPhone,
  FiMapPin,
  FiUser,
  FiTag,
} from "react-icons/fi";

function ViewLead({ lead, onClose }) {
  if (!lead) return null;

  // =========================
  // STATUS STYLE
  // =========================

  const getStatusStyle = (status) => {
    const s = (status || "").toLowerCase();

    const map = {
      new: "bg-blue-50 text-blue-700 ring-blue-200",
      contacted: "bg-cyan-50 text-cyan-700 ring-cyan-200",
      qualified: "bg-green-50 text-green-700 ring-green-200",
      proposal: "bg-purple-50 text-purple-700 ring-purple-200",
      negotiation: "bg-amber-50 text-amber-700 ring-amber-200",
      won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      lost: "bg-red-50 text-red-700 ring-red-200",
    };

    return (
      map[s] ||
      "bg-gray-50 text-gray-700 ring-gray-200"
    );
  };

  // =========================
  // PRIORITY STYLE
  // =========================

  const getPriorityStyle = (priority) => {
    const p = (priority || "").toLowerCase();

    const map = {
      high: "bg-red-50 text-red-700 ring-red-200",
      medium: "bg-amber-50 text-amber-700 ring-amber-200",
      low: "bg-gray-50 text-gray-600 ring-gray-200",
    };

    return (
      map[p] ||
      "bg-gray-50 text-gray-600 ring-gray-200"
    );
  };

  // =========================
  // NAME
  // =========================

  const fullName =
    [lead.firstName, lead.lastName]
      .filter(Boolean)
      .join(" ") ||
    lead.name ||
    "Unnamed Lead";

  // =========================
  // INITIALS
  // =========================

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[620px] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* =========================
            HEADER
        ========================= */}

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">

          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Lead Details
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              Basic lead information
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

        {/* =========================
            BODY
        ========================= */}

        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* =========================
              PROFILE
          ========================= */}

          <div className="flex items-center gap-3.5 pb-5 mb-5 border-b border-gray-100">

            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 uppercase shadow-sm">
              {initials || "?"}
            </div>

            <div className="min-w-0 flex-1">

              <h3 className="text-base font-semibold text-gray-900 truncate">
                {fullName}
              </h3>

              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {lead.email ||
                  lead.phone ||
                  "No contact information"}
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-2">

                {/* STATUS */}

                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${getStatusStyle(
                    lead.status
                  )}`}
                >
                  {lead.status || "New"}
                </span>

                {/* PRIORITY */}

                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${getPriorityStyle(
                    lead.priority
                  )}`}
                >
                  {lead.priority || "Medium"}
                </span>

              </div>

            </div>

          </div>

          {/* =========================
              CONTACT INFORMATION
          ========================= */}

          <SectionTitle title="Contact Information" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">

            <ReadOnlyField
              label="Name"
              value={fullName}
              icon={<FiUser size={13} />}
              highlight
            />

            <ReadOnlyField
              label="Mobile"
              value={lead.phone}
              icon={<FiPhone size={13} />}
            />

            <ReadOnlyField
              label="Email"
              value={lead.email}
              icon={<FiMail size={13} />}
            />

          </div>

          {/* =========================
              LEAD INFORMATION
          ========================= */}

          <SectionTitle title="Lead Information" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">

            <ReadOnlyField
              label="Destination"
              value={lead.destination}
              icon={<FiMapPin size={13} />}
              highlight
            />

            <ReadOnlyField
              label="Lead Source"
              value={lead.source}
              icon={<FiTag size={13} />}
            />

            <ReadOnlyField
              label="Status"
              value={lead.status}
              pill="status"
            />

            <ReadOnlyField
              label="Priority"
              value={lead.priority}
              pill="priority"
            />

            <ReadOnlyField
              label="Assigned To"
              value={
                lead.assignedTo?.name ||
                lead.assignedTo?.email ||
                lead.assignedTo ||
                "—"
              }
              icon={<FiUser size={13} />}
            />

          </div>

          {/* =========================
              NOTES
          ========================= */}

          <SectionTitle title="Notes" />

          <div className="mb-2">

            <div className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 min-h-[80px] whitespace-pre-wrap leading-relaxed">

              {lead.notes ? (
                lead.notes
              ) : (
                <span className="text-gray-400 italic">
                  No notes available
                </span>
              )}

            </div>

          </div>

        </div>

        {/* =========================
            FOOTER
        ========================= */}

        <div className="flex items-center justify-end px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition"
          >
            Close
          </button>

        </div>

      </div>
    </div>
  );
}

// =====================================================
// SECTION TITLE
// =====================================================

function SectionTitle({ title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-4 rounded-full bg-blue-600" />

      <h3 className="text-sm font-semibold text-gray-800">
        {title}
      </h3>
    </div>
  );
}

// =====================================================
// READ ONLY FIELD
// =====================================================

function ReadOnlyField({
  label,
  value,
  icon,
  highlight,
  pill,
}) {
  // =========================
  // STATUS / PRIORITY PILL
  // =========================

  if (pill) {
    const styles =
      pill === "status"
        ? {
            new: "bg-blue-50 text-blue-700 ring-blue-200",
            contacted:
              "bg-cyan-50 text-cyan-700 ring-cyan-200",
            qualified:
              "bg-green-50 text-green-700 ring-green-200",
            proposal:
              "bg-purple-50 text-purple-700 ring-purple-200",
            negotiation:
              "bg-amber-50 text-amber-700 ring-amber-200",
            won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
            lost:
              "bg-red-50 text-red-700 ring-red-200",
          }
        : {
            high:
              "bg-red-50 text-red-700 ring-red-200",
            medium:
              "bg-amber-50 text-amber-700 ring-amber-200",
            low:
              "bg-gray-50 text-gray-600 ring-gray-200",
          };

    const key = (value || "").toLowerCase();

    const cls =
      styles[key] ||
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
  // NORMAL FIELD
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
          {value !== undefined &&
          value !== null &&
          value !== ""
            ? value
            : "—"}
        </span>

      </div>

    </div>
  );
}

export default ViewLead;