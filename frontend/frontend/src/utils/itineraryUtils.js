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
// PDF COLORS
// =====================================================

const BLUE = [24, 0, 172];
const GOLD = [174, 167, 1];
const BLACK = [26, 26, 26];
const GREY = [110, 110, 110];
const LIGHT_GREY = [230, 230, 230];

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
  hotel: { ...emptyHotel },
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
  const totalDays =
    getDaysCount(
      startDate,
      endDate
    );

  return Array.from(
    {
      length: totalDays,
    },
    (_, index) => {
      const dayNumber =
        index + 1;

      const existing =
        existingDays[index];

      let date = "";

      if (startDate) {
        const start =
          new Date(
            `${startDate}T00:00:00`
          );

        start.setDate(
          start.getDate() +
            index
        );

        date =
          start
            .toISOString()
            .split("T")[0];
      }

      return {
        ...createEmptyDay(
          dayNumber
        ),

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
          existing?.activities ||
          [],

        transport:
          existing?.transport ||
          [],

        meals:
          existing?.meals ||
          [],

        hotel: {
          ...emptyHotel,

          ...(existing?.hotel ||
            {}),

          hotel:
            existing?.hotel?.hotel
              ?._id ||
            existing?.hotel?.hotel ||
            null,

          checkIn:
            existing?.hotel?.checkIn
              ? formatDateInput(
                  existing.hotel
                    .checkIn
                )
              : "",

          checkOut:
            existing?.hotel
              ?.checkOut
              ? formatDateInput(
                  existing.hotel
                    .checkOut
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

export function normalizeList(
  values
) {
  return (values || []).filter(
    (item) =>
      String(item || "").trim()
  );
}

// =====================================================
// PAYLOAD NORMALIZATION
// =====================================================

export function normalizePayload(
  form
) {
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
      form.destination?.trim() ||
      "",

    startDate:
      form.startDate ||
      undefined,

    endDate:
      form.endDate ||
      undefined,

    status:
      form.status || "Draft",

    days: (
      form.days || []
    ).map((day, index) => {
      const hotel = {
        ...(day.hotel || {}),

        nights: Number(
          day.hotel?.nights || 0
        ),
      };

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
          day.date ||
          undefined,

        title:
          day.title?.trim() ||
          `Day ${index + 1}`,

        description:
          day.description ||
          "",

        city:
          day.city || "",

        location:
          day.location || "",

        activities: (
          day.activities || []
        ).map(
          (activity) => ({
            ...activity,

            amount: Number(
              activity.amount ||
                0
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
    }),

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
        form.emergencyContact
          ?.name?.trim() || "",

      phone:
        form.emergencyContact
          ?.phone?.trim() || "",

      email:
        form.emergencyContact
          ?.email?.trim() || "",
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

  if (
    typeof customer ===
    "string"
  ) {
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

export function getTripName(
  trip
) {
  if (!trip) return "—";

  if (
    typeof trip ===
    "string"
  ) {
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

  if (
    typeof booking ===
    "string"
  ) {
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

  if (
    typeof hotel ===
    "string"
  ) {
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

  if (
    typeof transport ===
    "string"
  ) {
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

  const date =
    new Date(value);

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

function pdfDateTime(
  value
) {
  if (!value) return "—";

  const date =
    new Date(value);

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
// IMAGE LOADER
// =====================================================

const loadImage = (
  src
) =>
  new Promise(
    (resolve, reject) => {
      const img =
        new Image();

      img.onload = () =>
        resolve(img);

      img.onerror = () =>
        reject(
          new Error(
            `Failed: ${src}`
          )
        );

      img.src = src;
    }
  );

const getImageHeight = (
  image,
  width
) => {
  if (
    !image?.naturalWidth ||
    !image?.naturalHeight
  ) {
    return 30;
  }

  return (
    width *
    (image.naturalHeight /
      image.naturalWidth)
  );
};

// =====================================================
// MAIN PDF GENERATOR
// =====================================================

export async function generateItineraryPDF(
  itinerary
) {
  if (!itinerary) return;

  // ===================================================
  // CREATE PDF
  // ===================================================

  const doc =
    new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();

  // ===================================================
  // LOAD IMAGES
  // ===================================================

  let headerImage = null;
  let footerImage = null;

  try {
    headerImage =
      await loadImage(
        PDF_HEADER_IMAGE
      );
  } catch {
    console.warn(
      "Header image not found"
    );
  }

  try {
    footerImage =
      await loadImage(
        PDF_FOOTER_IMAGE
      );
  } catch {
    console.warn(
      "Footer image not found"
    );
  }

  const headerHeight =
    headerImage
      ? getImageHeight(
          headerImage,
          pageWidth
        )
      : 0;

  const footerHeight =
    footerImage
      ? getImageHeight(
          footerImage,
          pageWidth
        )
      : 0;

  // ===================================================
  // PAGE SETTINGS
  // ===================================================

  const LEFT = 15;

  const RIGHT =
    pageWidth - 15;

  const CONTENT_WIDTH =
    RIGHT - LEFT;

  /*
   * FIRST PAGE:
   * Header ke neeche content
   */
  const firstPageTop =
    headerHeight + 8;

  /*
   * OTHER PAGES:
   * Header nahi hoga.
   */
  const otherPageTop = 15;

  /*
   * Footer ke liye bottom space
   */
  const contentBottom =
    pageHeight -
    (footerImage
      ? footerHeight + 8
      : 15);

  // ===================================================
  // PAGE CONTROL
  // ===================================================

  const ensureSpace = (
    y,
    h = 12
  ) => {
    if (
      y + h >
      contentBottom
    ) {
      /*
       * New page create.
       *
       * IMPORTANT:
       * Header yahan bilkul nahi lagana.
       */

      doc.addPage();

      return otherPageTop;
    }

    return y;
  };

  // ===================================================
  // HEADING
  // ===================================================

  const drawHeading = (
    y,
    title
  ) => {
    y = ensureSpace(
      y,
      12
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(11);

    doc.setTextColor(
      ...BLUE
    );

    doc.text(
      String(
        title
      ).toUpperCase(),
      LEFT,
      y
    );

    y += 1.5;

    doc.setDrawColor(
      ...BLUE
    );

    doc.setLineWidth(
      0.5
    );

    doc.line(
      LEFT,
      y,
      RIGHT,
      y
    );

    return y + 6;
  };

  // ===================================================
  // BULLETS
  // ===================================================

  const drawBullets = (
    y,
    items,
    fontSize = 9.5
  ) => {
    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(
      fontSize
    );

    doc.setTextColor(
      ...BLACK
    );

    items.forEach(
      (item) => {
        const lines =
          doc.splitTextToSize(
            `•  ${item}`,
            CONTENT_WIDTH - 4
          );

        y = ensureSpace(
          y,
          lines.length *
            4.5
        );

        doc.text(
          lines,
          LEFT + 2,
          y
        );

        y +=
          lines.length *
            4.5 +
          1.2;
      }
    );

    return y;
  };

  // ===================================================
  // LABEL VALUE
  // ===================================================

  const drawLabelValue = (
    y,
    label,
    value
  ) => {
    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(9);

    doc.setTextColor(
      ...GREY
    );

    const text =
      pdfText(
        value,
        "—"
      );

    const valueLines =
      doc.splitTextToSize(
        String(text),
        CONTENT_WIDTH - 30
      );

    y = ensureSpace(
      y,
      Math.max(
        4.5,
        valueLines.length *
          4.5
      )
    );

    doc.text(
      `${label}:`,
      LEFT + 3,
      y
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(
      9.5
    );

    doc.setTextColor(
      ...BLACK
    );

    doc.text(
      valueLines,
      LEFT + 26,
      y
    );

    return (
      y +
      valueLines.length *
        4.5 +
      1.2
    );
  };

  // ===================================================
  // FIRST PAGE HEADER ONLY
  // ===================================================

  if (headerImage) {
    try {
      doc.addImage(
        headerImage,
        "PNG",
        0,
        0,
        pageWidth,
        headerHeight
      );
    } catch {}
  }

  // ===================================================
  // FIRST PAGE CONTENT
  // ===================================================

  let y =
    firstPageTop;

  // ===================================================
  // TITLE
  // ===================================================

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    17
  );

  doc.setTextColor(
    ...BLACK
  );

  doc.text(
    itinerary.title ||
      "Travel Itinerary",
    pageWidth / 2,
    y,
    {
      align: "center",
    }
  );

  y += 6;

  doc.setFont(
    "helvetica",
    "italic"
  );

  doc.setFontSize(
    9.5
  );

  doc.setTextColor(
    ...GREY
  );

  doc.text(
    "Greetings From Cult Holidays",
    pageWidth / 2,
    y,
    {
      align: "center",
    }
  );

  y += 10;

  // ===================================================
  // SUMMARY
  // ===================================================

  const totalDays =
    itinerary.totalDays ||
    itinerary.days?.length ||
    "—";

  const totalNights =
    itinerary.totalNights
      ? `${itinerary.totalNights} Nights`
      : "—";

  const summaryRows =
    [
      [
        "Destination",
        pdfText(
          itinerary.destination
        ),
        "Status",
        pdfText(
          itinerary.status,
          "Draft"
        ),
      ],

      [
        "Customer",
        getCustomerName(
          itinerary.customer
        ),
        "Trip",
        getTripName(
          itinerary.trip
        ),
      ],

      [
        "Booking",
        getBookingName(
          itinerary.booking
        ),
        "Itinerary No.",
        pdfText(
          itinerary.itineraryNumber,
          "—"
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
        `${totalDays} Days`,
        "Nights",
        totalNights,
      ],
    ];

  autoTable(doc, {
    startY: y,

    body:
      summaryRows,

    theme: "plain",

    styles: {
      font: "helvetica",
      fontSize: 9.5,
      cellPadding: 2.8,

      textColor:
        BLACK,

      lineColor:
        LIGHT_GREY,

      lineWidth:
        0.15,

      valign:
        "middle",

      minCellHeight:
        7.5,

      overflow:
        "linebreak",
    },

    columnStyles: {
      0: {
        fontStyle:
          "bold",

        cellWidth:
          32,

        textColor:
          GREY,
      },

      1: {
        cellWidth:
          63,
      },

      2: {
        fontStyle:
          "bold",

        cellWidth:
          32,

        textColor:
          GREY,
      },

      3: {
        cellWidth:
          63,
      },
    },

    margin: {
      left: LEFT,
      right: 15,
    },

    pageBreak:
      "avoid",
  });

  y =
    doc.lastAutoTable
      .finalY + 10;

  // ===================================================
  // DAY WISE ITINERARY
  // ===================================================

  const days =
    itinerary.days || [];

  if (
    days.length > 0
  ) {
    y =
      drawHeading(
        y,
        "Day-wise Itinerary"
      );

    days.forEach(
      (day, dayIndex) => {
        y =
          ensureSpace(
            y,
            20
          );

        const dayNum =
          day.dayNumber ||
          dayIndex + 1;

        // -----------------------------------------------
        // DAY HEADER
        // -----------------------------------------------

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(
          10.5
        );

        doc.setTextColor(
          ...BLUE
        );

        doc.text(
          `Day ${dayNum}`,
          LEFT,
          y
        );

        const cleanTitle =
          String(
            day.title || ""
          ).trim();

        const isDuplicateTitle =
          new RegExp(
            `^day\\s*${dayNum}\\s*$`,
            "i"
          ).test(
            cleanTitle
          );

        if (
          cleanTitle &&
          !isDuplicateTitle
        ) {
          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(
            10.5
          );

          doc.setTextColor(
            ...BLACK
          );

          const titleLines =
            doc.splitTextToSize(
              cleanTitle,
              CONTENT_WIDTH -
                22
            );

          doc.text(
            titleLines[0],
            LEFT + 18,
            y
          );
        }

        const dayMeta =
          [
            day.date
              ? pdfDate(
                  day.date
                )
              : "",

            day.city || "",
          ]
            .filter(Boolean)
            .join(" • ");

        if (dayMeta) {
          doc.setFont(
            "helvetica",
            "normal"
          );

          doc.setFontSize(
            8
          );

          doc.setTextColor(
            ...GREY
          );

          doc.text(
            dayMeta,
            RIGHT,
            y,
            {
              align: "right",
            }
          );
        }

        y += 6;

        // -----------------------------------------------
        // DESCRIPTION
        // -----------------------------------------------

        if (
          day.description
        ) {
          y =
            drawLabelValue(
              y,
              "Description",
              day.description
            );
        }

        // -----------------------------------------------
        // LOCATION
        // -----------------------------------------------

        if (
          day.location
        ) {
          y =
            drawLabelValue(
              y,
              "Location",
              day.location
            );
        }

        // -----------------------------------------------
        // ACTIVITIES
        // -----------------------------------------------

        if (
          day.activities
            ?.length
        ) {
          y =
            ensureSpace(
              y,
              20
            );

          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(
            9.5
          );

          doc.setTextColor(
            ...BLACK
          );

          doc.text(
            "Activities",
            LEFT + 3,
            y
          );

          y += 4;

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
                  .join(
                    " - "
                  ) ||
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
            startY:
              y,

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

            body:
              activityRows,

            theme:
              "plain",

            styles: {
              font:
                "helvetica",

              fontSize:
                8.5,

              cellPadding:
                2.5,

              textColor:
                BLACK,

              lineColor:
                LIGHT_GREY,

              lineWidth:
                0.15,

              valign:
                "middle",

              minCellHeight:
                6.5,

              overflow:
                "linebreak",
            },

            headStyles: {
              fillColor:
                BLUE,

              textColor: [
                255,
                255,
                255,
              ],

              fontStyle:
                "bold",
            },

            margin: {
              left: LEFT,
              right: 15,
            },

            pageBreak:
              "auto",
          });

          y =
            doc.lastAutoTable
              .finalY + 4;

          for (
            const activity of
              day.activities
          ) {
            if (
              !activity.description &&
              !activity.notes
            ) {
              continue;
            }

            y =
              ensureSpace(
                y,
                12
              );

            const activityText =
              [
                activity.description
                  ? `Description: ${activity.description}`
                  : "",

                activity.notes
                  ? `Notes: ${activity.notes}`
                  : "",
              ]
                .filter(Boolean)
                .join(
                  " | "
                );

            const activityLines =
              doc.splitTextToSize(
                activityText,
                CONTENT_WIDTH -
                  4
              );

            doc.setFont(
              "helvetica",
              "normal"
            );

            doc.setFontSize(
              8
            );

            doc.setTextColor(
              ...GREY
            );

            doc.text(
              activityLines,
              LEFT + 3,
              y
            );

            y +=
              activityLines.length *
                3.5 +
              3;
          }
        }

        // -----------------------------------------------
        // HOTEL
        // -----------------------------------------------

        if (
          day.hotel &&
          day.hotel.hotel
        ) {
          y =
            ensureSpace(
              y,
              20
            );

          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(
            9.5
          );

          doc.setTextColor(
            ...BLACK
          );

          doc.text(
            "Hotel",
            LEFT + 3,
            y
          );

          y += 4;

          autoTable(doc, {
            startY:
              y,

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

            theme:
              "plain",

            styles: {
              font:
                "helvetica",

              fontSize:
                8.5,

              cellPadding:
                2.5,

              textColor:
                BLACK,

              lineColor:
                LIGHT_GREY,

              lineWidth:
                0.15,

              valign:
                "middle",

              minCellHeight:
                6.5,

              overflow:
                "linebreak",
            },

            headStyles: {
              fillColor:
                BLUE,

              textColor: [
                255,
                255,
                255,
              ],

              fontStyle:
                "bold",
            },

            margin: {
              left: LEFT,
              right: 15,
            },

            pageBreak:
              "avoid",
          });

          y =
            doc.lastAutoTable
              .finalY + 4;

          if (
            day.hotel.notes
          ) {
            y =
              ensureSpace(
                y,
                10
              );

            doc.setFont(
              "helvetica",
              "normal"
            );

            doc.setFontSize(
              8
            );

            doc.setTextColor(
              ...GREY
            );

            const hotelNoteLines =
              doc.splitTextToSize(
                `Hotel Notes: ${day.hotel.notes}`,
                CONTENT_WIDTH -
                  4
              );

            doc.text(
              hotelNoteLines,
              LEFT + 3,
              y
            );

            y +=
              hotelNoteLines.length *
                3.5 +
              3;
          }
        }

        // -----------------------------------------------
        // TRANSPORT
        // -----------------------------------------------

        if (
          day.transport
            ?.length
        ) {
          y =
            ensureSpace(
              y,
              20
            );

          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(
            9.5
          );

          doc.setTextColor(
            ...BLACK
          );

          doc.text(
            "Transport",
            LEFT + 3,
            y
          );

          y += 4;

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
            startY:
              y,

            head: [
              [
                "Transport",
                "Type",
                "Route",
                "Departure",
                "Arrival",
              ],
            ],

            body:
              transportRows,

            theme:
              "plain",

            styles: {
              font:
                "helvetica",

              fontSize:
                8.5,

              cellPadding:
                2.5,

              textColor:
                BLACK,

              lineColor:
                LIGHT_GREY,

              lineWidth:
                0.15,

              valign:
                "middle",

              minCellHeight:
                6.5,

              overflow:
                "linebreak",
            },

            headStyles: {
              fillColor:
                BLUE,

              textColor: [
                255,
                255,
                255,
              ],

              fontStyle:
                "bold",
            },

            margin: {
              left: LEFT,
              right: 15,
            },

            pageBreak:
              "auto",
          });

          y =
            doc.lastAutoTable
              .finalY + 4;
        }

        // -----------------------------------------------
        // MEALS
        // -----------------------------------------------

        if (
          day.meals?.length
        ) {
          y =
            ensureSpace(
              y,
              20
            );

          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(
            9.5
          );

          doc.setTextColor(
            ...BLACK
          );

          doc.text(
            "Meals",
            LEFT + 3,
            y
          );

          y += 4;

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
            startY:
              y,

            head: [
              [
                "Meal",
                "Restaurant",
                "Status",
                "Notes",
              ],
            ],

            body:
              mealRows,

            theme:
              "plain",

            styles: {
              font:
                "helvetica",

              fontSize:
                8.5,

              cellPadding:
                2.5,

              textColor:
                BLACK,

              lineColor:
                LIGHT_GREY,

              lineWidth:
                0.15,

              valign:
                "middle",

              minCellHeight:
                6.5,

              overflow:
                "linebreak",
            },

            headStyles: {
              fillColor:
                BLUE,

              textColor: [
                255,
                255,
                255,
              ],

              fontStyle:
                "bold",
            },

            margin: {
              left: LEFT,
              right: 15,
            },

            pageBreak:
              "auto",
          });

          y =
            doc.lastAutoTable
              .finalY + 4;
        }

        // -----------------------------------------------
        // FREE TIME
        // -----------------------------------------------

        if (
          day.freeTime
        ) {
          y =
            drawLabelValue(
              y,
              "Free Time",
              day.freeTime
            );
        }

        // -----------------------------------------------
        // DAY NOTES
        // -----------------------------------------------

        if (
          day.notes
        ) {
          y =
            drawLabelValue(
              y,
              "Day Notes",
              day.notes
            );
        }

        y += 3;

        // -----------------------------------------------
        // DIVIDER
        // -----------------------------------------------

        if (
          dayIndex <
          days.length - 1
        ) {
          doc.setDrawColor(
            ...LIGHT_GREY
          );

          doc.setLineWidth(
            0.15
          );

          doc.line(
            LEFT,
            y,
            RIGHT,
            y
          );

          y += 4;
        }
      }
    );

    y += 4;
  }

  // ===================================================
  // TRAVEL INFORMATION
  // ===================================================

  y =
    drawHeading(
      y,
      "Travel Information"
    );

  // ===================================================
  // INCLUSIONS
  // ===================================================

  if (
    Array.isArray(
      itinerary.inclusions
    ) &&
    itinerary.inclusions
      .length
  ) {
    y =
      drawHeading(
        y,
        "Inclusions"
      );

    y =
      drawBullets(
        y,
        itinerary.inclusions
      );

    y += 4;
  }

  // ===================================================
  // EXCLUSIONS
  // ===================================================

  if (
    Array.isArray(
      itinerary.exclusions
    ) &&
    itinerary.exclusions
      .length
  ) {
    y =
      drawHeading(
        y,
        "Exclusions"
      );

    y =
      drawBullets(
        y,
        itinerary.exclusions
      );

    y += 4;
  }

  // ===================================================
  // IMPORTANT NOTES
  // ===================================================

  if (
    Array.isArray(
      itinerary.importantNotes
    ) &&
    itinerary.importantNotes
      .length
  ) {
    y =
      drawHeading(
        y,
        "Important Notes"
      );

    y =
      drawBullets(
        y,
        itinerary.importantNotes
      );

    y += 4;
  }

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
    y =
      drawHeading(
        y,
        "Emergency Contact"
      );

    autoTable(doc, {
      startY:
        y,

      body: [
        [
          "Name",

          pdfText(
            itinerary
              .emergencyContact
              ?.name
          ),

          "Phone",

          pdfText(
            itinerary
              .emergencyContact
              ?.phone
          ),
        ],

        [
          "Email",

          pdfText(
            itinerary
              .emergencyContact
              ?.email
          ),

          "",

          "",
        ],
      ],

      theme:
        "plain",

      styles: {
        font:
          "helvetica",

        fontSize:
          9,

        cellPadding:
          2.5,

        textColor:
          BLACK,

        lineColor:
          LIGHT_GREY,

        lineWidth:
          0.15,

        valign:
          "middle",

        minCellHeight:
          7,

        overflow:
          "linebreak",
      },

      columnStyles: {
        0: {
          fontStyle:
            "bold",

          cellWidth:
            30,

          textColor:
            GREY,
        },

        1: {
          cellWidth:
            65,
        },

        2: {
          fontStyle:
            "bold",

          cellWidth:
            30,

          textColor:
            GREY,
        },

        3: {
          cellWidth:
            65,
        },
      },

      margin: {
        left: LEFT,
        right: 15,
      },

      pageBreak:
        "avoid",
    });

    y =
      doc.lastAutoTable
        .finalY + 8;
  }

  // ===================================================
  // ADDITIONAL NOTES
  // ===================================================

  if (
    itinerary.notes
  ) {
    y =
      drawHeading(
        y,
        "Additional Notes"
      );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(
      9.5
    );

    doc.setTextColor(
      ...BLACK
    );

    const noteLines =
      doc.splitTextToSize(
        String(
          itinerary.notes
        ),
        CONTENT_WIDTH - 4
      );

    let noteIndex = 0;

    while (
      noteIndex <
      noteLines.length
    ) {
      const availableHeight =
        contentBottom - y;

      const maxLines =
        Math.max(
          1,
          Math.floor(
            availableHeight /
              4.5
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
        LEFT + 2,
        y
      );

      noteIndex +=
        chunk.length;

      if (
        noteIndex <
        noteLines.length
      ) {
        /*
         * NEW PAGE
         *
         * NO HEADER HERE.
         */

        doc.addPage();

        y =
          otherPageTop;
      } else {
        y +=
          chunk.length *
          4.5;
      }
    }
  }

  // ===================================================
  // FOOTER
  // LAST PAGE ONLY
  // ===================================================

  const totalPages =
    doc.internal.getNumberOfPages();

  for (
    let page = 1;
    page <= totalPages;
    page++
  ) {
    doc.setPage(page);

    /*
     * IMPORTANT:
     *
     * Footer image ONLY on final page.
     */

    if (
      footerImage &&
      page ===
        totalPages
    ) {
      try {
        doc.addImage(
          footerImage,
          "PNG",
          0,
          pageHeight -
            footerHeight,
          pageWidth,
          footerHeight
        );
      } catch {}
    }
  }

  // ===================================================
  // FILENAME
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
    `${number}-${
      cleanTitle ||
      "travel-itinerary"
    }.pdf`;

  // ===================================================
  // DOWNLOAD
  // ===================================================

  doc.save(
    filename
  );
}