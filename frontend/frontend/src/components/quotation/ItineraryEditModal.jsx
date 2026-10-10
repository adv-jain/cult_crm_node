import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FiAlertCircle,
  FiCalendar,
  FiMapPin,
  FiPlus,
  FiSave,
  FiTrash2,
  FiX,
  FiCoffee,
  FiHome,
  FiTruck,
  FiActivity,
  FiFileText,
  FiPhone,
  FiCheck,
  FiList,
  FiSearch,
  FiChevronDown,
} from "react-icons/fi";
import api from "../../api";
import HotelForm from "../HotelForm";
import TransportForm from "../TransportForm";
import ActivityForm from "../ActivityForm";
import HotelView from "../HotelView";
import TransportView from "../TransportView";
import ViewActivity from "../ViewActivity";

/* =========================================================
   EMPTY DAY
========================================================= */

const emptyDay = (dayNumber) => ({
  dayNumber,
  date: "",
  title: "",
  description: "",
  city: "",
  location: "",
  activities: [],
  hotel: {
    hotel: null,
    name: "",
    city: "",
    rating: null,
    roomType: "",
    checkIn: "",
    checkOut: "",
  },
  transport: {
    transport: null,
    type: "",
    capacity: null,
    pickup: "",
    drop: "",
    departureTime: "",
    arrivalTime: "",
  },
  meals: {
    breakfast: false,
    lunch: false,
    dinner: false,
  },
  freeTime: "",
  notes: "",
});

/* =========================================================
   NORMALIZE DAY
========================================================= */

function normalizeDay(day, index) {
  const activities = Array.isArray(day?.activities) ? day.activities : [];

  const hotelRaw = day?.hotel?.hotel;
  const hotelObj =
    hotelRaw && typeof hotelRaw === "object" ? hotelRaw : null;

  const trRaw = Array.isArray(day?.transport)
    ? day.transport[0] || {}
    : day?.transport || {};

  const trObj =
    trRaw?.transport && typeof trRaw.transport === "object"
      ? trRaw.transport
      : null;

  return {
    dayNumber: Number(day?.dayNumber || index + 1),
    date: day?.date ? String(day.date).slice(0, 10) : "",
    title: day?.title || "",
    description: day?.description || "",
    city: day?.city || "",
    location: day?.location || "",
    activities: activities
      .map((activity) => {
        if (typeof activity === "string") {
          return activity ? { _id: null, name: activity } : null;
        }
        if (activity && typeof activity === "object") {
          return {
            _id: activity?._id || null,
            name:
              activity?.name ||
              activity?.title ||
              activity?.activityName ||
              "",
          };
        }
        return null;
      })
      .filter(Boolean),
    hotel: {
      hotel: hotelObj?._id || day?.hotel?.hotel || null,
      name: day?.hotel?.name || hotelObj?.name || "",
      city:
        day?.hotel?.city ||
        hotelObj?.city ||
        hotelObj?.destination ||
        "",
      rating: day?.hotel?.rating ?? hotelObj?.rating ?? null,
      roomType: day?.hotel?.roomType || "",
      checkIn: day?.hotel?.checkIn
        ? String(day.hotel.checkIn).slice(0, 10)
        : "",
      checkOut: day?.hotel?.checkOut
        ? String(day.hotel.checkOut).slice(0, 10)
        : "",
    },
    transport: {
      transport: trRaw?.transport?._id || trRaw?.transport || null,
      type:
        trRaw?.type ||
        trObj?.type ||
        trObj?.name ||
        trObj?.title ||
        "",
      capacity:
        trRaw?.capacity ??
        trObj?.vehicleDetails?.capacity ??
        null,
      pickup: trRaw?.from || trRaw?.pickup || "",
      drop: trRaw?.to || trRaw?.drop || "",
      departureTime: trRaw?.departureTime || "",
      arrivalTime: trRaw?.arrivalTime || "",
    },
    meals: {
      breakfast: Boolean(day?.meals?.breakfast),
      lunch: Boolean(day?.meals?.lunch),
      dinner: Boolean(day?.meals?.dinner),
    },
    freeTime: day?.freeTime || "",
    notes: day?.notes || "",
  };
}

/* =========================================================
   SECTION CARD
========================================================= */

function SectionCard({
  icon,
  iconColor = "blue",
  title,
  description,
  right,
  children,
}) {
  const colorMap = {
    blue: "bg-brand-blue-50 text-brand-blue",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-brand-gold-50 text-brand-gold-dark",
    pink: "bg-pink-50 text-pink-600",
    indigo: "bg-indigo-50 text-indigo-600",
    cyan: "bg-cyan-50 text-cyan-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
              colorMap[iconColor] || colorMap.blue
            }`}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <h3 className="text-xs font-bold text-gray-900 tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-[10px] text-gray-500 truncate">
                {description}
              </p>
            )}
          </div>
        </div>

        {right}
      </div>

      <div className="p-4">{children}</div>
    </section>
  );
}

/* =========================================================
   FIELD / INPUT / TEXTAREA
========================================================= */

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs text-gray-800 outline-none placeholder:text-gray-400 transition focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10 ${className}`}
    />
  );
}

function Textarea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none placeholder:text-gray-400 resize-none transition focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10 ${className}`}
    />
  );
}

/* =========================================================
   SEARCHABLE DROPDOWN
========================================================= */

function SearchableDropdown({
  items = [],
  value = null,
  onChange,
  placeholder = "Search...",
  getLabel = (item) => item?.name || item?.title || "Unnamed",
  getKey = (item) => item?._id || item?.id || getLabel(item),
  disabled = false,
  loading = false,
  emptyText = "No items found",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const selectedItem = items.find((item) => {
    if (!value) return false;
    return (
      String(item?._id) === String(value) ||
      String(item?.id) === String(value)
    );
  });

  const filtered = items.filter((item) => {
    if (!query.trim()) return true;
    const label = String(getLabel(item)).toLowerCase();
    return label.includes(query.toLowerCase());
  });

  useEffect(() => {
    setHighlighted(0);
  }, [query, open]);

  const handleSelect = (item) => {
    onChange?.(item);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((prev) =>
        prev < filtered.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) handleSelect(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs text-left outline-none transition focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10 flex items-center justify-between gap-2 ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <span
          className={`truncate ${
            selectedItem ? "text-gray-800" : "text-gray-400"
          }`}
        >
          {selectedItem ? getLabel(selectedItem) : placeholder}
        </span>
        <FiChevronDown
          size={13}
          className={`shrink-0 text-gray-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <FiSearch size={12} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              className="h-6 w-full border-0 bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-400"
            />
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {loading ? (
              <div className="px-3 py-3 text-center text-[11px] text-gray-400">
                Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-3 text-center text-[11px] text-gray-400">
                {items.length === 0 ? emptyText : "No matches found"}
              </div>
            ) : (
              filtered.map((item, index) => {
                const isSelected =
                  value &&
                  (String(item?._id) === String(value) ||
                    String(item?.id) === String(value));
                const isHighlighted = index === highlighted;

                return (
                  <button
                    key={getKey(item) + "-" + index}
                    type="button"
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => handleSelect(item)}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition ${
                      isHighlighted ? "bg-brand-blue-50" : "bg-white"
                    }`}
                  >
                    <span className="truncate text-gray-800">
                      {getLabel(item)}
                    </span>
                    {isSelected && (
                      <FiCheck size={12} className="text-brand-blue shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function ItineraryEditModal({
  open,
  itinerary,
  saving = false,
  error = "",
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(null);

  const [hotels, setHotels] = useState([]);
  const [transports, setTransports] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  /* Activity CRM dropdown data */
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [trips, setTrips] = useState([]);

  /* Hotel modals */
  const [showAddHotelForm, setShowAddHotelForm] = useState(false);
  const [showEditHotelForm, setShowEditHotelForm] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [previewHotel, setPreviewHotel] = useState(null);

  /* Transport modals */
  const [showAddTransportForm, setShowAddTransportForm] = useState(false);
  const [showEditTransportForm, setShowEditTransportForm] = useState(false);
  const [editingTransport, setEditingTransport] = useState(null);
  const [previewTransport, setPreviewTransport] = useState(null);

  /* Activity modals */
  const [showAddActivityForm, setShowAddActivityForm] = useState(false);
  const [showEditActivityForm, setShowEditActivityForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [previewActivity, setPreviewActivity] = useState(null);

  /* Preview tracking (shared day index) */
  const [previewDayIndex, setPreviewDayIndex] = useState(null);
  const [previewActivityIndex, setPreviewActivityIndex] = useState(null);

  /* =========================================================
     FETCH OPTIONS
  ========================================================= */
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const fetchAll = async () => {
      setLoadingOptions(true);

      const safeGet = async (url) => {
        try {
          const res = await api.get(url);
          const data = res?.data;
          if (Array.isArray(data)) return data;
          if (Array.isArray(data?.data)) return data.data;
          if (Array.isArray(data?.hotels)) return data.hotels;
          if (Array.isArray(data?.transports)) return data.transports;
          if (Array.isArray(data?.activities)) return data.activities;
          if (Array.isArray(data?.results)) return data.results;
          return [];
        } catch (err) {
          console.warn(`Failed to load ${url}`, err?.message);
          return [];
        }
      };

      const [
        hotelsRes,
        transportsRes,
        activitiesRes,
        leadsRes,
        contactsRes,
        companiesRes,
        tripsRes,
      ] = await Promise.all([
        safeGet("/hotels"),
        safeGet("/transports"),
        safeGet("/activities"),
        safeGet("/leads"),
        safeGet("/contacts"),
        safeGet("/companies"),
        safeGet("/trips"),
      ]);

      if (cancelled) return;

      setHotels(hotelsRes);
      setTransports(transportsRes);
      setActivities(activitiesRes);
      setLeads(leadsRes);
      setContacts(contactsRes);
      setCompanies(companiesRes);
      setTrips(tripsRes);
      setLoadingOptions(false);
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [open]);

  /* =========================================================
     LOAD ITINERARY
  ========================================================= */
  useEffect(() => {
    if (!open || !itinerary) {
      setForm(null);
      return;
    }

    const normalizedDays =
      Array.isArray(itinerary.days) && itinerary.days.length > 0
        ? itinerary.days.map(normalizeDay)
        : [emptyDay(1)];

    setForm({
      title: itinerary.title || "",
      destination: itinerary.destination || "",
      startDate: itinerary.startDate
        ? String(itinerary.startDate).slice(0, 10)
        : "",
      endDate: itinerary.endDate
        ? String(itinerary.endDate).slice(0, 10)
        : "",
      days: normalizedDays,
      inclusions: Array.isArray(itinerary.inclusions)
        ? [...itinerary.inclusions]
        : [],
      exclusions: Array.isArray(itinerary.exclusions)
        ? [...itinerary.exclusions]
        : [],
      importantNotes: Array.isArray(itinerary.importantNotes)
        ? [...itinerary.importantNotes]
        : [],
      emergencyContact: {
        name: itinerary.emergencyContact?.name || "",
        phone: itinerary.emergencyContact?.phone || "",
        relation: itinerary.emergencyContact?.relation || "",
      },
      notes: itinerary.notes || "",
    });
  }, [open, itinerary]);

  if (!open || !form) return null;

  /* =======================================================
     FORM UPDATERS
  ======================================================= */

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateDay = (dayIndex, field, value) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.map((day, index) =>
        index === dayIndex ? { ...day, [field]: value } : day
      ),
    }));
  };

  const updateDayNested = (dayIndex, section, field, value) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              [section]: { ...(day[section] || {}), [field]: value },
            }
          : day
      ),
    }));
  };

  const addDay = () => {
    setForm((prev) => ({
      ...prev,
      days: [...prev.days, emptyDay(prev.days.length + 1)],
    }));
  };

  const removeDay = (dayIndex) => {
    if (form.days.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      days: prev.days
        .filter((_, index) => index !== dayIndex)
        .map((day, index) => ({ ...day, dayNumber: index + 1 })),
    }));
  };

  const updateArrayItem = (field, index, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].map((item, itemIndex) =>
        itemIndex === index ? value : item
      ),
    }));
  };

  const addArrayItem = (field) => {
    setForm((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  };

  const removeArrayItem = (field, index) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  /* ---------------- ACTIVITY HELPERS ---------------- */

  const removeActivity = (dayIndex, activityIndex) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              activities: (day.activities || []).filter(
                (_, i) => i !== activityIndex
              ),
            }
          : day
      ),
    }));
  };

  /* =======================================================
     HOTEL / TRANSPORT HANDLERS
  ======================================================= */

  const handleNewHotelSaved = (newHotel) => {
    if (!newHotel) return;

    setHotels((prev) => {
      const exists = prev.some((h) => String(h._id) === String(newHotel._id));
      return exists ? prev : [newHotel, ...prev];
    });

    setForm((prev) => ({
      ...prev,
      days: prev.days.map((day) => {
        const isEmpty = !day.hotel?.hotel && !day.hotel?.name?.trim();
        if (!isEmpty) return day;
        return {
          ...day,
          hotel: {
            ...day.hotel,
            hotel: newHotel._id,
            name: newHotel.name || "",
            city: newHotel.city || newHotel.destination || "",
            rating: newHotel.rating ?? null,
          },
        };
      }),
    }));

    setShowAddHotelForm(false);
  };

  const handleNewTransportSaved = (newTransport) => {
    if (!newTransport) return;

    setTransports((prev) => {
      const exists = prev.some(
        (t) => String(t._id) === String(newTransport._id)
      );
      return exists ? prev : [newTransport, ...prev];
    });

    setForm((prev) => ({
      ...prev,
      days: prev.days.map((day) => {
        const isEmpty =
          !day.transport?.transport && !day.transport?.type?.trim();
        if (!isEmpty) return day;
        return {
          ...day,
          transport: {
            ...day.transport,
            transport: newTransport._id,
            type:
              newTransport.name ||
              newTransport.type ||
              newTransport.title ||
              "",
            capacity:
              newTransport.vehicleDetails?.capacity ??
              newTransport.capacity ??
              null,
          },
        };
      }),
    }));

    setShowAddTransportForm(false);
  };

  const handleUpdatedHotelSaved = (updatedHotel) => {
    if (!updatedHotel) return;

    setHotels((prev) =>
      prev.map((h) =>
        String(h._id) === String(updatedHotel._id) ? updatedHotel : h
      )
    );

    setForm((prev) => ({
      ...prev,
      days: prev.days.map((day) => {
        if (String(day.hotel?.hotel) !== String(updatedHotel._id)) {
          return day;
        }
        return {
          ...day,
          hotel: {
            ...day.hotel,
            name: updatedHotel.name || day.hotel?.name || "",
            city:
              updatedHotel.city ||
              updatedHotel.destination ||
              day.hotel?.city ||
              "",
            rating: updatedHotel.rating ?? day.hotel?.rating ?? null,
          },
        };
      }),
    }));

    setPreviewHotel(updatedHotel);
    setShowEditHotelForm(false);
    setEditingHotel(null);
  };

  const handleUpdatedTransportSaved = (updatedTransport) => {
    if (!updatedTransport) return;

    setTransports((prev) =>
      prev.map((t) =>
        String(t._id) === String(updatedTransport._id)
          ? updatedTransport
          : t
      )
    );

    setForm((prev) => ({
      ...prev,
      days: prev.days.map((day) => {
        if (
          String(day.transport?.transport) !== String(updatedTransport._id)
        ) {
          return day;
        }
        return {
          ...day,
          transport: {
            ...day.transport,
            type:
              updatedTransport.name ||
              updatedTransport.type ||
              day.transport?.type ||
              "",
            capacity:
              updatedTransport.vehicleDetails?.capacity ??
              updatedTransport.capacity ??
              day.transport?.capacity ??
              null,
          },
        };
      }),
    }));

    setPreviewTransport(updatedTransport);
    setShowEditTransportForm(false);
    setEditingTransport(null);
  };

  const handleHotelPreviewConfirm = (hotel) => {
    if (!hotel || previewDayIndex === null) return;

    updateDayNested(previewDayIndex, "hotel", "hotel", hotel._id);
    updateDayNested(previewDayIndex, "hotel", "name", hotel.name || "");
    updateDayNested(
      previewDayIndex,
      "hotel",
      "city",
      hotel.city || hotel.destination || ""
    );
    updateDayNested(
      previewDayIndex,
      "hotel",
      "rating",
      hotel.rating ?? null
    );

    setPreviewHotel(null);
    setPreviewDayIndex(null);
  };

  const handleTransportPreviewConfirm = (transport) => {
    if (!transport || previewDayIndex === null) return;

    updateDayNested(previewDayIndex, "transport", "transport", transport._id);
    updateDayNested(
      previewDayIndex,
      "transport",
      "type",
      transport.name || transport.type || transport.title || ""
    );
    updateDayNested(
      previewDayIndex,
      "transport",
      "capacity",
      transport.vehicleDetails?.capacity ?? transport.capacity ?? null
    );

    setPreviewTransport(null);
    setPreviewDayIndex(null);
  };

  /* =======================================================
     ACTIVITY HANDLERS
  ======================================================= */

  const handleNewActivitySaved = (newActivity) => {
    if (!newActivity) return;

    setActivities((prev) => {
      const exists = prev.some(
        (a) => String(a._id) === String(newActivity._id)
      );
      return exists ? prev : [newActivity, ...prev];
    });

    setForm((prev) => ({
      ...prev,
      days: prev.days.map((day) => {
        const dayActs = Array.isArray(day.activities) ? day.activities : [];
        return {
          ...day,
          activities: [
            ...dayActs,
            {
              _id: newActivity._id,
              name:
                newActivity.name ||
                newActivity.title ||
                newActivity.activityName ||
                "",
            },
          ],
        };
      }),
    }));

    setShowAddActivityForm(false);
  };

  const handleUpdatedActivitySaved = (updatedActivity) => {
    if (!updatedActivity) return;

    setActivities((prev) =>
      prev.map((a) =>
        String(a._id) === String(updatedActivity._id) ? updatedActivity : a
      )
    );

    setForm((prev) => ({
      ...prev,
      days: prev.days.map((day) => ({
        ...day,
        activities: (day.activities || []).map((act) =>
          typeof act === "object" &&
          String(act._id) === String(updatedActivity._id)
            ? {
                ...act,
                name:
                  updatedActivity.name ||
                  updatedActivity.title ||
                  act.name ||
                  "",
              }
            : act
        ),
      })),
    }));

    setPreviewActivity(updatedActivity);
    setShowEditActivityForm(false);
    setEditingActivity(null);
  };

  const handleActivityPreviewConfirm = (activity) => {
    if (!activity || previewDayIndex === null) return;

    const newActivity = {
      _id: activity._id,
      name:
        activity.name ||
        activity.title ||
        activity.activityName ||
        "",
    };

    setForm((prev) => ({
      ...prev,
      days: prev.days.map((d, idx) => {
        if (idx !== previewDayIndex) return d;
        const acts = Array.isArray(d.activities) ? [...d.activities] : [];

        const isDuplicate = acts.some(
          (a) =>
            typeof a === "object" &&
            String(a._id) === String(activity._id)
        );
        if (isDuplicate) return d;

        if (previewActivityIndex !== null) {
          acts[previewActivityIndex] = newActivity;
        } else {
          acts.push(newActivity);
        }
        return { ...d, activities: acts };
      }),
    }));

    setPreviewActivity(null);
    setPreviewDayIndex(null);
    setPreviewActivityIndex(null);
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (event) => {
    event?.preventDefault();
    if (saving) return;

    const cleanedDays = form.days.map((day, index) => {
      const hotelPayload = {
        hotel: day.hotel?.hotel || null,
        name: day.hotel?.name?.trim() || "",
        city: day.hotel?.city?.trim() || "",
        rating: day.hotel?.rating ?? null,
        roomType: day.hotel?.roomType || "",
        checkIn: day.hotel?.checkIn || "",
        checkOut: day.hotel?.checkOut || "",
      };

      const hasTransport =
        day.transport?.transport || day.transport?.type?.trim();

      const transportPayload = hasTransport
        ? [
            {
              transport: day.transport?.transport || null,
              type: day.transport?.type?.trim() || "",
              capacity: day.transport?.capacity ?? null,
              from: day.transport?.pickup?.trim() || "",
              to: day.transport?.drop?.trim() || "",
              departureTime: day.transport?.departureTime || "",
              arrivalTime: day.transport?.arrivalTime || "",
            },
          ]
        : [];

      const activityPayload = Array.isArray(day.activities)
        ? day.activities
            .map((act) => {
              if (typeof act === "string") {
                return act.trim() ? { name: act.trim() } : null;
              }
              if (act && typeof act === "object") {
                const name = act.name || act.title || "";
                if (!name) return null;
                return {
                  ...(act._id ? { _id: act._id } : {}),
                  name,
                };
              }
              return null;
            })
            .filter(Boolean)
        : [];

      return {
        dayNumber: index + 1,
        date: day.date || null,
        title: day.title?.trim() || `Day ${index + 1}`,
        description: day.description?.trim() || "",
        city: day.city?.trim() || "",
        location: day.location?.trim() || "",
        activities: activityPayload,
        hotel: hotelPayload,
        transport: transportPayload,
        meals: [],
        freeTime: day.freeTime?.trim() || "",
        notes: day.notes?.trim() || "",
      };
    });

    const payload = {
      title: form.title.trim(),
      destination: form.destination.trim(),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      days: cleanedDays,
      inclusions: form.inclusions
        .map((item) => String(item || "").trim())
        .filter(Boolean),
      exclusions: form.exclusions
        .map((item) => String(item || "").trim())
        .filter(Boolean),
      importantNotes: form.importantNotes
        .map((item) => String(item || "").trim())
        .filter(Boolean),
      emergencyContact: {
        name: form.emergencyContact.name.trim(),
        phone: form.emergencyContact.phone.trim(),
        relation: form.emergencyContact.relation.trim(),
      },
      notes: form.notes.trim(),
    };

    await onSave(payload);
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/50 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="relative shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-blue to-brand-blue-light" />
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 right-16 h-20 w-20 rounded-full bg-white/5" />

          <div className="relative flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm shrink-0">
                <FiMapPin size={18} className="text-white" />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight text-white">
                  Edit Itinerary
                </h2>
                <p className="mt-0.5 text-[11px] text-blue-100">
                  Update your day-wise travel plan
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50 shrink-0"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* ERROR */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                <FiAlertCircle size={15} className="mt-0.5 shrink-0" />
                <span className="pt-0.5">{error}</span>
              </div>
            )}

            {/* BASIC DETAILS */}
            <SectionCard
              icon={<FiMapPin size={15} />}
              iconColor="blue"
              title="Itinerary Details"
              description="Basic information about the trip"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Title" className="lg:col-span-2">
                  <Input
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    placeholder="Manali Family Trip"
                  />
                </Field>

                <Field label="Destination">
                  <Input
                    value={form.destination}
                    onChange={(e) => updateForm("destination", e.target.value)}
                    placeholder="Manali"
                  />
                </Field>

                <Field label="Start Date">
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateForm("startDate", e.target.value)}
                  />
                </Field>

                <Field label="End Date">
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => updateForm("endDate", e.target.value)}
                  />
                </Field>
              </div>
            </SectionCard>

            {/* DAYS */}
            <SectionCard
              icon={<FiCalendar size={15} />}
              iconColor="purple"
              title="Day-wise Itinerary"
              description={`${form.days.length} day${
                form.days.length === 1 ? "" : "s"
              } planned`}
              right={
                <button
                  type="button"
                  onClick={addDay}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-blue bg-brand-blue-50 hover:bg-brand-blue-100 rounded-lg transition"
                >
                  <FiPlus size={12} />
                  Add Day
                </button>
              }
            >
              <div className="space-y-3">
                {form.days.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/40"
                  >
                    {/* DAY HEADER */}
                    <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gradient-to-r from-brand-blue-50/60 to-white px-4 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue to-brand-blue-light text-white text-[11px] font-bold shrink-0">
                          {dayIndex + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            Day {dayIndex + 1}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {day.title || "Untitled day"}
                          </p>
                        </div>
                      </div>

                      {form.days.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDay(dayIndex)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition shrink-0"
                          title="Remove day"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* DAY BODY */}
                    <div className="p-4 space-y-4">
                      {/* BASIC INFO */}
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <Field label="Date">
                          <Input
                            type="date"
                            value={day.date}
                            onChange={(e) =>
                              updateDay(dayIndex, "date", e.target.value)
                            }
                          />
                        </Field>

                        <Field label="Day Title" className="lg:col-span-2">
                          <Input
                            value={day.title}
                            onChange={(e) =>
                              updateDay(dayIndex, "title", e.target.value)
                            }
                            placeholder="Arrival & Local Sightseeing"
                          />
                        </Field>

                        <Field label="City">
                          <Input
                            value={day.city}
                            onChange={(e) =>
                              updateDay(dayIndex, "city", e.target.value)
                            }
                            placeholder="Manali"
                          />
                        </Field>

                        <Field
                          label="Location"
                          className="md:col-span-2 lg:col-span-4"
                        >
                          <Input
                            value={day.location}
                            onChange={(e) =>
                              updateDay(dayIndex, "location", e.target.value)
                            }
                            placeholder="Mall Road, Manali"
                          />
                        </Field>

                        <Field
                          label="Description"
                          className="md:col-span-2 lg:col-span-4"
                        >
                          <Textarea
                            rows={3}
                            value={day.description}
                            onChange={(e) =>
                              updateDay(
                                dayIndex,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Describe the day's plan..."
                          />
                        </Field>
                      </div>

                      {/* ============ ACTIVITIES ============ */}
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <FiActivity size={12} className="text-brand-blue" />
                            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-600">
                              Activities
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowAddActivityForm(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold text-brand-blue bg-brand-blue-50 hover:bg-brand-blue-100 border border-brand-blue/20 transition"
                          >
                            <FiPlus size={11} />
                            Add New
                          </button>
                        </div>

                        {/* Selected activities list */}
                        <div className="space-y-2">
                          {(day.activities || []).length === 0 && (
                            <p className="text-[11px] text-gray-400">
                              No activities added.
                            </p>
                          )}

                          {(day.activities || []).map(
                            (activity, activityIndex) => {
                              const activityId =
                                typeof activity === "object"
                                  ? activity._id
                                  : null;
                              const activityName =
                                typeof activity === "string"
                                  ? activity
                                  : activity?.name || "Unnamed activity";

                              return (
                                <div
                                  key={activityIndex}
                                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                                >
                                  <FiActivity
                                    size={12}
                                    className="text-brand-blue shrink-0"
                                  />
                                  <span className="flex-1 truncate text-xs text-gray-800">
                                    {activityName}
                                  </span>

                                  {activityId && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const full = activities.find(
                                          (a) =>
                                            String(a._id) ===
                                            String(activityId)
                                        );
                                        if (full) {
                                          setEditingActivity(full);
                                          setShowEditActivityForm(true);
                                        }
                                      }}
                                      className="w-7 h-7 shrink-0 rounded-lg border border-gray-200 text-gray-400 hover:text-brand-blue hover:bg-brand-blue-50 transition"
                                      title="Edit activity"
                                    >
                                      <FiFileText
                                        size={12}
                                        className="mx-auto"
                                      />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeActivity(dayIndex, activityIndex)
                                    }
                                    className="w-7 h-7 shrink-0 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                                    title="Remove activity"
                                  >
                                    <FiTrash2 size={12} className="mx-auto" />
                                  </button>
                                </div>
                              );
                            }
                          )}
                        </div>

                        {/* Dropdown to pick existing activity */}
                        <div className="mt-2">
                          <Field label="Add From Existing">
                            <SearchableDropdown
                              items={activities}
                              value={null}
                              loading={loadingOptions}
                              placeholder="Search activities..."
                              emptyText="No activities available"
                              getLabel={(item) =>
                                item?.name ||
                                item?.title ||
                                item?.activityName ||
                                "Unnamed activity"
                              }
                              onChange={(item) => {
                                if (!item) return;
                                setPreviewActivity(item);
                                setPreviewDayIndex(dayIndex);
                                setPreviewActivityIndex(null);
                              }}
                            />
                          </Field>
                        </div>
                      </div>

                      {/* ============ HOTEL ============ */}
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <FiHome size={12} className="text-brand-gold" />
                            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-600">
                              Hotel
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowAddHotelForm(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold text-brand-blue bg-brand-blue-50 hover:bg-brand-blue-100 border border-brand-blue/20 transition"
                          >
                            <FiPlus size={11} />
                            Add New
                          </button>
                        </div>

                        <Field label="Hotel">
                          <SearchableDropdown
                            items={hotels}
                            value={day.hotel?.hotel}
                            loading={loadingOptions}
                            placeholder="Search hotels..."
                            emptyText="No hotels available"
                            getLabel={(item) =>
                              item?.name || item?.title || "Unnamed hotel"
                            }
                            onChange={(item) => {
                              updateDayNested(
                                dayIndex,
                                "hotel",
                                "hotel",
                                item?._id || null
                              );
                              updateDayNested(
                                dayIndex,
                                "hotel",
                                "name",
                                item?.name || ""
                              );
                              updateDayNested(
                                dayIndex,
                                "hotel",
                                "city",
                                item?.city || item?.destination || ""
                              );
                              updateDayNested(
                                dayIndex,
                                "hotel",
                                "rating",
                                item?.rating ?? null
                              );
                              setPreviewHotel(item);
                              setPreviewDayIndex(dayIndex);
                            }}
                          />
                        </Field>
                      </div>

                      {/* ============ TRANSPORT ============ */}
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <FiTruck size={12} className="text-brand-blue" />
                            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-600">
                              Transport
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowAddTransportForm(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold text-brand-blue bg-brand-blue-50 hover:bg-brand-blue-100 border border-brand-blue/20 transition"
                          >
                            <FiPlus size={11} />
                            Add New
                          </button>
                        </div>

                        <Field label="Transport">
                          <SearchableDropdown
                            items={transports}
                            value={day.transport?.transport}
                            loading={loadingOptions}
                            placeholder="Search transport..."
                            emptyText="No transports available"
                            getLabel={(item) =>
                              item?.name ||
                              item?.type ||
                              item?.title ||
                              "Unnamed"
                            }
                            onChange={(item) => {
                              updateDayNested(
                                dayIndex,
                                "transport",
                                "transport",
                                item?._id || null
                              );
                              updateDayNested(
                                dayIndex,
                                "transport",
                                "type",
                                item?.name ||
                                  item?.type ||
                                  item?.title ||
                                  ""
                              );
                              updateDayNested(
                                dayIndex,
                                "transport",
                                "capacity",
                                item?.vehicleDetails?.capacity ??
                                  item?.capacity ??
                                  null
                              );
                              setPreviewTransport(item);
                              setPreviewDayIndex(dayIndex);
                            }}
                          />
                        </Field>
                      </div>

                      {/* ============ MEALS ============ */}
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <FiCoffee size={12} className="text-brand-gold" />
                          <span className="text-[11px] font-bold uppercase tracking-wide text-gray-600">
                            Meals
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {[
                            ["breakfast", "Breakfast"],
                            ["lunch", "Lunch"],
                            ["dinner", "Dinner"],
                          ].map(([key, label]) => {
                            const isChecked = Boolean(day.meals?.[key]);

                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() =>
                                  updateDayNested(
                                    dayIndex,
                                    "meals",
                                    key,
                                    !isChecked
                                  )
                                }
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                                  isChecked
                                    ? "bg-brand-gold-50 text-brand-gold-dark border-brand-gold/30"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-brand-gold/30 hover:bg-brand-gold-50/40"
                                }`}
                              >
                                {isChecked && <FiCheck size={11} />}
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ============ FREE TIME + NOTES ============ */}
                      <div className="grid grid-cols-1 gap-3 border-t border-gray-200 pt-4 md:grid-cols-2">
                        <Field label="Free Time">
                          <Textarea
                            rows={2}
                            value={day.freeTime}
                            onChange={(e) =>
                              updateDay(dayIndex, "freeTime", e.target.value)
                            }
                            placeholder="Evening free for leisure..."
                          />
                        </Field>

                        <Field label="Day Notes">
                          <Textarea
                            rows={2}
                            value={day.notes}
                            onChange={(e) =>
                              updateDay(dayIndex, "notes", e.target.value)
                            }
                            placeholder="Any special instructions..."
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* INCLUSIONS / EXCLUSIONS */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard
                icon={<FiList size={15} />}
                iconColor="green"
                title="Inclusions"
                description="What's covered in the itinerary"
              >
                <ArrayEditor
                  title=""
                  items={form.inclusions}
                  field="inclusions"
                  onAdd={addArrayItem}
                  onChange={updateArrayItem}
                  onRemove={removeArrayItem}
                  placeholder="Breakfast included"
                />
              </SectionCard>

              <SectionCard
                icon={<FiX size={15} />}
                iconColor="red"
                title="Exclusions"
                description="What's not included"
              >
                <ArrayEditor
                  title=""
                  items={form.exclusions}
                  field="exclusions"
                  onAdd={addArrayItem}
                  onChange={updateArrayItem}
                  onRemove={removeArrayItem}
                  placeholder="Personal expenses"
                />
              </SectionCard>
            </div>

            {/* IMPORTANT NOTES */}
            <SectionCard
              icon={<FiAlertCircle size={15} />}
              iconColor="amber"
              title="Important Notes"
              description="Key information for travellers"
            >
              <ArrayEditor
                title=""
                items={form.importantNotes}
                field="importantNotes"
                onAdd={addArrayItem}
                onChange={updateArrayItem}
                onRemove={removeArrayItem}
                placeholder="Carry valid ID proof"
              />
            </SectionCard>

            {/* EMERGENCY CONTACT */}
            <SectionCard
              icon={<FiPhone size={15} />}
              iconColor="pink"
              title="Emergency Contact"
              description="Point of contact during travel"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Contact Name">
                  <Input
                    value={form.emergencyContact.name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        emergencyContact: {
                          ...prev.emergencyContact,
                          name: e.target.value,
                        },
                      }))
                    }
                    placeholder="Contact name"
                  />
                </Field>

                <Field label="Phone">
                  <Input
                    value={form.emergencyContact.phone}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        emergencyContact: {
                          ...prev.emergencyContact,
                          phone: e.target.value,
                        },
                      }))
                    }
                    placeholder="+91 9876543210"
                  />
                </Field>

                <Field label="Relation">
                  <Input
                    value={form.emergencyContact.relation}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        emergencyContact: {
                          ...prev.emergencyContact,
                          relation: e.target.value,
                        },
                      }))
                    }
                    placeholder="Brother / Friend"
                  />
                </Field>
              </div>
            </SectionCard>

            {/* GENERAL NOTES */}
            <SectionCard
              icon={<FiFileText size={15} />}
              iconColor="indigo"
              title="General Notes"
              description="Any other information for the traveller"
            >
              <Textarea
                rows={4}
                value={form.notes}
                onChange={(e) => updateForm("notes", e.target.value)}
                placeholder="General itinerary notes..."
              />
            </SectionCard>
          </div>

          {/* FOOTER */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-brand-blue-50/30 px-5 py-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-blue-dark hover:shadow-brand-lg disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave size={14} />
                  Save Itinerary
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ============ ADD NEW HOTEL ============ */}
      {showAddHotelForm && (
        <HotelForm
          hotel={null}
          onClose={() => setShowAddHotelForm(false)}
          onSuccess={handleNewHotelSaved}
        />
      )}

      {/* ============ ADD NEW TRANSPORT ============ */}
      {showAddTransportForm && (
        <TransportForm
          transport={null}
          onClose={() => setShowAddTransportForm(false)}
          onSuccess={handleNewTransportSaved}
        />
      )}

      {/* ============ ADD NEW ACTIVITY ============ */}
      {showAddActivityForm && (
        <ActivityForm
          editingActivity={null}
          leads={leads}
          contacts={contacts}
          companies={companies}
          trips={trips}
          onClose={() => setShowAddActivityForm(false)}
          onSaved={handleNewActivitySaved}
        />
      )}

      {/* ============ EDIT HOTEL ============ */}
      {showEditHotelForm && editingHotel && (
        <HotelForm
          hotel={editingHotel}
          onClose={() => {
            setShowEditHotelForm(false);
            setEditingHotel(null);
          }}
          onSuccess={handleUpdatedHotelSaved}
        />
      )}

      {/* ============ EDIT TRANSPORT ============ */}
      {showEditTransportForm && editingTransport && (
        <TransportForm
          transport={editingTransport}
          onClose={() => {
            setShowEditTransportForm(false);
            setEditingTransport(null);
          }}
          onSuccess={handleUpdatedTransportSaved}
        />
      )}

      {/* ============ EDIT ACTIVITY ============ */}
      {showEditActivityForm && editingActivity && (
        <ActivityForm
          editingActivity={editingActivity}
          leads={leads}
          contacts={contacts}
          companies={companies}
          trips={trips}
          onClose={() => {
            setShowEditActivityForm(false);
            setEditingActivity(null);
          }}
          onSaved={handleUpdatedActivitySaved}
        />
      )}

      {/* ============ PREVIEW HOTEL ============ */}
      {previewHotel && (
        <HotelView
          hotel={previewHotel}
          onClose={() => {
            setPreviewHotel(null);
            setPreviewDayIndex(null);
          }}
          onSelect={handleHotelPreviewConfirm}
          onEdit={(hotel) => {
            setPreviewHotel(null);
            setEditingHotel(hotel);
            setShowEditHotelForm(true);
          }}
          selectLabel="Use This Hotel"
        />
      )}

      {/* ============ PREVIEW TRANSPORT ============ */}
      {previewTransport && (
        <TransportView
          transport={previewTransport}
          onClose={() => {
            setPreviewTransport(null);
            setPreviewDayIndex(null);
          }}
          onSelect={handleTransportPreviewConfirm}
          onEdit={(transport) => {
            setPreviewTransport(null);
            setEditingTransport(transport);
            setShowEditTransportForm(true);
          }}
          selectLabel="Use This Transport"
        />
      )}

      {/* ============ PREVIEW ACTIVITY ============ */}
      {previewActivity && (
        <ViewActivity
          activity={previewActivity}
          onClose={() => {
            setPreviewActivity(null);
            setPreviewDayIndex(null);
            setPreviewActivityIndex(null);
          }}
          onSelect={handleActivityPreviewConfirm}
          onEdit={(activity) => {
            setPreviewActivity(null);
            setEditingActivity(activity);
            setShowEditActivityForm(true);
          }}
          selectLabel="Use This Activity"
        />
      )}
    </div>,
    document.body
  );
}

/* =========================================================
   ARRAY EDITOR
========================================================= */

function ArrayEditor({
  title,
  items,
  field,
  onAdd,
  onChange,
  onRemove,
  placeholder,
}) {
  return (
    <div>
      {title && (
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold uppercase tracking-wide text-gray-600">
            {title}
          </label>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-[11px] text-gray-400 py-1">No items added.</p>
        )}

        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={item}
              onChange={(e) => onChange(field, index, e.target.value)}
              placeholder={placeholder}
            />

            <button
              type="button"
              onClick={() => onRemove(field, index)}
              className="w-9 shrink-0 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
            >
              <FiTrash2 size={13} className="mx-auto" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onAdd(field)}
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-blue hover:text-brand-blue-dark"
      >
        <FiPlus size={11} />
        Add Item
      </button>
    </div>
  );
}