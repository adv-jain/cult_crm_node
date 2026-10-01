import { useEffect } from "react";
import {
  FiX,
  FiTruck,
  FiMapPin,
  FiClock,
  FiDollarSign,
  FiUser,
  FiPhone,
  FiMail,
  FiPackage,
  FiCheck,
  FiEdit2,
} from "react-icons/fi";

const formatFare = (fare, currency = "INR") => {
  if (fare === undefined || fare === null || fare === "") return "—";
  return `${currency} ${Number(fare).toLocaleString("en-IN")}`;
};

export default function TransportView({
  transport,
  onClose,
  onSelect,
  onEdit,
  selectLabel = "Use This Transport",
}) {
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[760px] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {transport.name}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  transport.status === "Active"
                    ? "bg-brand-gold-50 text-brand-gold-dark"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {transport.status || "Inactive"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {transport.code || "No code"}
              {transport.provider ? ` • ${transport.provider}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0"
          >
            <FiX size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <FiTruck className="text-brand-blue mb-2" size={16} />
              <p className="text-[10px] text-gray-400 uppercase font-semibold">
                Type
              </p>
              <p className="text-xs font-medium text-gray-800 mt-1">
                {transport.type || "—"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <FiClock className="text-brand-gold mb-2" size={16} />
              <p className="text-[10px] text-gray-400 uppercase font-semibold">
                Duration
              </p>
              <p className="text-xs font-medium text-gray-800 mt-1">
                {transport.duration || "—"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <FiDollarSign className="text-brand-blue mb-2" size={16} />
              <p className="text-[10px] text-gray-400 uppercase font-semibold">
                Fare
              </p>
              <p className="text-xs font-medium text-gray-800 mt-1">
                {formatFare(transport.fare, transport.currency || "INR")}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <FiPackage className="text-brand-gold mb-2" size={16} />
              <p className="text-[10px] text-gray-400 uppercase font-semibold">
                Class
              </p>
              <p className="text-xs font-medium text-gray-800 mt-1">
                {transport.class || "—"}
              </p>
            </div>
          </div>

          {(transport.departure?.location || transport.arrival?.location) && (
            <section>
              <h3 className="text-xs font-semibold text-gray-900 mb-3">
                Route & Schedule
              </h3>
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase font-semibold mb-1">
                      <FiMapPin size={11} />
                      From
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {transport.departure?.location || "—"}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-1 text-gray-300 shrink-0">
                    <div className="w-8 h-[1.5px] bg-gray-300" />
                    <FiTruck size={14} />
                    <div className="w-8 h-[1.5px] bg-gray-300" />
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-[10px] text-gray-400 uppercase font-semibold mb-1">
                      <FiMapPin size={11} />
                      To
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {transport.arrival?.location || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {transport.vehicleDetails &&
            Object.values(transport.vehicleDetails).some(Boolean) && (
              <section>
                <h3 className="text-xs font-semibold text-gray-900 mb-3">
                  Vehicle Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {transport.vehicleDetails.vehicleType && (
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-[10px] text-gray-400">Vehicle Type</p>
                      <p className="text-xs font-medium text-gray-800 mt-1">
                        {transport.vehicleDetails.vehicleType}
                      </p>
                    </div>
                  )}
                  {transport.vehicleDetails.vehicleNumber && (
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-[10px] text-gray-400">
                        Vehicle Number
                      </p>
                      <p className="text-xs font-medium text-gray-800 mt-1 font-mono">
                        {transport.vehicleDetails.vehicleNumber}
                      </p>
                    </div>
                  )}
                  {transport.vehicleDetails.driverName && (
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-[10px] text-gray-400">Driver Name</p>
                      <p className="text-xs font-medium text-gray-800 mt-1">
                        {transport.vehicleDetails.driverName}
                      </p>
                    </div>
                  )}
                  {transport.vehicleDetails.driverPhone && (
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-[10px] text-gray-400">Driver Phone</p>
                      <p className="text-xs font-medium text-gray-800 mt-1">
                        {transport.vehicleDetails.driverPhone}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

          {(transport.baggageAllowance ||
            (Array.isArray(transport.amenities) &&
              transport.amenities.length > 0) ||
            transport.cancellationPolicy) && (
            <section>
              <h3 className="text-xs font-semibold text-gray-900 mb-3">
                Service Details
              </h3>
              <div className="space-y-3">
                {transport.baggageAllowance && (
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-[10px] text-gray-400">
                      Baggage Allowance
                    </p>
                    <p className="text-xs font-medium text-gray-800 mt-1">
                      {transport.baggageAllowance}
                    </p>
                  </div>
                )}

                {Array.isArray(transport.amenities) &&
                  transport.amenities.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-400 mb-2">
                        Amenities
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {transport.amenities.map((amenity, index) => (
                          <span
                            key={`${amenity}-${index}`}
                            className="px-2.5 py-1 rounded-full bg-brand-blue-50 text-brand-blue-dark text-[11px] font-medium"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {transport.cancellationPolicy && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
                      Cancellation Policy
                    </p>
                    <p className="text-xs text-gray-600 leading-5">
                      {transport.cancellationPolicy}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {transport.contactPerson &&
            Object.values(transport.contactPerson).some(Boolean) && (
              <section>
                <h3 className="text-xs font-semibold text-gray-900 mb-3">
                  Contact Person
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {transport.contactPerson.name && (
                    <div className="p-3 rounded-lg bg-gray-50 flex items-center gap-2">
                      <FiUser className="text-gray-400" size={13} />
                      <div>
                        <p className="text-[10px] text-gray-400">Name</p>
                        <p className="text-xs font-medium text-gray-800">
                          {transport.contactPerson.name}
                        </p>
                      </div>
                    </div>
                  )}
                  {transport.contactPerson.phone && (
                    <div className="p-3 rounded-lg bg-gray-50 flex items-center gap-2">
                      <FiPhone className="text-gray-400" size={13} />
                      <div>
                        <p className="text-[10px] text-gray-400">Phone</p>
                        <p className="text-xs font-medium text-gray-800">
                          {transport.contactPerson.phone}
                        </p>
                      </div>
                    </div>
                  )}
                  {transport.contactPerson.email && (
                    <div className="p-3 rounded-lg bg-gray-50 flex items-center gap-2 col-span-2">
                      <FiMail className="text-gray-400" size={13} />
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400">Email</p>
                        <p className="text-xs font-medium text-gray-800 truncate">
                          {transport.contactPerson.email}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

          {transport.notes && (
            <section>
              <h3 className="text-xs font-semibold text-gray-900 mb-3">
                Notes
              </h3>
              <p className="text-xs text-gray-600 leading-5 whitespace-pre-wrap">
                {transport.notes}
              </p>
            </section>
          )}
        </div>

        {/* FOOTER — Edit + Use This Transport (Close hata diya) */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex justify-end gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(transport)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-gold-dark bg-brand-gold-50 border border-brand-gold/30 rounded-lg hover:bg-brand-gold-100 transition"
            >
              <FiEdit2 size={14} />
              Edit
            </button>
          )}

          {onSelect && (
            <button
              type="button"
              onClick={() => onSelect(transport)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition shadow-brand"
            >
              <FiCheck size={14} />
              {selectLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}