
const mongoose = require("mongoose");

const Quotation = require("../models/Quotation");
const Itinerary = require("../models/Itinerary");
const Enquiry = require("../models/Enquiry");
const Customer = require("../models/Customer");
const Lead = require("../models/Lead");
const Trip = require("../models/Trip");
const User = require("../models/User");

const {
  createNotification,
} = require("../services/notificationService");

/* ======================================================
   HELPER: GET PACKAGE MODEL
====================================================== */

const getPackageModel = () => {
  try {
    return require("../models/Package");
  } catch (err) {
    return mongoose.model("Package");
  }
};

/* ======================================================
   HELPER: NORMALIZE EMPTY STRINGS TO NULL
====================================================== */

const normalizeObjectIdFields = (body) => {
  const objectIdFields = [
    "customer",
    "lead",
    "trip",
    "package",
    "assignedTo",
    "enquiry",
  ];

  objectIdFields.forEach((field) => {
    if (
      Object.prototype.hasOwnProperty.call(body, field) &&
      (body[field] === "" || body[field] === undefined)
    ) {
      body[field] = null;
    }
  });

  return body;
};

// ======================================================
// HELPER: CALCULATE TOTAL DAYS
// ======================================================

const calculateTotalDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  const difference = end.getTime() - start.getTime();

  if (difference < 0) return 0;

  return Math.ceil(difference / (1000 * 60 * 60 * 24)) + 1;
};

// ======================================================
// HELPER: CALCULATE TOTAL NIGHTS
// ======================================================

const calculateTotalNights = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  const difference = end.getTime() - start.getTime();

  if (difference < 0) return 0;

  return Math.ceil(difference / (1000 * 60 * 60 * 24));
};

// ======================================================
// HELPER: CALCULATE PRICING
// ======================================================

const calculatePricing = ({
  baseAmount,
  markupType,
  markupValue,
  discountType,
  discountValue,
  taxPercentage,
  costAmount,
}) => {
  const numericBaseAmount = Number(baseAmount) || 0;
  const numericMarkupValue = Number(markupValue) || 0;
  const numericDiscountValue = Number(discountValue) || 0;
  const numericTaxPercentage = Number(taxPercentage) || 0;
  const numericCostAmount = Number(costAmount) || 0;

  let markupAmount = 0;

  if (markupType === "Percentage") {
    markupAmount =
      (numericBaseAmount * numericMarkupValue) / 100;
  } else if (markupType === "Fixed") {
    markupAmount = numericMarkupValue;
  }

  const amountAfterMarkup =
    numericBaseAmount + markupAmount;

  let discountAmount = 0;

  if (discountType === "Percentage") {
    discountAmount =
      (amountAfterMarkup * numericDiscountValue) / 100;
  } else if (discountType === "Fixed") {
    discountAmount = numericDiscountValue;
  }

  const amountAfterDiscount =
    amountAfterMarkup - discountAmount;

  const taxAmount =
    (amountAfterDiscount * numericTaxPercentage) / 100;

  const totalAmount =
    amountAfterDiscount + taxAmount;

  const estimatedProfit =
    totalAmount - numericCostAmount;

  return {
    baseAmount: numericBaseAmount,
    markupValue: numericMarkupValue,
    markupAmount,
    discountValue: numericDiscountValue,
    discountAmount,
    taxPercentage: numericTaxPercentage,
    taxAmount,
    totalAmount,
    costAmount: numericCostAmount,
    estimatedProfit,
  };
};

// ======================================================
// HELPER: GENERATE ITINERARY NUMBER
// ======================================================

const generateItineraryNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `IT-${year}-`;

  const lastItinerary = await Itinerary.findOne({
    itineraryNumber: new RegExp(`^${prefix}`),
  })
    .sort({ createdAt: -1 })
    .select("itineraryNumber")
    .lean();

  let nextNumber = 1;

  if (lastItinerary?.itineraryNumber) {
    const lastNumber = parseInt(
      lastItinerary.itineraryNumber.replace(prefix, ""),
      10
    );

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

// ======================================================
// HELPER: BUILD EMPTY DAY SLOTS
// ======================================================

const buildEmptyDaySlots = (startDate, endDate) => {
  const totalDays = calculateTotalDays(
    startDate,
    endDate
  );

  if (totalDays <= 0) return [];

  return Array.from({ length: totalDays }, (_, index) => {
    let date = null;

    if (startDate) {
      const start = new Date(startDate);

      if (!Number.isNaN(start.getTime())) {
        start.setDate(start.getDate() + index);
        date = start;
      }
    }

    return {
      dayNumber: index + 1,
      date,
      title: `Day ${index + 1}`,
      description: "",
      city: "",
      location: "",
      activities: [],
      hotel: {
        hotel: null,
        name: "",
        roomType: "",
        checkIn: "",
        checkOut: "",
        nights: 0,
        notes: "",
      },
      transport: [],
      meals: [],
      freeTime: "",
      notes: "",
    };
  });
};

// ======================================================
// HELPER: NORMALIZE ITINERARY DAY
// ======================================================

const normalizeItineraryDay = (
  day,
  index,
  fallbackDate
) => {
  const date = day?.date
    ? new Date(day.date)
    : fallbackDate || null;

  /* ACTIVITIES */

  const activities = Array.isArray(day?.activities)
    ? day.activities
        .map((activity) => {
          if (typeof activity === "string") {
            return {
              name: activity.trim(),
              description: "",
              startTime: "",
              endTime: "",
              location: "",
              duration: 0,
              amount: 0,
              included: true,
              notes: "",
            };
          }

          return {
            name: (activity?.name || "").trim(),
            description: activity?.description || "",
            startTime: activity?.startTime || "",
            endTime: activity?.endTime || "",
            location: activity?.location || "",
            duration:
              Number(activity?.duration) || 0,
            amount:
              Number(activity?.amount) || 0,
            included:
              activity?.included !== undefined
                ? Boolean(activity.included)
                : true,
            notes: activity?.notes || "",
          };
        })
        .filter((activity) => activity.name)
    : [];

  /* TRANSPORT */

  const transport = Array.isArray(day?.transport)
    ? day.transport
        .map((item) => {
          const trimmedType =
            (item?.type || "").trim();

          return {
            transport: item?.transport || null,
            type: trimmedType || "Other",
            from: (item?.from || "").trim(),
            to: (item?.to || "").trim(),
            departureTime:
              item?.departureTime || "",
            arrivalTime:
              item?.arrivalTime || "",
            notes: item?.notes || "",
          };
        })
        .filter(
          (item) =>
            item.from ||
            item.to ||
            item.type
        )
    : [];

  /* MEALS */

  const meals = Array.isArray(day?.meals)
    ? day.meals
        .map((meal) => {
          const trimmedType =
            (meal?.type || "").trim();

          return {
            type: trimmedType || "Breakfast",
            included:
              meal?.included !== undefined
                ? Boolean(meal.included)
                : true,
            restaurant:
              meal?.restaurant || "",
            notes: meal?.notes || "",
          };
        })
        .filter((meal) => meal.type)
    : [];

  return {
    dayNumber:
      Number(day?.dayNumber) || index + 1,

    date,

    title:
      (day?.title || `Day ${index + 1}`).trim(),

    description: day?.description || "",

    city: day?.city || "",

    location: day?.location || "",

    activities,

    hotel: {
      hotel:
        day?.hotel?.hotel || null,
      name:
        (day?.hotel?.name || "").trim(),
      roomType:
        day?.hotel?.roomType || "",
      checkIn:
        day?.hotel?.checkIn || "",
      checkOut:
        day?.hotel?.checkOut || "",
      nights:
        Number(day?.hotel?.nights) || 0,
      notes:
        day?.hotel?.notes || "",
    },

    transport,

    meals,

    freeTime:
      day?.freeTime || "",

    notes:
      day?.notes || "",
  };
};

// ======================================================
// HELPER: BUILD ITINERARY DAYS
// ======================================================

const buildItineraryDays = ({
  travelDate,
  returnDate,
  userDays,
}) => {
  const autoDays = buildEmptyDaySlots(
    travelDate,
    returnDate
  );

  if (
    !Array.isArray(userDays) ||
    userDays.length === 0
  ) {
    return autoDays;
  }

  const maxLength = Math.max(
    autoDays.length,
    userDays.length
  );

  return Array.from(
    { length: maxLength },
    (_, index) => {
      const userDay = userDays[index];
      const fallbackDate =
        autoDays[index]?.date;

      if (userDay) {
        return normalizeItineraryDay(
          userDay,
          index,
          fallbackDate
        );
      }

      return null;
    }
  ).filter(Boolean);
};

// ======================================================
// HELPER: CREATE ITINERARY FROM QUOTATION
// ======================================================

const createQuotationItinerary = async ({
  quotation,
  preparedBy,
  userItineraryData = null,
}) => {
  const totalDays = calculateTotalDays(
    quotation.travelDate,
    quotation.returnDate
  );

  const totalNights = calculateTotalNights(
    quotation.travelDate,
    quotation.returnDate
  );

  const itineraryNumber =
    await generateItineraryNumber();

  const days = buildItineraryDays({
    travelDate: quotation.travelDate,
    returnDate: quotation.returnDate,
    userDays:
      userItineraryData?.days,
  });

  const itinerary =
    await Itinerary.create({
      itineraryNumber,

      title:
        userItineraryData?.title ||
        quotation.title,

      quotation:
        quotation._id,

      trip:
        quotation.trip || null,

      booking: null,

      customer:
        quotation.customer || null,

      destination:
        userItineraryData?.destination ||
        quotation.destination,

      startDate:
        quotation.travelDate || null,

      endDate:
        quotation.returnDate || null,

      totalDays,

      totalNights,

      status:
        userItineraryData?.status ||
        "Draft",

      days,

      inclusions:
        Array.isArray(
          userItineraryData?.inclusions
        )
          ? userItineraryData.inclusions.filter(
              Boolean
            )
          : Array.isArray(
              quotation.inclusions
            )
          ? quotation.inclusions
          : [],

      exclusions:
        Array.isArray(
          userItineraryData?.exclusions
        )
          ? userItineraryData.exclusions.filter(
              Boolean
            )
          : Array.isArray(
              quotation.exclusions
            )
          ? quotation.exclusions
          : [],

      importantNotes:
        Array.isArray(
          userItineraryData?.importantNotes
        )
          ? userItineraryData.importantNotes.filter(
              Boolean
            )
          : quotation.notes
          ? [quotation.notes]
          : [],

      emergencyContact: {
        name:
          userItineraryData
            ?.emergencyContact?.name || "",

        phone:
          userItineraryData
            ?.emergencyContact?.phone || "",

        email:
          userItineraryData
            ?.emergencyContact?.email || "",
      },

      preparedBy,

      notes:
        userItineraryData?.notes ||
        quotation.termsAndConditions ||
        "",
    });

  return itinerary;
};

// ======================================================
// HELPER: SYNC ITINERARY WITH QUOTATION
// ======================================================

const syncItineraryWithQuotation = async (
  quotation
) => {
  if (!quotation.itinerary) {
    return null;
  }

  const itinerary =
    await Itinerary.findById(
      quotation.itinerary
    );

  if (!itinerary) {
    return null;
  }

  const oldTotalDays =
    itinerary.totalDays;

  const newTotalDays =
    calculateTotalDays(
      quotation.travelDate,
      quotation.returnDate
    );

  const newTotalNights =
    calculateTotalNights(
      quotation.travelDate,
      quotation.returnDate
    );

  itinerary.title =
    quotation.title;

  itinerary.customer =
    quotation.customer || null;

  itinerary.trip =
    quotation.trip || null;

  itinerary.destination =
    quotation.destination;

  itinerary.startDate =
    quotation.travelDate || null;

  itinerary.endDate =
    quotation.returnDate || null;

  itinerary.totalDays =
    newTotalDays;

  itinerary.totalNights =
    newTotalNights;

  itinerary.inclusions =
    quotation.inclusions || [];

  itinerary.exclusions =
    quotation.exclusions || [];

  itinerary.importantNotes =
    quotation.notes
      ? [quotation.notes]
      : [];

  itinerary.notes =
    quotation.termsAndConditions ||
    "";

  if (
    newTotalDays > 0 &&
    oldTotalDays !== newTotalDays
  ) {
    const existingDays =
      Array.isArray(itinerary.days)
        ? itinerary.days
        : [];

    itinerary.days =
      buildItineraryDays({
        travelDate:
          quotation.travelDate,

        returnDate:
          quotation.returnDate,

        userDays:
          existingDays,
      });
  }

  await itinerary.save();

  return itinerary;
};

// ======================================================
// HELPER: POPULATE QUOTATION
// ======================================================

const populateQuotation = (query) => {
  return query
    .populate("enquiry")
    .populate("customer")
    .populate("lead")
    .populate("trip")
    .populate("package")
    .populate({
      path: "itinerary",
      populate: [
        {
          path: "days.hotel.hotel",
          model: "Hotel",
        },
        {
          path: "days.transport.transport",
          model: "Transport",
        },
      ],
    })
    .populate(
      "preparedBy",
      "name email role"
    )
    .populate(
      "assignedTo",
      "name email role"
    );
};

// ======================================================
// CREATE QUOTATION
// Multiple quotations per enquiry allowed
// ======================================================

const createQuotation = async (
  req,
  res
) => {
  try {
    normalizeObjectIdFields(
      req.body
    );

    const {
      title,
      enquiry,
      customer,
      lead,
      trip,
      assignedTo,
      destination,
      travelDate,
      returnDate,
      adults,
      children,
      infants,
      currency,

      hotels,
      transport,
      activities,
      otherServices,

      baseAmount,
      markupType,
      markupValue,
      discountType,
      discountValue,
      taxPercentage,
      costAmount,

      validUntil,

      termsAndConditions,
      inclusions,
      exclusions,
      notes,

      itinerary: itineraryData,
      package: packageId,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        message:
          "Quotation title is required",
      });
    }

    if (!enquiry) {
      return res.status(400).json({
        message:
          "Enquiry is required",
      });
    }

    if (!destination) {
      return res.status(400).json({
        message:
          "Destination is required",
      });
    }

    if (
      !req.user ||
      !req.user._id
    ) {
      return res.status(401).json({
        message:
          "Authenticated user not found",
      });
    }

    const enquiryDoc =
      await Enquiry.findById(
        enquiry
      );

    if (!enquiryDoc) {
      return res.status(404).json({
        message:
          "Enquiry not found",
      });
    }

    // NO DUPLICATE CHECK
    // Multiple quotations allowed

    if (packageId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          packageId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid package ID",
        });
      }

      const PackageModel =
        getPackageModel();

      const packageExists =
        await PackageModel.findById(
          packageId
        );

      if (!packageExists) {
        return res.status(404).json({
          message:
            "Package not found",
        });
      }
    }

    const finalCustomer =
      customer ||
      enquiryDoc.customer ||
      null;

    if (finalCustomer) {
      const customerExists =
        await Customer.findById(
          finalCustomer
        );

      if (!customerExists) {
        return res.status(404).json({
          message:
            "Customer not found",
        });
      }
    }

    const finalLead =
      lead ||
      enquiryDoc.lead ||
      null;

    if (finalLead) {
      const leadExists =
        await Lead.findById(
          finalLead
        );

      if (!leadExists) {
        return res.status(404).json({
          message:
            "Lead not found",
        });
      }
    }

    if (trip) {
      const tripExists =
        await Trip.findById(trip);

      if (!tripExists) {
        return res.status(404).json({
          message:
            "Trip not found",
        });
      }
    }

    if (assignedTo) {
      const assignedUser =
        await User.findById(
          assignedTo
        );

      if (!assignedUser) {
        return res.status(404).json({
          message:
            "Assigned user not found",
        });
      }

      if (
        ![
          "admin",
          "manager",
          "sales",
        ].includes(
          assignedUser.role
        )
      ) {
        return res.status(400).json({
          message:
            "Quotation can only be assigned to admin, manager or sales user",
        });
      }
    }

    const finalMarkupType =
      markupType || "Percentage";

    const finalDiscountType =
      discountType || "Fixed";

    if (
      ![
        "Percentage",
        "Fixed",
      ].includes(finalMarkupType)
    ) {
      return res.status(400).json({
        message:
          "markupType must be Percentage or Fixed",
      });
    }

    if (
      ![
        "Percentage",
        "Fixed",
      ].includes(finalDiscountType)
    ) {
      return res.status(400).json({
        message:
          "discountType must be Percentage or Fixed",
      });
    }

    const pricing =
      calculatePricing({
        baseAmount,
        markupType:
          finalMarkupType,
        markupValue,
        discountType:
          finalDiscountType,
        discountValue,
        taxPercentage,
        costAmount,
      });

    const quotationNumber =
      `QT-${Date.now()}`;

    const quotation =
      await Quotation.create({
        quotationNumber,

        title,
        enquiry,
        customer: finalCustomer,
        lead: finalLead,
        trip: trip || null,
        itinerary: null,
        package:
          packageId || null,

        preparedBy:
          req.user._id,

        assignedTo:
          assignedTo || null,

        destination,

        travelDate:
          travelDate || null,

        returnDate:
          returnDate || null,

        adults:
          Number(adults) || 1,

        children:
          Number(children) || 0,

        infants:
          Number(infants) || 0,

        currency:
          currency || "INR",

        hotels:
          hotels || [],

        transport:
          transport || [],

        activities:
          activities || [],

        otherServices:
          otherServices || [],

        baseAmount:
          pricing.baseAmount,

        markupType:
          finalMarkupType,

        markupValue:
          pricing.markupValue,

        markupAmount:
          pricing.markupAmount,

        discountType:
          finalDiscountType,

        discountValue:
          pricing.discountValue,

        discountAmount:
          pricing.discountAmount,

        taxPercentage:
          pricing.taxPercentage,

        taxAmount:
          pricing.taxAmount,

        totalAmount:
          pricing.totalAmount,

        costAmount:
          pricing.costAmount,

        estimatedProfit:
          pricing.estimatedProfit,

        status: "Draft",

        validUntil:
          validUntil || null,

        termsAndConditions:
          termsAndConditions || "",

        inclusions:
          inclusions || [],

        exclusions:
          exclusions || [],

        notes:
          notes || "",
      });

    if (!packageId) {
      const itinerary =
        await createQuotationItinerary({
          quotation,
          preparedBy:
            req.user._id,
          userItineraryData:
            itineraryData,
        });

      quotation.itinerary =
        itinerary._id;

      await quotation.save();
    }

    if (
      [
        "New",
        "In Progress",
        "Waiting for Customer",
      ].includes(
        enquiryDoc.status
      )
    ) {
      enquiryDoc.status =
        "Quotation Prepared";

      await enquiryDoc.save();
    }

    const populatedQuotation =
      await populateQuotation(
        Quotation.findById(
          quotation._id
        )
      );

    try {
      if (assignedTo) {
        await createNotification({
          recipient: assignedTo,

          type:
            "QUOTATION_CREATED",

          title:
            "New Quotation Created",

          message:
            `Quotation ${quotation.quotationNumber} has been created and assigned to you.`,

          relatedQuotation:
            quotation._id,
        });
      }
    } catch (
      notificationError
    ) {
      console.error(
        "Notification Error:",
        notificationError.message
      );
    }

    return res.status(201).json({
      message:
        "Quotation created successfully",

      quotation:
        populatedQuotation,
    });
  } catch (error) {
    console.error(
      "Create Quotation Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to create quotation",

      error:
        error.message,
    });
  }
};

// ======================================================
// GET ALL QUOTATIONS
// ======================================================

const getQuotations = async (
  req,
  res
) => {
  try {
    const {
      status,
      enquiry,
      customer,
      lead,
      trip,
      assignedTo,
      search,
    } = req.query;

    const filter = {};

    if (status)
      filter.status = status;

    if (enquiry)
      filter.enquiry = enquiry;

    if (customer)
      filter.customer = customer;

    if (lead)
      filter.lead = lead;

    if (trip)
      filter.trip = trip;

    if (assignedTo)
      filter.assignedTo =
        assignedTo;

    if (search) {
      filter.$or = [
        {
          quotationNumber: {
            $regex: search,
            $options: "i",
          },
        },

        {
          title: {
            $regex: search,
            $options: "i",
          },
        },

        {
          destination: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const quotations =
      await populateQuotation(
        Quotation.find(filter).sort({
          createdAt: -1,
        })
      );

    return res.status(200).json({
      count:
        quotations.length,

      quotations,
    });
  } catch (error) {
    console.error(
      "Get Quotations Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch quotations",

      error:
        error.message,
    });
  }
};

// ======================================================
// GET QUOTATION BY ID
// ======================================================

const getQuotationById = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid quotation ID",
      });
    }

    const quotation =
      await populateQuotation(
        Quotation.findById(id)
      );

    if (!quotation) {
      return res.status(404).json({
        message:
          "Quotation not found",
      });
    }

    return res.status(200).json({
      quotation,
    });
  } catch (error) {
    console.error(
      "Get Quotation By ID Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch quotation",

      error:
        error.message,
    });
  }
};

// ======================================================
// UPDATE QUOTATION
// ======================================================

const updateQuotation = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid quotation ID",
      });
    }

    const quotation =
      await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        message:
          "Quotation not found",
      });
    }

    normalizeObjectIdFields(
      req.body
    );

    const allowedFields = [
      "title",
      "customer",
      "lead",
      "trip",
      "assignedTo",
      "package",
      "destination",
      "travelDate",
      "returnDate",
      "adults",
      "children",
      "infants",
      "currency",
      "hotels",
      "transport",
      "activities",
      "otherServices",
      "baseAmount",
      "markupType",
      "markupValue",
      "discountType",
      "discountValue",
      "taxPercentage",
      "costAmount",
      "validUntil",
      "termsAndConditions",
      "inclusions",
      "exclusions",
      "notes",
      "status",
    ];

    /*
      IMPORTANT:

      Negotiation is allowed here because
      frontend pipeline may update quotation
      status through PUT /:id.

      Converted is intentionally NOT included.

      Converted should only happen after
      successful booking creation.
    */

    const allowedStatuses = [
      "Draft",
      "Prepared",
      "Sent",
      "Viewed",
      "Negotiation",
      "Accepted",
      "Rejected",
      "Cancelled",
    ];

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "status"
      )
    ) {
      if (
        !allowedStatuses.includes(
          req.body.status
        )
      ) {
        return res.status(400).json({
          message:
            `Invalid quotation status. Allowed statuses: ${allowedStatuses.join(
              ", "
            )}`,
        });
      }

      /*
        Converted quotations cannot be
        changed back through generic update.
      */

      if (
        quotation.status ===
        "Converted"
      ) {
        return res.status(400).json({
          message:
            "Converted quotation cannot be modified through status update",
        });
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "package"
      ) &&
      req.body.package
    ) {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.body.package
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid package ID",
        });
      }

      const PackageModel =
        getPackageModel();

      const packageExists =
        await PackageModel.findById(
          req.body.package
        );

      if (!packageExists) {
        return res.status(404).json({
          message:
            "Package not found",
        });
      }
    }

    const oldStatus =
      quotation.status;

    allowedFields.forEach(
      (field) => {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body,
            field
          )
        ) {
          quotation[field] =
            req.body[field];
        }
      }
    );

    if (quotation.customer) {
      const customerExists =
        await Customer.findById(
          quotation.customer
        );

      if (!customerExists) {
        return res.status(404).json({
          message:
            "Customer not found",
        });
      }
    }

    if (quotation.lead) {
      const leadExists =
        await Lead.findById(
          quotation.lead
        );

      if (!leadExists) {
        return res.status(404).json({
          message:
            "Lead not found",
        });
      }
    }

    if (quotation.trip) {
      const tripExists =
        await Trip.findById(
          quotation.trip
        );

      if (!tripExists) {
        return res.status(404).json({
          message:
            "Trip not found",
        });
      }
    }

    if (quotation.assignedTo) {
      const assignedUser =
        await User.findById(
          quotation.assignedTo
        );

      if (!assignedUser) {
        return res.status(404).json({
          message:
            "Assigned user not found",
        });
      }

      if (
        ![
          "admin",
          "manager",
          "sales",
        ].includes(
          assignedUser.role
        )
      ) {
        return res.status(400).json({
          message:
            "Quotation can only be assigned to admin, manager or sales user",
        });
      }
    }

    if (
      ![
        "Percentage",
        "Fixed",
      ].includes(
        quotation.markupType
      )
    ) {
      return res.status(400).json({
        message:
          "markupType must be Percentage or Fixed",
      });
    }

    if (
      ![
        "Percentage",
        "Fixed",
      ].includes(
        quotation.discountType
      )
    ) {
      return res.status(400).json({
        message:
          "discountType must be Percentage or Fixed",
      });
    }

    const pricing =
      calculatePricing({
        baseAmount:
          quotation.baseAmount,

        markupType:
          quotation.markupType,

        markupValue:
          quotation.markupValue,

        discountType:
          quotation.discountType,

        discountValue:
          quotation.discountValue,

        taxPercentage:
          quotation.taxPercentage,

        costAmount:
          quotation.costAmount,
      });

    quotation.baseAmount =
      pricing.baseAmount;

    quotation.markupValue =
      pricing.markupValue;

    quotation.markupAmount =
      pricing.markupAmount;

    quotation.discountValue =
      pricing.discountValue;

    quotation.discountAmount =
      pricing.discountAmount;

    quotation.taxPercentage =
      pricing.taxPercentage;

    quotation.taxAmount =
      pricing.taxAmount;

    quotation.totalAmount =
      pricing.totalAmount;

    quotation.costAmount =
      pricing.costAmount;

    quotation.estimatedProfit =
      pricing.estimatedProfit;

    const newStatus =
      quotation.status;

    if (newStatus !== oldStatus) {
      if (
        newStatus === "Sent"
      ) {
        quotation.sentAt =
          new Date();
      }

      if (
        newStatus === "Viewed"
      ) {
        quotation.viewedAt =
          new Date();
      }

      if (
        newStatus === "Accepted"
      ) {
        quotation.acceptedAt =
          new Date();
      }

      if (
        newStatus === "Rejected"
      ) {
        quotation.rejectedAt =
          new Date();
      }
    }

    await quotation.save();

    let itinerary = null;

    const {
      itinerary: itineraryData,
    } = req.body;

    if (
      itineraryData &&
      quotation.itinerary
    ) {
      const existingItinerary =
        await Itinerary.findById(
          quotation.itinerary
        );

      if (existingItinerary) {
        if (
          Array.isArray(
            itineraryData.days
          )
        ) {
          existingItinerary.days =
            buildItineraryDays({
              travelDate:
                quotation.travelDate,

              returnDate:
                quotation.returnDate,

              userDays:
                itineraryData.days,
            });
        }

        if (itineraryData.title) {
          existingItinerary.title =
            itineraryData.title;
        }

        if (
          itineraryData.destination
        ) {
          existingItinerary.destination =
            itineraryData.destination;
        }

        if (
          Array.isArray(
            itineraryData.inclusions
          )
        ) {
          existingItinerary.inclusions =
            itineraryData.inclusions;
        }

        if (
          Array.isArray(
            itineraryData.exclusions
          )
        ) {
          existingItinerary.exclusions =
            itineraryData.exclusions;
        }

        if (
          itineraryData.notes !==
          undefined
        ) {
          existingItinerary.notes =
            itineraryData.notes;
        }

        existingItinerary.totalDays =
          calculateTotalDays(
            quotation.travelDate,
            quotation.returnDate
          );

        existingItinerary.totalNights =
          calculateTotalNights(
            quotation.travelDate,
            quotation.returnDate
          );

        await existingItinerary.save();

        itinerary =
          existingItinerary;
      }
    } else if (
      quotation.itinerary
    ) {
      itinerary =
        await syncItineraryWithQuotation(
          quotation
        );
    }

    // ==================================================
    // STATUS SIDE EFFECTS
    // ==================================================

    if (newStatus !== oldStatus) {
      if (
        newStatus === "Draft"
      ) {
        if (
          quotation.itinerary
        ) {
          await Itinerary.findByIdAndUpdate(
            quotation.itinerary,
            {
              status: "Draft",
            }
          );
        }

        if (
          quotation.enquiry
        ) {
          await Enquiry.findByIdAndUpdate(
            quotation.enquiry,
            {
              status:
                "Quotation Prepared",
            }
          );
        }
      }

      if (
        newStatus === "Prepared"
      ) {
        if (
          quotation.itinerary
        ) {
          await Itinerary.findByIdAndUpdate(
            quotation.itinerary,
            {
              status: "Planning",
            }
          );
        }

        if (
          quotation.enquiry
        ) {
          await Enquiry.findByIdAndUpdate(
            quotation.enquiry,
            {
              status:
                "Quotation Prepared",
            }
          );
        }
      }

      if (
        newStatus === "Sent"
      ) {
        if (
          quotation.itinerary
        ) {
          await Itinerary.findByIdAndUpdate(
            quotation.itinerary,
            {
              status: "Shared",
              customerSharedAt:
                new Date(),
            }
          );
        }

        if (
          quotation.enquiry
        ) {
          await Enquiry.findByIdAndUpdate(
            quotation.enquiry,
            {
              status:
                "Quotation Sent",
            }
          );
        }
      }

      if (
        newStatus === "Viewed"
      ) {
        if (
          quotation.itinerary
        ) {
          await Itinerary.findByIdAndUpdate(
            quotation.itinerary,
            {
              status: "Shared",
            }
          );
        }
      }

      /*
        Negotiation does not change
        itinerary or enquiry status.

        The quotation simply moves into
        negotiation stage.
      */

      if (
        newStatus ===
        "Negotiation"
      ) {
        if (
          quotation.itinerary
        ) {
          await Itinerary.findByIdAndUpdate(
            quotation.itinerary,
            {
              status: "Shared",
            }
          );
        }

        if (
          quotation.enquiry
        ) {
          await Enquiry.findByIdAndUpdate(
            quotation.enquiry,
            {
              status:
                "Quotation Sent",
            }
          );
        }
      }

      if (
        newStatus === "Accepted"
      ) {
        if (
          quotation.itinerary
        ) {
          await Itinerary.findByIdAndUpdate(
            quotation.itinerary,
            {
              status: "Approved",
              approvedBy:
                req.user._id,
              approvedAt:
                new Date(),
            }
          );
        }

        if (
          quotation.enquiry
        ) {
          await Enquiry.findByIdAndUpdate(
            quotation.enquiry,
            {
              status: "Confirmed",
            }
          );
        }
      }

      if (
        newStatus === "Rejected"
      ) {
        if (
          quotation.itinerary
        ) {
          await Itinerary.findByIdAndUpdate(
            quotation.itinerary,
            {
              status:
                "Cancelled",
            }
          );
        }

        if (
          quotation.enquiry
        ) {
          await Enquiry.findByIdAndUpdate(
            quotation.enquiry,
            {
              status:
                "In Progress",
            }
          );
        }
      }

      if (
        newStatus === "Cancelled"
      ) {
        if (
          quotation.itinerary
        ) {
          await Itinerary.findByIdAndUpdate(
            quotation.itinerary,
            {
              status:
                "Cancelled",
            }
          );
        }

        if (
          quotation.enquiry
        ) {
          await Enquiry.findByIdAndUpdate(
            quotation.enquiry,
            {
              status:
                "Cancelled",
            }
          );
        }
      }

      if (
        quotation.itinerary
      ) {
        itinerary =
          await Itinerary.findById(
            quotation.itinerary
          );
      }
    }

    const updatedQuotation =
      await populateQuotation(
        Quotation.findById(id)
      );

    return res.status(200).json({
      message:
        "Quotation updated successfully",

      quotation:
        updatedQuotation,

      itinerary,
    });
  } catch (error) {
    console.error(
      "Update Quotation Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to update quotation",

      error:
        error.message,
    });
  }
};

// ======================================================
// DELETE QUOTATION
// ======================================================

const deleteQuotation = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid quotation ID",
      });
    }

    const quotation =
      await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        message:
          "Quotation not found",
      });
    }

    if (quotation.itinerary) {
      await Itinerary.findByIdAndDelete(
        quotation.itinerary
      );
    }

    await Quotation.findByIdAndDelete(
      id
    );

    return res.status(200).json({
      message:
        "Quotation and linked itinerary deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Quotation Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to delete quotation",

      error:
        error.message,
    });
  }
};

// ======================================================
// PREPARE QUOTATION
// ======================================================

const prepareQuotation = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const quotation =
      await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        message:
          "Quotation not found",
      });
    }

    if (
      quotation.status !==
      "Draft"
    ) {
      return res.status(400).json({
        message:
          "Only Draft quotations can be prepared",
      });
    }

    quotation.status =
      "Prepared";

    await quotation.save();

    if (quotation.itinerary) {
      await Itinerary.findByIdAndUpdate(
        quotation.itinerary,
        {
          status:
            "Planning",
        }
      );
    }

    if (quotation.enquiry) {
      await Enquiry.findByIdAndUpdate(
        quotation.enquiry,
        {
          status:
            "Quotation Prepared",
        }
      );
    }

    const updatedQuotation =
      await populateQuotation(
        Quotation.findById(id)
      );

    return res.status(200).json({
      message:
        "Quotation prepared successfully",

      quotation:
        updatedQuotation,
    });
  } catch (error) {
    console.error(
      "Prepare Quotation Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to prepare quotation",

      error:
        error.message,
    });
  }
};

// ======================================================
// SEND QUOTATION
// ======================================================

const sendQuotation = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const quotation =
      await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        message:
          "Quotation not found",
      });
    }

    if (
      ![
        "Prepared",
        "Viewed",
      ].includes(
        quotation.status
      )
    ) {
      return res.status(400).json({
        message:
          "Only Prepared or Viewed quotations can be sent",
      });
    }

    quotation.status =
      "Sent";

    quotation.sentAt =
      new Date();

    await quotation.save();

    if (quotation.itinerary) {
      await Itinerary.findByIdAndUpdate(
        quotation.itinerary,
        {
          status: "Shared",
          customerSharedAt:
            new Date(),
        }
      );
    }

    if (quotation.enquiry) {
      await Enquiry.findByIdAndUpdate(
        quotation.enquiry,
        {
          status:
            "Quotation Sent",
        }
      );
    }

    const updatedQuotation =
      await populateQuotation(
        Quotation.findById(id)
      );

    return res.status(200).json({
      message:
        "Quotation sent successfully",

      quotation:
        updatedQuotation,
    });
  } catch (error) {
    console.error(
      "Send Quotation Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to send quotation",

      error:
        error.message,
    });
  }
};

// ======================================================
// VIEW QUOTATION
// ======================================================

const viewQuotation = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const quotation =
      await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        message:
          "Quotation not found",
      });
    }

    if (
      quotation.status ===
      "Sent"
    ) {
      quotation.status =
        "Viewed";

      quotation.viewedAt =
        new Date();

      await quotation.save();
    }

    const updatedQuotation =
      await populateQuotation(
        Quotation.findById(id)
      );

    return res.status(200).json({
      message:
        "Quotation viewed successfully",

      quotation:
        updatedQuotation,
    });
  } catch (error) {
    console.error(
      "View Quotation Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to view quotation",

      error:
        error.message,
    });
  }
};

// ======================================================
// NEGOTIATE QUOTATION
// ======================================================

const negotiateQuotation = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid quotation ID",
      });
    }

    const quotation =
      await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        message:
          "Quotation not found",
      });
    }

    /*
      Negotiation can start only after
      quotation has been sent/viewed.
    */

    if (
      ![
        "Sent",
        "Viewed",
      ].includes(
        quotation.status
      )
    ) {
      return res.status(400).json({
        message:
          "Only Sent or Viewed quotations can enter negotiation",
      });
    }

    quotation.status =
      "Negotiation";

    await quotation.save();

    /*
      Itinerary remains Shared because
      customer is still discussing the quotation.
    */

    if (quotation.itinerary) {
      await Itinerary.findByIdAndUpdate(
        quotation.itinerary,
        {
          status:
            "Shared",
        }
      );
    }

    if (quotation.enquiry) {
      await Enquiry.findByIdAndUpdate(
        quotation.enquiry,
        {
          status:
            "Quotation Sent",
        }
      );
    }

    const updatedQuotation =
      await populateQuotation(
        Quotation.findById(id)
      );

    return res.status(200).json({
      message:
        "Quotation moved to negotiation successfully",

      quotation:
        updatedQuotation,
    });
  } catch (error) {
    console.error(
      "Negotiate Quotation Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to move quotation to negotiation",

      error:
        error.message,
    });
  }
};

// ======================================================
// ACCEPT QUOTATION
// ======================================================

const acceptQuotation = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid quotation ID",
      });
    }

    const quotation =
      await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        message:
          "Quotation not found",
      });
    }

    /*
      Accepted can come from:

      Sent
      Viewed
      Negotiation
    */

    if (
      ![
        "Sent",
        "Viewed",
        "Negotiation",
      ].includes(
        quotation.status
      )
    ) {
      return res.status(400).json({
        message:
          "Only Sent, Viewed or Negotiation quotations can be accepted",
      });
    }

    quotation.status =
      "Accepted";

    quotation.acceptedAt =
      new Date();

    await quotation.save();

    if (quotation.itinerary) {
      await Itinerary.findByIdAndUpdate(
        quotation.itinerary,
        {
          status:
            "Approved",

          approvedBy:
            req.user._id,

          approvedAt:
            new Date(),
        }
      );
    }

    if (quotation.enquiry) {
      await Enquiry.findByIdAndUpdate(
        quotation.enquiry,
        {
          status:
            "Confirmed",
        }
      );
    }

    const updatedQuotation =
      await populateQuotation(
        Quotation.findById(id)
      );

    return res.status(200).json({
      message:
        "Quotation accepted successfully",

      quotation:
        updatedQuotation,
    });
  } catch (error) {
    console.error(
      "Accept Quotation Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to accept quotation",

      error:
        error.message,
    });
  }
};

// ======================================================
// REJECT QUOTATION
// ======================================================

const rejectQuotation = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const {
      rejectionReason,
    } = req.body;

    const quotation =
      await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        message:
          "Quotation not found",
      });
    }

    /*
      Negotiation quotation can also
      be rejected.
    */

    if (
      ![
        "Sent",
        "Viewed",
        "Negotiation",
      ].includes(
        quotation.status
      )
    ) {
      return res.status(400).json({
        message:
          "Only Sent, Viewed or Negotiation quotations can be rejected",
      });
    }

    quotation.status =
      "Rejected";

    quotation.rejectedAt =
      new Date();

    quotation.rejectionReason =
      rejectionReason || "";

    await quotation.save();

    if (quotation.itinerary) {
      await Itinerary.findByIdAndUpdate(
        quotation.itinerary,
        {
          status:
            "Cancelled",
        }
      );
    }

    if (quotation.enquiry) {
      await Enquiry.findByIdAndUpdate(
        quotation.enquiry,
        {
          status:
            "In Progress",
        }
      );
    }

    const updatedQuotation =
      await populateQuotation(
        Quotation.findById(id)
      );

    return res.status(200).json({
      message:
        "Quotation rejected successfully",

      quotation:
        updatedQuotation,
    });
  } catch (error) {
    console.error(
      "Reject Quotation Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to reject quotation",

      error:
        error.message,
    });
  }
};

// ======================================================
// CANCEL QUOTATION
// ======================================================

const cancelQuotation = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const quotation =
      await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        message:
          "Quotation not found",
      });
    }

    /*
      Accepted and Converted quotations
      cannot be cancelled from quotation
      workflow.

      Once accepted, booking conversion
      should happen.

      Once converted, booking owns the
      operational lifecycle.
    */

    if (
      quotation.status ===
        "Accepted" ||
      quotation.status ===
        "Converted" ||
      quotation.status ===
        "Cancelled"
    ) {
      return res.status(400).json({
        message:
          `Quotation cannot be cancelled when status is ${quotation.status}`,
      });
    }

    quotation.status =
      "Cancelled";

    await quotation.save();

    if (quotation.itinerary) {
      await Itinerary.findByIdAndUpdate(
        quotation.itinerary,
        {
          status:
            "Cancelled",
        }
      );
    }

    if (quotation.enquiry) {
      await Enquiry.findByIdAndUpdate(
        quotation.enquiry,
        {
          status:
            "Cancelled",
        }
      );
    }

    const updatedQuotation =
      await populateQuotation(
        Quotation.findById(id)
      );

    return res.status(200).json({
      message:
        "Quotation cancelled successfully",

      quotation:
        updatedQuotation,
    });
  } catch (error) {
    console.error(
      "Cancel Quotation Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to cancel quotation",

      error:
        error.message,
    });
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,

  prepareQuotation,
  sendQuotation,
  viewQuotation,
  negotiateQuotation,
  acceptQuotation,
  rejectQuotation,
  cancelQuotation,
};

