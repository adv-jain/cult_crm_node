
/* =========================================================
   STATUS OPTIONS
========================================================= */

export const STATUS_OPTIONS = [
  "Draft",
  "Prepared",
  "Sent",
  "Viewed",
  "Negotiation",
  "Accepted",
  "Rejected",
  "Expired",
  "Cancelled",
];

/* =========================================================
   STATUS STYLES
========================================================= */

export const STATUS_STYLES = {
  Draft: "bg-gray-100 text-gray-700 border-gray-200",
  Prepared: "bg-blue-100 text-blue-700 border-blue-200",
  Sent: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Viewed: "bg-purple-100 text-purple-700 border-purple-200",
  Negotiation: "bg-amber-100 text-amber-700 border-amber-200",
  Accepted: "bg-green-100 text-green-700 border-green-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
  Expired: "bg-orange-100 text-orange-700 border-orange-200",
  Cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

/* =========================================================
   TRANSPORT TYPES
========================================================= */

export const TRANSPORT_TYPES = [
  "Flight",
  "Train",
  "Bus",
  "Private Cab",
  "Rental Car",
  "Cruise",
  "Other",
];

/* =========================================================
   EMPTY TEMPLATES
========================================================= */

export const EMPTY_HOTEL = {
  name: "",
  city: "",
  category: "",
  roomType: "",
  nights: 1,
  rooms: 1,
  amount: 0,
  inclusions: [],
  notes: "",
};

export const EMPTY_TRANSPORT = {
  type: "Flight",
  provider: "",
  route: "",
  travelDate: "",
  amount: 0,
  notes: "",
};

export const EMPTY_ACTIVITY = {
  name: "",
  location: "",
  date: "",
  quantity: 1,
  amount: 0,
  notes: "",
};

export const EMPTY_OTHER_SERVICE = {
  name: "",
  description: "",
  amount: 0,
};

/* =========================================================
   INITIAL FORM
========================================================= */

export const initialForm = {
  // Basic
  title: "",
  enquiry: "",
  customer: null,
  lead: null,
  trip: "",
  destination: "",
  travelDate: "",
  returnDate: "",
  adults: 1,
  children: 0,
  infants: 0,
  currency: "INR",

  // Quotation items
  hotels: [],
  transport: [],
  activities: [],
  otherServices: [],

  // Pricing
  baseAmount: 0,
  markupType: "Percentage",
  markupValue: 0,
  discountType: "Fixed",
  discountValue: 0,
  taxPercentage: 0,
  costAmount: 0,

  // Dates
  validUntil: "",

  // Status
  status: "Draft",

  // Text
  inclusionsText: "",
  exclusionsText: "",
  termsAndConditions: "",
  notes: "",

  // Package reference
  package: null,

  // Itinerary day-wise data
  itineraryDays: [],
};

/* =========================================================
   HELPERS: GET ID / NAME
========================================================= */

export const getId = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;

  return item._id || item.id || "";
};

/**
 * Returns null instead of empty string.
 * Used for ObjectId fields:
 * customer, trip, lead, package
 */
const getIdOrNull = (item) => {
  if (!item) return null;

  if (typeof item === "string") {
    return item.trim() || null;
  }

  const id = item._id || item.id || "";

  return id || null;
};

export const getName = (item, fallback = "—") => {
  if (!item) return fallback;

  if (typeof item === "string") return item;

  const firstName = item.firstName || "";
  const lastName = item.lastName || "";

  const fullName = `${firstName} ${lastName}`.trim();

  return (
    fullName ||
    item.name ||
    item.title ||
    item.companyName ||
    item.enquiryNumber ||
    item.quotationNumber ||
    fallback
  );
};

/* =========================================================
   HELPER: GET LIST FROM RESPONSE
========================================================= */

export const getList = (response) => {
  if (!response) return [];

  const data = response.data || response;

  if (Array.isArray(data)) return data;

  return (
    data.quotations ||
    data.enquiries ||
    data.data ||
    data.list ||
    []
  );
};

/* =========================================================
   HELPER: FORMAT DATE
========================================================= */

export const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =========================================================
   HELPER: FORMAT CURRENCY
========================================================= */

export const formatCurrency = (value, currency = "INR") => {
  const amount = Number(value) || 0;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
};

/* =========================================================
   HELPER: CALCULATE PRICING
========================================================= */

export const calculatePricing = (form = {}) => {
  const baseAmount = Number(form.baseAmount) || 0;
  const markupValue = Number(form.markupValue) || 0;
  const discountValue = Number(form.discountValue) || 0;
  const taxPercentage = Number(form.taxPercentage) || 0;
  const costAmount = Number(form.costAmount) || 0;

  let markupAmount = 0;

  if (form.markupType === "Percentage") {
    markupAmount = (baseAmount * markupValue) / 100;
  } else if (form.markupType === "Fixed") {
    markupAmount = markupValue;
  }

  const amountAfterMarkup = baseAmount + markupAmount;

  let discountAmount = 0;

  if (form.discountType === "Percentage") {
    discountAmount =
      (amountAfterMarkup * discountValue) / 100;
  } else if (form.discountType === "Fixed") {
    discountAmount = discountValue;
  }

  const amountAfterDiscount =
    amountAfterMarkup - discountAmount;

  const taxAmount =
    (amountAfterDiscount * taxPercentage) / 100;

  const totalAmount =
    amountAfterDiscount + taxAmount;

  const estimatedProfit =
    totalAmount - costAmount;

  return {
    baseAmount,
    markupAmount,
    discountAmount,
    taxAmount,
    totalAmount,
    estimatedProfit,
  };
};

/* =========================================================
   HELPER: ENQUIRY → FORM
========================================================= */

export const enquiryToForm = (enquiry) => {
  if (!enquiry) return { ...initialForm };

  return {
    ...initialForm,

    enquiry: getId(enquiry),

    customer: enquiry.customer || null,

    lead: enquiry.lead || null,

    trip:
      enquiry.trip?._id ||
      enquiry.trip ||
      "",

    destination:
      enquiry.destination || "",

    travelDate: enquiry.travelDate
      ? String(enquiry.travelDate).slice(0, 10)
      : "",

    returnDate: enquiry.returnDate
      ? String(enquiry.returnDate).slice(0, 10)
      : "",

    adults: enquiry.adults ?? 1,

    children: enquiry.children ?? 0,

    infants: enquiry.infants ?? 0,

    currency:
      enquiry.currency || "INR",

    title:
      enquiry.title || "",
  };
};

/* =========================================================
   HELPER: QUOTATION → FORM
   EDIT KE LIYE
========================================================= */

export const quotationToForm = (quotation) => {
  if (!quotation) return { ...initialForm };

  /* Itinerary days from quotation.itinerary.days */

  const itineraryDays =
    (quotation.itinerary?.days || []).map(
      (day, index) => ({
        dayNumber:
          day.dayNumber || index + 1,

        date: day.date
          ? String(day.date).slice(0, 10)
          : "",

        title:
          day.title ||
          `Day ${index + 1}`,

        description:
          day.description || "",

        city:
          day.city || "",

        location:
          day.location || "",

        activities:
          Array.isArray(day.activities)
            ? day.activities.map((act) => {
                if (typeof act === "string") {
                  return act;
                }

                return act?.name || "";
              })
            : [],

        hotel: {
          hotel:
            day.hotel?.hotel || null,

          name:
            day.hotel?.name ||
            day.hotel?.hotel?.name ||
            "",

          roomType:
            day.hotel?.roomType || "",

          checkIn: day.hotel?.checkIn
            ? String(
                day.hotel.checkIn
              ).slice(0, 10)
            : "",

          checkOut: day.hotel?.checkOut
            ? String(
                day.hotel.checkOut
              ).slice(0, 10)
            : "",

          nights:
            Number(day.hotel?.nights) || 0,

          notes:
            day.hotel?.notes || "",
        },

        transport:
          Array.isArray(day.transport)
            ? day.transport.map((tr) => ({
                transport:
                  tr?.transport || null,

                type:
                  tr?.type || "Other",

                from:
                  tr?.from || "",

                to:
                  tr?.to || "",

                departureTime:
                  tr?.departureTime || "",

                arrivalTime:
                  tr?.arrivalTime || "",

                notes:
                  tr?.notes || "",
              }))
            : [],

        meals:
          Array.isArray(day.meals)
            ? day.meals.map((meal) => ({
                type:
                  meal?.type ||
                  "Breakfast",

                restaurant:
                  meal?.restaurant || "",

                notes:
                  meal?.notes || "",
              }))
            : [],

        freeTime:
          day.freeTime || "",

        notes:
          day.notes || "",
      })
    );

  return {
    // Basic

    title:
      quotation.title || "",

    enquiry:
      getId(quotation.enquiry),

    customer:
      quotation.customer || null,

    lead:
      quotation.lead || null,

    trip:
      getId(quotation.trip),

    destination:
      quotation.destination || "",

    travelDate:
      quotation.travelDate
        ? String(
            quotation.travelDate
          ).slice(0, 10)
        : "",

    returnDate:
      quotation.returnDate
        ? String(
            quotation.returnDate
          ).slice(0, 10)
        : "",

    adults:
      quotation.adults ?? 1,

    children:
      quotation.children ?? 0,

    infants:
      quotation.infants ?? 0,

    currency:
      quotation.currency || "INR",

    // Quotation items

    hotels:
      Array.isArray(quotation.hotels)
        ? quotation.hotels.map((h) => ({
            ...EMPTY_HOTEL,
            ...h,

            inclusions:
              Array.isArray(h?.inclusions)
                ? h.inclusions
                : [],
          }))
        : [],

    transport:
      Array.isArray(quotation.transport)
        ? quotation.transport.map((t) => ({
            ...EMPTY_TRANSPORT,
            ...t,

            travelDate:
              t?.travelDate
                ? String(
                    t.travelDate
                  ).slice(0, 10)
                : "",
          }))
        : [],

    activities:
      Array.isArray(quotation.activities)
        ? quotation.activities.map((a) => ({
            ...EMPTY_ACTIVITY,
            ...a,

            date:
              a?.date
                ? String(a.date).slice(0, 10)
                : "",
          }))
        : [],

    otherServices:
      Array.isArray(
        quotation.otherServices
      )
        ? quotation.otherServices.map(
            (s) => ({
              ...EMPTY_OTHER_SERVICE,
              ...s,
            })
          )
        : [],

    // Pricing

    baseAmount:
      Number(quotation.baseAmount) || 0,

    markupType:
      quotation.markupType ||
      "Percentage",

    markupValue:
      Number(quotation.markupValue) || 0,

    discountType:
      quotation.discountType ||
      "Fixed",

    discountValue:
      Number(quotation.discountValue) || 0,

    taxPercentage:
      Number(quotation.taxPercentage) || 0,

    costAmount:
      Number(quotation.costAmount) || 0,

    // Dates

    validUntil:
      quotation.validUntil
        ? String(
            quotation.validUntil
          ).slice(0, 10)
        : "",

    // Status

    status:
      quotation.status || "Draft",

    // Text

    inclusionsText:
      Array.isArray(quotation.inclusions)
        ? quotation.inclusions.join("\n")
        : quotation.inclusions || "",

    exclusionsText:
      Array.isArray(quotation.exclusions)
        ? quotation.exclusions.join("\n")
        : quotation.exclusions || "",

    termsAndConditions:
      quotation.termsAndConditions || "",

    notes:
      quotation.notes || "",

    // Package reference

    package:
      quotation.package?._id ||
      quotation.package ||
      null,

    // Itinerary days

    itineraryDays,
  };
};

/* =========================================================
   HELPER: BUILD PAYLOAD
   FORM → BACKEND
========================================================= */

export const buildPayload = (form) => {
  /* Build itinerary object from form.itineraryDays */

  const itineraryDays =
    (form.itineraryDays || []).map(
      (day, index) => ({
        dayNumber: index + 1,

        date:
          day.date || null,

        title:
          (day.title ||
            `Day ${index + 1}`).trim(),

        description:
          day.description || "",

        city:
          day.city || "",

        location:
          day.location || "",

        activities:
          Array.isArray(day.activities)
            ? day.activities
                .map((activity) => {
                  if (
                    typeof activity ===
                    "string"
                  ) {
                    return {
                      name:
                        activity.trim(),

                      description:
                        "",

                      startTime:
                        "",

                      endTime:
                        "",

                      location:
                        "",

                      duration:
                        0,

                      amount:
                        0,

                      included:
                        true,

                      notes:
                        "",
                    };
                  }

                  return {
                    name:
                      (
                        activity?.name ||
                        ""
                      ).trim(),

                    description:
                      activity?.description ||
                      "",

                    startTime:
                      activity?.startTime ||
                      "",

                    endTime:
                      activity?.endTime ||
                      "",

                    location:
                      activity?.location ||
                      "",

                    duration:
                      Number(
                        activity?.duration
                      ) || 0,

                    amount:
                      Number(
                        activity?.amount
                      ) || 0,

                    included:
                      activity?.included !==
                      undefined
                        ? Boolean(
                            activity.included
                          )
                        : true,

                    notes:
                      activity?.notes || "",
                  };
                })
                .filter(
                  (a) => a.name
                )
            : [],

        hotel: {
          hotel:
            day.hotel?.hotel || null,

          name:
            (
              day.hotel?.name || ""
            ).trim(),

          roomType:
            (
              day.hotel?.roomType ||
              ""
            ).trim(),

          checkIn:
            day.hotel?.checkIn || "",

          checkOut:
            day.hotel?.checkOut || "",

          nights:
            Number(
              day.hotel?.nights
            ) || 0,

          notes:
            day.hotel?.notes || "",
        },

        transport:
          Array.isArray(day.transport)
            ? day.transport
                .map((tr) => ({
                  transport:
                    tr?.transport || null,

                  type:
                    tr?.type || "Other",

                  from:
                    (tr?.from || "").trim(),

                  to:
                    (tr?.to || "").trim(),

                  departureTime:
                    tr?.departureTime || "",

                  arrivalTime:
                    tr?.arrivalTime || "",

                  notes:
                    tr?.notes || "",
                }))
                .filter(
                  (tr) =>
                    tr.from ||
                    tr.to ||
                    tr.type
                )
            : [],

        meals:
          Array.isArray(day.meals)
            ? day.meals
                .map((meal) => ({
                  type:
                    meal?.type ||
                    "Breakfast",

                  restaurant:
                    meal?.restaurant ||
                    "",

                  notes:
                    meal?.notes || "",
                }))
                .filter(
                  (meal) =>
                    meal.type
                )
            : [],

        freeTime:
          day.freeTime || "",

        notes:
          day.notes || "",
      })
    );

  const inclusionsArray =
    (form.inclusionsText || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

  const exclusionsArray =
    (form.exclusionsText || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

  return {
    // Basic

    title:
      form.title?.trim() || "",

    enquiry:
      getIdOrNull(form.enquiry),

    customer:
      getIdOrNull(form.customer),

    lead:
      getIdOrNull(form.lead),

    trip:
      getIdOrNull(form.trip),

    destination:
      form.destination?.trim() || "",

    travelDate:
      form.travelDate || null,

    returnDate:
      form.returnDate || null,

    adults:
      Number(form.adults) || 1,

    children:
      Number(form.children) || 0,

    infants:
      Number(form.infants) || 0,

    currency:
      form.currency || "INR",

    // Quotation items

    hotels:
      Array.isArray(form.hotels)
        ? form.hotels.map((h) => ({
            name:
              h.name || "",

            city:
              h.city || "",

            category:
              h.category || "",

            roomType:
              h.roomType || "",

            nights:
              Number(h.nights) || 0,

            rooms:
              Number(h.rooms) || 1,

            amount:
              Number(h.amount) || 0,

            inclusions:
              Array.isArray(h.inclusions)
                ? h.inclusions
                : [],

            notes:
              h.notes || "",
          }))
        : [],

    transport:
      Array.isArray(form.transport)
        ? form.transport.map((t) => ({
            type:
              t.type || "Other",

            provider:
              t.provider || "",

            route:
              t.route || "",

            travelDate:
              t.travelDate || null,

            amount:
              Number(t.amount) || 0,

            notes:
              t.notes || "",
          }))
        : [],

    activities:
      Array.isArray(form.activities)
        ? form.activities.map((a) => ({
            name:
              a.name || "",

            location:
              a.location || "",

            date:
              a.date || null,

            quantity:
              Number(a.quantity) || 1,

            amount:
              Number(a.amount) || 0,

            notes:
              a.notes || "",
          }))
        : [],

    otherServices:
      Array.isArray(form.otherServices)
        ? form.otherServices.map((s) => ({
            name:
              s.name || "",

            description:
              s.description || "",

            amount:
              Number(s.amount) || 0,
          }))
        : [],

    // Pricing

    baseAmount:
      Number(form.baseAmount) || 0,

    markupType:
      form.markupType ||
      "Percentage",

    markupValue:
      Number(form.markupValue) || 0,

    discountType:
      form.discountType ||
      "Fixed",

    discountValue:
      Number(form.discountValue) || 0,

    taxPercentage:
      Number(form.taxPercentage) || 0,

    costAmount:
      Number(form.costAmount) || 0,

    // Dates

    validUntil:
      form.validUntil || null,

    // Status

    status:
      form.status || "Draft",

    // Text

    termsAndConditions:
      form.termsAndConditions || "",

    inclusions:
      inclusionsArray,

    exclusions:
      exclusionsArray,

    notes:
      form.notes || "",

    // Package reference

    package:
      getIdOrNull(form.package),

    // Itinerary object for backend

    itinerary: {
      title:
        form.title?.trim() || "",

      destination:
        form.destination?.trim() || "",

      days:
        itineraryDays,

      inclusions:
        inclusionsArray,

      exclusions:
        exclusionsArray,

      notes:
        form.termsAndConditions || "",
    },
  };
};

/* =========================================================
   HELPER: BUILD ITINERARY DAYS

   Travel dates ke hisaab se
   empty day slots banata hai
========================================================= */

export const buildItineraryDays = (
  travelDate,
  returnDate,
  existingDays = []
) => {
  if (!travelDate || !returnDate) {
    return [];
  }

  const start =
    new Date(travelDate);

  const end =
    new Date(returnDate);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return [];
  }

  const diffMs =
    end.getTime() -
    start.getTime();

  if (diffMs < 0) {
    return [];
  }

  const totalDays =
    Math.ceil(
      diffMs /
        (1000 * 60 * 60 * 24)
    ) + 1;

  const existingMap =
    new Map();

  (existingDays || []).forEach(
    (day, idx) => {
      if (day?.dayNumber) {
        existingMap.set(
          Number(day.dayNumber),
          day
        );
      } else {
        existingMap.set(
          idx + 1,
          day
        );
      }
    }
  );

  return Array.from(
    { length: totalDays },
    (_, index) => {
      const dayNumber =
        index + 1;

      const date =
        new Date(start);

      date.setDate(
        date.getDate() + index
      );

      const dateStr =
        date.toISOString().slice(0, 10);

      const existing =
        existingMap.get(
          dayNumber
        );

      if (existing) {
        return {
          ...existing,

          dayNumber,

          date: existing.date
            ? String(
                existing.date
              ).slice(0, 10)
            : dateStr,
        };
      }

      return {
        dayNumber,

        date: dateStr,

        title:
          `Day ${dayNumber}`,

        description:
          "",

        city:
          "",

        location:
          "",

        activities:
          [],

        hotel: {
          hotel: null,

          name:
            "",

          roomType:
            "",

          checkIn:
            "",

          checkOut:
            "",

          nights:
            0,

          notes:
            "",
        },

        transport:
          [],

        meals:
          [],

        freeTime:
          "",

        notes:
          "",
      };
    }
  );
};

