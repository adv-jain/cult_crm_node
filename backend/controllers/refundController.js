
const mongoose = require("mongoose");

const Refund = require("../models/Refund");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Customer = require("../models/Customer");
const Deal = require("../models/Trip");
const Invoice = require("../models/Invoice");

// ----------------------------------------------------
// HELPERS
// ----------------------------------------------------

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ----------------------------------------------------
// GENERATE REFUND NUMBER
// ----------------------------------------------------

const generateRefundNumber = async (session) => {
  const year = new Date().getFullYear();
  const prefix = `REF-${year}-`;

  const lastRefund = await Refund.findOne({
    refundNumber: new RegExp(`^${prefix}`),
  })
    .sort({ refundNumber: -1 })
    .select("refundNumber")
    .session(session)
    .lean();

  let nextNumber = 1;

  if (lastRefund?.refundNumber) {
    const lastNumber = parseInt(
      lastRefund.refundNumber.replace(prefix, ""),
      10
    );

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

// ----------------------------------------------------
// POPULATE REFUND
// ----------------------------------------------------

const populateRefund = (query) => {
  return query
    .populate("booking")
    .populate("payment")
    .populate("invoice")
    .populate("customer")
    .populate("trip")
    .populate("requestedBy", "name email role")
    .populate("approvedBy", "name email role")
    .populate("processedBy", "name email role");
};

// ----------------------------------------------------
// COMMON REFUND STATUSES
// ----------------------------------------------------

const refundableStatuses = [
  "Requested",
  "Under Review",
  "Approved",
  "Processing",
  "Completed",
];

// ----------------------------------------------------
// CREATE REFUND REQUEST
// ----------------------------------------------------

const createRefund = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      booking,
      payment,
      invoice,
      customer,
      trip,
      amount,
      currency,
      refundDate,
      reason,
      refundMethod,
      transactionId,
      referenceNumber,
      notes,
    } = req.body;

    // ---------------------------------------------
    // BASIC VALIDATION
    // ---------------------------------------------

    if (!booking) {
      return res.status(400).json({
        message: "Booking is required",
      });
    }

    if (!customer) {
      return res.status(400).json({
        message: "Customer is required",
      });
    }

    if (amount === undefined || amount === null) {
      return res.status(400).json({
        message: "Refund amount is required",
      });
    }

    const refundAmount = Number(amount);

    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      return res.status(400).json({
        message: "Refund amount must be greater than 0",
      });
    }

    if (!reason?.trim()) {
      return res.status(400).json({
        message: "Refund reason is required",
      });
    }

    // ---------------------------------------------
    // OBJECT ID VALIDATION
    // ---------------------------------------------

    if (!isValidObjectId(booking)) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    if (!isValidObjectId(customer)) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    if (payment && !isValidObjectId(payment)) {
      return res.status(400).json({
        message: "Invalid payment ID",
      });
    }

    if (invoice && !isValidObjectId(invoice)) {
      return res.status(400).json({
        message: "Invalid invoice ID",
      });
    }

    if (trip && !isValidObjectId(trip)) {
      return res.status(400).json({
        message: "Invalid trip ID",
      });
    }

    // ---------------------------------------------
    // START TRANSACTION
    // ---------------------------------------------

    let createdRefund;

    await session.withTransaction(async () => {
      // -------------------------------------------
      // BOOKING
      // -------------------------------------------

      const bookingData = await Booking.findById(booking).session(
        session
      );

      if (!bookingData) {
        throw new Error("Booking not found");
      }

      if (bookingData.status === "Cancelled") {
        throw new Error(
          "Cancelled booking cannot be refunded"
        );
      }

      // -------------------------------------------
      // CUSTOMER
      // -------------------------------------------

      const customerData = await Customer.findById(
        customer
      ).session(session);

      if (!customerData) {
        throw new Error("Customer not found");
      }

      if (
        bookingData.customer &&
        bookingData.customer.toString() !== customer.toString()
      ) {
        throw new Error(
          "Customer does not belong to this booking"
        );
      }

      // -------------------------------------------
      // PAYMENT
      // -------------------------------------------

      let paymentData = null;

      if (payment) {
        paymentData = await Payment.findById(payment).session(
          session
        );

        if (!paymentData) {
          throw new Error("Payment not found");
        }

        if (
          paymentData.booking &&
          paymentData.booking.toString() !== booking.toString()
        ) {
          throw new Error(
            "Payment does not belong to this booking"
          );
        }

        if (paymentData.status !== "Completed") {
          throw new Error(
            "Only completed payments can be refunded"
          );
        }

        // -----------------------------------------
        // EXISTING REFUNDS AGAINST PAYMENT
        // -----------------------------------------

        const existingRefunds = await Refund.aggregate([
          {
            $match: {
              payment: paymentData._id,
              status: {
                $in: refundableStatuses,
              },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: "$amount",
              },
            },
          },
        ]).session(session);

        const alreadyRefunded =
          existingRefunds.length > 0
            ? existingRefunds[0].total
            : 0;

        const refundablePaymentAmount =
          Number(paymentData.amount || 0) -
          Number(alreadyRefunded || 0);

        if (refundAmount > refundablePaymentAmount) {
          throw new Error(
            `Refund amount cannot exceed refundable payment amount of ${refundablePaymentAmount}`
          );
        }
      } else {
        // -----------------------------------------
        // BOOKING LEVEL REFUND
        // -----------------------------------------

        const existingBookingRefunds =
          await Refund.aggregate([
            {
              $match: {
                booking: bookingData._id,
                status: {
                  $in: refundableStatuses,
                },
              },
            },
            {
              $group: {
                _id: null,
                total: {
                  $sum: "$amount",
                },
              },
            },
          ]).session(session);

        const alreadyRefunded =
          existingBookingRefunds.length > 0
            ? existingBookingRefunds[0].total
            : 0;

        const refundableBookingAmount =
          Number(bookingData.amountPaid || 0) -
          Number(alreadyRefunded || 0);

        if (refundAmount > refundableBookingAmount) {
          throw new Error(
            `Refund amount cannot exceed refundable booking amount of ${refundableBookingAmount}`
          );
        }
      }

      // -------------------------------------------
      // INVOICE
      // -------------------------------------------

      let invoiceData = null;

      if (invoice) {
        invoiceData = await Invoice.findById(invoice).session(
          session
        );

        if (!invoiceData) {
          throw new Error("Invoice not found");
        }

        if (
          invoiceData.booking &&
          invoiceData.booking.toString() !== booking.toString()
        ) {
          throw new Error(
            "Invoice does not belong to this booking"
          );
        }

        if (
          invoiceData.customer &&
          invoiceData.customer.toString() !== customer.toString()
        ) {
          throw new Error(
            "Invoice does not belong to this customer"
          );
        }

        if (invoiceData.status === "Cancelled") {
          throw new Error(
            "Cancelled invoice cannot be refunded"
          );
        }

        // Refund cannot exceed invoice amount already paid
        const existingInvoiceRefunds =
          await Refund.aggregate([
            {
              $match: {
                invoice: invoiceData._id,
                status: {
                  $in: refundableStatuses,
                },
              },
            },
            {
              $group: {
                _id: null,
                total: {
                  $sum: "$amount",
                },
              },
            },
          ]).session(session);

        const alreadyRefunded =
          existingInvoiceRefunds.length > 0
            ? existingInvoiceRefunds[0].total
            : 0;

        const refundableInvoiceAmount =
          Number(invoiceData.amountPaid || 0) -
          Number(alreadyRefunded || 0);

        if (refundAmount > refundableInvoiceAmount) {
          throw new Error(
            `Refund amount cannot exceed refundable invoice amount of ${refundableInvoiceAmount}`
          );
        }
      }

      // -------------------------------------------
      // TRIP
      // -------------------------------------------

      if (trip) {
        const tripData = await Deal.findById(trip).session(
          session
        );

        if (!tripData) {
          throw new Error("Trip not found");
        }
      }

      // -------------------------------------------
      // DUPLICATE TRANSACTION CHECK
      // -------------------------------------------

      if (transactionId?.trim()) {
        const existingTransaction =
          await Refund.findOne({
            transactionId: transactionId.trim(),
          }).session(session);

        if (existingTransaction) {
          throw new Error(
            "Refund with this transaction ID already exists"
          );
        }
      }

      // -------------------------------------------
      // GENERATE REFUND NUMBER
      // -------------------------------------------

      const refundNumber =
        await generateRefundNumber(session);

      // -------------------------------------------
      // CREATE REFUND
      // -------------------------------------------

      const refundDocs = await Refund.create(
        [
          {
            refundNumber,
            booking,
            payment: payment || null,
            invoice: invoice || null,
            customer,
            trip: trip || null,
            amount: refundAmount,
            currency: currency || "INR",
            refundDate: refundDate || new Date(),
            reason: reason.trim(),
            refundMethod:
              refundMethod || "Original Payment Method",
            transactionId: transactionId?.trim() || null,
            referenceNumber:
              referenceNumber?.trim() || null,
            notes: notes?.trim() || "",
            status: "Requested",
            requestedBy: req.user.id,
          },
        ],
        { session }
      );

      createdRefund = refundDocs[0];
    });

    // ---------------------------------------------
    // GET POPULATED REFUND
    // ---------------------------------------------

    const populatedRefund = await populateRefund(
      Refund.findById(createdRefund._id)
    );

    return res.status(201).json({
      message: "Refund request created successfully",
      refund: populatedRefund,
    });
  } catch (error) {
    console.error("Create refund error:", error);

    if (
      error.code === 11000 &&
      error.keyPattern?.transactionId
    ) {
      return res.status(409).json({
        message:
          "Refund with this transaction ID already exists",
      });
    }

    if (
      error.code === 11000 &&
      error.keyPattern?.refundNumber
    ) {
      return res.status(409).json({
        message:
          "Refund number already exists. Please try again.",
      });
    }

    return res.status(400).json({
      message: error.message || "Failed to create refund",
    });
  } finally {
    await session.endSession();
  }
};

// ----------------------------------------------------
// GET ALL REFUNDS
// ----------------------------------------------------

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
      limit = 50,
    } = req.query;

    const filter = {};

    // ---------------------------------------------
    // ID FILTERS
    // ---------------------------------------------

    const idFilters = [
      ["booking", booking],
      ["payment", payment],
      ["invoice", invoice],
      ["customer", customer],
      ["trip", trip],
    ];

    for (const [field, value] of idFilters) {
      if (value) {
        if (!isValidObjectId(value)) {
          return res.status(400).json({
            message: `Invalid ${field} ID`,
          });
        }

        filter[field] = value;
      }
    }

    // ---------------------------------------------
    // OTHER FILTERS
    // ---------------------------------------------

    if (status) {
      filter.status = status;
    }

    if (refundMethod) {
      filter.refundMethod = refundMethod;
    }

    // ---------------------------------------------
    // DATE FILTER
    // ---------------------------------------------

    if (startDate || endDate) {
      filter.refundDate = {};

      if (startDate) {
        const start = new Date(startDate);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            message: "Invalid start date",
          });
        }

        filter.refundDate.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            message: "Invalid end date",
          });
        }

        end.setHours(23, 59, 59, 999);

        filter.refundDate.$lte = end;
      }
    }

    // ---------------------------------------------
    // SEARCH
    // ---------------------------------------------

    if (search?.trim()) {
      const searchRegex = {
        $regex: search.trim(),
        $options: "i",
      };

      filter.$or = [
        {
          refundNumber: searchRegex,
        },
        {
          reason: searchRegex,
        },
        {
          referenceNumber: searchRegex,
        },
        {
          transactionId: searchRegex,
        },
      ];
    }

    // ---------------------------------------------
    // PAGINATION
    // ---------------------------------------------

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 50, 1),
      100
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    // ---------------------------------------------
    // DATA
    // ---------------------------------------------

    const [refunds, total, summary] =
      await Promise.all([
        populateRefund(
          Refund.find(filter)
            .sort({
              refundDate: -1,
              createdAt: -1,
            })
            .skip(skip)
            .limit(limitNumber)
        ),

        Refund.countDocuments(filter),

        Refund.aggregate([
          {
            $match: filter,
          },
          {
            $group: {
              _id: null,
              totalRefundAmount: {
                $sum: "$amount",
              },
              completedRefundAmount: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        "Completed",
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },
              pendingRefundAmount: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        "$status",
                        [
                          "Requested",
                          "Under Review",
                          "Approved",
                          "Processing",
                        ],
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },
            },
          },
        ]),
      ]);

    const totalRefundAmount =
      summary.length > 0
        ? summary[0].totalRefundAmount
        : 0;

    const completedRefundAmount =
      summary.length > 0
        ? summary[0].completedRefundAmount
        : 0;

    const pendingRefundAmount =
      summary.length > 0
        ? summary[0].pendingRefundAmount
        : 0;

    const totalPages = Math.ceil(
      total / limitNumber
    );

    return res.status(200).json({
      message: "Refunds fetched successfully",
      count: refunds.length,
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages,
      hasNextPage:
        pageNumber < totalPages,
      hasPreviousPage:
        pageNumber > 1,
      totalRefundAmount,
      completedRefundAmount,
      pendingRefundAmount,
      refunds,
    });
  } catch (error) {
    console.error("Get refunds error:", error);

    return res.status(500).json({
      message: "Failed to fetch refunds",
      error: error.message,
    });
  }
};

// ----------------------------------------------------
// GET REFUND BY ID
// ----------------------------------------------------

const getRefundById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid refund ID",
      });
    }

    const refund = await populateRefund(
      Refund.findById(id)
    );

    if (!refund) {
      return res.status(404).json({
        message: "Refund not found",
      });
    }

    return res.status(200).json({
      message: "Refund fetched successfully",
      refund,
    });
  } catch (error) {
    console.error("Get refund error:", error);

    return res.status(500).json({
      message: "Failed to fetch refund",
      error: error.message,
    });
  }
};

// ----------------------------------------------------
// UPDATE REFUND
// ----------------------------------------------------

const updateRefund = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid refund ID",
      });
    }

    const refund = await Refund.findById(id);

    if (!refund) {
      return res.status(404).json({
        message: "Refund not found",
      });
    }

    // ---------------------------------------------
    // LOCK FINANCIAL RECORD AFTER APPROVAL
    // ---------------------------------------------

    if (
      [
        "Approved",
        "Processing",
        "Completed",
        "Rejected",
        "Cancelled",
      ].includes(refund.status)
    ) {
      return res.status(400).json({
        message: `Refund cannot be updated when status is ${refund.status}`,
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

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        refund[field] = req.body[field];
      }
    });

    if (
      !Number.isFinite(Number(refund.amount)) ||
      Number(refund.amount) <= 0
    ) {
      return res.status(400).json({
        message: "Refund amount must be greater than 0",
      });
    }

    if (!refund.reason?.trim()) {
      return res.status(400).json({
        message: "Refund reason is required",
      });
    }

    if (refund.transactionId?.trim()) {
      const duplicate = await Refund.findOne({
        transactionId:
          refund.transactionId.trim(),
        _id: { $ne: refund._id },
      });

      if (duplicate) {
        return res.status(409).json({
          message:
            "Refund with this transaction ID already exists",
        });
      }
    }

    await refund.save();

    const updatedRefund = await populateRefund(
      Refund.findById(refund._id)
    );

    return res.status(200).json({
      message: "Refund updated successfully",
      refund: updatedRefund,
    });
  } catch (error) {
    console.error("Update refund error:", error);

    return res.status(400).json({
      message: error.message || "Failed to update refund",
    });
  }
};

// ----------------------------------------------------
// REVIEW REFUND
// ----------------------------------------------------

const reviewRefund = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid refund ID",
      });
    }

    const refund = await Refund.findById(id);

    if (!refund) {
      return res.status(404).json({
        message: "Refund not found",
      });
    }

    if (refund.status !== "Requested") {
      return res.status(400).json({
        message:
          `Only Requested refunds can be moved to Under Review. Current status: ${refund.status}`,
      });
    }

    refund.status = "Under Review";

    await refund.save();

    const updatedRefund = await populateRefund(
      Refund.findById(refund._id)
    );

    return res.status(200).json({
      message:
        "Refund moved to review successfully",
      refund: updatedRefund,
    });
  } catch (error) {
    console.error("Review refund error:", error);

    return res.status(400).json({
      message:
        error.message || "Failed to review refund",
    });
  }
};

// ----------------------------------------------------
// APPROVE REFUND
// ----------------------------------------------------

const approveRefund = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid refund ID",
      });
    }

    const refund = await Refund.findById(id);

    if (!refund) {
      return res.status(404).json({
        message: "Refund not found",
      });
    }

    if (
      !["Requested", "Under Review"].includes(
        refund.status
      )
    ) {
      return res.status(400).json({
        message:
          `Refund cannot be approved when status is ${refund.status}`,
      });
    }

    refund.status = "Approved";
    refund.approvedBy = req.user.id;
    refund.approvedAt = new Date();

    await refund.save();

    const updatedRefund = await populateRefund(
      Refund.findById(refund._id)
    );

    return res.status(200).json({
      message: "Refund approved successfully",
      refund: updatedRefund,
    });
  } catch (error) {
    console.error("Approve refund error:", error);

    return res.status(400).json({
      message:
        error.message || "Failed to approve refund",
    });
  }
};

// ----------------------------------------------------
// REJECT REFUND
// ----------------------------------------------------

const rejectRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid refund ID",
      });
    }

    const refund = await Refund.findById(id);

    if (!refund) {
      return res.status(404).json({
        message: "Refund not found",
      });
    }

    if (
      !["Requested", "Under Review"].includes(
        refund.status
      )
    ) {
      return res.status(400).json({
        message:
          `Refund cannot be rejected when status is ${refund.status}`,
      });
    }

    if (!rejectionReason?.trim()) {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    refund.status = "Rejected";
    refund.rejectionReason =
      rejectionReason.trim();
    refund.approvedBy = req.user.id;
    refund.approvedAt = new Date();

    await refund.save();

    const updatedRefund = await populateRefund(
      Refund.findById(refund._id)
    );

    return res.status(200).json({
      message: "Refund rejected successfully",
      refund: updatedRefund,
    });
  } catch (error) {
    console.error("Reject refund error:", error);

    return res.status(400).json({
      message:
        error.message || "Failed to reject refund",
    });
  }
};

// ----------------------------------------------------
// START PROCESSING REFUND
// ----------------------------------------------------

const processRefund = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid refund ID",
      });
    }

    const refund = await Refund.findById(id);

    if (!refund) {
      return res.status(404).json({
        message: "Refund not found",
      });
    }

    if (refund.status !== "Approved") {
      return res.status(400).json({
        message:
          `Only Approved refunds can be processed. Current status: ${refund.status}`,
      });
    }

    refund.status = "Processing";

    await refund.save();

    const updatedRefund = await populateRefund(
      Refund.findById(refund._id)
    );

    return res.status(200).json({
      message:
        "Refund processing started successfully",
      refund: updatedRefund,
    });
  } catch (error) {
    console.error("Process refund error:", error);

    return res.status(400).json({
      message:
        error.message || "Failed to process refund",
    });
  }
};

// ----------------------------------------------------
// COMPLETE REFUND
// ----------------------------------------------------

const completeRefund = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    const {
      transactionId,
      referenceNumber,
      notes,
    } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid refund ID",
      });
    }

    let completedRefundId;

    await session.withTransaction(async () => {
      // -------------------------------------------
      // FIND REFUND
      // -------------------------------------------

      const refund = await Refund.findById(id).session(
        session
      );

      if (!refund) {
        throw new Error("Refund not found");
      }

      if (refund.status !== "Processing") {
        throw new Error(
          `Only Processing refunds can be completed. Current status: ${refund.status}`
        );
      }

      // -------------------------------------------
      // DUPLICATE TRANSACTION CHECK
      // -------------------------------------------

      if (transactionId?.trim()) {
        const existingTransaction =
          await Refund.findOne({
            transactionId:
              transactionId.trim(),
            _id: { $ne: refund._id },
          }).session(session);

        if (existingTransaction) {
          throw new Error(
            "Refund with this transaction ID already exists"
          );
        }

        refund.transactionId =
          transactionId.trim();
      }

      if (referenceNumber !== undefined) {
        refund.referenceNumber =
          referenceNumber?.trim() || null;
      }

      if (notes !== undefined) {
        refund.notes = notes?.trim() || "";
      }

      // -------------------------------------------
      // MARK REFUND COMPLETED
      // -------------------------------------------

      refund.status = "Completed";
      refund.processedBy = req.user.id;
      refund.processedAt = new Date();

      await refund.save({ session });

      // -------------------------------------------
      // BOOKING
      // -------------------------------------------

      const booking = await Booking.findById(
        refund.booking
      ).session(session);

      if (!booking) {
        throw new Error(
          "Booking associated with refund not found"
        );
      }

      // -------------------------------------------
      // TOTAL COMPLETED REFUNDS FOR BOOKING
      // -------------------------------------------

      const bookingRefundSummary =
        await Refund.aggregate([
          {
            $match: {
              booking: booking._id,
              status: "Completed",
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: "$amount",
              },
            },
          },
        ]).session(session);

      const totalRefundedForBooking =
        bookingRefundSummary.length > 0
          ? Number(
              bookingRefundSummary[0].total
            )
          : 0;

      // -------------------------------------------
      // UPDATE BOOKING FINANCIAL VALUES
      // -------------------------------------------

      const originalBookingAmount =
        Number(booking.totalAmount || 0);

      const currentBookingPaid =
        Number(booking.amountPaid || 0);

      const newBookingPaid = Math.max(
        currentBookingPaid -
          Number(refund.amount),
        0
      );

      const newBookingDue = Math.max(
        originalBookingAmount -
          newBookingPaid,
        0
      );

      booking.amountPaid =
        newBookingPaid;

      booking.amountDue =
        newBookingDue;

      if (newBookingDue === 0) {
        booking.paymentStatus = "Paid";
      } else if (newBookingPaid > 0) {
        booking.paymentStatus =
          "Partially Paid";
      } else {
        booking.paymentStatus =
          "Pending";
      }

      // -------------------------------------------
      // OPTIONAL REFUND FIELDS
      // -------------------------------------------
      // These are assigned only if the Booking
      // schema supports them.

      if (
        Object.prototype.hasOwnProperty.call(
          booking.schema.paths,
          "refundAmount"
        )
      ) {
        booking.refundAmount =
          totalRefundedForBooking;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          booking.schema.paths,
          "refundStatus"
        )
      ) {
        if (
          totalRefundedForBooking >=
          originalBookingAmount
        ) {
          booking.refundStatus =
            "Fully Refunded";
        } else if (
          totalRefundedForBooking > 0
        ) {
          booking.refundStatus =
            "Partially Refunded";
        } else {
          booking.refundStatus =
            "Not Applicable";
        }
      }

      if (
        Object.prototype.hasOwnProperty.call(
          booking.schema.paths,
          "refundProcessedAt"
        )
      ) {
        booking.refundProcessedAt =
          new Date();
      }

      if (
        Object.prototype.hasOwnProperty.call(
          booking.schema.paths,
          "refundProcessedBy"
        )
      ) {
        booking.refundProcessedBy =
          req.user.id;
      }

      await booking.save({ session });

      // -------------------------------------------
      // PAYMENT
      // -------------------------------------------

      if (refund.payment) {
        const payment =
          await Payment.findById(
            refund.payment
          ).session(session);

        if (!payment) {
          throw new Error(
            "Payment associated with refund not found"
          );
        }

        const paymentRefundSummary =
          await Refund.aggregate([
            {
              $match: {
                payment: payment._id,
                status: "Completed",
              },
            },
            {
              $group: {
                _id: null,
                total: {
                  $sum: "$amount",
                },
              },
            },
          ]).session(session);

        const totalRefundedForPayment =
          paymentRefundSummary.length > 0
            ? Number(
                paymentRefundSummary[0].total
              )
            : 0;

        if (
          totalRefundedForPayment >=
          Number(payment.amount || 0)
        ) {
          payment.status = "Refunded";
        }

        await payment.save({ session });
      }

      // -------------------------------------------
      // INVOICE
      // -------------------------------------------

      if (refund.invoice) {
        const invoice =
          await Invoice.findById(
            refund.invoice
          ).session(session);

        if (!invoice) {
          throw new Error(
            "Invoice associated with refund not found"
          );
        }

        const invoiceRefundSummary =
          await Refund.aggregate([
            {
              $match: {
                invoice: invoice._id,
                status: "Completed",
              },
            },
            {
              $group: {
                _id: null,
                total: {
                  $sum: "$amount",
                },
              },
            },
          ]).session(session);

        const totalRefundedForInvoice =
          invoiceRefundSummary.length > 0
            ? Number(
                invoiceRefundSummary[0].total
              )
            : 0;

        // -----------------------------------------
        // REDUCE AMOUNT PAID
        // -----------------------------------------

        invoice.amountPaid =
          Math.max(
            Number(invoice.amountPaid || 0) -
              Number(refund.amount),
            0
          );

        invoice.amountDue =
          Math.max(
            Number(invoice.totalAmount || 0) -
              Number(invoice.amountPaid || 0),
            0
          );

        // -----------------------------------------
        // PAYMENT STATUS
        // -----------------------------------------

        if (invoice.amountDue === 0) {
          invoice.paymentStatus = "Paid";
        } else if (
          invoice.amountPaid > 0
        ) {
          invoice.paymentStatus =
            "Partially Paid";
        } else {
          invoice.paymentStatus =
            "Pending";
        }

        // -----------------------------------------
        // INVOICE STATUS
        // -----------------------------------------

        if (
          totalRefundedForInvoice >=
          Number(invoice.totalAmount || 0)
        ) {
          invoice.status = "Cancelled";
        } else if (
          invoice.amountPaid > 0
        ) {
          invoice.status =
            "Partially Paid";
        } else {
          invoice.status = "Issued";
        }

        await invoice.save({ session });
      }

      completedRefundId = refund._id;
    });

    // ---------------------------------------------
    // GET UPDATED REFUND
    // ---------------------------------------------

    const updatedRefund = await populateRefund(
      Refund.findById(completedRefundId)
    );

    return res.status(200).json({
      message: "Refund completed successfully",
      refund: updatedRefund,
    });
  } catch (error) {
    console.error("Complete refund error:", error);

    if (
      error.code === 11000 &&
      error.keyPattern?.transactionId
    ) {
      return res.status(409).json({
        message:
          "Refund with this transaction ID already exists",
      });
    }

    return res.status(400).json({
      message:
        error.message || "Failed to complete refund",
    });
  } finally {
    await session.endSession();
  }
};

// ----------------------------------------------------
// CANCEL REFUND
// ----------------------------------------------------

const cancelRefund = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid refund ID",
      });
    }

    const refund = await Refund.findById(id);

    if (!refund) {
      return res.status(404).json({
        message: "Refund not found",
      });
    }

    if (
      [
        "Completed",
        "Rejected",
        "Cancelled",
      ].includes(refund.status)
    ) {
      return res.status(400).json({
        message:
          `Refund cannot be cancelled when status is ${refund.status}`,
      });
    }

    refund.status = "Cancelled";

    await refund.save();

    const updatedRefund = await populateRefund(
      Refund.findById(refund._id)
    );

    return res.status(200).json({
      message: "Refund cancelled successfully",
      refund: updatedRefund,
    });
  } catch (error) {
    console.error("Cancel refund error:", error);

    return res.status(400).json({
      message:
        error.message || "Failed to cancel refund",
    });
  }
};

// ----------------------------------------------------
// DELETE REFUND
// ----------------------------------------------------

const deleteRefund = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid refund ID",
      });
    }

    const refund = await Refund.findById(id);

    if (!refund) {
      return res.status(404).json({
        message: "Refund not found",
      });
    }

    if (
      [
        "Approved",
        "Processing",
        "Completed",
      ].includes(refund.status)
    ) {
      return res.status(400).json({
        message:
          `Refund cannot be deleted when status is ${refund.status}`,
      });
    }

    await Refund.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Refund deleted successfully",
    });
  } catch (error) {
    console.error("Delete refund error:", error);

    return res.status(500).json({
      message:
        error.message || "Failed to delete refund",
    });
  }
};

// ----------------------------------------------------
// EXPORTS
// ----------------------------------------------------

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

