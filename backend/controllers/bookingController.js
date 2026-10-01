
const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Quotation = require("../models/Quotation");
const Customer = require("../models/Customer");
const Enquiry = require("../models/Enquiry");
const User = require("../models/User");

const { createNotification } = require("../services/notificationService");

// ======================================================
// HELPERS
// ======================================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const toObjectId = (id) => {
  return new mongoose.Types.ObjectId(id);
};

const validateDateRange = (travelDate, returnDate) => {
  if (!travelDate) {
    return "Travel date is required";
  }

  const travel = new Date(travelDate);

  if (Number.isNaN(travel.getTime())) {
    return "Invalid travel date";
  }

  if (returnDate) {
    const returnD = new Date(returnDate);

    if (Number.isNaN(returnD.getTime())) {
      return "Invalid return date";
    }

    if (returnD < travel) {
      return "Return date cannot be before travel date";
    }
  }

  return null;
};

const validateFinancials = ({
  totalAmount,
  totalCost,
  discountAmount,
  taxAmount,
}) => {
  const values = {
    totalAmount,
    totalCost,
    discountAmount,
    taxAmount,
  };

  for (const [field, value] of Object.entries(values)) {
    if (!Number.isFinite(Number(value))) {
      return `${field} must be a valid number`;
    }

    if (Number(value) < 0) {
      return `${field} cannot be negative`;
    }
  }

  if (Number(discountAmount) > Number(totalAmount)) {
    return "Discount amount cannot be greater than total amount";
  }

  return null;
};

const validateTravellerCounts = ({
  adults,
  children,
  infants,
}) => {
  if (!Number.isInteger(adults) || adults < 1) {
    return "Adults must be at least 1";
  }

  if (!Number.isInteger(children) || children < 0) {
    return "Children cannot be negative";
  }

  if (!Number.isInteger(infants) || infants < 0) {
    return "Infants cannot be negative";
  }

  return null;
};

const getActiveSalesUsers = async () => {
  return User.find({
    role: "sales",
    isActive: true,
  }).select("_id");
};

const canViewBooking = (booking, user) => {
  if (user.role === "admin" || user.role === "accounts") {
    return true;
  }

  if (user.role === "manager") {
    if (!booking.salesOwner) {
      return false;
    }

    return true;
  }

  if (user.role === "sales") {
    return (
      booking.salesOwner &&
      booking.salesOwner.toString() === user.id.toString()
    );
  }

  if (user.role === "operations") {
    return (
      booking.operationsOwner &&
      booking.operationsOwner.toString() === user.id.toString()
    );
  }

  return false;
};

const canManageBooking = (booking, user) => {
  if (user.role === "admin") {
    return true;
  }

  if (user.role === "manager") {
    return (
      booking.salesOwner &&
      booking.salesOwner.toString() === user.id.toString()
    );
  }

  if (user.role === "sales") {
    return (
      booking.salesOwner &&
      booking.salesOwner.toString() === user.id.toString()
    );
  }

  if (user.role === "operations") {
    return (
      booking.operationsOwner &&
      booking.operationsOwner.toString() === user.id.toString()
    );
  }

  return false;
};

// ======================================================
// CREATE BOOKING
// ======================================================

const createBooking = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      quotation,
      enquiry,
      customer,
      company,
      trip,
      lead,
      travellers,
      destination,
      departureCity,
      travelDate,
      returnDate,
      adults,
      children,
      infants,
      travelType,
      currency,
      totalAmount,
      totalCost,
      discountAmount,
      taxAmount,
      salesOwner,
      operationsOwner,
      specialRequests,
      internalNotes,
    } = req.body;

    // --------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------

    if (!quotation) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Quotation is required",
      });
    }

    if (!isValidObjectId(quotation)) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Invalid quotation ID",
      });
    }

    // --------------------------------------------------
    // FIND QUOTATION
    // --------------------------------------------------

    const quotationDoc = await Quotation.findById(quotation).session(session);

    if (!quotationDoc) {
      await session.abortTransaction();

      return res.status(404).json({
        message: "Quotation not found",
      });
    }

    // Only accepted quotation can become booking
    if (quotationDoc.status !== "Accepted") {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Only Accepted quotations can be converted into booking",
      });
    }

    // --------------------------------------------------
    // PREVENT DUPLICATE BOOKING
    // --------------------------------------------------

    const existingBooking = await Booking.findOne({
      quotation: quotationDoc._id,
      status: {
        $nin: ["Cancelled", "Refunded"],
      },
    }).session(session);

    if (existingBooking) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "A booking already exists for this quotation",
        booking: existingBooking,
      });
    }

    // --------------------------------------------------
    // CUSTOMER
    // --------------------------------------------------

    const customerId =
      customer || quotationDoc.customer;

    if (!customerId) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Customer is required",
      });
    }

    if (!isValidObjectId(customerId)) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    const customerDoc = await Customer.findById(customerId).session(session);

    if (!customerDoc) {
      await session.abortTransaction();

      return res.status(404).json({
        message: "Customer not found",
      });
    }

    // --------------------------------------------------
    // ENQUIRY
    // --------------------------------------------------

    const enquiryId =
      enquiry || quotationDoc.enquiry;

    if (enquiryId) {
      if (!isValidObjectId(enquiryId)) {
        await session.abortTransaction();

        return res.status(400).json({
          message: "Invalid enquiry ID",
        });
      }

      const enquiryDoc = await Enquiry.findById(enquiryId).session(session);

      if (!enquiryDoc) {
        await session.abortTransaction();

        return res.status(404).json({
          message: "Enquiry not found",
        });
      }
    }

    // --------------------------------------------------
    // SALES OWNER
    // --------------------------------------------------

    let bookingSalesOwner =
      salesOwner ||
      quotationDoc.assignedTo ||
      req.user.id;

    if (!isValidObjectId(bookingSalesOwner)) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Invalid sales owner ID",
      });
    }

    // Sales user can only own their own bookings
    if (req.user.role === "sales") {
      bookingSalesOwner = req.user.id;
    }

    const salesUser = await User.findById(
      bookingSalesOwner
    ).session(session);

    if (!salesUser) {
      await session.abortTransaction();

      return res.status(404).json({
        message: "Sales owner not found",
      });
    }

    if (!salesUser.isActive) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Sales owner is inactive",
      });
    }

    if (
      !["admin", "manager", "sales"].includes(
        salesUser.role
      )
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        message:
          "Sales owner must have admin, manager or sales role",
      });
    }

    // --------------------------------------------------
    // OPERATIONS OWNER
    // --------------------------------------------------

    let bookingOperationsOwner =
      operationsOwner || null;

    if (bookingOperationsOwner) {
      if (!isValidObjectId(bookingOperationsOwner)) {
        await session.abortTransaction();

        return res.status(400).json({
          message: "Invalid operations owner ID",
        });
      }

      const operationsUser = await User.findById(
        bookingOperationsOwner
      ).session(session);

      if (!operationsUser) {
        await session.abortTransaction();

        return res.status(404).json({
          message: "Operations owner not found",
        });
      }

      if (!operationsUser.isActive) {
        await session.abortTransaction();

        return res.status(400).json({
          message: "Operations owner is inactive",
        });
      }

      if (operationsUser.role !== "operations") {
        await session.abortTransaction();

        return res.status(400).json({
          message:
            "Operations owner must have operations role",
        });
      }
    }

    // --------------------------------------------------
    // OPTIONAL REFERENCES
    // --------------------------------------------------

    const optionalReferences = [
      { name: "company", value: company },
      { name: "trip", value: trip },
      { name: "lead", value: lead },
    ];

    for (const reference of optionalReferences) {
      if (
        reference.value &&
        !isValidObjectId(reference.value)
      ) {
        await session.abortTransaction();

        return res.status(400).json({
          message: `Invalid ${reference.name} ID`,
        });
      }
    }

    // --------------------------------------------------
    // USE QUOTATION DATA AS DEFAULT
    // --------------------------------------------------

    const bookingDestination =
      destination || quotationDoc.destination;

    if (!bookingDestination) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Destination is required",
      });
    }

    const bookingTravelDate =
      travelDate || quotationDoc.travelDate;

    const bookingReturnDate =
      returnDate || quotationDoc.returnDate;

    const dateError = validateDateRange(
      bookingTravelDate,
      bookingReturnDate
    );

    if (dateError) {
      await session.abortTransaction();

      return res.status(400).json({
        message: dateError,
      });
    }

    const bookingAdults =
      adults !== undefined
        ? Number(adults)
        : Number(quotationDoc.adults || 1);

    const bookingChildren =
      children !== undefined
        ? Number(children)
        : Number(quotationDoc.children || 0);

    const bookingInfants =
      infants !== undefined
        ? Number(infants)
        : Number(quotationDoc.infants || 0);

    const travellerCountError =
      validateTravellerCounts({
        adults: bookingAdults,
        children: bookingChildren,
        infants: bookingInfants,
      });

    if (travellerCountError) {
      await session.abortTransaction();

      return res.status(400).json({
        message: travellerCountError,
      });
    }

    const bookingCurrency =
      currency ||
      quotationDoc.currency ||
      "INR";

    const bookingTotalAmount =
      totalAmount !== undefined
        ? Number(totalAmount)
        : Number(quotationDoc.totalAmount || 0);

    const bookingTotalCost =
      totalCost !== undefined
        ? Number(totalCost)
        : Number(quotationDoc.costAmount || 0);

    const bookingDiscount =
      discountAmount !== undefined
        ? Number(discountAmount)
        : Number(quotationDoc.discountAmount || 0);

    const bookingTax =
      taxAmount !== undefined
        ? Number(taxAmount)
        : Number(quotationDoc.taxAmount || 0);

    const financialError = validateFinancials({
      totalAmount: bookingTotalAmount,
      totalCost: bookingTotalCost,
      discountAmount: bookingDiscount,
      taxAmount: bookingTax,
    });

    if (financialError) {
      await session.abortTransaction();

      return res.status(400).json({
        message: financialError,
      });
    }

    // --------------------------------------------------
    // CREATE BOOKING
    // --------------------------------------------------

    const booking = await Booking.create(
      [
        {
          quotation: quotationDoc._id,
          enquiry: enquiryId || null,
          customer: customerId,

          company: company || customerDoc.company || null,

          trip: trip || quotationDoc.trip || null,

          lead: lead || quotationDoc.lead || null,

          travellers: Array.isArray(travellers)
            ? travellers
            : [],

          destination: bookingDestination,
          departureCity,

          travelDate: bookingTravelDate,
          returnDate: bookingReturnDate,

          adults: bookingAdults,
          children: bookingChildren,
          infants: bookingInfants,

          travelType:
            travelType ||
            quotationDoc.travelType ||
            "Other",

          currency: bookingCurrency,

          status: "Pending",

          confirmationStatus: {
            hotel: "Pending",
            transport: "Pending",
            activities: "Not Required",
            overall: "Pending",
          },

          totalAmount: bookingTotalAmount,
          totalCost: bookingTotalCost,

          discountAmount: bookingDiscount,
          taxAmount: bookingTax,

          profitAmount:
            bookingTotalAmount -
            bookingTotalCost,

          amountPaid: 0,

          amountDue: bookingTotalAmount,

          paymentStatus: "Pending",

          salesOwner: bookingSalesOwner,

          operationsOwner:
            bookingOperationsOwner,

          specialRequests,
          internalNotes,

          createdBy: req.user.id,
        },
      ],
      { session }
    );

    const createdBooking = booking[0];

    // --------------------------------------------------
    // COMMIT TRANSACTION
    // --------------------------------------------------

    await session.commitTransaction();

    // --------------------------------------------------
    // POPULATE
    // --------------------------------------------------

    await createdBooking.populate([
      {
        path: "quotation",
        select:
          "quotationNumber title totalAmount status",
      },
      {
        path: "customer",
        select:
          "firstName lastName email phone",
      },
      {
        path: "enquiry",
        select:
          "title destination travelDate returnDate status",
      },
      {
        path: "salesOwner",
        select: "name email role",
      },
      {
        path: "operationsOwner",
        select: "name email role",
      },
      {
        path: "createdBy",
        select: "name email role",
      },
    ]);

    // --------------------------------------------------
    // NOTIFICATION
    // --------------------------------------------------

    await createNotification({
      recipient: bookingSalesOwner,
      type: "BOOKING_CREATED",
      title: "New Booking Created",
      message:
        `Booking for ${createdBooking.destination} has been created.`,
      relatedBooking: createdBooking._id,
      relatedCustomer: createdBooking.customer,
      relatedEnquiry: createdBooking.enquiry,
      relatedQuotation: createdBooking.quotation,
      relatedLead: createdBooking.lead,
    });

    // Operations notification
    if (bookingOperationsOwner) {
      await createNotification({
        recipient: bookingOperationsOwner,
        type: "BOOKING_CREATED",
        title: "New Booking Assigned",
        message:
          `A new ${createdBooking.destination} booking has been assigned to operations.`,
        relatedBooking: createdBooking._id,
        relatedCustomer: createdBooking.customer,
        relatedEnquiry: createdBooking.enquiry,
        relatedQuotation: createdBooking.quotation,
      });
    }

    return res.status(201).json({
      message: "Booking created successfully",
      booking: createdBooking,
    });
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (transactionError) {
      console.error(
        "Booking transaction rollback error:",
        transactionError.message
      );
    }

    console.error(
      "Create booking error:",
      error
    );

    return res.status(500).json({
      message: "Failed to create booking",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// ======================================================
// GET ALL BOOKINGS
// ======================================================

const getBookings = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      destination,
      customer,
      salesOwner,
      operationsOwner,
      search,
    } = req.query;

    const pageNumber =
      Math.max(Number(req.query.page) || 1, 1);

    const limitNumber = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      50
    );

    const query = {};

    // --------------------------------------------------
    // ROLE SCOPE
    // --------------------------------------------------

    if (req.user.role === "sales") {
      query.salesOwner = toObjectId(req.user.id);
    }

    if (req.user.role === "operations") {
      query.operationsOwner = toObjectId(
        req.user.id
      );
    }

    if (req.user.role === "manager") {
      const salesUsers =
        await getActiveSalesUsers();

      const activeSalesIds =
        salesUsers.map((user) => user._id);

      // Manager can only see active sales team
      if (salesOwner) {
        if (!isValidObjectId(salesOwner)) {
          return res.status(400).json({
            message: "Invalid sales owner ID",
          });
        }

        const requestedSalesId =
          salesOwner.toString();

        const allowed =
          activeSalesIds.some(
            (id) =>
              id.toString() ===
              requestedSalesId
          );

        if (!allowed) {
          return res.status(403).json({
            message:
              "You can only view bookings assigned to active sales users",
          });
        }

        query.salesOwner =
          toObjectId(salesOwner);
      } else {
        query.salesOwner = {
          $in: activeSalesIds,
        };
      }
    }

    // --------------------------------------------------
    // CUSTOMER FILTER
    // --------------------------------------------------

    if (customer) {
      if (!isValidObjectId(customer)) {
        return res.status(400).json({
          message: "Invalid customer ID",
        });
      }

      query.customer = toObjectId(customer);
    }

    // --------------------------------------------------
    // SALES OWNER FILTER
    // --------------------------------------------------

    if (
      salesOwner &&
      !["sales", "manager"].includes(
        req.user.role
      )
    ) {
      if (!isValidObjectId(salesOwner)) {
        return res.status(400).json({
          message: "Invalid sales owner ID",
        });
      }

      query.salesOwner =
        toObjectId(salesOwner);
    }

    // --------------------------------------------------
    // OPERATIONS OWNER FILTER
    // --------------------------------------------------

    if (
      operationsOwner &&
      req.user.role !== "operations"
    ) {
      if (!isValidObjectId(operationsOwner)) {
        return res.status(400).json({
          message:
            "Invalid operations owner ID",
        });
      }

      query.operationsOwner =
        toObjectId(operationsOwner);
    }

    // --------------------------------------------------
    // STATUS FILTER
    // --------------------------------------------------

    if (status) {
      const allowedStatuses = [
        "Draft",
        "Pending",
        "Confirmed",
        "Partially Confirmed",
        "On Hold",
        "Completed",
        "Cancelled",
        "Refunded",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid booking status",
        });
      }

      query.status = status;
    }

    // --------------------------------------------------
    // PAYMENT STATUS FILTER
    // --------------------------------------------------

    if (paymentStatus) {
      const allowedPaymentStatuses = [
        "Pending",
        "Partially Paid",
        "Paid",
        "Overdue",
        "Refunded",
      ];

      if (
        !allowedPaymentStatuses.includes(
          paymentStatus
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid payment status",
        });
      }

      query.paymentStatus =
        paymentStatus;
    }

    // --------------------------------------------------
    // DESTINATION
    // --------------------------------------------------

    if (destination) {
      query.destination = {
        $regex: destination,
        $options: "i",
      };
    }

    // --------------------------------------------------
    // SEARCH
    // --------------------------------------------------

    if (search) {
      query.$or = [
        {
          bookingNumber: {
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

    // --------------------------------------------------
    // PAGINATION
    // --------------------------------------------------

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [bookings, total] =
      await Promise.all([
        Booking.find(query)
          .populate(
            "quotation",
            "quotationNumber title totalAmount status"
          )
          .populate(
            "customer",
            "firstName lastName email phone"
          )
          .populate(
            "enquiry",
            "title destination travelDate returnDate"
          )
          .populate(
            "salesOwner",
            "name email role"
          )
          .populate(
            "operationsOwner",
            "name email role"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNumber),

        Booking.countDocuments(query),
      ]);

    return res.status(200).json({
      message: "Bookings fetched successfully",
      count: bookings.length,
      total,
      page: pageNumber,
      pages: Math.ceil(
        total / limitNumber
      ),
      bookings,
    });
  } catch (error) {
    console.error(
      "Get bookings error:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

// ======================================================
// GET BOOKING BY ID
// ======================================================

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    const booking =
      await Booking.findById(id)
        .populate("quotation")
        .populate("customer")
        .populate("enquiry")
        .populate("trip")
        .populate("lead")
        .populate(
          "salesOwner",
          "name email role"
        )
        .populate(
          "operationsOwner",
          "name email role"
        )
        .populate(
          "createdBy",
          "name email role"
        );

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (
      !canViewBooking(
        booking,
        req.user
      )
    ) {
      return res.status(403).json({
        message:
          "Not authorized to view this booking",
      });
    }

    return res.status(200).json({
      message: "Booking fetched successfully",
      booking,
    });
  } catch (error) {
    console.error(
      "Get booking error:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch booking",
      error: error.message,
    });
  }
};

// ======================================================
// UPDATE BOOKING
// ======================================================

const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    const booking =
      await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (
      !canManageBooking(
        booking,
        req.user
      )
    ) {
      return res.status(403).json({
        message:
          "Not authorized to update this booking",
      });
    }

    // --------------------------------------------------
    // PROTECTED STATUSES
    // --------------------------------------------------

    if (
      ["Completed", "Cancelled", "Refunded"].includes(
        booking.status
      )
    ) {
      return res.status(400).json({
        message:
          `Booking cannot be updated after ${booking.status.toLowerCase()} status`,
      });
    }

    // --------------------------------------------------
    // ALLOWED NON-FINANCIAL FIELDS
    // --------------------------------------------------

    const allowedFields = [
      "travellers",
      "destination",
      "departureCity",
      "travelDate",
      "returnDate",
      "adults",
      "children",
      "infants",
      "travelType",
      "currency",
      "specialRequests",
      "internalNotes",
      "nextPaymentDueDate",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        booking[field] =
          req.body[field];
      }
    });

    // --------------------------------------------------
    // DATE VALIDATION
    // --------------------------------------------------

    const dateError =
      validateDateRange(
        booking.travelDate,
        booking.returnDate
      );

    if (dateError) {
      return res.status(400).json({
        message: dateError,
      });
    }

    // --------------------------------------------------
    // TRAVELLER COUNT VALIDATION
    // --------------------------------------------------

    const travellerCountError =
      validateTravellerCounts({
        adults: Number(booking.adults),
        children: Number(booking.children),
        infants: Number(booking.infants),
      });

    if (travellerCountError) {
      return res.status(400).json({
        message: travellerCountError,
      });
    }

    // --------------------------------------------------
    // FINANCIAL VALUES ARE NOT DIRECTLY EDITABLE
    // --------------------------------------------------

    // totalAmount, totalCost, discountAmount,
    // taxAmount and amountPaid should be controlled
    // by quotation/payment/finance workflows.

    // --------------------------------------------------
    // PROFIT
    // --------------------------------------------------

    booking.profitAmount =
      (Number(booking.totalAmount) || 0) -
      (Number(booking.totalCost) || 0);

    await booking.save();

    await booking.populate([
      {
        path: "customer",
        select:
          "firstName lastName email phone",
      },
      {
        path: "salesOwner",
        select: "name email role",
      },
      {
        path: "operationsOwner",
        select:
          "name email role",
      },
    ]);

    return res.status(200).json({
      message: "Booking updated successfully",
      booking,
    });
  } catch (error) {
    console.error(
      "Update booking error:",
      error
    );

    return res.status(500).json({
      message: "Failed to update booking",
      error: error.message,
    });
  }
};

// ======================================================
// CONFIRM BOOKING
// ======================================================

const confirmBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    const booking =
      await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (
      !canManageBooking(
        booking,
        req.user
      )
    ) {
      return res.status(403).json({
        message:
          "Not authorized to confirm this booking",
      });
    }

    // Only these states can become Confirmed
    if (
      ![
        "Pending",
        "Partially Confirmed",
        "On Hold",
      ].includes(booking.status)
    ) {
      return res.status(400).json({
        message:
          `Booking cannot be confirmed from ${booking.status} status`,
      });
    }

    booking.status = "Confirmed";

    booking.confirmationStatus.overall =
      "Confirmed";

    await booking.save();

    await createNotification({
      recipient:
        booking.salesOwner ||
        req.user.id,

      type: "BOOKING_CONFIRMED",

      title: "Booking Confirmed",

      message:
        `Booking ${booking.bookingNumber || ""} for ${booking.destination} has been confirmed.`,

      relatedBooking:
        booking._id,

      relatedCustomer:
        booking.customer,

      relatedQuotation:
        booking.quotation,
    });

    return res.status(200).json({
      message:
        "Booking confirmed successfully",
      booking,
    });
  } catch (error) {
    console.error(
      "Confirm booking error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to confirm booking",
      error: error.message,
    });
  }
};

// ======================================================
// CANCEL BOOKING
// ======================================================

const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    const booking =
      await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (
      !canManageBooking(
        booking,
        req.user
      )
    ) {
      return res.status(403).json({
        message:
          "Not authorized to cancel this booking",
      });
    }

    // --------------------------------------------------
    // INVALID CANCELLATION STATES
    // --------------------------------------------------

    if (
      ["Completed", "Cancelled", "Refunded"].includes(
        booking.status
      )
    ) {
      return res.status(400).json({
        message:
          `Booking cannot be cancelled from ${booking.status} status`,
      });
    }

    const cancellationReason =
      req.body.cancellationReason;

    if (
      !cancellationReason ||
      !cancellationReason.trim()
    ) {
      return res.status(400).json({
        message:
          "Cancellation reason is required",
      });
    }

    booking.status = "Cancelled";

    booking.cancellationReason =
      cancellationReason.trim();

    booking.cancelledAt =
      new Date();

    booking.cancelledBy =
      req.user.id;

    await booking.save();

    await createNotification({
      recipient:
        booking.salesOwner ||
        req.user.id,

      type: "BOOKING_CANCELLED",

      title: "Booking Cancelled",

      message:
        `Booking for ${booking.destination} has been cancelled.`,

      relatedBooking:
        booking._id,

      relatedCustomer:
        booking.customer,

      relatedQuotation:
        booking.quotation,
    });

    return res.status(200).json({
      message:
        "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    console.error(
      "Cancel booking error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to cancel booking",
      error: error.message,
    });
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  confirmBooking,
  cancelBooking,
};

