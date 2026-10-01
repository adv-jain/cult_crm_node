import { useEffect } from "react";
import {
  FiX,
  FiStar,
  FiMapPin,
  FiPhone,
  FiMail,
  FiHome,
  FiClock,
  FiCheck,
  FiEdit2,
} from "react-icons/fi";

export default function HotelView({
  hotel,
  onClose,
  onSelect,
  onEdit,
  selectLabel = "Use This Hotel",
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
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {hotel.name}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  hotel.status === "Active"
                    ? "bg-brand-blue-50 text-brand-blue-dark"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {hotel.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {hotel.code || "No hotel code"}
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
              <FiMapPin className="text-brand-blue mb-2" size={16} />
              <p className="text-[10px] text-gray-400 uppercase font-semibold">
                Destination
              </p>
              <p className="text-xs font-medium text-gray-800 mt-1">
                {hotel.destination || "—"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <FiStar className="text-brand-gold mb-2" size={16} />
              <p className="text-[10px] text-gray-400 uppercase font-semibold">
                Rating
              </p>
              <p className="text-xs font-medium text-gray-800 mt-1">
                {Number(hotel.rating || 0).toFixed(1)} / 5
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <FiClock className="text-brand-blue mb-2" size={16} />
              <p className="text-[10px] text-gray-400 uppercase font-semibold">
                Check-in
              </p>
              <p className="text-xs font-medium text-gray-800 mt-1">
                {hotel.checkInTime || "—"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <FiHome className="text-brand-gold mb-2" size={16} />
              <p className="text-[10px] text-gray-400 uppercase font-semibold">
                Category
              </p>
              <p className="text-xs font-medium text-gray-800 mt-1">
                {hotel.category || "—"}
              </p>
            </div>
          </div>

          {hotel.description && (
            <section>
              <h3 className="text-xs font-semibold text-gray-900 mb-2">
                Description
              </h3>
              <p className="text-sm text-gray-600 leading-6">
                {hotel.description}
              </p>
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold text-gray-900 mb-3">
              Location
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-gray-400 mb-1">City / State</p>
                <p className="font-medium text-gray-800">
                  {[hotel.city, hotel.state].filter(Boolean).join(", ") || "—"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-gray-400 mb-1">Country</p>
                <p className="font-medium text-gray-800">
                  {hotel.country || "—"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 col-span-2">
                <p className="text-gray-400 mb-1">Address</p>
                <p className="font-medium text-gray-800">
                  {hotel.address || "—"}
                </p>
              </div>
            </div>
          </section>

          {Array.isArray(hotel.amenities) && hotel.amenities.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-900 mb-3">
                Amenities
              </h3>
              <div className="flex flex-wrap gap-2">
                {hotel.amenities.map((amenity, index) => (
                  <span
                    key={`${amenity}-${index}`}
                    className="px-2.5 py-1 rounded-full bg-brand-blue-50 text-brand-blue-dark text-[11px] font-medium"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-900">
                Room Types
              </h3>
              <span className="text-[10px] text-gray-400">
                {hotel.roomTypes?.length || 0} room types
              </span>
            </div>

            {hotel.roomTypes?.length ? (
              <div className="space-y-2">
                {hotel.roomTypes.map((room, index) => (
                  <div
                    key={room._id || index}
                    className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/60"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-800">
                          {room.name}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {room.bedType || "Bed type not specified"}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        ₹
                        {Number(room.pricePerNight || 0).toLocaleString(
                          "en-IN"
                        )}
                        <span className="text-[10px] font-normal text-gray-400">
                          /night
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-gray-500">
                      <span>Adults: {room.maxAdults || 0}</span>
                      <span>Children: {room.maxChildren || 0}</span>
                      <span>Available: {room.availableRooms || 0}</span>
                      <span>{room.mealPlan || "Room Only"}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                No room types available.
              </p>
            )}
          </section>

          {hotel.contactPerson &&
            Object.values(hotel.contactPerson).some(Boolean) && (
              <section>
                <h3 className="text-xs font-semibold text-gray-900 mb-3">
                  Contact Person
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-[10px] text-gray-400">Name</p>
                    <p className="text-xs font-medium text-gray-800 mt-1">
                      {hotel.contactPerson.name || "—"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-[10px] text-gray-400">Designation</p>
                    <p className="text-xs font-medium text-gray-800 mt-1">
                      {hotel.contactPerson.designation || "—"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 flex items-center gap-2">
                    <FiPhone className="text-gray-400" size={13} />
                    <span className="text-xs text-gray-700">
                      {hotel.contactPerson.phone || "—"}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 flex items-center gap-2">
                    <FiMail className="text-gray-400" size={13} />
                    <span className="text-xs text-gray-700 truncate">
                      {hotel.contactPerson.email || "—"}
                    </span>
                  </div>
                </div>
              </section>
            )}

          {(hotel.cancellationPolicy ||
            hotel.paymentTerms ||
            hotel.notes) && (
            <section>
              <h3 className="text-xs font-semibold text-gray-900 mb-3">
                Policies & Notes
              </h3>
              <div className="space-y-3">
                {hotel.cancellationPolicy && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
                      Cancellation Policy
                    </p>
                    <p className="text-xs text-gray-600 leading-5">
                      {hotel.cancellationPolicy}
                    </p>
                  </div>
                )}

                {hotel.paymentTerms && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
                      Payment Terms
                    </p>
                    <p className="text-xs text-gray-600 leading-5">
                      {hotel.paymentTerms}
                    </p>
                  </div>
                )}

                {hotel.notes && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
                      Notes
                    </p>
                    <p className="text-xs text-gray-600 leading-5">
                      {hotel.notes}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* FOOTER — Edit + Use This Hotel (Close hata diya) */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex justify-end gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(hotel)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-gold-dark bg-brand-gold-50 border border-brand-gold/30 rounded-lg hover:bg-brand-gold-100 transition"
            >
              <FiEdit2 size={14} />
              Edit
            </button>
          )}

          {onSelect && (
            <button
              type="button"
              onClick={() => onSelect(hotel)}
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