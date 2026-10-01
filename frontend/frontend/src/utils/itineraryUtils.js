import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// =====================================================
// CONSTANTS
// =====================================================

export const STATUS_OPTIONS = [
  "Draft",
  "Planning",
  "Ready",
  "Shared",
  "Approved",
  "Completed",
  "Cancelled",
];

export const RECORDS_PER_PAGE = 50;

export const statusClasses = {
  Draft: "bg-gray-100 text-gray-700 border-gray-200",
  Planning: "bg-blue-50 text-blue-700 border-blue-200",
  Ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Shared: "bg-purple-50 text-purple-700 border-purple-200",
  Approved: "bg-green-50 text-green-700 border-green-200",
  Completed: "bg-sky-50 text-sky-700 border-sky-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
};

// =====================================================
// PDF CONSTANTS
// =====================================================

const PDF_HEADER_IMAGE = "/images/cult-header.png";
const PDF_FOOTER_IMAGE = "/images/cult-footer.png";

// =====================================================
// EMPTY OBJECTS
// =====================================================

export const emptyActivity = {
  name: "",
  description: "",
  startTime: "",
  endTime: "",
  location: "",
  duration: "",
  amount: 0,
  included: true,
  notes: "",
};

export const emptyHotel = {
  hotel: null,
  roomType: "",
  checkIn: "",
  checkOut: "",
  nights: 0,
  notes: "",
};

export const emptyTransport = {
  transport: "",
  type: "Private Cab",
  from: "",
  to: "",
  departureTime: "",
  arrivalTime: "",
  notes: "",
};

export const emptyMeal = {
  type: "Breakfast",
  included: true,
  restaurant: "",
  notes: "",
};

export const createEmptyDay = (dayNumber = 1) => ({
  dayNumber,
  date: "",
  title: `Day ${dayNumber}`,
  description: "",
  city: "",
  location: "",
  activities: [],
  hotel: {
    ...emptyHotel,
  },
  transport: [],
  meals: [],
  freeTime: "",
  notes: "",
});

export const initialForm = {
  itineraryNumber: "",
  title: "",
  trip: "",
  booking: "",
  customer: "",
  destination: "",
  startDate: "",
  endDate: "",
  status: "Draft",
  days: [createEmptyDay(1)],
  inclusions: [],
  exclusions: [],
  importantNotes: [],
  emergencyContact: {
    name: "",
    phone: "",
    email: "",
  },
  notes: "",
};

// =====================================================
// BASIC HELPERS
// =====================================================

export function formatDate(date) {
  if (!date) return "—";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "—";
  }

  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateInput(date) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toISOString().split("T")[0];
}

export function getDaysCount(startDate, endDate) {
  if (!startDate || !endDate) {
    return 1;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return 1;
  }

  const difference =
    end.getTime() - start.getTime();

  const days =
    Math.floor(
      difference /
        (1000 * 60 * 60 * 24)
    ) + 1;

  return Math.max(days, 1);
}

// =====================================================
// BUILD DAYS
// =====================================================

export function buildDays(
  startDate,
  endDate,
  existingDays = []
) {
  const totalDays = getDaysCount(
    startDate,
    endDate
  );

  return Array.from(
    {
      length: totalDays,
    },
    (_, index) => {
      const dayNumber = index + 1;

      const existing =
        existingDays[index];

      let date = "";

      if (startDate) {
        const start = new Date(
          `${startDate}T00:00:00`
        );

        start.setDate(
          start.getDate() + index
        );

        date = start
          .toISOString()
          .split("T")[0];
      }

      return {
        ...createEmptyDay(dayNumber),

        ...(existing || {}),

        dayNumber,

        date: existing?.date
          ? formatDateInput(
              existing.date
            )
          : date,

        title:
          existing?.title ||
          `Day ${dayNumber}`,

        activities:
          existing?.activities || [],

        transport:
          existing?.transport || [],

        meals:
          existing?.meals || [],

        hotel: {
          ...emptyHotel,

          ...(existing?.hotel || {}),

          hotel:
            existing?.hotel?.hotel?._id ||
            existing?.hotel?.hotel ||
            null,

          checkIn:
            existing?.hotel?.checkIn
              ? formatDateInput(
                  existing.hotel.checkIn
                )
              : "",

          checkOut:
            existing?.hotel?.checkOut
              ? formatDateInput(
                  existing.hotel.checkOut
                )
              : "",
        },
      };
    }
  );
}

// =====================================================
// LIST NORMALIZATION
// =====================================================

export function normalizeList(values) {
  return (values || []).filter(
    (item) =>
      String(item || "").trim()
  );
}

// =====================================================
// PAYLOAD NORMALIZATION
// =====================================================

export function normalizePayload(form) {
  return {
    itineraryNumber:
      form.itineraryNumber ||
      undefined,

    title:
      form.title?.trim() || "",

    trip:
      form.trip || undefined,

    booking:
      form.booking || undefined,

    customer:
      form.customer || undefined,

    destination:
      form.destination?.trim() || "",

    startDate:
      form.startDate || undefined,

    endDate:
      form.endDate || undefined,

    status:
      form.status || "Draft",

    days: (form.days || []).map(
      (day, index) => {
        const hotel = {
          ...(day.hotel || {}),
          nights: Number(
            day.hotel?.nights || 0
          ),
        };

        // IMPORTANT:
        // Backend expects ObjectId.
        // Empty string causes Cast to ObjectId error.
        if (
          !hotel.hotel ||
          String(
            hotel.hotel
          ).trim() === ""
        ) {
          delete hotel.hotel;
        }

        return {
          ...day,

          dayNumber:
            index + 1,

          date:
            day.date || undefined,

          title:
            day.title?.trim() ||
            `Day ${index + 1}`,

          description:
            day.description || "",

          city:
            day.city || "",

          location:
            day.location || "",

          activities:
            (day.activities || []).map(
              (activity) => ({
                ...activity,

                amount: Number(
                  activity.amount || 0
                ),
              })
            ),

          hotel,

          transport:
            day.transport || [],

          meals:
            day.meals || [],

          freeTime:
            day.freeTime || "",

          notes:
            day.notes || "",
        };
      }
    ),

    inclusions:
      normalizeList(
        form.inclusions
      ),

    exclusions:
      normalizeList(
        form.exclusions
      ),

    importantNotes:
      normalizeList(
        form.importantNotes
      ),

    emergencyContact: {
      name:
        form.emergencyContact?.name?.trim() ||
        "",

      phone:
        form.emergencyContact?.phone?.trim() ||
        "",

      email:
        form.emergencyContact?.email?.trim() ||
        "",
    },

    notes:
      form.notes?.trim() || "",
  };
}

// =====================================================
// DISPLAY HELPERS
// =====================================================

export function getCustomerName(
  customer
) {
  if (!customer) return "—";

  if (typeof customer === "string") {
    return customer;
  }

  const name = [
    customer.firstName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    name ||
    customer.name ||
    customer.fullName ||
    customer.email ||
    "—"
  );
}

export function getTripName(trip) {
  if (!trip) return "—";

  if (typeof trip === "string") {
    return trip;
  }

  return (
    trip.tripCode ||
    trip.title ||
    trip.name ||
    "—"
  );
}

export function getBookingName(
  booking
) {
  if (!booking) return "—";

  if (typeof booking === "string") {
    return booking;
  }

  return (
    booking.bookingCode ||
    booking.title ||
    booking.name ||
    "—"
  );
}

export function getHotelName(
  hotel
) {
  if (!hotel) return "Hotel";

  if (typeof hotel === "string") {
    return hotel;
  }

  return (
    hotel.name ||
    hotel.hotelName ||
    hotel.title ||
    "Hotel"
  );
}

export function getTransportName(
  transport
) {
  if (!transport) {
    return "Transport";
  }

  if (typeof transport === "string") {
    return transport;
  }

  return (
    transport.name ||
    transport.vehicleNumber ||
    transport.type ||
    "Transport"
  );
}

// =====================================================
// PDF TEXT HELPERS
// =====================================================

function pdfText(
  value,
  fallback = "—"
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return String(value);
}

function pdfDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function pdfDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

// =====================================================
// PDF IMAGE LOADER
// =====================================================

async function imageToDataURL(
  url
) {
  try {
    const response =
      await fetch(url);

    if (!response.ok) {
      return null;
    }

    const blob =
      await response.blob();

    return await new Promise(
      (resolve) => {
        const reader =
          new FileReader();

        reader.onloadend = () =>
          resolve(
            reader.result
          );

        reader.onerror = () =>
          resolve(null);

        reader.readAsDataURL(
          blob
        );
      }
    );
  } catch (error) {
    console.warn(
      "Unable to load PDF image:",
      url,
      error
    );

    return null;
  }
}

// =====================================================
// PDF HEADER
// =====================================================

export function addPdfHeader(
  doc,
  itinerary,
  headerImage = null
) {
  const width =
    doc.internal.pageSize.getWidth();

  if (headerImage) {
    try {
      doc.addImage(
        headerImage,
        "PNG",
        0,
        0,
        width,
        40
      );
    } catch (error) {
      console.warn(
        "PDF header image failed:",
        error
      );

      doc.setFillColor(
        37,
        99,
        235
      );

      doc.rect(
        0,
        0,
        width,
        9,
        "F"
      );
    }
  } else {
    doc.setFillColor(
      37,
      99,
      235
    );

    doc.rect(
      0,
      0,
      width,
      9,
      "F"
    );
  }

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(16);

  doc.setTextColor(
    31,
    41,
    55
  );

  doc.text(
    pdfText(
      itinerary?.title,
      "Travel Itinerary"
    ),
    14,
    50
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8);

  doc.setTextColor(
    107,
    114,
    128
  );

  doc.text(
    pdfText(
      itinerary?.itineraryNumber,
      "ITINERARY"
    ),
    14,
    56
  );

  doc.text(
    `Generated: ${pdfDateTime(
      new Date()
    )}`,
    width - 14,
    56,
    {
      align: "right",
    }
  );

  return 64;
}

// =====================================================
// PDF FOOTER
// =====================================================

export function addPdfFooter(
  doc,
  footerImage = null
) {
  const totalPages =
    doc.internal.getNumberOfPages();

  const width =
    doc.internal.pageSize.getWidth();

  const height =
    doc.internal.pageSize.getHeight();

  for (
    let page = 1;
    page <= totalPages;
    page++
  ) {
    doc.setPage(page);

    if (footerImage) {
      try {
        doc.addImage(
          footerImage,
          "PNG",
          0,
          height - 25,
          width,
          25
        );
      } catch (error) {
        console.warn(
          "PDF footer image failed:",
          error
        );

        doc.setDrawColor(
          229,
          231,
          235
        );

        doc.line(
          14,
          height - 15,
          width - 14,
          height - 15
        );
      }
    } else {
      doc.setDrawColor(
        229,
        231,
        235
      );

      doc.line(
        14,
        height - 15,
        width - 14,
        height - 15
      );
    }

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(8);

    doc.setTextColor(
      156,
      163,
      175
    );

    doc.text(
      "Travel Itinerary",
      14,
      height - 8
    );

    doc.text(
      `Page ${page} of ${totalPages}`,
      width - 14,
      height - 8,
      {
        align: "right",
      }
    );
  }
}

// =====================================================
// STATUS COLOR
// =====================================================

function getStatusColor(
  status
) {
  switch (status) {
    case "Ready":
      return [5, 150, 105];

    case "Planning":
      return [37, 99, 235];

    case "Shared":
      return [124, 58, 237];

    case "Approved":
      return [22, 163, 74];

    case "Completed":
      return [14, 165, 233];

    case "Cancelled":
      return [220, 38, 38];

    default:
      return [107, 114, 128];
  }
}

// =====================================================
// SAFE AUTOTABLE OPTIONS
// =====================================================
//
// IMPORTANT:
// Do NOT add didDrawPage here.
//
// Previously didDrawPage was calling addPdfHeader(),
// and addPdfHeader() was calling addImage().
// AutoTable creates pages recursively while printing
// a large row, which caused:
//
// Maximum call stack size exceeded
//
// This function intentionally contains NO page callback.
//

function safeTableOptions() {
  return {
    showHead: "everyPage",

    pageBreak: "auto",

    rowPageBreak: "auto",

    margin: {
      top: 70,
      bottom: 38,
      left: 14,
      right: 14,
    },

    styles: {
      overflow: "linebreak",

      valign: "top",

      minCellHeight: 0,

      cellPadding: 2.5,

      fontSize: 8,

      lineWidth: 0.2,

      lineColor: [
        229,
        231,
        235,
      ],

      textColor: [
        55,
        65,
        81,
      ],
    },
  };
}

// =====================================================
// PAGE BREAK HELPER
// =====================================================

function ensurePageSpace(
  doc,
  itinerary,
  currentY,
  requiredHeight,
  headerImage
) {
  const pageHeight =
    doc.internal.pageSize.getHeight();

  if (
    currentY + requiredHeight >
    pageHeight - 38
  ) {
    doc.addPage();

    addPdfHeader(
      doc,
      itinerary,
      headerImage
    );

    return 70;
  }

  return currentY;
}

// =====================================================
// BULLET ROW BUILDER
// =====================================================
//
// Instead of putting 20-30 bullet points into one
// giant AutoTable cell, each item becomes its own row.
//
// This prevents:
// "Will not be able to print row -1 correctly
//  since it's minimum height is larger than page height"
//
// and makes page breaks much safer.
//

function buildBulletRows(
  label,
  values
) {
  const list = Array.isArray(values)
    ? values.filter(
        (item) =>
          String(
            item || ""
          ).trim()
      )
    : [];

  if (!list.length) {
    return [
      [
        label,
        "None specified",
      ],
    ];
  }

  return list.map(
    (item, index) => [
      index === 0
        ? label
        : "",

      `• ${item}`,
    ]
  );
}

// =====================================================
// GENERATE COMPLETE PDF
// =====================================================

export async function generateItineraryPDF(
  itinerary
) {
  if (!itinerary) {
    return;
  }

  // ---------------------------------------------------
  // LOAD PDF IMAGES BEFORE STARTING AUTOTABLE
  // ---------------------------------------------------

  const [
    headerImage,
    footerImage,
  ] = await Promise.all([
    imageToDataURL(
      PDF_HEADER_IMAGE
    ),

    imageToDataURL(
      PDF_FOOTER_IMAGE
    ),
  ]);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const width =
    doc.internal.pageSize.getWidth();

  const height =
    doc.internal.pageSize.getHeight();

  // ===================================================
  // HEADER
  // ===================================================

  let currentY =
    addPdfHeader(
      doc,
      itinerary,
      headerImage
    );

  // ===================================================
  // STATUS
  // ===================================================

  const statusColor =
    getStatusColor(
      itinerary.status
    );

  doc.setFillColor(
    statusColor[0],
    statusColor[1],
    statusColor[2]
  );

  doc.roundedRect(
    width - 45,
    44,
    31,
    8,
    2,
    2,
    "F"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(8);

  doc.setTextColor(
    255,
    255,
    255
  );

  doc.text(
    pdfText(
      itinerary.status,
      "Draft"
    ),
    width - 29.5,
    49.3,
    {
      align: "center",
    }
  );

  // ===================================================
  // TRIP OVERVIEW
  // ===================================================

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(11);

  doc.setTextColor(
    31,
    41,
    55
  );

  doc.text(
    "Trip Overview",
    14,
    currentY
  );

  const overviewRows = [
    [
      "Destination",
      pdfText(
        itinerary.destination
      ),

      "Customer",
      getCustomerName(
        itinerary.customer
      ),
    ],

    [
      "Trip",
      getTripName(
        itinerary.trip
      ),

      "Booking",
      getBookingName(
        itinerary.booking
      ),
    ],

    [
      "Start Date",
      pdfDate(
        itinerary.startDate
      ),

      "End Date",
      pdfDate(
        itinerary.endDate
      ),
    ],

    [
      "Duration",
      `${
        itinerary.totalDays ||
        itinerary.days?.length ||
        "—"
      } Days`,

      "Nights",
      itinerary.totalNights
        ? `${itinerary.totalNights} Nights`
        : "—",
    ],
  ];

  autoTable(doc, {
    startY:
      currentY + 4,

    body: overviewRows,

    theme: "grid",

    styles: {
      fontSize: 8.5,

      cellPadding: 3,

      textColor: [
        55,
        65,
        81,
      ],

      lineColor: [
        229,
        231,
        235,
      ],

      lineWidth: 0.2,

      valign: "top",

      overflow: "linebreak",

      minCellHeight: 0,
    },

    columnStyles: {
      0: {
        fontStyle: "bold",

        fillColor: [
          249,
          250,
          251,
        ],

        cellWidth: 28,
      },

      1: {
        cellWidth: 57,
      },

      2: {
        fontStyle: "bold",

        fillColor: [
          249,
          250,
          251,
        ],

        cellWidth: 28,
      },

      3: {
        cellWidth: 67,
      },
    },

    margin: {
      top: 70,
      bottom: 38,
      left: 14,
      right: 14,
    },

    pageBreak: "auto",

    rowPageBreak: "auto",
  });

  currentY =
    doc.lastAutoTable?.finalY
      ? doc.lastAutoTable.finalY +
        10
      : 75;

  // ===================================================
  // DAY-WISE ITINERARY
  // ===================================================

  currentY =
    ensurePageSpace(
      doc,
      itinerary,
      currentY,
      20,
      headerImage
    );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(12);

  doc.setTextColor(
    31,
    41,
    55
  );

  doc.text(
    "Day-wise Itinerary",
    14,
    currentY
  );

  currentY += 7;

  const days =
    itinerary.days || [];

  for (
    let dayIndex = 0;
    dayIndex < days.length;
    dayIndex++
  ) {
    const day =
      days[dayIndex];

    // =================================================
    // DAY HEADER
    // =================================================

    currentY =
      ensurePageSpace(
        doc,
        itinerary,
        currentY,
        20,
        headerImage
      );

    doc.setFillColor(
      239,
      246,
      255
    );

    doc.roundedRect(
      14,
      currentY,
      width - 28,
      12,
      2,
      2,
      "F"
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(9);

    doc.setTextColor(
      37,
      99,
      235
    );

    doc.text(
      `DAY ${
        day.dayNumber ||
        dayIndex + 1
      }`,
      18,
      currentY + 5
    );

    doc.setFontSize(10);

    doc.setTextColor(
      31,
      41,
      55
    );

    doc.text(
      pdfText(
        day.title,
        `Day ${
          dayIndex + 1
        }`
      ),
      18,
      currentY + 10
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(8);

    doc.setTextColor(
      107,
      114,
      128
    );

    const dayMeta = [
      day.date
        ? pdfDate(day.date)
        : "",

      day.city || "",
    ]
      .filter(Boolean)
      .join(" • ");

    if (dayMeta) {
      doc.text(
        dayMeta,
        width - 18,
        currentY + 8,
        {
          align: "right",
        }
      );
    }

    currentY += 17;

    // =================================================
    // DESCRIPTION
    // =================================================

    if (day.description) {
      currentY =
        ensurePageSpace(
          doc,
          itinerary,
          currentY,
          15,
          headerImage
        );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(8.5);

      doc.setTextColor(
        75,
        85,
        99
      );

      const descriptionLines =
        doc.splitTextToSize(
          String(
            day.description
          ),
          width - 28
        );

      doc.text(
        descriptionLines,
        14,
        currentY
      );

      currentY +=
        descriptionLines.length *
          4 +
        4;
    }

    // =================================================
    // LOCATION
    // =================================================

    if (day.location) {
      currentY =
        ensurePageSpace(
          doc,
          itinerary,
          currentY,
          10,
          headerImage
        );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(8);

      doc.setTextColor(
        37,
        99,
        235
      );

      doc.text(
        "Location:",
        14,
        currentY
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setTextColor(
        75,
        85,
        99
      );

      const locationLines =
        doc.splitTextToSize(
          String(
            day.location
          ),
          width - 50
        );

      doc.text(
        locationLines,
        34,
        currentY
      );

      currentY +=
        locationLines.length *
          4 +
        4;
    }

    // =================================================
    // ACTIVITIES
    // =================================================

    if (
      day.activities?.length
    ) {
      currentY =
        ensurePageSpace(
          doc,
          itinerary,
          currentY,
          20,
          headerImage
        );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(9);

      doc.setTextColor(
        31,
        41,
        55
      );

      doc.text(
        "Activities",
        14,
        currentY
      );

      currentY += 3;

      const activityRows =
        day.activities.map(
          (activity) => [
            pdfText(
              activity.name
            ),

            [
              activity.startTime,
              activity.endTime,
            ]
              .filter(Boolean)
              .join(" - ") ||
              "—",

            pdfText(
              activity.location
            ),

            pdfText(
              activity.duration
            ),

            activity.amount
              ? `₹${Number(
                  activity.amount
                ).toLocaleString(
                  "en-IN"
                )}`
              : "—",

            activity.included !==
            false
              ? "Included"
              : "Extra",
          ]
        );

      autoTable(doc, {
        ...safeTableOptions(),

        startY:
          currentY + 2,

        head: [
          [
            "Activity",
            "Time",
            "Location",
            "Duration",
            "Amount",
            "Status",
          ],
        ],

        body: activityRows,

        theme: "grid",

        styles: {
          ...safeTableOptions()
            .styles,

          fontSize: 7.5,

          cellPadding: 2.5,

          overflow: "linebreak",

          valign: "top",

          minCellHeight: 0,

          lineWidth: 0.2,
        },

        headStyles: {
          fillColor: [
            37,
            99,
            235,
          ],

          textColor: [
            255,
            255,
            255,
          ],

          fontStyle:
            "bold",
        },

        columnStyles: {
          0: {
            cellWidth: 38,
          },

          1: {
            cellWidth: 24,
          },

          2: {
            cellWidth: 38,
          },

          3: {
            cellWidth: 24,
          },

          4: {
            cellWidth: 25,
          },

          5: {
            cellWidth: 27,
          },
        },
      });

      currentY =
        doc.lastAutoTable.finalY +
        5;

      // -----------------------------------------------
      // ACTIVITY DESCRIPTION / NOTES
      // -----------------------------------------------

      for (
        const activity of day.activities
      ) {
        if (
          !activity.description &&
          !activity.notes
        ) {
          continue;
        }

        currentY =
          ensurePageSpace(
            doc,
            itinerary,
            currentY,
            15,
            headerImage
          );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(7.5);

        doc.setTextColor(
          107,
          114,
          128
        );

        const activityText = [
          activity.description
            ? `Description: ${activity.description}`
            : "",

          activity.notes
            ? `Notes: ${activity.notes}`
            : "",
        ]
          .filter(Boolean)
          .join(" | ");

        const activityLines =
          doc.splitTextToSize(
            activityText,
            width - 28
          );

        doc.text(
          activityLines,
          14,
          currentY
        );

        currentY +=
          activityLines.length *
            3.5 +
          3;
      }
    }

    // =================================================
    // HOTEL
    // =================================================

    if (
      day.hotel &&
      day.hotel.hotel
    ) {
      currentY =
        ensurePageSpace(
          doc,
          itinerary,
          currentY,
          25,
          headerImage
        );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(9);

      doc.setTextColor(
        31,
        41,
        55
      );

      doc.text(
        "Hotel",
        14,
        currentY
      );

      currentY += 3;

      autoTable(doc, {
        ...safeTableOptions(),

        startY:
          currentY + 2,

        head: [
          [
            "Hotel",
            "Room",
            "Check-in",
            "Check-out",
            "Nights",
          ],
        ],

        body: [
          [
            getHotelName(
              day.hotel.hotel
            ),

            pdfText(
              day.hotel.roomType
            ),

            pdfDate(
              day.hotel.checkIn
            ),

            pdfDate(
              day.hotel.checkOut
            ),

            pdfText(
              day.hotel.nights,
              "0"
            ),
          ],
        ],

        theme: "grid",

        styles: {
          ...safeTableOptions()
            .styles,

          fontSize: 7.5,

          cellPadding: 2.5,

          overflow: "linebreak",

          valign: "top",

          minCellHeight: 0,

          lineWidth: 0.2,
        },

        headStyles: {
          fillColor: [
            5,
            150,
            105,
          ],

          textColor: [
            255,
            255,
            255,
          ],
        },
      });

      currentY =
        doc.lastAutoTable.finalY +
        5;

      if (day.hotel.notes) {
        currentY =
          ensurePageSpace(
            doc,
            itinerary,
            currentY,
            10,
            headerImage
          );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(7.5);

        doc.setTextColor(
          107,
          114,
          128
        );

        const hotelNoteLines =
          doc.splitTextToSize(
            `Hotel Notes: ${day.hotel.notes}`,
            width - 28
          );

        doc.text(
          hotelNoteLines,
          14,
          currentY
        );

        currentY +=
          hotelNoteLines.length *
            3.5 +
          3;
      }
    }

    // =================================================
    // TRANSPORT
    // =================================================

    if (
      day.transport?.length
    ) {
      currentY =
        ensurePageSpace(
          doc,
          itinerary,
          currentY,
          25,
          headerImage
        );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(9);

      doc.setTextColor(
        31,
        41,
        55
      );

      doc.text(
        "Transport",
        14,
        currentY
      );

      currentY += 3;

      const transportRows =
        day.transport.map(
          (transport) => [
            getTransportName(
              transport.transport
            ),

            pdfText(
              transport.type
            ),

            `${pdfText(
              transport.from
            )} → ${pdfText(
              transport.to
            )}`,

            pdfDateTime(
              transport.departureTime
            ),

            pdfDateTime(
              transport.arrivalTime
            ),
          ]
        );

      autoTable(doc, {
        ...safeTableOptions(),

        startY:
          currentY + 2,

        head: [
          [
            "Transport",
            "Type",
            "Route",
            "Departure",
            "Arrival",
          ],
        ],

        body: transportRows,

        theme: "grid",

        styles: {
          ...safeTableOptions()
            .styles,

          fontSize: 7.2,

          cellPadding: 2.5,

          overflow: "linebreak",

          valign: "top",

          minCellHeight: 0,

          lineWidth: 0.2,
        },

        headStyles: {
          fillColor: [
            234,
            88,
            12,
          ],

          textColor: [
            255,
            255,
            255,
          ],
        },

        columnStyles: {
          0: {
            cellWidth: 35,
          },

          1: {
            cellWidth: 27,
          },

          2: {
            cellWidth: 47,
          },

          3: {
            cellWidth: 35,
          },

          4: {
            cellWidth: 35,
          },
        },
      });

      currentY =
        doc.lastAutoTable.finalY +
        5;
    }

    // =================================================
    // MEALS
    // =================================================

    if (
      day.meals?.length
    ) {
      currentY =
        ensurePageSpace(
          doc,
          itinerary,
          currentY,
          25,
          headerImage
        );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(9);

      doc.setTextColor(
        31,
        41,
        55
      );

      doc.text(
        "Meals",
        14,
        currentY
      );

      currentY += 3;

      const mealRows =
        day.meals.map(
          (meal) => [
            pdfText(
              meal.type
            ),

            pdfText(
              meal.restaurant
            ),

            meal.included !==
            false
              ? "Included"
              : "Not Included",

            pdfText(
              meal.notes
            ),
          ]
        );

      autoTable(doc, {
        ...safeTableOptions(),

        startY:
          currentY + 2,

        head: [
          [
            "Meal",
            "Restaurant",
            "Status",
            "Notes",
          ],
        ],

        body: mealRows,

        theme: "grid",

        styles: {
          ...safeTableOptions()
            .styles,

          fontSize: 7.5,

          cellPadding: 2.5,

          overflow: "linebreak",

          valign: "top",

          minCellHeight: 0,

          lineWidth: 0.2,
        },

        headStyles: {
          fillColor: [
            217,
            119,
            6,
          ],

          textColor: [
            255,
            255,
            255,
          ],
        },

        columnStyles: {
          0: {
            cellWidth: 35,
          },

          1: {
            cellWidth: 50,
          },

          2: {
            cellWidth: 35,
          },

          3: {
            cellWidth: 59,
          },
        },
      });

      currentY =
        doc.lastAutoTable.finalY +
        5;
    }

    // =================================================
    // FREE TIME
    // =================================================

    if (day.freeTime) {
      currentY =
        ensurePageSpace(
          doc,
          itinerary,
          currentY,
          20,
          headerImage
        );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(8);

      doc.setTextColor(
        31,
        41,
        55
      );

      doc.text(
        "Free Time",
        14,
        currentY
      );

      currentY += 4;

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(8);

      doc.setTextColor(
        75,
        85,
        99
      );

      const freeTimeLines =
        doc.splitTextToSize(
          String(
            day.freeTime
          ),
          width - 28
        );

      doc.text(
        freeTimeLines,
        14,
        currentY
      );

      currentY +=
        freeTimeLines.length *
          4 +
        3;
    }

    // =================================================
    // DAY NOTES
    // =================================================

    if (day.notes) {
      currentY =
        ensurePageSpace(
          doc,
          itinerary,
          currentY,
          20,
          headerImage
        );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(8);

      doc.setTextColor(
        31,
        41,
        55
      );

      doc.text(
        "Day Notes",
        14,
        currentY
      );

      currentY += 4;

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(8);

      doc.setTextColor(
        75,
        85,
        99
      );

      const dayNoteLines =
        doc.splitTextToSize(
          String(day.notes),
          width - 28
        );

      doc.text(
        dayNoteLines,
        14,
        currentY
      );

      currentY +=
        dayNoteLines.length *
          4 +
        5;
    }

    currentY += 4;
  }

  // ===================================================
  // TRAVEL INFORMATION
  // ===================================================

  currentY =
    ensurePageSpace(
      doc,
      itinerary,
      currentY,
      35,
      headerImage
    );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(11);

  doc.setTextColor(
    31,
    41,
    55
  );

  doc.text(
    "Travel Information",
    14,
    currentY
  );

  currentY += 5;

  // IMPORTANT:
  // Each item gets its own row.
  // This prevents one massive row from being
  // taller than the available PDF page.

  const informationRows = [
    ...buildBulletRows(
      "Inclusions",
      itinerary.inclusions
    ),

    ...buildBulletRows(
      "Exclusions",
      itinerary.exclusions
    ),

    ...buildBulletRows(
      "Important Notes",
      itinerary.importantNotes
    ),
  ];

  autoTable(doc, {
    ...safeTableOptions(),

    startY:
      currentY + 2,

    body: informationRows,

    theme: "grid",

    styles: {
      ...safeTableOptions()
        .styles,

      fontSize: 8,

      cellPadding: 2.5,

      textColor: [
        55,
        65,
        81,
      ],

      lineColor: [
        229,
        231,
        235,
      ],

      lineWidth: 0.2,

      valign: "top",

      overflow: "linebreak",

      minCellHeight: 0,
    },

    columnStyles: {
      0: {
        fontStyle: "bold",

        fillColor: [
          249,
          250,
          251,
        ],

        cellWidth: 36,
      },

      1: {
        cellWidth: 144,
      },
    },
  });

  currentY =
    doc.lastAutoTable.finalY +
    8;

  // ===================================================
  // EMERGENCY CONTACT
  // ===================================================

  if (
    itinerary.emergencyContact
      ?.name ||
    itinerary.emergencyContact
      ?.phone ||
    itinerary.emergencyContact
      ?.email
  ) {
    currentY =
      ensurePageSpace(
        doc,
        itinerary,
        currentY,
        25,
        headerImage
      );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(10);

    doc.setTextColor(
      185,
      28,
      28
    );

    doc.text(
      "Emergency Contact",
      14,
      currentY
    );

    currentY += 4;

    autoTable(doc, {
      ...safeTableOptions(),

      startY:
        currentY + 2,

      head: [
        [
          "Name",
          "Phone",
          "Email",
        ],
      ],

      body: [
        [
          pdfText(
            itinerary
              .emergencyContact
              ?.name
          ),

          pdfText(
            itinerary
              .emergencyContact
              ?.phone
          ),

          pdfText(
            itinerary
              .emergencyContact
              ?.email
          ),
        ],
      ],

      theme: "grid",

      styles: {
        ...safeTableOptions()
          .styles,

        fontSize: 8,

        cellPadding: 3,

        textColor: [
          127,
          29,
          29,
        ],

        lineColor: [
          254,
          202,
          202,
        ],

        lineWidth: 0.2,

        valign: "top",

        overflow: "linebreak",

        minCellHeight: 0,
      },

      headStyles: {
        fillColor: [
          254,
          226,
          226,
        ],

        textColor: [
          127,
          29,
          29,
        ],

        fontStyle:
          "bold",
      },

      columnStyles: {
        0: {
          cellWidth: 55,
        },

        1: {
          cellWidth: 55,
        },

        2: {
          cellWidth: 70,
        },
      },
    });

    currentY =
      doc.lastAutoTable.finalY +
      8;
  }

  // ===================================================
  // ADDITIONAL NOTES
  // ===================================================

  if (itinerary.notes) {
    currentY =
      ensurePageSpace(
        doc,
        itinerary,
        currentY,
        25,
        headerImage
      );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(10);

    doc.setTextColor(
      31,
      41,
      55
    );

    doc.text(
      "Additional Notes",
      14,
      currentY
    );

    currentY += 5;

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(8);

    doc.setTextColor(
      75,
      85,
      99
    );

    const noteLines =
      doc.splitTextToSize(
        String(
          itinerary.notes
        ),
        width - 28
      );

    // Render notes page by page
    let noteIndex = 0;

    while (
      noteIndex <
      noteLines.length
    ) {
      const availableHeight =
        height -
        38 -
        currentY;

      const maxLines = Math.max(
        1,
        Math.floor(
          availableHeight / 4
        )
      );

      const chunk =
        noteLines.slice(
          noteIndex,
          noteIndex +
            maxLines
        );

      doc.text(
        chunk,
        14,
        currentY
      );

      noteIndex +=
        chunk.length;

      if (
        noteIndex <
        noteLines.length
      ) {
        doc.addPage();

        addPdfHeader(
          doc,
          itinerary,
          headerImage
        );

        currentY = 70;
      } else {
        currentY +=
          chunk.length * 4;
      }
    }
  }

  // ===================================================
  // FOOTER
  // ===================================================

  addPdfFooter(
    doc,
    footerImage
  );

  // ===================================================
  // FILE NAME
  // ===================================================

  const cleanTitle =
    String(
      itinerary.title ||
        "itinerary"
    )
      .replace(
        /[^a-z0-9]+/gi,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .toLowerCase();

  const number =
    String(
      itinerary.itineraryNumber ||
        "itinerary"
    )
      .replace(
        /[^a-z0-9-]/gi,
        "-"
      )
      .toLowerCase();

  const filename =
    `${number}-${cleanTitle || "travel-itinerary"}.pdf`;

  // ===================================================
  // SAVE
  // ===================================================

  doc.save(filename);
}