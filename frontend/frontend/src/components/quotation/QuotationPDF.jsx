import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* =========================================================
   ULT HOLIDAYS — SIMPLE PDF
========================================================= */

const BLUE = [24, 0, 172];
const GOLD = [174, 167, 1];
const BLACK = [26, 26, 26];
const GREY = [110, 110, 110];
const LIGHT_GREY = [230, 230, 230];

const HEADER_IMAGE = "/images/cult-header.png";
const FOOTER_IMAGE = "/images/cult-footer.png";

/* =========================================================
   IMAGE LOADER
========================================================= */

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed: ${src}`));
    img.src = src;
  });

const getImageHeight = (image, width) => {
  if (!image?.naturalWidth || !image?.naturalHeight) return 30;
  return width * (image.naturalHeight / image.naturalWidth);
};

/* =========================================================
   HELPERS
========================================================= */

function getMealsText(meals) {
  if (!meals) return "";
  if (typeof meals === "string") return meals;

  if (Array.isArray(meals)) {
    return meals
      .map((m) => (typeof m === "string" ? m : m?.type))
      .filter(Boolean)
      .join(", ");
  }

  if (typeof meals === "object") {
    const result = [];
    if (meals.breakfast) result.push("Breakfast");
    if (meals.lunch) result.push("Lunch");
    if (meals.dinner) result.push("Dinner");
    return result.join(", ");
  }
  return "";
}

function getActivitiesText(activities) {
  if (!Array.isArray(activities)) return "";
  return activities
    .map((a) => (typeof a === "string" ? a : a?.name))
    .filter(Boolean)
    .join(", ");
}

function buildMealPlanText(quotation) {
  const hotels = quotation?.hotels || [];
  if (hotels.length === 0) {
    const days = quotation?.itinerary?.days || [];
    const mealSet = new Set();
    days.forEach((day) => {
      (day?.meals || []).forEach((meal) => {
        if (meal?.type) mealSet.add(meal.type);
      });
    });
    if (mealSet.size > 0) return Array.from(mealSet).join(", ");
    return "Not Specified";
  }
  const allInclusions = hotels
    .flatMap((h) => (Array.isArray(h?.inclusions) ? h.inclusions : []))
    .filter(Boolean);
  if (allInclusions.length > 0) return allInclusions.join(", ");
  return "Not Specified";
}

function buildRoomsText(quotation) {
  const hotels = quotation?.hotels || [];
  const totalRooms = hotels.reduce(
    (sum, hotel) => sum + (Number(hotel?.rooms) || 0),
    0
  );
  if (totalRooms > 0) return `${totalRooms} Room${totalRooms > 1 ? "s" : ""}`;
  return "01 Double Room";
}

function buildPickupDropText(quotation) {
  const dep = quotation?.departureCity || "";
  const dest = quotation?.destination || "";
  if (dep && dest) return `${dep} To ${dest}`;
  if (dest) return dest;
  return "As Per Itinerary";
}

function buildVehicleText(quotation) {
  const days = quotation?.itinerary?.days || [];
  for (const day of days) {
    // Backend array bhejta hai
    const tr = Array.isArray(day?.transport)
      ? day.transport[0] || {}
      : day?.transport || {};
    const type = tr?.type || tr?.transport?.type || tr?.transport?.name;
    if (type) return type;
  }
  return "Sedan";
}

/* =========================================================
   MAIN PDF GENERATOR
========================================================= */

export const generateQuotationPDF = async (quotation) => {
  if (!quotation) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const currency = quotation.currency || "INR";

  let headerImage = null;
  let footerImage = null;

  try {
    headerImage = await loadImage(HEADER_IMAGE);
  } catch {
    console.warn("Header image not found");
  }

  try {
    footerImage = await loadImage(FOOTER_IMAGE);
  } catch {
    console.warn("Footer image not found");
  }

  const headerHeight = headerImage
    ? getImageHeight(headerImage, pageWidth)
    : 0;
  const footerHeight = footerImage
    ? getImageHeight(footerImage, pageWidth)
    : 0;

  const LEFT = 15;
  const RIGHT = pageWidth - 15;
  const CONTENT_WIDTH = RIGHT - LEFT;
  const contentTopMargin = 15;
  const contentBottom = pageHeight - (footerImage ? footerHeight + 8 : 15);

  const money = (value) =>
    `${currency} ${Number(value || 0).toLocaleString("en-IN")}`;

  const safeDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const ensureSpace = (y, h = 12) => {
    if (y + h > contentBottom) {
      doc.addPage();
      return contentTopMargin;
    }
    return y;
  };

  const drawHeading = (y, title) => {
    y = ensureSpace(y, 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLUE);
    doc.text(title.toUpperCase(), LEFT, y);

    y += 1.5;

    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.5);
    doc.line(LEFT, y, RIGHT, y);

    return y + 6;
  };

  const drawBullets = (y, items, fontSize = 9.5) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(...BLACK);

    items.forEach((item) => {
      const lines = doc.splitTextToSize(`•  ${item}`, CONTENT_WIDTH - 4);
      y = ensureSpace(y, lines.length * 4.5);
      doc.text(lines, LEFT + 2, y);
      y += lines.length * 4.5 + 1.2;
    });

    return y;
  };

  /* HEADER IMAGE */
  if (headerImage) {
    try {
      doc.addImage(headerImage, "PNG", 0, 0, pageWidth, headerHeight);
    } catch {}
  }

  let y = headerHeight + 8;

  /* TITLE */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...BLACK);
  doc.text(quotation.title || "Travel Quotation", pageWidth / 2, y, {
    align: "center",
  });

  y += 6;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(...GREY);
  doc.text("Greetings From Cult Holidays", pageWidth / 2, y, {
    align: "center",
  });

  y += 10;

  /* SUMMARY */
  const totalPax =
    (Number(quotation.adults) || 0) +
    (Number(quotation.children) || 0) +
    (Number(quotation.infants) || 0);

  const roomsText = quotation.package
    ? buildRoomsText({ hotels: quotation.package?.hotels || [] })
    : buildRoomsText(quotation);

  const mealPlanText = quotation.package
    ? quotation.package?.mealPlan || "Not Specified"
    : buildMealPlanText(quotation);

  const vehicleText = quotation.package
    ? quotation.package?.transportation || "As Per Package"
    : buildVehicleText(quotation);

  const travelDateText =
    quotation.travelDate && quotation.returnDate
      ? `${safeDate(quotation.travelDate)} - ${safeDate(quotation.returnDate)}`
      : safeDate(quotation.travelDate);

  const totalDaysFromSource = getTotalDays(quotation);
  const totalNightsFromSource = getTotalNights(quotation);

  const durationText =
    totalDaysFromSource > 0
      ? `${totalNightsFromSource}N / ${totalDaysFromSource}D`
      : "—";

  const paxText = `${totalPax} ${
    totalPax === 1 ? "Person" : "Persons"
  } (${quotation.adults || 0}A${
    quotation.children ? `, ${quotation.children}C` : ""
  }${quotation.infants ? `, ${quotation.infants}I` : ""})`;

  const summaryRows = [
    ["Total Pax", paxText, "Travel Date", travelDateText],
    ["Destination", quotation.destination || "—", "Duration", durationText],
    ["Rooms", roomsText, "Meal Plan", mealPlanText],
    [
      "Pickup & Drop",
      buildPickupDropText(quotation),
      "Vehicle",
      vehicleText,
    ],
  ];

  autoTable(doc, {
    startY: y,
    body: summaryRows,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      cellPadding: 2.8,
      textColor: BLACK,
      lineColor: LIGHT_GREY,
      lineWidth: 0.15,
      valign: "middle",
      minCellHeight: 7.5,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 32, textColor: GREY },
      1: { cellWidth: 63 },
      2: { fontStyle: "bold", cellWidth: 32, textColor: GREY },
      3: { cellWidth: 63 },
    },
    margin: { left: LEFT, right: 15 },
    pageBreak: "avoid",
  });

  y = doc.lastAutoTable.finalY + 6;

  /* TOTAL COST */
  y = ensureSpace(y, 15);

  doc.setDrawColor(...LIGHT_GREY);
  doc.setLineWidth(0.3);
  doc.line(LEFT, y, RIGHT, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...BLACK);
  doc.text("Total Cost", LEFT, y);

  doc.setTextColor(...BLUE);
  doc.setFontSize(14);
  doc.text(`${money(quotation.totalAmount)} /-`, RIGHT, y, {
    align: "right",
  });

  y += 5;

  doc.setDrawColor(...LIGHT_GREY);
  doc.setLineWidth(0.3);
  doc.line(LEFT, y, RIGHT, y);

  y += 10;

  /* MODE DETECTION */
  const hasPackage = Boolean(quotation.package);
  const packageItinerary =
    Array.isArray(quotation.package?.itinerary) &&
    quotation.package.itinerary.length > 0
      ? quotation.package.itinerary
      : null;

  const manualItinerary =
    quotation.itinerary?.days?.length > 0 ? quotation.itinerary : null;

  /* PACKAGE MODE */
  if (hasPackage) {
    const pkg = quotation.package;

    y = drawHeading(y, "Selected Package");

    const pkgInfoRows = [
      ["Package Name", pkg.name || "—"],
      ["Destination", pkg.destination || "—"],
      [
        "Duration",
        pkg.duration
          ? `${pkg.duration.days} Days / ${pkg.duration.nights} Nights`
          : "—",
      ],
      ["Hotel Category", pkg.hotelCategory || "—"],
      ["Meal Plan", pkg.mealPlan || "—"],
      ["Transportation", pkg.transportation || "—"],
    ];

    autoTable(doc, {
      startY: y,
      body: pkgInfoRows,
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 9.5,
        cellPadding: 2.5,
        textColor: BLACK,
        lineColor: LIGHT_GREY,
        lineWidth: 0.15,
        valign: "middle",
        minCellHeight: 7,
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 40, textColor: GREY },
        1: { cellWidth: 150 },
      },
      margin: { left: LEFT, right: 15 },
      pageBreak: "avoid",
    });

    y = doc.lastAutoTable.finalY + 6;

    if (pkg.pricing) {
      const pricingRows = [];
      if (pkg.pricing.adultPrice > 0)
        pricingRows.push(["Adult", money(pkg.pricing.adultPrice)]);
      if (pkg.pricing.childPrice > 0)
        pricingRows.push(["Child", money(pkg.pricing.childPrice)]);
      if (pkg.pricing.infantPrice > 0)
        pricingRows.push(["Infant", money(pkg.pricing.infantPrice)]);

      if (pricingRows.length > 0) {
        y = drawHeading(y, "Package Pricing");

        autoTable(doc, {
          startY: y,
          body: pricingRows,
          theme: "plain",
          styles: {
            font: "helvetica",
            fontSize: 9.5,
            cellPadding: 2.5,
            textColor: BLACK,
            lineColor: LIGHT_GREY,
            lineWidth: 0.15,
            valign: "middle",
            minCellHeight: 7,
          },
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 60, textColor: GREY },
            1: { cellWidth: 130, fontStyle: "bold", halign: "right" },
          },
          margin: { left: LEFT, right: 15 },
          pageBreak: "avoid",
        });

        y = doc.lastAutoTable.finalY + 6;
      }
    }

    if (Array.isArray(pkg.inclusions) && pkg.inclusions.length > 0) {
      y = drawHeading(y, "Inclusions");
      y = drawBullets(y, pkg.inclusions);
      y += 4;
    }

    if (Array.isArray(pkg.exclusions) && pkg.exclusions.length > 0) {
      y = drawHeading(y, "Exclusions");
      y = drawBullets(y, pkg.exclusions);
      y += 4;
    }

    if (packageItinerary && packageItinerary.length > 0) {
      y = drawHeading(y, "Day-wise Itinerary");

      packageItinerary.forEach((day, index) => {
        y = ensureSpace(y, 20);

        const dayNum = day.dayNumber || index + 1;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(...BLUE);
        doc.text(`Day ${dayNum}`, LEFT, y);

        const cleanTitle = String(day.title || "").trim();
        const isDuplicateTitle = new RegExp(
          `^day\\s*${dayNum}\\s*$`,
          "i"
        ).test(cleanTitle);

        if (cleanTitle && !isDuplicateTitle) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10.5);
          doc.setTextColor(...BLACK);

          const titleLines = doc.splitTextToSize(
            cleanTitle,
            CONTENT_WIDTH - 22
          );
          doc.text(titleLines[0], LEFT + 18, y);
        }

        y += 6;

        const lines = [];
        if (day.destination) lines.push(["Destination", day.destination]);
        if (day.description) lines.push(["Description", day.description]);

        const activitiesText = getActivitiesText(day.activities);
        if (activitiesText) lines.push(["Activities", activitiesText]);

        if (Array.isArray(day.meals) && day.meals.length > 0) {
          lines.push(["Meals", day.meals.join(", ")]);
        }
        if (day.overnightStay) lines.push(["Overnight", day.overnightStay]);
        if (day.notes) lines.push(["Notes", day.notes]);

        lines.forEach(([label, text]) => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(...GREY);
          doc.text(`${label}:`, LEFT + 3, y);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(...BLACK);
          const textLines = doc.splitTextToSize(
            String(text),
            CONTENT_WIDTH - 30
          );
          y = ensureSpace(y, textLines.length * 4.5);
          doc.text(textLines, LEFT + 26, y);
          y += textLines.length * 4.5 + 1;
        });

        y += 3;

        if (index < packageItinerary.length - 1) {
          doc.setDrawColor(...LIGHT_GREY);
          doc.setLineWidth(0.15);
          doc.line(LEFT, y, RIGHT, y);
          y += 4;
        }
      });

      y += 4;
    }
  }

  /* MANUAL ITINERARY */
  if (!hasPackage && manualItinerary?.days?.length > 0) {
    y = drawHeading(y, "Day-wise Itinerary");

    manualItinerary.days.forEach((day, index) => {
      y = ensureSpace(y, 20);

      const dayNum = day.dayNumber || index + 1;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...BLUE);
      doc.text(`Day ${dayNum}`, LEFT, y);

      const cleanTitle = String(day.title || "").trim();
      const isDuplicateTitle = new RegExp(
        `^day\\s*${dayNum}\\s*$`,
        "i"
      ).test(cleanTitle);

      if (cleanTitle && !isDuplicateTitle) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(...BLACK);

        const titleLines = doc.splitTextToSize(
          cleanTitle,
          CONTENT_WIDTH - 22
        );
        doc.text(titleLines[0], LEFT + 18, y);
      }

      y += 6;

      const lines = [];

      if (day.date) lines.push(["Date", safeDate(day.date)]);
      if (day.city || day.location) {
        lines.push([
          "Location",
          [day.city, day.location].filter(Boolean).join(", "),
        ]);
      }
      if (day.description) lines.push(["Description", day.description]);

      const activitiesText = getActivitiesText(day.activities);
      if (activitiesText) lines.push(["Activities", activitiesText]);

      /* HOTEL — Sirf Day-wise me */
      const hotelRaw = day?.hotel?.hotel;
      const hotelObj =
        hotelRaw && typeof hotelRaw === "object" ? hotelRaw : null;

      const hotelName = day?.hotel?.name || hotelObj?.name || "";
      const hotelCity =
        day?.hotel?.city ||
        hotelObj?.city ||
        hotelObj?.destination ||
        day?.city ||
        "";
      const hotelRating =
        day?.hotel?.rating ?? hotelObj?.rating ?? null;
      const hotelRoomType = day?.hotel?.roomType || "";

      if (hotelName) {
        const parts = [hotelName];
        if (hotelCity) parts.push(hotelCity);
        if (hotelRating !== null && hotelRating !== undefined) {
          parts.push(`${Number(hotelRating).toFixed(1)} Star`);
        }
        if (hotelRoomType) parts.push(hotelRoomType);

        lines.push(["Hotel", parts.join("  |  ")]);
      }

      /* TRANSPORT — Backend array bhejta hai */
      let trType = "";
      let trCapacity = null;

      if (Array.isArray(day?.transport) && day.transport.length > 0) {
        const first = day.transport[0];
        trType =
          first?.type ||
          first?.transport?.type ||
          first?.transport?.name ||
          first?.transport?.title ||
          "";
        trCapacity =
          first?.capacity ??
          first?.transport?.vehicleDetails?.capacity ??
          null;
      } else if (day?.transport && !Array.isArray(day.transport)) {
        trType =
          day.transport?.type ||
          day.transport?.transport?.type ||
          day.transport?.transport?.name ||
          day.transport?.transport?.title ||
          "";
        trCapacity =
          day.transport?.capacity ??
          day.transport?.transport?.vehicleDetails?.capacity ??
          null;
      }

      if (trType) {
        const parts = [trType];
        if (trCapacity) parts.push(`${trCapacity} Seater`);
        lines.push(["Transport", parts.join("  —  ")]);
      }

      const mealsText = getMealsText(day.meals);
      if (mealsText) lines.push(["Meals", mealsText]);
      if (day.freeTime) lines.push(["Free Time", day.freeTime]);
      if (day.notes) lines.push(["Notes", day.notes]);

      lines.forEach(([label, text]) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...GREY);
        doc.text(`${label}:`, LEFT + 3, y);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...BLACK);
        const textLines = doc.splitTextToSize(
          String(text),
          CONTENT_WIDTH - 30
        );
        y = ensureSpace(y, textLines.length * 4.5);
        doc.text(textLines, LEFT + 26, y);
        y += textLines.length * 4.5 + 1;
      });

      y += 3;

      if (index < manualItinerary.days.length - 1) {
        doc.setDrawColor(...LIGHT_GREY);
        doc.setLineWidth(0.15);
        doc.line(LEFT, y, RIGHT, y);
        y += 4;
      }
    });

    y += 4;
  }

  /* INCLUSIONS */
  if (
    Array.isArray(quotation.inclusions) &&
    quotation.inclusions.length > 0 &&
    !hasPackage
  ) {
    y = drawHeading(y, "Inclusions");
    y = drawBullets(y, quotation.inclusions);
    y += 4;
  }

  /* EXCLUSIONS */
  if (
    Array.isArray(quotation.exclusions) &&
    quotation.exclusions.length > 0 &&
    !hasPackage
  ) {
    y = drawHeading(y, "Exclusions");
    y = drawBullets(y, quotation.exclusions);
    y += 4;
  }

  /* ❌ HOTELS LIST SECTION — HATA DIYA */
  /* ❌ TRANSPORT LIST SECTION — HATA DIYA */

  /* PAYMENT POLICY */
  y = drawHeading(y, "Payment Policy");

  const paymentPolicy = [
    "30% of the total package amount is payable at the time of booking.",
    "40% (Second Installment) must be paid 15 days prior to the departure date.",
    "Remaining balance must be settled upon arrival at the destination.",
  ];

  y = drawBullets(y, paymentPolicy);
  y += 4;

  /* CANCELLATION POLICY */
  y = ensureSpace(y, 20);
  y = drawHeading(y, "Cancellation & Refund Policy");

  const cancellationPolicy = [
    "Booking amount is non-refundable if cancellation is made within 0-3 working days prior to departure, including no-show.",
    "If cancellation is made 4-6 working days prior to departure, no refund shall be applicable.",
    "If cancellation is made 7 or more working days prior to departure, 30% of total package cost will be refunded.",
    "All applicable taxes, service charges, supplier penalties, GST, and payment gateway charges are non-refundable.",
    '"Working days" shall mean Monday to Saturday, excluding public holidays.',
    "All cancellation requests must be submitted in writing via email or WhatsApp. Date of receipt will be considered official cancellation date.",
    "Refunds, if applicable, will be processed within 30-45 working days, subject to confirmation from hotels, transport providers, and third-party vendors.",
    "GST, convenience fees, and transaction charges are non-refundable.",
    "In case of force majeure events (natural calamities, government restrictions, strikes, pandemics, etc.), refunds shall be subject to recoveries from respective service providers.",
    "The company reserves the right to amend or revise the cancellation policy for future bookings only, based on supplier terms and operational requirements.",
  ];

  y = drawBullets(y, cancellationPolicy, 9);
  y += 6;

  /* FOOTER + PAGE NUMBERS */
  const totalPages = doc.internal.getNumberOfPages();

  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    if (footerImage && page === totalPages) {
      try {
        doc.addImage(
          footerImage,
          "PNG",
          0,
          pageHeight - footerHeight,
          pageWidth,
          footerHeight
        );
      } catch {}
    }

    if (page !== totalPages) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GREY);

      doc.text("Travel Quotation", LEFT, pageHeight - 6);
      doc.text(`Page ${page} of ${totalPages}`, RIGHT, pageHeight - 6, {
        align: "right",
      });
    }
  }

  const fileName = quotation.quotationNumber
    ? `${quotation.quotationNumber}.pdf`
    : "Travel-Quotation.pdf";

  doc.save(fileName);
};

/* =========================================================
   QUICK HELPERS
========================================================= */

function getTotalDays(quotation) {
  if (quotation.package?.duration?.days) {
    return Number(quotation.package.duration.days) || 0;
  }
  const days = quotation.itinerary?.days || [];
  return quotation.itinerary?.totalDays || days.length || 0;
}

function getTotalNights(quotation) {
  if (quotation.package?.duration?.nights) {
    return Number(quotation.package.duration.nights) || 0;
  }
  const days = quotation.itinerary?.days || [];
  return (
    quotation.itinerary?.totalNights ||
    (days.length > 0 ? days.length - 1 : 0)
  );
}