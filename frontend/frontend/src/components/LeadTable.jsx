import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiMapPin,
  FiTag,
  FiUser,
  FiChevronRight,
} from "react-icons/fi";

// =====================================================
// HELPERS
// =====================================================

function getInitials(firstName, lastName) {
  const first = firstName?.trim()?.[0] || "";
  const last = lastName?.trim()?.[0] || "";

  return `${first}${last}`.toUpperCase() || "?";
}

function getAvatarColor(name = "") {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
    "bg-cyan-100 text-cyan-700",
  ];

  let total = 0;

  for (let i = 0; i < name.length; i++) {
    total += name.charCodeAt(i);
  }

  return colors[total % colors.length];
}

function getStatusStyle(status) {
  const key = (status || "").toLowerCase();

  const styles = {
    new: "bg-blue-50 text-blue-700 ring-blue-200",
    contacted: "bg-cyan-50 text-cyan-700 ring-cyan-200",
    qualified: "bg-green-50 text-green-700 ring-green-200",
    proposal: "bg-purple-50 text-purple-700 ring-purple-200",
    negotiation: "bg-amber-50 text-amber-700 ring-amber-200",
    won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    lost: "bg-red-50 text-red-700 ring-red-200",
  };

  return (
    styles[key] ||
    "bg-gray-50 text-gray-700 ring-gray-200"
  );
}

function getPriorityStyle(priority) {
  const key = (priority || "").toLowerCase();

  const styles = {
    high: "bg-red-50 text-red-700 ring-red-200",
    medium: "bg-amber-50 text-amber-700 ring-amber-200",
    low: "bg-gray-50 text-gray-600 ring-gray-200",
  };

  return (
    styles[key] ||
    "bg-gray-50 text-gray-600 ring-gray-200"
  );
}

// =====================================================
// COMPONENT
// =====================================================

function LeadTable({
  leads = [],
  onView,
  onEdit,
  onDelete,
  onConvert,
  deletingId,
  convertingId,
  user,
}) {
  // ===================================================
  // EMPTY STATE
  // ===================================================

  if (!leads.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

        <div className="flex flex-col items-center justify-center py-16 px-5 text-center">

          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <FiUser size={22} />
          </div>

          <h3 className="text-sm font-semibold text-gray-800">
            No leads found
          </h3>

          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            No leads match your current search or filters.
          </p>

        </div>

      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

      {/* =================================================
          DESKTOP TABLE
      ================================================= */}

      <div className="hidden lg:block overflow-x-auto">

        <table className="w-full text-sm">

          <thead>

            <tr className="border-b border-gray-200 bg-gray-50/60">

              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Lead
              </th>

              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Destination
              </th>

              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Source
              </th>

              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>

              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Priority
              </th>

              <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Actions
              </th>

            </tr>

          </thead>

          <tbody className="divide-y divide-gray-100">

            {leads.map((lead) => {
              const fullName =
                [lead.firstName, lead.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                lead.name ||
                "Unnamed Lead";

              const initials = getInitials(
                lead.firstName,
                lead.lastName
              );

              const avatarColor =
                getAvatarColor(fullName);

              const isConverted =
                Boolean(lead.isConverted);

              const isDeleting =
                deletingId === lead._id;

              const isConverting =
                convertingId === lead._id;

              return (
                <tr
                  key={lead._id}
                  className="hover:bg-gray-50/70 transition-colors"
                >

                  {/* =====================================
                      LEAD
                  ===================================== */}

                  <td className="px-5 py-3.5">

                    <div className="flex items-center gap-3 min-w-[220px]">

                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor}`}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0">

                        <p className="font-semibold text-gray-800 truncate max-w-[190px]">
                          {fullName}
                        </p>

                        <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[190px]">
                          {lead.email ||
                            lead.phone ||
                            "No contact information"}
                        </p>

                      </div>

                    </div>

                  </td>

                  {/* =====================================
                      DESTINATION
                  ===================================== */}

                  <td className="px-5 py-3.5">

                    <div className="flex items-center gap-1.5 text-xs text-gray-700">

                      <FiMapPin
                        size={13}
                        className="text-gray-400 flex-shrink-0"
                      />

                      <span className="truncate max-w-[150px]">
                        {lead.destination || "—"}
                      </span>

                    </div>

                  </td>

                  {/* =====================================
                      SOURCE
                  ===================================== */}

                  <td className="px-5 py-3.5">

                    <div className="flex items-center gap-1.5 text-xs text-gray-600">

                      <FiTag
                        size={13}
                        className="text-gray-400 flex-shrink-0"
                      />

                      <span>
                        {lead.source || "—"}
                      </span>

                    </div>

                  </td>

                  {/* =====================================
                      STATUS
                  ===================================== */}

                  <td className="px-5 py-3.5">

                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium ring-1 ring-inset ${getStatusStyle(
                        lead.status
                      )}`}
                    >
                      {lead.status || "New"}
                    </span>

                  </td>

                  {/* =====================================
                      PRIORITY
                  ===================================== */}

                  <td className="px-5 py-3.5">

                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium ring-1 ring-inset ${getPriorityStyle(
                        lead.priority
                      )}`}
                    >
                      {lead.priority || "Medium"}
                    </span>

                  </td>

                  {/* =====================================
                      ACTIONS
                  ===================================== */}

                  <td className="px-5 py-3.5">

                    <div className="flex items-center justify-end gap-1">

                      {/* VIEW */}

                      <ActionButton
                        title="View Lead"
                        onClick={() =>
                          onView?.(lead)
                        }
                      >
                        <FiEye size={15} />
                      </ActionButton>

                      {/* EDIT */}

                      <ActionButton
                        title={
                          isConverted
                            ? "Converted lead cannot be edited"
                            : "Edit Lead"
                        }
                        disabled={
                          isConverted ||
                          isDeleting ||
                          isConverting
                        }
                        onClick={() =>
                          onEdit?.(lead)
                        }
                      >
                        <FiEdit2 size={14} />
                      </ActionButton>

                      {/* CREATE ENQUIRY */}

                      {!isConverted && (
                        <button
                          type="button"
                          title="Create Enquiry"
                          disabled={
                            isConverting ||
                            isDeleting
                          }
                          onClick={() =>
                            onConvert?.(lead)
                          }
                          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          {isConverting ? (
                            <span className="w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                          ) : (
                            <FiPlus size={14} />
                          )}

                          <span>
                            {isConverting
                              ? "Creating..."
                              : "Enquiry"}
                          </span>
                        </button>
                      )}

                      {/* DELETE */}

                      {user?.role === "admin" && (
                        <ActionButton
                          title="Delete Lead"
                          danger
                          disabled={
                            isDeleting ||
                            isConverting ||
                            isConverted
                          }
                          onClick={() =>
                            onDelete?.(lead)
                          }
                        >
                          {isDeleting ? (
                            <span className="w-3.5 h-3.5 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                          ) : (
                            <FiTrash2 size={14} />
                          )}
                        </ActionButton>
                      )}

                    </div>

                  </td>

                </tr>
              );
            })}

          </tbody>

        </table>

      </div>

      {/* =================================================
          MOBILE / TABLET CARDS
      ================================================= */}

      <div className="lg:hidden divide-y divide-gray-100">

        {leads.map((lead) => {
          const fullName =
            [lead.firstName, lead.lastName]
              .filter(Boolean)
              .join(" ") ||
            lead.name ||
            "Unnamed Lead";

          const initials = getInitials(
            lead.firstName,
            lead.lastName
          );

          const avatarColor =
            getAvatarColor(fullName);

          const isConverted =
            Boolean(lead.isConverted);

          const isDeleting =
            deletingId === lead._id;

          const isConverting =
            convertingId === lead._id;

          return (
            <div
              key={lead._id}
              className="p-4 hover:bg-gray-50/60 transition"
            >

              {/* =====================================
                  TOP
              ===================================== */}

              <div className="flex items-start justify-between gap-3">

                <div className="flex items-center gap-3 min-w-0">

                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor}`}
                  >
                    {initials}
                  </div>

                  <div className="min-w-0">

                    <h3 className="text-sm font-semibold text-gray-800 truncate">
                      {fullName}
                    </h3>

                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {lead.email ||
                        lead.phone ||
                        "No contact information"}
                    </p>

                  </div>

                </div>

                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium ring-1 ring-inset flex-shrink-0 ${getStatusStyle(
                    lead.status
                  )}`}
                >
                  {lead.status || "New"}
                </span>

              </div>

              {/* =====================================
                  DETAILS
              ===================================== */}

              <div className="grid grid-cols-2 gap-3 mt-4">

                <div>

                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                    Destination
                  </p>

                  <div className="flex items-center gap-1.5 mt-1">

                    <FiMapPin
                      size={12}
                      className="text-gray-400"
                    />

                    <p className="text-xs text-gray-700 truncate">
                      {lead.destination || "—"}
                    </p>

                  </div>

                </div>

                <div>

                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                    Source
                  </p>

                  <div className="flex items-center gap-1.5 mt-1">

                    <FiTag
                      size={12}
                      className="text-gray-400"
                    />

                    <p className="text-xs text-gray-700 truncate">
                      {lead.source || "—"}
                    </p>

                  </div>

                </div>

              </div>

              {/* =====================================
                  PRIORITY
              ===================================== */}

              <div className="flex items-center gap-2 mt-3">

                <span className="text-[10px] text-gray-400 font-medium">
                  Priority:
                </span>

                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 ring-inset ${getPriorityStyle(
                    lead.priority
                  )}`}
                >
                  {lead.priority || "Medium"}
                </span>

              </div>

              {/* =====================================
                  ACTIONS
              ===================================== */}

              <div className="flex items-center justify-end gap-1 mt-4 pt-3 border-t border-gray-100">

                {/* VIEW */}

                <ActionButton
                  title="View Lead"
                  onClick={() =>
                    onView?.(lead)
                  }
                >
                  <FiEye size={14} />
                </ActionButton>

                {/* EDIT */}

                <ActionButton
                  title={
                    isConverted
                      ? "Converted lead cannot be edited"
                      : "Edit Lead"
                  }
                  disabled={
                    isConverted ||
                    isDeleting ||
                    isConverting
                  }
                  onClick={() =>
                    onEdit?.(lead)
                  }
                >
                  <FiEdit2 size={14} />
                </ActionButton>

                {/* CREATE ENQUIRY */}

                {!isConverted && (
                  <button
                    type="button"
                    disabled={
                      isConverting ||
                      isDeleting
                    }
                    onClick={() =>
                      onConvert?.(lead)
                    }
                    className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {isConverting ? (
                      <span className="w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    ) : (
                      <FiPlus size={14} />
                    )}

                    <span>
                      {isConverting
                        ? "Creating..."
                        : "Enquiry"}
                    </span>

                    {!isConverting && (
                      <FiChevronRight size={13} />
                    )}
                  </button>
                )}

                {/* DELETE */}

                {user?.role === "admin" && (
                  <ActionButton
                    title="Delete Lead"
                    danger
                    disabled={
                      isDeleting ||
                      isConverting ||
                      isConverted
                    }
                    onClick={() =>
                      onDelete?.(lead)
                    }
                  >
                    {isDeleting ? (
                      <span className="w-3.5 h-3.5 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                    ) : (
                      <FiTrash2 size={14} />
                    )}
                  </ActionButton>
                )}

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}

// =====================================================
// ACTION BUTTON
// =====================================================

function ActionButton({
  children,
  title,
  onClick,
  disabled = false,
  danger = false,
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed ${
        danger
          ? "text-red-500 hover:bg-red-50 hover:text-red-600"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

export default LeadTable;