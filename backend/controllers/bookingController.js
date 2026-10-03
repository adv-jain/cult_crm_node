const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Quotation = require("../models/Quotation");
const Customer = require("../models/Customer");
const Enquiry = require("../models/Enquiry");
const Lead = require("../models/Lead");
const Trip = require("../models/Trip");
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
  if (!travelDate) return "Travel date is required";
  const travel = new Date(travelDate);
  if (Number.isNaN(travel.getTime())) return "Invalid travel date";

  if (returnDate) {
    const returnD = new Date(returnDate);
    if (Number.isNaN(returnD.getTime())) return "Invalid return date";
    if (returnD < travel) return "Return date cannot be before travel date";
  }
  return null;
};

const validateFinancials = ({
  totalAmount,
  totalCost,
  discountAmount,
  taxAmount,
}) => {
  const values = { totalAmount, totalCost, discountAmount, taxAmount };
  for (const [field, value] of Object.entries(values)) {
    if (!Number.isFinite(Number(value))) return `${field} must be a valid number`;
    if (Number(value) < 0) return `${field} cannot be negative`;
  }
  if (Number(discountAmount) > Number(totalAmount)) {
    return "Discount amount cannot be greater than total amount";
  }
  return null;
};

const validateTravellerCounts = ({ adults, children, infants }) => {
  if (!Number.isInteger(adults) || adults < 1) return "Adults must be at least 1";
  if (!Number.isInteger(children) || children < 0) return "Children cannot be negative";
  if (!Number.isInteger(infants) || infants < 0) return "Infants cannot be negative";
  return null;
};

const getActiveSalesUsers = async () => {
  return User.find({ role: "sales", isActive: true }).select("_id");
};

const canViewBooking = (booking, user) => {
  if (user.role === "admin" || user.role === "accounts") return true;
  if (user.role === "manager") return Boolean(booking.salesOwner);
  if (user.role === "sales") {
    return booking.salesOwner && booking.salesOwner.toString() === user.id.toString();
  }
  if (user.role === "operations") {
    return booking.operationsOwner && booking.operationsOwner.toString() === user.id.toString();
  }
  return false;
};

const canManageBooking = (booking, user) => {
  if (user.role === "admin") return true;
  if (user.role === "manager") {
    return booking.salesOwner && booking.salesOwner.toString() === user.id.toString();
  }
  if (user.role === "sales") {
    return booking.salesOwner && booking.salesOwner.toString() === user.id.toString();
  }
  if (user.role === "operations") {
    return booking.operationsOwner && booking.operationsOwner.toString() === user.id.toString();
  }
  return false;
};

/* ======================================================
   FIND OR CREATE CUSTOMER
====================================================== */

const findOrCreateCustomer = async ({
  customerId,
  quotationDoc,
  enquiryDoc,
  leadDoc,
  session,
  userId,
}) => {
  if (customerId && isValidObjectId(customerId)) {
    const existing = await Customer.findById(customerId).session(session);
    if (existing) return existing;
  }

  if (quotationDoc?.customer) {
    const existing = await Customer.findById(quotationDoc.customer).session(session);
    if (existing) return existing;
  }

  const leadId = leadDoc?._id || quotationDoc?.lead || enquiryDoc?.lead || null;

  let lead = leadDoc;
  if (!lead && leadId && isValidObjectId(leadId)) {
    lead = await Lead.findById(leadId).session(session);
  }

  const firstName = String(lead?.firstName || "").trim();
  const lastName = String(lead?.lastName || "").trim();
  const phone = String(lead?.phone || "").trim();
  const email = String(lead?.email || "").trim().toLowerCase();

  if (!firstName && !phone && !email) return null;

  const duplicateQuery = [];
  if (phone) duplicateQuery.push({ phone });
  if (email) duplicateQuery.push({ email });

  let existingCustomer = null;
  if (duplicateQuery.length > 0) {
    existingCustomer = await Customer.findOne({
      $or: duplicateQuery,
    }).session(session);
  }

  if (existingCustomer) return existingCustomer;

  const [newCustomer] = await Customer.create(
    [
      {
        firstName,
        lastName,
        phone,
        email,
        owner: userId,
        lead: lead?._id || null,
        customerType: "Individual",
        status: "Active",
        customerSince: new Date(),
      },
    ],
    { session }
  );

  return newCustomer;
};

/* ======================================================
   GENERATE TRIP CODE
====================================================== */

const generateTripCode = async (session) => {
  const year = new Date().getFullYear();

  const latestTrip = await Trip.findOne({
    tripCode: { $regex: `^TRP-${year}-` },
  })
    .sort({ createdAt: -1 })
    .select("tripCode")
    .session(session);

  let nextNumber = 1;

  if (latestTrip && latestTrip.tripCode) {
    const parts = latestTrip.tripCode.split("-");
    const lastNumber = parseInt(parts[2], 10);
    if (!Number.isNaN(lastNumber)) nextNumber = lastNumber + 1;
  }

  return `TRP-${year}-${String(nextNumber).padStart(4, "0")}`;
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

    /* --------------------------------------------------
       BASIC VALIDATION
    -------------------------------------------------- */

    if (!quotation) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Quotation is required" });
    }

    if (!isValidObjectId(quotation)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    /* --------------------------------------------------
       FIND QUOTATION
    -------------------------------------------------- */

    const quotationDoc = await Quotation.findById(quotation).session(session);

    if (!quotationDoc) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (quotationDoc.status !== "Accepted") {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Only Accepted quotations can be converted into booking",
      });
    }

    /* --------------------------------------------------
       PREVENT DUPLICATE BOOKING
    -------------------------------------------------- */

    const existingBooking = await Booking.findOne({
      quotation: quotationDoc._id,
      status: { $nin: ["Cancelled", "Refunded"] },
    }).session(session);

    if (existingBooking) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "A booking already exists for this quotation",
        booking: existingBooking,
      });
    }

    /* --------------------------------------------------
       ENQUIRY
    -------------------------------------------------- */

    const enquiryId = enquiry || quotationDoc.enquiry;
    let enquiryDoc = null;

    if (enquiryId) {
      if (!isValidObjectId(enquiryId)) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Invalid enquiry ID" });
      }

      enquiryDoc = await Enquiry.findById(enquiryId).session(session);

      if (!enquiryDoc) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Enquiry not found" });
      }
    }

    /* --------------------------------------------------
       LEAD
    -------------------------------------------------- */

    const leadId = lead || quotationDoc.lead || enquiryDoc?.lead || null;
    let leadDoc = null;

    if (leadId) {
      if (!isValidObjectId(leadId)) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Invalid lead ID" });
      }

      leadDoc = await Lead.findById(leadId).session(session);
    }

    /* --------------------------------------------------
       FIND OR CREATE CUSTOMER
    -------------------------------------------------- */

    const customerDoc = await findOrCreateCustomer({
      customerId: customer,
      quotationDoc,
      enquiryDoc,
      leadDoc,
      session,
      userId: req.user.id,
    });

    if (!customerDoc) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Unable to determine customer. Please ensure lead has name and phone.",
      });
    }

    const customerId = customerDoc._id;

    /* --------------------------------------------------
       SALES OWNER
    -------------------------------------------------- */

    let bookingSalesOwner =
      salesOwner || quotationDoc.assignedTo || req.user.id;

    if (!isValidObjectId(bookingSalesOwner)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid sales owner ID" });
    }

    if (req.user.role === "sales") {
      bookingSalesOwner = req.user.id;
    }

    const salesUser = await User.findById(bookingSalesOwner).session(session);
    if (!salesUser) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Sales owner not found" });
    }
    if (!salesUser.isActive) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Sales owner is inactive" });
    }
    if (!["admin", "manager", "sales"].includes(salesUser.role)) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Sales owner must have admin, manager or sales role",
      });
    }

    /* --------------------------------------------------
       OPERATIONS OWNER
    -------------------------------------------------- */

    let bookingOperationsOwner = operationsOwner || null;

    if (bookingOperationsOwner) {
      if (!isValidObjectId(bookingOperationsOwner)) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Invalid operations owner ID" });
      }

      const operationsUser = await User.findById(bookingOperationsOwner).session(session);

      if (!operationsUser) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Operations owner not found" });
      }
      if (!operationsUser.isActive) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Operations owner is inactive" });
      }
      if (operationsUser.role !== "operations") {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Operations owner must have operations role",
        });
      }
    }

    /* --------------------------------------------------
       OPTIONAL REFERENCES
    -------------------------------------------------- */

    const optionalReferences = [
      { name: "company", value: company },
    ];

    for (const reference of optionalReferences) {
      if (reference.value && !isValidObjectId(reference.value)) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `Invalid ${reference.name} ID`,
        });
      }
    }

    /* --------------------------------------------------
       QUOTATION DATA DEFAULTS
    -------------------------------------------------- */

    const bookingDestination = destination || quotationDoc.destination;
    if (!bookingDestination) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Destination is required" });
    }

    const bookingTravelDate = travelDate || quotationDoc.travelDate;
    const bookingReturnDate = returnDate || quotationDoc.returnDate;

    const dateError = validateDateRange(bookingTravelDate, bookingReturnDate);
    if (dateError) {
      await session.abortTransaction();
      return res.status(400).json({ message: dateError });
    }

    const bookingAdults =
      adults !== undefined ? Number(adults) : Number(quotationDoc.adults || 1);
    const bookingChildren =
      children !== undefined ? Number(children) : Number(quotationDoc.children || 0);
    const bookingInfants =
      infants !== undefined ? Number(infants) : Number(quotationDoc.infants || 0);

    const travellerCountError = validateTravellerCounts({
      adults: bookingAdults,
      children: bookingChildren,
      infants: bookingInfants,
    });

    if (travellerCountError) {
      await session.abortTransaction();
      return res.status(400).json({ message: travellerCountError });
    }

    const bookingCurrency = currency || quotationDoc.currency || "INR";

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
      return res.status(400).json({ message: financialError });
    }

    /* --------------------------------------------------
       CREATE BOOKING
    -------------------------------------------------- */

    const booking = await Booking.create(
      [
        {
          quotation: quotationDoc._id,
          enquiry: enquiryId || null,
          customer: customerId,
          company: company || customerDoc.company || null,
          trip: trip || quotationDoc.trip || null,
          lead: leadId || null,
          travellers: Array.isArray(travellers) ? travellers : [],
          destination: bookingDestination,
          departureCity,
          travelDate: bookingTravelDate,
          returnDate: bookingReturnDate,
          adults: bookingAdults,
          children: bookingChildren,
          infants: bookingInfants,
          travelType: travelType || quotationDoc.travelType || "Other",
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
          profitAmount: bookingTotalAmount - bookingTotalCost,
          amountPaid: 0,
          amountDue: bookingTotalAmount,
          paymentStatus: "Pending",
          salesOwner: bookingSalesOwner,
          operationsOwner: bookingOperationsOwner,
          specialRequests,
          internalNotes,
          createdBy: req.user.id,
        },
      ],
      { session }
    );

    const createdBooking = booking[0];

    /* --------------------------------------------------
       AUTO-CREATE TRIP
    -------------------------------------------------- */

    const tripCode = await generateTripCode(session);

    const totalPax = bookingAdults + bookingChildren;
    const tripTitle = `${bookingDestination} - ${totalPax} Pax`;

    const [tripDoc] = await Trip.create(
      [
        {
          title: tripTitle,
          tripCode,
          destination: bookingDestination,
          startDate: bookingTravelDate,
          endDate: bookingReturnDate,
          travelType: travelType || quotationDoc.travelType || "Other",
          adults: bookingAdults,
          children: bookingChildren,
          infants: bookingInfants,
          status: "Confirmed",
          estimatedValue: bookingTotalAmount,
          totalAmount: bookingTotalAmount,
          totalCost: bookingTotalCost,
          profit: bookingTotalAmount - bookingTotalCost,
          customer: customerId,
          booking: createdBooking._id,
          quotation: quotationDoc._id,
          itinerary: quotationDoc.itinerary || null,
          company: company || customerDoc.company || null,
          lead: leadId || null,
          owner: bookingSalesOwner,
          description: `Auto-created from booking ${
            createdBooking.bookingNumber || createdBooking._id
          }`,
        },
      ],
      { session }
    );

    /* Link trip to booking */
    createdBooking.trip = tripDoc._id;
    await createdBooking.save({ session });

    /* --------------------------------------------------
       LINK CUSTOMER → QUOTATION + ENQUIRY
    -------------------------------------------------- */

    if (!quotationDoc.customer) {
      quotationDoc.customer = customerId;
      await quotationDoc.save({ session });
    }

    if (enquiryDoc && !enquiryDoc.customer) {
      enquiryDoc.customer = customerId;
      await enquiryDoc.save({ session });
    }

    /* --------------------------------------------------
       COMMIT
    -------------------------------------------------- */

    await session.commitTransaction();

    /* --------------------------------------------------
       POPULATE
    -------------------------------------------------- */

    await createdBooking.populate([
      {
        path: "quotation",
        select: "quotationNumber title totalAmount status",
      },
      {
        path: "customer",
        select: "firstName lastName email phone",
      },
      {
        path: "enquiry",
        select: "title destination travelDate returnDate status",
      },
      {
        path: "trip",
        select:
          "title tripCode destination startDate endDate status adults children infants totalAmount",
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

    /* --------------------------------------------------
       NOTIFICATIONS
    -------------------------------------------------- */

    await createNotification({
      recipient: bookingSalesOwner,
      type: "BOOKING_CREATED",
      title: "New Booking Created",
      message: `Booking for ${createdBooking.destination} has been created.`,
      relatedBooking: createdBooking._id,
      relatedCustomer: createdBooking.customer,
      relatedEnquiry: createdBooking.enquiry,
      relatedQuotation: createdBooking.quotation,
      relatedLead: createdBooking.lead,
    });

    if (bookingOperationsOwner) {
      await createNotification({
        recipient: bookingOperationsOwner,
        type: "BOOKING_CREATED",
        title: "New Booking Assigned",
        message: `A new ${createdBooking.destination} booking has been assigned to operations.`,
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

    console.error("Create booking error:", error);

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

    const pageNumber = Math.max(Number(req.query.page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      50
    );

    const query = {};

    if (req.user.role === "sales") {
      query.salesOwner = toObjectId(req.user.id);
    }

    if (req.user.role === "operations") {
      query.operationsOwner = toObjectId(req.user.id);
    }

    if (req.user.role === "manager") {
      const salesUsers = await getActiveSalesUsers();
      const activeSalesIds = salesUsers.map((user) => user._id);

      if (salesOwner) {
        if (!isValidObjectId(salesOwner)) {
          return res.status(400).json({ message: "Invalid sales owner ID" });
        }

        const requestedSalesId = salesOwner.toString();
        const allowed = activeSalesIds.some(
          (id) => id.toString() === requestedSalesId
        );

        if (!allowed) {
          return res.status(403).json({
            message:
              "You can only view bookings assigned to active sales users",
          });
        }

        query.salesOwner = toObjectId(salesOwner);
      } else {
        query.salesOwner = { $in: activeSalesIds };
      }
    }

    if (customer) {
      if (!isValidObjectId(customer)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }
      query.customer = toObjectId(customer);
    }

    if (salesOwner && !["sales", "manager"].includes(req.user.role)) {
      if (!isValidObjectId(salesOwner)) {
        return res.status(400).json({ message: "Invalid sales owner ID" });
      }
      query.salesOwner = toObjectId(salesOwner);
    }

    if (operationsOwner && req.user.role !== "operations") {
      if (!isValidObjectId(operationsOwner)) {
        return res.status(400).json({ message: "Invalid operations owner ID" });
      }
      query.operationsOwner = toObjectId(operationsOwner);
    }

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
        return res.status(400).json({ message: "Invalid booking status" });
      }

      query.status = status;
    }

    if (paymentStatus) {
      const allowedPaymentStatuses = [
        "Pending",
        "Partially Paid",
        "Paid",
        "Overdue",
        "Refunded",
      ];

      if (!allowedPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({ message: "Invalid payment status" });
      }

      query.paymentStatus = paymentStatus;
    }

    if (destination) {
      query.destination = { $regex: destination, $options: "i" };
    }

    if (search) {
      query.$or = [
        { bookingNumber: { $regex: search, $options: "i" } },
        { destination: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate(
          "quotation",
          "quotationNumber title totalAmount status"
        )
        .populate("customer", "firstName lastName email phone")
        .populate("enquiry", "title destination travelDate returnDate")
        .populate(
          "trip",
          "title tripCode destination startDate endDate status"
        )
        .populate("salesOwner", "name email role")
        .populate("operationsOwner", "name email role")
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
      pages: Math.ceil(total / limitNumber),
      bookings,
    });
  } catch (error) {
    console.error("Get bookings error:", error);
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
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(id)
      .populate("quotation")
      .populate("customer")
      .populate("enquiry")
      .populate("trip")
      .populate("lead")
      .populate("salesOwner", "name email role")
      .populate("operationsOwner", "name email role")
      .populate("createdBy", "name email role");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!canViewBooking(booking, req.user)) {
      return res.status(403).json({
        message: "Not authorized to view this booking",
      });
    }

    return res.status(200).json({
      message: "Booking fetched successfully",
      booking,
    });
  } catch (error) {
    console.error("Get booking error:", error);
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
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!canManageBooking(booking, req.user)) {
      return res.status(403).json({
        message: "Not authorized to update this booking",
      });
    }

    if (["Completed", "Cancelled", "Refunded"].includes(booking.status)) {
      return res.status(400).json({
        message: `Booking cannot be updated after ${booking.status.toLowerCase()} status`,
      });
    }

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
        booking[field] = req.body[field];
      }
    });

    const dateError = validateDateRange(booking.travelDate, booking.returnDate);
    if (dateError) return res.status(400).json({ message: dateError });

    const travellerCountError = validateTravellerCounts({
      adults: Number(booking.adults),
      children: Number(booking.children),
      infants: Number(booking.infants),
    });
    if (travellerCountError) return res.status(400).json({ message: travellerCountError });

    booking.profitAmount =
      (Number(booking.totalAmount) || 0) - (Number(booking.totalCost) || 0);

    await booking.save();

    /* Sync Trip */
    if (booking.trip) {
      try {
        await Trip.findByIdAndUpdate(booking.trip, {
          title: `${booking.destination} - ${
            Number(booking.adults || 0) + Number(booking.children || 0)
          } Pax`,
          destination: booking.destination,
          startDate: booking.travelDate,
          endDate: booking.returnDate,
          adults: booking.adults,
          children: booking.children,
          infants: booking.infants,
          travelType: booking.travelType,
          totalAmount: booking.totalAmount,
          totalCost: booking.totalCost,
          profit: booking.profitAmount,
        });
      } catch (tripErr) {
        console.error("Failed to sync trip:", tripErr.message);
      }
    }

    await booking.populate([
      { path: "customer", select: "firstName lastName email phone" },
      { path: "trip", select: "title tripCode destination status" },
      { path: "salesOwner", select: "name email role" },
      { path: "operationsOwner", select: "name email role" },
    ]);

    return res.status(200).json({
      message: "Booking updated successfully",
      booking,
    });
  } catch (error) {
    console.error("Update booking error:", error);
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
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!canManageBooking(booking, req.user)) {
      return res.status(403).json({
        message: "Not authorized to confirm this booking",
      });
    }

    if (
      !["Pending", "Partially Confirmed", "On Hold"].includes(booking.status)
    ) {
      return res.status(400).json({
        message: `Booking cannot be confirmed from ${booking.status} status`,
      });
    }

    booking.status = "Confirmed";
    booking.confirmationStatus.overall = "Confirmed";
    await booking.save();

    /* Sync Trip status */
    if (booking.trip) {
      try {
        await Trip.findByIdAndUpdate(booking.trip, { status: "Confirmed" });
      } catch (tripErr) {
        console.error("Failed to sync trip:", tripErr.message);
      }
    }

    await createNotification({
      recipient: booking.salesOwner || req.user.id,
      type: "BOOKING_CONFIRMED",
      title: "Booking Confirmed",
      message: `Booking ${
        booking.bookingNumber || ""
      } for ${booking.destination} has been confirmed.`,
      relatedBooking: booking._id,
      relatedCustomer: booking.customer,
      relatedQuotation: booking.quotation,
    });

    return res.status(200).json({
      message: "Booking confirmed successfully",
      booking,
    });
  } catch (error) {
    console.error("Confirm booking error:", error);
    return res.status(500).json({
      message: "Failed to confirm booking",
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
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!canManageBooking(booking, req.user)) {
      return res.status(403).json({
        message: "Not authorized to cancel this booking",
      });
    }

    if (["Completed", "Cancelled", "Refunded"].includes(booking.status)) {
      return res.status(400).json({
        message: `Booking cannot be cancelled from ${booking.status} status`,
      });
    }

    const cancellationReason = req.body.cancellationReason;

    if (!cancellationReason || !cancellationReason.trim()) {
      return res.status(400).json({
        message: "Cancellation reason is required",
      });
    }

    booking.status = "Cancelled";
    booking.cancellationReason = cancellationReason.trim();
    booking.cancelledAt = new Date();
    booking.cancelledBy = req.user.id;
    await booking.save();

    /* Sync Trip status */
    if (booking.trip) {
      try {
        await Trip.findByIdAndUpdate(booking.trip, {
          status: "Cancelled",
          cancellationReason: cancellationReason.trim(),
          cancelledAt: new Date(),
        });
      } catch (tripErr) {
        console.error("Failed to sync trip:", tripErr.message);
      }
    }

    await createNotification({
      recipient: booking.salesOwner || req.user.id,
      type: "BOOKING_CANCELLED",
      title: "Booking Cancelled",
      message: `Booking for ${booking.destination} has been cancelled.`,
      relatedBooking: booking._id,
      relatedCustomer: booking.customer,
      relatedQuotation: booking.quotation,
    });

    return res.status(200).json({
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return res.status(500).json({
      message: "Failed to cancel booking",
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