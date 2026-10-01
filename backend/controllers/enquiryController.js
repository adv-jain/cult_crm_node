
const mongoose = require("mongoose");

const Enquiry = require("../models/Enquiry");
const Lead = require("../models/Lead");
const Customer = require("../models/Customer");
const User = require("../models/User");

const {
  createNotification,
} = require("../services/notificationService");

// ======================================================
// HELPERS
// ======================================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ------------------------------------------------------
// DATE VALIDATION
// ------------------------------------------------------

const validateTravelDates = (travelDate, returnDate) => {
  if (!travelDate && !returnDate) {
    return null;
  }

  if (travelDate) {
    const startDate = new Date(travelDate);

    if (Number.isNaN(startDate.getTime())) {
      return "Invalid travel date";
    }
  }

  if (returnDate) {
    const endDate = new Date(returnDate);

    if (Number.isNaN(endDate.getTime())) {
      return "Invalid return date";
    }
  }

  if (travelDate && returnDate) {
    const startDate = new Date(travelDate);
    const endDate = new Date(returnDate);

    if (endDate < startDate) {
      return "Return date cannot be before travel date";
    }
  }

  return null;
};

// ------------------------------------------------------
// TRIP DURATION
// ------------------------------------------------------

const calculateTripDuration = (travelDate, returnDate) => {
  if (!travelDate || !returnDate) {
    return null;
  }

  const startDate = new Date(travelDate);
  const endDate = new Date(returnDate);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return null;
  }

  const difference =
    endDate.getTime() - startDate.getTime();

  if (difference < 0) {
    return null;
  }

  return Math.ceil(
    difference / (1000 * 60 * 60 * 24)
  );
};

// ------------------------------------------------------
// BUDGET VALIDATION
// ------------------------------------------------------

const validateBudget = (budgetMin, budgetMax) => {
  if (
    budgetMin !== undefined &&
    budgetMin !== null &&
    Number(budgetMin) < 0
  ) {
    return "Minimum budget cannot be negative";
  }

  if (
    budgetMax !== undefined &&
    budgetMax !== null &&
    Number(budgetMax) < 0
  ) {
    return "Maximum budget cannot be negative";
  }

  if (
    budgetMin !== undefined &&
    budgetMin !== null &&
    budgetMax !== undefined &&
    budgetMax !== null &&
    Number(budgetMax) < Number(budgetMin)
  ) {
    return "Maximum budget cannot be less than minimum budget";
  }

  return null;
};

// ------------------------------------------------------
// GET ACTIVE SALES USERS
// ------------------------------------------------------

const getActiveSalesUserIds = async () => {
  const salesUsers = await User.find({
    role: "sales",
    isActive: true,
  }).select("_id");

  return salesUsers.map((user) => user._id);
};

// ------------------------------------------------------
// MANAGER ENQUIRY ACCESS
// ------------------------------------------------------

const isManagerEnquiry = async (enquiry) => {
  if (!enquiry?.assignedTo) {
    return false;
  }

  const assignedUser = await User.findById(
    enquiry.assignedTo
  ).select("role isActive");

  return Boolean(
    assignedUser &&
      assignedUser.role === "sales" &&
      assignedUser.isActive
  );
};

// ======================================================
// CREATE ENQUIRY
// ======================================================

const createEnquiry = async (req, res) => {
  try {
    const {
      title,
      lead,
      customer,
      assignedTo,
      destination,
      departureCity,
      travelDate,
      returnDate,
      flexibleDates,
      adults,
      children,
      infants,
      travelType,
      tripDuration,
      hotelCategory,
      roomPreference,
      transportation,
      mealPreference,
      budgetMin,
      budgetMax,
      currency,
      specialRequirements,
      status,
      priority,
      source,
      quotationRequired,
      quotationDueDate,
      notes,
    } = req.body;

    // --------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------

    if (
      !destination ||
      typeof destination !== "string" ||
      !destination.trim()
    ) {
      return res.status(400).json({
        message: "Destination is required",
      });
    }

    // --------------------------------------------------
    // DATE VALIDATION
    // --------------------------------------------------

    const dateError = validateTravelDates(
      travelDate,
      returnDate
    );

    if (dateError) {
      return res.status(400).json({
        message: dateError,
      });
    }

    // --------------------------------------------------
    // BUDGET VALIDATION
    // --------------------------------------------------

    const budgetError = validateBudget(
      budgetMin,
      budgetMax
    );

    if (budgetError) {
      return res.status(400).json({
        message: budgetError,
      });
    }

    // --------------------------------------------------
    // VALIDATE ASSIGNED USER
    // --------------------------------------------------

    const finalAssignedTo =
      assignedTo || req.user.id;

    if (!isValidObjectId(finalAssignedTo)) {
      return res.status(400).json({
        message: "Invalid assigned user ID",
      });
    }

    const assignedUser = await User.findById(
      finalAssignedTo
    );

    if (!assignedUser) {
      return res.status(404).json({
        message: "Assigned user not found",
      });
    }

    if (!assignedUser.isActive) {
      return res.status(400).json({
        message: "Cannot assign enquiry to an inactive user",
      });
    }

    // Sales can only assign to themselves
    if (
      req.user.role === "sales" &&
      finalAssignedTo.toString() !==
        req.user.id.toString()
    ) {
      return res.status(403).json({
        message:
          "Sales users can only assign enquiries to themselves",
      });
    }

    // Manager can only assign to sales
    if (
      req.user.role === "manager" &&
      assignedUser.role !== "sales"
    ) {
      return res.status(403).json({
        message:
          "Manager can assign enquiries only to sales users",
      });
    }

    // --------------------------------------------------
    // VALIDATE LEAD
    // --------------------------------------------------

    let leadDocument = null;

    if (lead) {
      if (!isValidObjectId(lead)) {
        return res.status(400).json({
          message: "Invalid lead ID",
        });
      }

      leadDocument = await Lead.findById(lead);

      if (!leadDocument) {
        return res.status(404).json({
          message: "Lead not found",
        });
      }
    }

    // --------------------------------------------------
    // VALIDATE CUSTOMER
    // --------------------------------------------------

    let customerDocument = null;

    if (customer) {
      if (!isValidObjectId(customer)) {
        return res.status(400).json({
          message: "Invalid customer ID",
        });
      }

      customerDocument = await Customer.findById(
        customer
      );

      if (!customerDocument) {
        return res.status(404).json({
          message: "Customer not found",
        });
      }
    }

    // --------------------------------------------------
    // TRIP DURATION
    // --------------------------------------------------

    let finalTripDuration = tripDuration;

    if (travelDate && returnDate) {
      finalTripDuration =
        calculateTripDuration(
          travelDate,
          returnDate
        );
    }

    // --------------------------------------------------
    // CREATE ENQUIRY
    // --------------------------------------------------

    const enquiry = await Enquiry.create({
      title:
        title?.trim() ||
        `${destination.trim()} Travel Enquiry`,

      lead: lead || null,
      customer: customer || null,

      assignedTo: finalAssignedTo,

      destination: destination.trim(),
      departureCity:
        departureCity?.trim() || undefined,

      travelDate,
      returnDate,
      flexibleDates:
        flexibleDates !== undefined
          ? Boolean(flexibleDates)
          : false,

      adults:
        adults !== undefined
          ? adults
          : 1,

      children:
        children !== undefined
          ? children
          : 0,

      infants:
        infants !== undefined
          ? infants
          : 0,

      travelType,
      tripDuration: finalTripDuration,

      hotelCategory,
      roomPreference:
        roomPreference?.trim() || undefined,

      transportation,
      mealPreference,

      budgetMin:
        budgetMin !== undefined
          ? budgetMin
          : 0,

      budgetMax:
        budgetMax !== undefined
          ? budgetMax
          : 0,

      currency:
        currency?.trim() || "INR",

      specialRequirements,
      status: status || "New",
      priority: priority || "Medium",
      source,

      quotationRequired:
        quotationRequired !== undefined
          ? Boolean(quotationRequired)
          : true,

      quotationDueDate,
      notes,

      createdBy: req.user.id,
    });

    // --------------------------------------------------
    // NOTIFICATION
    // --------------------------------------------------

    await createNotification({
      recipient: finalAssignedTo,
      type: "ENQUIRY_ASSIGNED",
      title: "New Travel Enquiry Assigned",
      message: `A new travel enquiry for ${destination.trim()} has been assigned to you.`,
      relatedEnquiry: enquiry._id,
    });

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    const populatedEnquiry =
      await Enquiry.findById(enquiry._id)
        .populate(
          "lead",
          "firstName lastName email phone destination"
        )
        .populate(
          "customer",
          "firstName lastName email phone"
        )
        .populate(
          "assignedTo",
          "name email role"
        )
        .populate(
          "createdBy",
          "name email role"
        );

    return res.status(201).json({
      message: "Enquiry created successfully",
      enquiry: populatedEnquiry,
    });
  } catch (error) {
    console.error(
      "Create enquiry error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while creating enquiry",
      error: error.message,
    });
  }
};

// ======================================================
// GET ALL ENQUIRIES
// ======================================================

const getEnquiries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      travelType,
      destination,
      assignedTo,
      search,
    } = req.query;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    const pageNumber = Number.isNaN(parsedPage)
      ? 1
      : Math.max(parsedPage, 1);

    const limitNumber = Number.isNaN(parsedLimit)
      ? 10
      : Math.min(
          Math.max(parsedLimit, 1),
          100
        );

    const skip =
      (pageNumber - 1) * limitNumber;

    const filter = {};

    // --------------------------------------------------
    // ROLE BASED ACCESS
    // --------------------------------------------------

    if (req.user.role === "sales") {
      filter.assignedTo = req.user.id;
    }

    if (req.user.role === "manager") {
      const salesUserIds =
        await getActiveSalesUserIds();

      filter.assignedTo = {
        $in: salesUserIds,
      };

      // If manager requested a specific assignee,
      // ensure that user belongs to manager's sales scope.
      if (assignedTo) {
        if (!isValidObjectId(assignedTo)) {
          return res.status(400).json({
            message: "Invalid assigned user ID",
          });
        }

        const requestedUser =
          await User.findOne({
            _id: assignedTo,
            role: "sales",
            isActive: true,
          }).select("_id");

        if (!requestedUser) {
          return res.status(403).json({
            message:
              "Manager can only view enquiries assigned to active sales users",
          });
        }

        filter.assignedTo =
          requestedUser._id;
      }
    }

    // --------------------------------------------------
    // ADMIN FILTER
    // --------------------------------------------------

    if (
      assignedTo &&
      req.user.role === "admin"
    ) {
      if (!isValidObjectId(assignedTo)) {
        return res.status(400).json({
          message: "Invalid assigned user ID",
        });
      }

      filter.assignedTo = assignedTo;
    }

    // --------------------------------------------------
    // FILTERS
    // --------------------------------------------------

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (travelType) {
      filter.travelType = travelType;
    }

    if (destination) {
      filter.destination = {
        $regex: destination,
        $options: "i",
      };
    }

    // Sales should always remain restricted to own
    // enquiries even if assignedTo is supplied.
    if (
      assignedTo &&
      req.user.role === "sales"
    ) {
      filter.assignedTo = req.user.id;
    }

    // --------------------------------------------------
    // SEARCH
    // --------------------------------------------------

    if (search) {
      const safeSearch = search.trim();

      filter.$or = [
        {
          title: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          destination: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          departureCity: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          enquiryNumber: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    // --------------------------------------------------
    // QUERY
    // --------------------------------------------------

    const [enquiries, total] =
      await Promise.all([
        Enquiry.find(filter)
          .populate(
            "lead",
            "firstName lastName email phone destination"
          )
          .populate(
            "customer",
            "firstName lastName email phone"
          )
          .populate(
            "assignedTo",
            "name email role"
          )
          .populate(
            "createdBy",
            "name email role"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNumber),

        Enquiry.countDocuments(filter),
      ]);

    return res.status(200).json({
      message:
        "Enquiries fetched successfully",
      count: enquiries.length,
      total,
      page: pageNumber,
      pages: Math.ceil(
        total / limitNumber
      ),
      enquiries,
    });
  } catch (error) {
    console.error(
      "Get enquiries error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while fetching enquiries",
      error: error.message,
    });
  }
};

// ======================================================
// GET SINGLE ENQUIRY
// ======================================================

const getEnquiryById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid enquiry ID",
      });
    }

    const enquiry =
      await Enquiry.findById(id)
        .populate(
          "lead",
          "firstName lastName email phone destination travelDate"
        )
        .populate(
          "customer",
          "firstName lastName email phone"
        )
        .populate(
          "assignedTo",
          "name email role"
        )
        .populate(
          "createdBy",
          "name email role"
        );

    if (!enquiry) {
      return res.status(404).json({
        message: "Enquiry not found",
      });
    }

    // --------------------------------------------------
    // SALES ACCESS
    // --------------------------------------------------

    if (
      req.user.role === "sales" &&
      enquiry.assignedTo?._id.toString() !==
        req.user.id.toString()
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to view this enquiry",
      });
    }

    // --------------------------------------------------
    // MANAGER ACCESS
    // --------------------------------------------------

    if (req.user.role === "manager") {
      const allowed =
        await isManagerEnquiry(enquiry);

      if (!allowed) {
        return res.status(403).json({
          message:
            "You are not authorized to view this enquiry",
        });
      }
    }

    return res.status(200).json({
      message:
        "Enquiry fetched successfully",
      enquiry,
    });
  } catch (error) {
    console.error(
      "Get enquiry error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while fetching enquiry",
      error: error.message,
    });
  }
};

// ======================================================
// UPDATE ENQUIRY
// ======================================================

const updateEnquiry = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid enquiry ID",
      });
    }

    const enquiry =
      await Enquiry.findById(id);

    if (!enquiry) {
      return res.status(404).json({
        message: "Enquiry not found",
      });
    }

    // --------------------------------------------------
    // SALES ACCESS
    // --------------------------------------------------

    if (
      req.user.role === "sales" &&
      enquiry.assignedTo?.toString() !==
        req.user.id.toString()
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to update this enquiry",
      });
    }

    // --------------------------------------------------
    // MANAGER ACCESS
    // --------------------------------------------------

    if (req.user.role === "manager") {
      const allowed =
        await isManagerEnquiry(enquiry);

      if (!allowed) {
        return res.status(403).json({
          message:
            "Managers can only update enquiries assigned to active sales users",
        });
      }
    }

    // --------------------------------------------------
    // SAVE OLD ASSIGNEE
    // --------------------------------------------------

    const previousAssignedTo =
      enquiry.assignedTo
        ? enquiry.assignedTo.toString()
        : null;

    // --------------------------------------------------
    // ASSIGNMENT VALIDATION
    // --------------------------------------------------

    if (req.body.assignedTo !== undefined) {
      if (
        !isValidObjectId(
          req.body.assignedTo
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid assigned user ID",
        });
      }

      const assignedUser =
        await User.findById(
          req.body.assignedTo
        );

      if (!assignedUser) {
        return res.status(404).json({
          message:
            "Assigned user not found",
        });
      }

      if (!assignedUser.isActive) {
        return res.status(400).json({
          message:
            "Cannot assign enquiry to an inactive user",
        });
      }

      // Sales can only keep assignment to themselves
      if (
        req.user.role === "sales" &&
        req.body.assignedTo.toString() !==
          req.user.id.toString()
      ) {
        return res.status(403).json({
          message:
            "Sales users cannot assign enquiries to other users",
        });
      }

      // Manager can only assign to sales
      if (
        req.user.role === "manager" &&
        assignedUser.role !== "sales"
      ) {
        return res.status(403).json({
          message:
            "Manager can assign enquiries only to sales users",
        });
      }
    }

    // --------------------------------------------------
    // CUSTOMER VALIDATION
    // --------------------------------------------------

    if (req.body.customer !== undefined) {
      if (
        req.body.customer !== null &&
        !isValidObjectId(
          req.body.customer
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid customer ID",
        });
      }

      if (req.body.customer) {
        const customer =
          await Customer.findById(
            req.body.customer
          );

        if (!customer) {
          return res.status(404).json({
            message:
              "Customer not found",
          });
        }
      }
    }

    // --------------------------------------------------
    // LEAD VALIDATION
    // --------------------------------------------------

    if (req.body.lead !== undefined) {
      if (
        req.body.lead !== null &&
        !isValidObjectId(req.body.lead)
      ) {
        return res.status(400).json({
          message: "Invalid lead ID",
        });
      }

      if (req.body.lead) {
        const lead =
          await Lead.findById(
            req.body.lead
          );

        if (!lead) {
          return res.status(404).json({
            message:
              "Lead not found",
          });
        }
      }
    }

    // --------------------------------------------------
    // CALCULATE FINAL DATES
    // --------------------------------------------------

    const finalTravelDate =
      req.body.travelDate !== undefined
        ? req.body.travelDate
        : enquiry.travelDate;

    const finalReturnDate =
      req.body.returnDate !== undefined
        ? req.body.returnDate
        : enquiry.returnDate;

    const dateError =
      validateTravelDates(
        finalTravelDate,
        finalReturnDate
      );

    if (dateError) {
      return res.status(400).json({
        message: dateError,
      });
    }

    // --------------------------------------------------
    // CALCULATE FINAL BUDGET
    // --------------------------------------------------

    const finalBudgetMin =
      req.body.budgetMin !== undefined
        ? req.body.budgetMin
        : enquiry.budgetMin;

    const finalBudgetMax =
      req.body.budgetMax !== undefined
        ? req.body.budgetMax
        : enquiry.budgetMax;

    const budgetError =
      validateBudget(
        finalBudgetMin,
        finalBudgetMax
      );

    if (budgetError) {
      return res.status(400).json({
        message: budgetError,
      });
    }

    // --------------------------------------------------
    // ALLOWED FIELDS
    // --------------------------------------------------

    const allowedFields = [
      "title",
      "lead",
      "customer",
      "assignedTo",
      "destination",
      "departureCity",
      "travelDate",
      "returnDate",
      "flexibleDates",
      "adults",
      "children",
      "infants",
      "travelType",
      "tripDuration",
      "hotelCategory",
      "roomPreference",
      "transportation",
      "mealPreference",
      "budgetMin",
      "budgetMax",
      "currency",
      "specialRequirements",
      "status",
      "priority",
      "source",
      "quotationRequired",
      "quotationDueDate",
      "notes",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        enquiry[field] =
          req.body[field];
      }
    });

    // --------------------------------------------------
    // NORMALIZE STRING FIELDS
    // --------------------------------------------------

    if (
      typeof enquiry.title ===
      "string"
    ) {
      enquiry.title =
        enquiry.title.trim();
    }

    if (
      typeof enquiry.destination ===
      "string"
    ) {
      enquiry.destination =
        enquiry.destination.trim();
    }

    if (
      typeof enquiry.departureCity ===
      "string"
    ) {
      enquiry.departureCity =
        enquiry.departureCity.trim();
    }

    if (
      typeof enquiry.roomPreference ===
      "string"
    ) {
      enquiry.roomPreference =
        enquiry.roomPreference.trim();
    }

    if (
      typeof enquiry.currency ===
      "string"
    ) {
      enquiry.currency =
        enquiry.currency
          .trim()
          .toUpperCase();
    }

    // --------------------------------------------------
    // AUTO CALCULATE TRIP DURATION
    // --------------------------------------------------

    if (
      finalTravelDate &&
      finalReturnDate
    ) {
      const calculatedDuration =
        calculateTripDuration(
          finalTravelDate,
          finalReturnDate
        );

      if (
        calculatedDuration !== null
      ) {
        enquiry.tripDuration =
          calculatedDuration;
      }
    }

    await enquiry.save();

    // --------------------------------------------------
    // ASSIGNMENT NOTIFICATION
    // --------------------------------------------------

    const newAssignedTo =
      enquiry.assignedTo
        ? enquiry.assignedTo.toString()
        : null;

    if (
      newAssignedTo &&
      previousAssignedTo !==
        newAssignedTo
    ) {
      await createNotification({
        recipient: enquiry.assignedTo,
        type: "ENQUIRY_ASSIGNED",
        title:
          "Travel Enquiry Assigned",
        message: `A travel enquiry for ${enquiry.destination} has been assigned to you.`,
        relatedEnquiry:
          enquiry._id,
      });
    }

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    const updatedEnquiry =
      await Enquiry.findById(
        enquiry._id
      )
        .populate(
          "lead",
          "firstName lastName email phone destination"
        )
        .populate(
          "customer",
          "firstName lastName email phone"
        )
        .populate(
          "assignedTo",
          "name email role"
        )
        .populate(
          "createdBy",
          "name email role"
        );

    return res.status(200).json({
      message:
        "Enquiry updated successfully",
      enquiry: updatedEnquiry,
    });
  } catch (error) {
    console.error(
      "Update enquiry error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while updating enquiry",
      error: error.message,
    });
  }
};

// ======================================================
// DELETE ENQUIRY
// ======================================================

const deleteEnquiry = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid enquiry ID",
      });
    }

    const enquiry =
      await Enquiry.findById(id);

    if (!enquiry) {
      return res.status(404).json({
        message: "Enquiry not found",
      });
    }

    // --------------------------------------------------
    // DELETE SAFETY
    // --------------------------------------------------

    if (
      [
        "Confirmed",
        "Closed",
      ].includes(enquiry.status)
    ) {
      return res.status(400).json({
        message:
          "Confirmed or closed enquiries cannot be deleted",
      });
    }

    await Enquiry.findByIdAndDelete(
      id
    );

    return res.status(200).json({
      message:
        "Enquiry deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete enquiry error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while deleting enquiry",
      error: error.message,
    });
  }
};

// ======================================================
// ASSIGNABLE USERS
// ======================================================

const getAssignableUsers = async (
  req,
  res
) => {
  try {
    let filter = {
      isActive: true,
    };

    if (req.user.role === "manager") {
      filter.role = "sales";
    } else if (
      req.user.role === "admin"
    ) {
      filter.role = {
        $in: [
          "admin",
          "manager",
          "sales",
        ],
      };
    } else if (
      req.user.role === "sales"
    ) {
      filter._id = req.user.id;
    } else {
      return res.status(403).json({
        message:
          "You are not authorized to view assignable users",
      });
    }

    const users =
      await User.find(filter)
        .select(
          "_id name email role"
        )
        .sort({ name: 1 });

    return res.status(200).json({
      message:
        "Assignable users fetched successfully",
      users,
    });
  } catch (error) {
    console.error(
      "Get assignable users error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while fetching assignable users",
      error: error.message,
    });
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  updateEnquiry,
  deleteEnquiry,
  getAssignableUsers,
};

