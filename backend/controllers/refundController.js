const mongoose = require("mongoose");

const Refund = require("../models/Refund");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Customer = require("../models/Customer");
const Trip = require("../models/Trip");
const Invoice = require("../models/Invoice");

// =====================================================
// CONSTANTS
// =====================================================

const REFUND_STATUSES = {
  REQUESTED: "Requested",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const PENDING_REFUND_STATUSES = [
  REFUND_STATUSES.REQUESTED,
  REFUND_STATUSES.UNDER_REVIEW,
  REFUND_STATUSES.APPROVED,
  REFUND_STATUSES.PROCESSING,
];

const COMPLETED_REFUND_STATUS = REFUND_STATUSES.COMPLETED;

const PAYMENT_STATUSES = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  FAILED: "Failed",
  PARTIALLY_REFUNDED: "Partially Refunded",
  REFUNDED: "Refunded",
};

const INVOICE_PAYMENT_STATUSES = {
  PENDING: "Pending",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

const INVOICE_STATUSES = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  SENT: "Sent",
  VIEWED: "Viewed",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

// =====================================================
// HELPERS
// =====================================================

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const isPositiveNumber = (value) =>
  Number.isFinite(Number(value)) && Number(value) > 0;

const normalizeString = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const generateRefundNumber = async (session = null) => {
  const year = new Date().getFullYear();
  const prefix = `REF-${year}-`;

  const query = Refund.findOne({
    refundNumber: new RegExp(`^${prefix}\\d+$`, "i"),
  }).sort({ refundNumber: -1 });

  if (session) query.session(session);

  const latestRefund = await query.lean();

  let nextNumber = 1;

  if (latestRefund?.refundNumber) {
    const match = latestRefund.refundNumber.match(/(\d+)$/);
    if (match) nextNumber = Number(match[1]) + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

const populateRefund = (query) =>
  query
    .populate({
      path: "booking",
      select:
        "bookingNumber destination departureCity travelDate returnDate adults children infants travelType totalAmount amountPaid amountDue paymentStatus status customer refundAmount refundStatus refundProcessedAt",
    })
    .populate({
      path: "payment",
      select:
        "paymentNumber booking invoice customer amount currency paymentMethod transactionId paymentDate status notes receivedBy",
    })
    .populate({
      path: "invoice",
      select:
        "invoiceNumber booking customer totalAmount amountPaid amountDue paymentStatus status invoiceDate dueDate currency",
    })
    .populate({
      path: "customer",
      select:
        "firstName lastName email phone address city state country postalCode",
    })
    .populate({
      path: "trip",
      select: "tripCode title name destination departureCity travelDate returnDate status",
    })
    .populate({
      path: "requestedBy",
      select: "name firstName lastName email role",
    })
    .populate({
      path: "approvedBy",
      select: "name firstName lastName email role",
    })
    .populate({
      path: "processedBy",
      select: "name firstName lastName email role",
    });

const getCompletedRefundAmount = async ({
  booking = null,
  payment = null,
  invoice = null,
  excludeRefundId = null,
  session = null,
}) => {
  const match = { status: COMPLETED_REFUND_STATUS };

  if (booking) match.booking = booking;
  if (payment) match.payment = payment;
  if (invoice) match.invoice = invoice;
  if (excludeRefundId && isValidObjectId(excludeRefundId)) {
    match._id = { $ne: toObjectId(excludeRefundId) };
  }

  const aggregate = Refund.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  if (session) aggregate.session(session);

  const result = await aggregate;
  return roundMoney(result[0]?.total || 0);
};

const getActiveRefundAmount = async ({
  booking = null,
  payment = null,
  invoice = null,
  excludeRefundId = null,
  session = null,
}) => {
  const match = { status: { $in: PENDING_REFUND_STATUSES } };

  if (booking) match.booking = booking;
  if (payment) match.payment = payment;
  if (invoice) match.invoice = invoice;
  if (excludeRefundId && isValidObjectId(excludeRefundId)) {
    match._id = { $ne: toObjectId(excludeRefundId) };
  }

  const aggregate = Refund.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  if (session) aggregate.session(session);

  const result = await aggregate;
  return roundMoney(result[0]?.total || 0);
};

const getBookingRefundSummary = async (bookingId, session = null) => {
  const aggregate = Refund.aggregate([
    {
      $match: {
        booking: toObjectId(bookingId),
        status: COMPLETED_REFUND_STATUS,
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  if (session) aggregate.session(session);

  const result = await aggregate;
  return roundMoney(result[0]?.total || 0);
};

// =====================================================
// FINANCIAL SYNC HELPERS
// =====================================================

const syncBookingFinancialState = async (
  booking,
  currentRefundAmount = 0,
  session = null
) => {
  // booking.amountPaid is already NET amount retained.
  const previousNetPaid = roundMoney(booking.amountPaid || 0);
  const refundAmount = roundMoney(currentRefundAmount);

  const netPaid = roundMoney(Math.max(0, previousNetPaid - refundAmount));
  const totalAmount = roundMoney(booking.totalAmount || 0);
  const amountDue = roundMoney(Math.max(0, totalAmount - netPaid));

  // Total completed refunds used only for reporting/refund status.
  const completedRefundAmount = await getBookingRefundSummary(
    booking._id,
    session
  );

  booking.amountPaid = netPaid;
  booking.amountDue = amountDue;

  if (booking.status !== "Cancelled") {
    if (netPaid <= 0) {
      booking.paymentStatus = "Pending";
    } else if (netPaid < totalAmount) {
      booking.paymentStatus = "Partially Paid";
    } else {
      booking.paymentStatus = "Paid";
    }
  }

  if (booking.refundAmount !== undefined) {
    booking.refundAmount = completedRefundAmount;
  }

  if (booking.refundStatus !== undefined) {
    if (completedRefundAmount <= 0) {
      booking.refundStatus = "None";
    } else if (completedRefundAmount < totalAmount) {
      booking.refundStatus = "Partially Refunded";
    } else {
      booking.refundStatus = "Refunded";
    }
  }

  if (booking.refundProcessedAt !== undefined) {
    booking.refundProcessedAt = new Date();
  }

  await booking.save({ session, validateBeforeSave: false });

  return {
    previousNetPaid,
    refundedAmount: completedRefundAmount,
    currentRefundAmount: refundAmount,
    netPaid,
    amountDue,
  };
};

const syncPaymentFinancialState = async (payment, session = null) => {
  // Payment.amount remains ORIGINAL payment amount.
  const originalAmount = roundMoney(payment.amount);
  const totalRefunded = await getCompletedRefundAmount({
    payment: payment._id,
    session,
  });

  if (totalRefunded >= originalAmount) {
    payment.status = PAYMENT_STATUSES.REFUNDED;
  } else if (totalRefunded > 0) {
    payment.status = PAYMENT_STATUSES.PARTIALLY_REFUNDED;
  } else {
    payment.status = PAYMENT_STATUSES.COMPLETED;
  }

  await payment.save({ session, validateBeforeSave: false });

  return {
    originalAmount,
    refundedAmount: totalRefunded,
    remainingAmount: roundMoney(Math.max(0, originalAmount - totalRefunded)),
    status: payment.status,
  };
};

const syncInvoiceFinancialState = async (
  invoice,
  currentRefundAmount = 0,
  session = null
) => {
  // invoice.amountPaid already represents NET amount.
  const previousNetPaid = roundMoney(invoice.amountPaid || 0);
  const refundAmount = roundMoney(currentRefundAmount);

  const netPaid = roundMoney(Math.max(0, previousNetPaid - refundAmount));
  const totalAmount = roundMoney(invoice.totalAmount || 0);
  const amountDue = roundMoney(Math.max(0, totalAmount - netPaid));

  const totalRefunded = await getCompletedRefundAmount({
    invoice: invoice._id,
    session,
  });

  invoice.amountPaid = netPaid;
  invoice.amountDue = amountDue;

  if (invoice.status !== INVOICE_STATUSES.CANCELLED) {
    if (netPaid <= 0) {
      invoice.paymentStatus = INVOICE_PAYMENT_STATUSES.PENDING;

      if (
        invoice.status === INVOICE_STATUSES.PAID ||
        invoice.status === INVOICE_STATUSES.PARTIALLY_PAID
      ) {
        invoice.status = INVOICE_STATUSES.ISSUED;
      }
    } else if (netPaid < totalAmount) {
      invoice.paymentStatus = INVOICE_PAYMENT_STATUSES.PARTIALLY_PAID;
      invoice.status = INVOICE_STATUSES.PARTIALLY_PAID;
    } else {
      invoice.paymentStatus = INVOICE_PAYMENT_STATUSES.PAID;
      invoice.status = INVOICE_STATUSES.PAID;
    }
  }

  await invoice.save({ session, validateBeforeSave: false });

  return {
    totalAmount,
    previousNetPaid,
    refundedAmount: totalRefunded,
    currentRefundAmount: refundAmount,
    netPaid,
    amountDue,
    paymentStatus: invoice.paymentStatus,
    status: invoice.status,
  };
};

// =====================================================
// REFUND ELIGIBILITY HELPERS
// =====================================================

const checkPaymentRefundLimit = async ({
  payment,
  refundAmount,
  excludeRefundId = null,
  session = null,
}) => {
  const completed = await getCompletedRefundAmount({
    payment: payment._id,
    excludeRefundId,
    session,
  });

  const active = await getActiveRefundAmount({
    payment: payment._id,
    excludeRefundId,
    session,
  });

  const remaining = roundMoney(
    Math.max(0, payment.amount - completed - active)
  );

  if (refundAmount > remaining) {
    return {
      valid: false,
      message: `Refund amount cannot exceed remaining refundable payment amount of ${remaining}.`,
    };
  }

  return { valid: true, remaining };
};

const checkBookingRefundLimit = async ({
  booking,
  refundAmount,
  excludeRefundId = null,
  session = null,
}) => {
  // booking.amountPaid is already NET; completed refunds are NOT subtracted again.
  const bookingPaid = roundMoney(booking.amountPaid || 0);
  const active = await getActiveRefundAmount({
    booking: booking._id,
    excludeRefundId,
    session,
  });

  const remaining = roundMoney(Math.max(0, bookingPaid - active));

  if (refundAmount > remaining) {
    return {
      valid: false,
      message: `Refund amount cannot exceed remaining refundable booking amount of ${remaining}.`,
    };
  }

  return { valid: true, remaining };
};

const checkInvoiceRefundLimit = async ({
  invoice,
  refundAmount,
  excludeRefundId = null,
  session = null,
}) => {
  // invoice.amountPaid is already NET.
  const invoicePaid = roundMoney(invoice.amountPaid || 0);
  const active = await getActiveRefundAmount({
    invoice: invoice._id,
    excludeRefundId,
    session,
  });

  const remaining = roundMoney(Math.max(0, invoicePaid - active));

  if (refundAmount > remaining) {
    return {
      valid: false,
      message: `Refund amount cannot exceed remaining refundable invoice amount of ${remaining}.`,
    };
  }

  return { valid: true, remaining };
};

// =====================================================
// CREATE REFUND
// =====================================================

const createRefund = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      booking,
      payment = null,
      invoice = null,
      customer,
      trip = null,
      amount,
      currency = "INR",
      refundDate = null,
      reason,
      refundMethod = "Original Payment Method",
      transactionId = null,
      referenceNumber = null,
      notes = "",
    } = req.body;

    // ---------------------------------------------
    // BASIC VALIDATION
    // ---------------------------------------------

    if (!booking || !isValidObjectId(booking)) {
      return res.status(400).json({
        success: false,
        message: "Valid booking is required.",
      });
    }

    if (!customer || !isValidObjectId(customer)) {
      return res.status(400).json({
        success: false,
        message: "Valid customer is required.",
      });
    }

    if (!isPositiveNumber(amount)) {
      return res.status(400).json({
        success: false,
        message: "Refund amount must be greater than 0.",
      });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        message: "Refund reason is required.",
      });
    }

    if (payment && !isValidObjectId(payment)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    if (invoice && !isValidObjectId(invoice)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID.",
      });
    }

    if (trip && !isValidObjectId(trip)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip ID.",
      });
    }

    const refundAmount = roundMoney(amount);

    // ---------------------------------------------
    // START TRANSACTION
    // ---------------------------------------------

    session.startTransaction();

    // ---------------------------------------------
    // LOAD BOOKING
    // ---------------------------------------------

    const bookingDoc = await Booking.findById(booking).session(session);

    if (!bookingDoc) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (bookingDoc.status === "Cancelled") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Refund cannot be created for a cancelled booking.",
      });
    }

    // ---------------------------------------------
    // CUSTOMER VALIDATION
    // ---------------------------------------------

    const customerDoc = await Customer.findById(customer).session(session);

    if (!customerDoc) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    if (
      bookingDoc.customer &&
      String(bookingDoc.customer) !== String(customer)
    ) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Customer does not belong to this booking.",
      });
    }

    // ---------------------------------------------
    // PAYMENT VALIDATION
    // ---------------------------------------------

    let paymentDoc = null;

    if (payment) {
      paymentDoc = await Payment.findById(payment).session(session);

      if (!paymentDoc) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Payment not found.",
        });
      }

      if (String(paymentDoc.booking) !== String(booking)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Payment does not belong to this booking.",
        });
      }

      if (
        paymentDoc.customer &&
        String(paymentDoc.customer) !== String(customer)
      ) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Payment does not belong to this customer.",
        });
      }

      if (paymentDoc.status === PAYMENT_STATUSES.FAILED) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Failed payments cannot be refunded.",
        });
      }

      if (paymentDoc.status === PAYMENT_STATUSES.PENDING) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Pending payments cannot be refunded.",
        });
      }

      const paymentCheck = await checkPaymentRefundLimit({
        payment: paymentDoc,
        refundAmount,
        session,
      });

      if (!paymentCheck.valid) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: paymentCheck.message,
        });
      }
    }

    // ---------------------------------------------
    // BOOKING REFUND LIMIT
    // ---------------------------------------------

    const bookingCheck = await checkBookingRefundLimit({
      booking: bookingDoc,
      refundAmount,
      session,
    });

    if (!bookingCheck.valid) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: bookingCheck.message,
      });
    }

    // ---------------------------------------------
    // INVOICE VALIDATION
    // ---------------------------------------------

    let invoiceDoc = null;

    if (invoice) {
      invoiceDoc = await Invoice.findById(invoice).session(session);

      if (!invoiceDoc) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Invoice not found.",
        });
      }

      if (String(invoiceDoc.booking) !== String(booking)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Invoice does not belong to this booking.",
        });
      }

      if (
        invoiceDoc.customer &&
        String(invoiceDoc.customer) !== String(customer)
      ) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Invoice does not belong to this customer.",
        });
      }

      if (invoiceDoc.status === INVOICE_STATUSES.CANCELLED) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Cancelled invoice cannot be refunded.",
        });
      }

      const invoiceCheck = await checkInvoiceRefundLimit({
        invoice: invoiceDoc,
        refundAmount,
        session,
      });

      if (!invoiceCheck.valid) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: invoiceCheck.message,
        });
      }
    }

    // ---------------------------------------------
    // TRIP VALIDATION
    // ---------------------------------------------

    if (trip) {
      const tripDoc = await Trip.findById(trip).session(session);

      if (!tripDoc) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Trip not found.",
        });
      }
    }

    // ---------------------------------------------
    // TRANSACTION ID DUPLICATE CHECK
    // ---------------------------------------------

    const normalizedTransactionId = normalizeString(transactionId);

    if (normalizedTransactionId) {
      const existingRefund = await Refund.findOne({
        transactionId: normalizedTransactionId,
      }).session(session);

      if (existingRefund) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: "A refund with this transaction ID already exists.",
        });
      }
    }

    // ---------------------------------------------
    // GENERATE REFUND NUMBER
    // ---------------------------------------------

    const refundNumber = await generateRefundNumber(session);

    // ---------------------------------------------
    // CREATE REFUND
    // ---------------------------------------------

    const refund = new Refund({
      refundNumber,
      booking: bookingDoc._id,
      payment: paymentDoc?._id || null,
      invoice: invoiceDoc?._id || null,
      customer: customerDoc._id,
      trip: trip || null,
      amount: refundAmount,
      currency: String(
        currency || paymentDoc?.currency || invoiceDoc?.currency || "INR"
      ).toUpperCase(),
      refundDate: refundDate ? new Date(refundDate) : new Date(),
      reason: String(reason).trim(),
      refundMethod,
      transactionId: normalizedTransactionId,
      referenceNumber: normalizeString(referenceNumber),
      status: REFUND_STATUSES.REQUESTED,
      requestedBy: req.user._id,
      notes: String(notes || "").trim(),
    });

    await refund.save({ session });

    await session.commitTransaction();

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    const populatedRefund = await populateRefund(Refund.findById(refund._id));

    return res.status(201).json({
      success: true,
      message: "Refund request created successfully.",
      data: populatedRefund,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Create refund error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create refund request.",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// =====================================================
// GET REFUNDS
// =====================================================

const getRefunds = async (req, res) => {
  try {
    const {
      booking,
      payment,
      invoice,
      customer,
      trip,
      status,
      refundMethod,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    const idFilters = { booking, payment, invoice, customer, trip };

    for (const [key, value] of Object.entries(idFilters)) {
      if (value) {
        if (!isValidObjectId(value)) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${key} ID.`,
          });
        }
        filter[key] = value;
      }
    }

    if (status) filter.status = status;
    if (refundMethod) filter.refundMethod = refundMethod;

    if (startDate || endDate) {
      filter.refundDate = {};

      if (startDate) {
        const start = new Date(startDate);
        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid startDate.",
          });
        }
        start.setHours(0, 0, 0, 0);
        filter.refundDate.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid endDate.",
          });
        }
        end.setHours(23, 59, 59, 999);
        filter.refundDate.$lte = end;
      }
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), "i");

      filter.$or = [
        { refundNumber: searchRegex },
        { transactionId: searchRegex },
        { referenceNumber: searchRegex },
        { reason: searchRegex },
      ];
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const currentLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (currentPage - 1) * currentLimit;

    const [refunds, total, summary] = await Promise.all([
      populateRefund(
        Refund.find(filter)
          .sort({ refundDate: -1, createdAt: -1 })
          .skip(skip)
          .limit(currentLimit)
      ),
      Refund.countDocuments(filter),
      Refund.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalRefundAmount: { $sum: "$amount" },
            completedRefundAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", REFUND_STATUSES.COMPLETED] },
                  "$amount",
                  0,
                ],
              },
            },
            pendingRefundAmount: {
              $sum: {
                $cond: [
                  { $in: ["$status", PENDING_REFUND_STATUSES] },
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const summaryData = summary[0] || {
      totalRefundAmount: 0,
      completedRefundAmount: 0,
      pendingRefundAmount: 0,
    };

    return res.status(200).json({
      success: true,
      data: refunds,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages: Math.ceil(total / currentLimit),
      },
      summary: {
        totalRefundAmount: roundMoney(summaryData.totalRefundAmount),
        completedRefundAmount: roundMoney(summaryData.completedRefundAmount),
        pendingRefundAmount: roundMoney(summaryData.pendingRefundAmount),
      },
    });
  } catch (error) {
    console.error("Get refunds error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch refunds.",
      error: error.message,
    });
  }
};

// =====================================================
// GET REFUND BY ID
// =====================================================

const getRefundById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid refund ID.",
      });
    }

    const refund = await populateRefund(Refund.findById(id));

    if (!refund) {
      return res.status(404).json({
        success: false,
        message: "Refund not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: refund,
    });
  } catch (error) {
    console.error("Get refund error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch refund.",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE REFUND
// =====================================================

const updateRefund = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid refund ID.",
      });
    }

    const refund = await Refund.findById(id);

    if (!refund) {
      return res.status(404).json({
        success: false,
        message: "Refund not found.",
      });
    }

    if (
      ![REFUND_STATUSES.REQUESTED, REFUND_STATUSES.UNDER_REVIEW].includes(
        refund.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Only Requested or Under Review refunds can be edited.",
      });
    }

    const allowedFields = [
      "amount",
      "currency",
      "refundDate",
      "reason",
      "refundMethod",
      "transactionId",
      "referenceNumber",
      "notes",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        refund[field] = req.body[field];
      }
    }

    if (!isPositiveNumber(refund.amount)) {
      return res.status(400).json({
        success: false,
        message: "Refund amount must be greater than 0.",
      });
    }

    refund.amount = roundMoney(refund.amount);

    // ---------------------------------------------
    // TRANSACTION ID
    // ---------------------------------------------

    if (refund.transactionId) {
      refund.transactionId = String(refund.transactionId).trim();

      const duplicate = await Refund.findOne({
        transactionId: refund.transactionId,
        _id: { $ne: refund._id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "A refund with this transaction ID already exists.",
        });
      }
    }

    // ---------------------------------------------
    // PAYMENT LIMIT
    // ---------------------------------------------

    const payment = refund.payment
      ? await Payment.findById(refund.payment)
      : null;

    if (payment) {
      const check = await checkPaymentRefundLimit({
        payment,
        refundAmount: refund.amount,
        excludeRefundId: refund._id,
      });

      if (!check.valid) {
        return res.status(400).json({
          success: false,
          message: check.message,
        });
      }
    }

    // ---------------------------------------------
    // BOOKING LIMIT
    // ---------------------------------------------

    const booking = await Booking.findById(refund.booking);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Associated booking not found.",
      });
    }

    const bookingCheck = await checkBookingRefundLimit({
      booking,
      refundAmount: refund.amount,
      excludeRefundId: refund._id,
    });

    if (!bookingCheck.valid) {
      return res.status(400).json({
        success: false,
        message: bookingCheck.message,
      });
    }

    // ---------------------------------------------
    // INVOICE LIMIT
    // ---------------------------------------------

    const invoice = refund.invoice
      ? await Invoice.findById(refund.invoice)
      : null;

    if (invoice) {
      const invoiceCheck = await checkInvoiceRefundLimit({
        invoice,
        refundAmount: refund.amount,
        excludeRefundId: refund._id,
      });

      if (!invoiceCheck.valid) {
        return res.status(400).json({
          success: false,
          message: invoiceCheck.message,
        });
      }
    }

    refund.currency = String(refund.currency || "INR").toUpperCase();
    refund.reason = String(refund.reason || "").trim();
    refund.notes = String(refund.notes || "").trim();

    await refund.save();

    const populatedRefund = await populateRefund(Refund.findById(refund._id));

    return res.status(200).json({
      success: true,
      message: "Refund updated successfully.",
      data: populatedRefund,
    });
  } catch (error) {
    console.error("Update refund error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update refund.",
      error: error.message,
    });
  }
};

// =====================================================
// STATUS TRANSITION HELPER
// =====================================================

const transitionRefundStatus = async ({
  req,
  res,
  fromStatuses,
  toStatus,
  successMessage,
  errorMessage,
  extraUpdates = {},
}) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid refund ID.",
      });
    }

    const refund = await Refund.findById(id);

    if (!refund) {
      return res.status(404).json({
        success: false,
        message: "Refund not found.",
      });
    }

    if (!fromStatuses.includes(refund.status)) {
      return res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }

    refund.status = toStatus;

    Object.assign(refund, extraUpdates);

    await refund.save();

    const populatedRefund = await populateRefund(Refund.findById(refund._id));

    return res.status(200).json({
      success: true,
      message: successMessage,
      data: populatedRefund,
    });
  } catch (error) {
    console.error("Refund status transition error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update refund status.",
      error: error.message,
    });
  }
};

// =====================================================
// REVIEW REFUND
// =====================================================

const reviewRefund = (req, res) =>
  transitionRefundStatus({
    req,
    res,
    fromStatuses: [REFUND_STATUSES.REQUESTED],
    toStatus: REFUND_STATUSES.UNDER_REVIEW,
    successMessage: "Refund moved to Under Review.",
    errorMessage: "Only Requested refunds can be moved to Under Review.",
  });

// =====================================================
// APPROVE REFUND
// =====================================================

const approveRefund = (req, res) =>
  transitionRefundStatus({
    req,
    res,
    fromStatuses: [REFUND_STATUSES.REQUESTED, REFUND_STATUSES.UNDER_REVIEW],
    toStatus: REFUND_STATUSES.APPROVED,
    successMessage: "Refund approved successfully.",
    errorMessage: "Only Requested or Under Review refunds can be approved.",
    extraUpdates: {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      rejectionReason: null,
    },
  });

// =====================================================
// REJECT REFUND
// =====================================================

const rejectRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid refund ID.",
      });
    }

    if (!rejectionReason || !String(rejectionReason).trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required.",
      });
    }

    const refund = await Refund.findById(id);

    if (!refund) {
      return res.status(404).json({
        success: false,
        message: "Refund not found.",
      });
    }

    if (
      ![REFUND_STATUSES.REQUESTED, REFUND_STATUSES.UNDER_REVIEW].includes(
        refund.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Only Requested or Under Review refunds can be rejected.",
      });
    }

    refund.status = REFUND_STATUSES.REJECTED;
    refund.approvedBy = req.user._id;
    refund.approvedAt = new Date();
    refund.rejectionReason = String(rejectionReason).trim();

    await refund.save();

    const populatedRefund = await populateRefund(Refund.findById(refund._id));

    return res.status(200).json({
      success: true,
      message: "Refund rejected successfully.",
      data: populatedRefund,
    });
  } catch (error) {
    console.error("Reject refund error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject refund.",
      error: error.message,
    });
  }
};

// =====================================================
// PROCESS REFUND
// =====================================================

const processRefund = (req, res) =>
  transitionRefundStatus({
    req,
    res,
    fromStatuses: [REFUND_STATUSES.APPROVED],
    toStatus: REFUND_STATUSES.PROCESSING,
    successMessage: "Refund moved to Processing.",
    errorMessage: "Only Approved refunds can move to Processing.",
  });

// =====================================================
// COMPLETE REFUND
// =====================================================

const completeRefund = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { transactionId, referenceNumber, notes } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid refund ID.",
      });
    }

    session.startTransaction();

    // ---------------------------------------------
    // LOAD REFUND
    // ---------------------------------------------

    const refund = await Refund.findById(id).session(session);

    if (!refund) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Refund not found.",
      });
    }

    if (refund.status !== REFUND_STATUSES.PROCESSING) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Only Processing refunds can be marked as Completed.",
      });
    }

    // ---------------------------------------------
    // DUPLICATE TRANSACTION CHECK
    // ---------------------------------------------

    const normalizedTransactionId = normalizeString(transactionId);

    if (normalizedTransactionId) {
      const existingRefund = await Refund.findOne({
        transactionId: normalizedTransactionId,
        _id: { $ne: refund._id },
      }).session(session);

      if (existingRefund) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: "A refund with this transaction ID already exists.",
        });
      }
    }

    // ---------------------------------------------
    // RELOAD BOOKING
    // ---------------------------------------------

    const booking = await Booking.findById(refund.booking).session(session);

    if (!booking) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Associated booking not found.",
      });
    }

    // ---------------------------------------------
    // RELOAD PAYMENT
    // ---------------------------------------------

    let payment = null;

    if (refund.payment) {
      payment = await Payment.findById(refund.payment).session(session);

      if (!payment) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Associated payment not found.",
        });
      }

      if (String(payment.booking) !== String(booking._id)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Payment does not belong to the refund booking.",
        });
      }
    }

    // ---------------------------------------------
    // RELOAD INVOICE
    // ---------------------------------------------

    let invoice = null;

    if (refund.invoice) {
      invoice = await Invoice.findById(refund.invoice).session(session);

      if (!invoice) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Associated invoice not found.",
        });
      }

      if (String(invoice.booking) !== String(booking._id)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Invoice does not belong to the refund booking.",
        });
      }
    }

    // ---------------------------------------------
    // FINAL REFUND LIMIT CHECKS
    // ---------------------------------------------

    if (payment) {
      const check = await checkPaymentRefundLimit({
        payment,
        refundAmount: refund.amount,
        excludeRefundId: refund._id,
        session,
      });

      if (!check.valid) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: check.message,
        });
      }
    }

    const bookingCheck = await checkBookingRefundLimit({
      booking,
      refundAmount: refund.amount,
      excludeRefundId: refund._id,
      session,
    });

    if (!bookingCheck.valid) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: bookingCheck.message,
      });
    }

    if (invoice) {
      const invoiceCheck = await checkInvoiceRefundLimit({
        invoice,
        refundAmount: refund.amount,
        excludeRefundId: refund._id,
        session,
      });

      if (!invoiceCheck.valid) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: invoiceCheck.message,
        });
      }
    }

    // ---------------------------------------------
    // COMPLETE REFUND
    // ---------------------------------------------

    refund.status = REFUND_STATUSES.COMPLETED;
    refund.transactionId =
      normalizedTransactionId || refund.transactionId || null;

    if (referenceNumber !== undefined) {
      refund.referenceNumber = normalizeString(referenceNumber);
    }

    if (notes !== undefined) {
      refund.notes = String(notes || "").trim();
    }

    refund.processedBy = req.user._id;
    refund.processedAt = new Date();

    await refund.save({ session });

    // ---------------------------------------------
    // SYNC FINANCIAL RECORDS
    // ---------------------------------------------

    let paymentSummary = null;

    if (payment) {
      paymentSummary = await syncPaymentFinancialState(payment, session);
    }

    const bookingSummary = await syncBookingFinancialState(
      booking,
      refund.amount,
      session
    );

    let invoiceSummary = null;

    if (invoice) {
      invoiceSummary = await syncInvoiceFinancialState(
        invoice,
        refund.amount,
        session
      );
    }

    await session.commitTransaction();

    // ---------------------------------------------
    // POPULATED RESPONSE
    // ---------------------------------------------

    const populatedRefund = await populateRefund(Refund.findById(refund._id));

    return res.status(200).json({
      success: true,
      message: "Refund completed successfully and financial records updated.",
      data: populatedRefund,
      financialSummary: {
        refundAmount: refund.amount,
        booking: bookingSummary,
        payment: paymentSummary,
        invoice: invoiceSummary,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Complete refund error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to complete refund.",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// =====================================================
// CANCEL REFUND
// =====================================================

const cancelRefund = (req, res) =>
  transitionRefundStatus({
    req,
    res,
    fromStatuses: [
      REFUND_STATUSES.REQUESTED,
      REFUND_STATUSES.UNDER_REVIEW,
      REFUND_STATUSES.APPROVED,
      REFUND_STATUSES.PROCESSING,
    ],
    toStatus: REFUND_STATUSES.CANCELLED,
    successMessage: "Refund cancelled successfully.",
    errorMessage: "This refund cannot be cancelled in its current status.",
  });

// =====================================================
// DELETE REFUND
// =====================================================

const deleteRefund = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid refund ID.",
      });
    }

    const refund = await Refund.findById(id);

    if (!refund) {
      return res.status(404).json({
        success: false,
        message: "Refund not found.",
      });
    }

    if (
      [
        REFUND_STATUSES.APPROVED,
        REFUND_STATUSES.PROCESSING,
        REFUND_STATUSES.COMPLETED,
      ].includes(refund.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Approved, Processing or Completed refunds cannot be deleted.",
      });
    }

    await Refund.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Refund deleted successfully.",
    });
  } catch (error) {
    console.error("Delete refund error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete refund.",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createRefund,
  getRefunds,
  getRefundById,
  updateRefund,
  reviewRefund,
  approveRefund,
  rejectRefund,
  processRefund,
  completeRefund,
  cancelRefund,
  deleteRefund,
};