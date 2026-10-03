import { useEffect } from "react";
import {
  FiX,
  FiMapPin,
  FiUser,
  FiUsers,
  FiDollarSign,
  FiCheckCircle,
  FiEdit2,
  FiCheck,
  FiXCircle,
} from "react-icons/fi";
import {
  formatDate,
  formatCurrency,
  getCustomerName,
  getOwnerName,
  getQuotationLabel,
  getBookingNumber,
  getStatusClasses,
  getPaymentClasses,
  canEdit,
  canConfirm,
  canCancel,
} from "./bookingHelpers";

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right break-words">
        {value}
      </span>
    </div>
  );
}

function InfoBlock({ icon, title, children }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function NoteBlock({ label, value, variant = "default" }) {
  const styles =
    variant === "danger"
      ? "bg-red-50 border-red-200 text-red-800"
      : "bg-gray-50 border-gray-200 text-gray-800";

  const labelColor = variant === "danger" ? "text-red-600" : "text-gray-600";

  return (
    <div className="mb-4">
      <label className={`block text-xs font-medium mb-1 ${labelColor}`}>
        {label}
      </label>
      <div
        className={`w-full px-3 py-2.5 border rounded-lg text-sm min-h-[72px] whitespace-pre-wrap leading-relaxed ${styles}`}
      >
        {value}
      </div>
    </div>
  );
}

export default function BookingViewModal({
  booking,
  onClose,
  onEdit,
  onConfirm,
  onCancel,
  actionLoading = false,
}) {
  useEffect(() => {
    if (!booking) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [booking, onClose]);

  if (!booking) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[760px] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">
                {getBookingNumber(booking)}
              </h2>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getStatusClasses(
                  booking.status
                )}`}
              >
                {booking.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {booking.destination || "Booking details"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* SUMMARY */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-brand-blue-50 border border-brand-blue/20 rounded-xl p-3">
              <p className="text-[10px] text-brand-blue-dark font-semibold uppercase tracking-wide">
                Total
              </p>
              <p className="text-sm font-bold text-brand-blue-dark mt-1">
                {formatCurrency(booking.totalAmount, booking.currency || "INR")}
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">
                Paid
              </p>
              <p className="text-sm font-bold text-emerald-900 mt-1">
                {formatCurrency(booking.amountPaid, booking.currency || "INR")}
              </p>
            </div>
            <div className="bg-brand-gold-50 border border-brand-gold/30 rounded-xl p-3">
              <p className="text-[10px] text-brand-gold-dark font-semibold uppercase tracking-wide">
                Due
              </p>
              <p className="text-sm font-bold text-brand-gold-dark mt-1">
                {formatCurrency(booking.amountDue, booking.currency || "INR")}
              </p>
            </div>
          </div>

          {/* TRIP + TRAVELLERS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <InfoBlock
              icon={<FiMapPin size={16} className="text-brand-blue" />}
              title="Trip Details"
            >
              <DetailRow label="Destination" value={booking.destination || "—"} />
              <DetailRow label="Departure" value={booking.departureCity || "—"} />
              <DetailRow label="Travel Type" value={booking.travelType || "—"} />
              <DetailRow label="Travel Date" value={formatDate(booking.travelDate)} />
              <DetailRow label="Return Date" value={formatDate(booking.returnDate)} />
            </InfoBlock>

            <InfoBlock
              icon={<FiUsers size={16} className="text-brand-blue" />}
              title="Travellers"
            >
              <DetailRow label="Adults" value={booking.adults ?? 0} />
              <DetailRow label="Children" value={booking.children ?? 0} />
              <DetailRow label="Infants" value={booking.infants ?? 0} />
              <DetailRow
                label="Payment"
                value={
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getPaymentClasses(
                      booking.paymentStatus
                    )}`}
                  >
                    {booking.paymentStatus || "Pending"}
                  </span>
                }
              />
            </InfoBlock>
          </div>

          {/* CUSTOMER + FINANCIALS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <InfoBlock
              icon={<FiUser size={16} className="text-brand-blue" />}
              title="Customer"
            >
              <DetailRow label="Name" value={getCustomerName(booking.customer)} />
              <DetailRow label="Email" value={booking.customer?.email || "—"} />
              <DetailRow label="Phone" value={booking.customer?.phone || "—"} />
              <DetailRow
                label="Quotation"
                value={getQuotationLabel(booking.quotation)}
              />
            </InfoBlock>

            <InfoBlock
              icon={<FiDollarSign size={16} className="text-brand-blue" />}
              title="Financials"
            >
              <DetailRow
                label="Total"
                value={formatCurrency(booking.totalAmount, booking.currency || "INR")}
              />
              <DetailRow
                label="Cost"
                value={formatCurrency(booking.totalCost, booking.currency || "INR")}
              />
              <DetailRow
                label="Profit"
                value={formatCurrency(booking.profitAmount, booking.currency || "INR")}
              />
              <DetailRow
                label="Discount"
                value={formatCurrency(booking.discountAmount, booking.currency || "INR")}
              />
              <DetailRow
                label="Tax"
                value={formatCurrency(booking.taxAmount, booking.currency || "INR")}
              />
            </InfoBlock>
          </div>

          {/* CONFIRMATION */}
          <div className="border border-gray-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <FiCheckCircle size={16} className="text-brand-blue" />
              <h3 className="text-sm font-semibold text-gray-800">
                Confirmation Status
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                ["Hotel", booking.confirmationStatus?.hotel],
                ["Transport", booking.confirmationStatus?.transport],
                ["Activities", booking.confirmationStatus?.activities],
                ["Overall", booking.confirmationStatus?.overall],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {label}
                  </p>
                  <p className="text-xs font-semibold text-gray-700 mt-1">
                    {value || "Pending"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* OWNERSHIP */}
          <div className="border border-gray-200 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Ownership
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow
                label="Sales Owner"
                value={getOwnerName(booking.salesOwner)}
              />
              <DetailRow
                label="Operations Owner"
                value={getOwnerName(booking.operationsOwner)}
              />
            </div>
          </div>

          {/* NOTES */}
          {booking.specialRequests && (
            <NoteBlock label="Special Requests" value={booking.specialRequests} />
          )}
          {booking.internalNotes && (
            <NoteBlock label="Internal Notes" value={booking.internalNotes} />
          )}
          {booking.cancellationReason && (
            <NoteBlock
              label="Cancellation Reason"
              value={booking.cancellationReason}
              variant="danger"
            />
          )}
        </div>

        {/* FOOTER — Close button hataya */}
        {(canEdit(booking) || canConfirm(booking) || canCancel(booking)) && (
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-brand-blue-50/30">
            {canEdit(booking) && (
              <button
                type="button"
                onClick={() => onEdit(booking)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <FiEdit2 size={14} />
                Edit
              </button>
            )}
            {canConfirm(booking) && (
              <button
                type="button"
                onClick={() => onConfirm(booking)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition disabled:opacity-50 shadow-brand"
              >
                <FiCheck size={14} />
                Confirm
              </button>
            )}
            {canCancel(booking) && (
              <button
                type="button"
                onClick={() => onCancel(booking)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                <FiXCircle size={14} />
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}