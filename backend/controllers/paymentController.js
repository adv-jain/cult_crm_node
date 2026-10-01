
const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const Invoice = require("../models/Invoice");
const User = require("../models/User");

const createNotification = require("../services/notificationService");

// =====================================================
// CONSTANTS
// =====================================================

const PAYMENT_STATUSES = [
  "Pending",
  "Completed",
  "Failed",
  "Refunded",
];

const CREATABLE_PAYMENT_STATUSES = [
  "Pending",
  "Completed",
  "Failed",
];

const PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
  "Cheque",
  "Online",
];

const ACTIVE_SALES_ROLES = ["sales"];


// =====================================================
// HELPERS
// =====================================================

const isValidObjectId = (id) => {
  return mongoose.isValidObjectId(id);
};


const toObjectId = (id) => {
  return new mongoose.Types.ObjectId(id);
};


const isValidDate = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
};


const isFutureDate = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() > Date.now();
};


// =====================================================
// GENERATE PAYMENT NUMBER
// =====================================================

const generatePaymentNumber = async (session) => {
  const year = new Date().getFullYear();

  const lastPayment = await Payment.findOne({
    paymentNumber: {
      $regex: `^PAY-${year}-`,
    },
  })
    .sort({ createdAt: -1 })
    .session(session);

  let nextNumber = 1;

  if (lastPayment?.paymentNumber) {
    const lastNumber = parseInt(
      lastPayment.paymentNumber.split("-").pop(),
      10
    );

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `PAY-${year}-${String(nextNumber).padStart(4, "0")}`;
};


// =====================================================
// GET ACTIVE SALES USERS
// =====================================================

const getActiveSalesUserIds = async (session = null) => {
  const query = User.find({
    role: { $in: ACTIVE_SALES_ROLES },
    isActive: true,
  }).select("_id");

  if (session) {
    query.session(session);
  }

  const users = await query;

  return users.map((user) => user._id);
};


// =====================================================
// CHECK BOOKING ACCESS
// =====================================================

const canAccessBooking = async (bookingData, user) => {
  if (!bookingData || !user) {
    return false;
  }

  // Admin → everything
  if (user.role === "admin") {
    return true;
  }

  // Accounts → finance/payment visibility
  if (user.role === "accounts") {
    return true;
  }

  // Operations → booking visibility
  if (user.role === "operations") {
    return true;
  }

  // Sales → only own bookings
  if (user.role === "sales") {
    return (
      bookingData.salesOwner &&
      bookingData.salesOwner.toString() === user.id.toString()
    );
  }

  // Manager → bookings belonging to active sales team
  if (user.role === "manager") {
    if (!bookingData.salesOwner) {
      return false;
    }

    const salesUser = await User.findOne({
      _id: bookingData.salesOwner,
      role: "sales",
      isActive: true,
    }).select("_id");

    return Boolean(salesUser);
  }

  return false;
};


// =====================================================
// VALIDATE PAYMENT STATUS
// =====================================================

const validatePaymentStatus = (status) => {
  if (status === undefined || status === null || status === "") {
    return "Completed";
  }

  if (!PAYMENT_STATUSES.includes(status)) {
    throw new Error(
      `Invalid payment status. Allowed values: ${PAYMENT_STATUSES.join(", ")}`
    );
  }

  // Refunded payments must be handled by refund workflow.
  if (status === "Refunded") {
    throw new Error(
      "Refunded payment status cannot be created directly. Use the refund workflow."
    );
  }

  if (!CREATABLE_PAYMENT_STATUSES.includes(status)) {
    throw new Error(
      `Payment status ${status} cannot be created directly`
    );
  }

  return status;
};


// =====================================================
// VALIDATE PAYMENT METHOD
// =====================================================

const validatePaymentMethod = (paymentMethod) => {
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw new Error(
      `Invalid payment method. Allowed values: ${PAYMENT_METHODS.join(", ")}`
    );
  }
};


// =====================================================
// VALIDATE PAYMENT DATE
// =====================================================

const validatePaymentDate = (paymentDate) => {
  if (paymentDate === undefined || paymentDate === null || paymentDate === "") {
    return new Date();
  }

  if (!isValidDate(paymentDate)) {
    throw new Error("Payment date must be a valid date");
  }

  if (isFutureDate(paymentDate)) {
    throw new Error("Payment date cannot be in the future");
  }

  return new Date(paymentDate);
};


// =====================================================
// UPDATE BOOKING PAYMENT TOTALS
// ONLY COMPLETED PAYMENTS REACH HERE
// =====================================================

const updateBookingPaymentTotals = (bookingData, paymentAmount) => {
  const currentAmountPaid = Number(
    bookingData.amountPaid || 0
  );

  const totalBookingAmount = Number(
    bookingData.totalAmount || 0
  );

  const newAmountPaid = Number(
    (currentAmountPaid + paymentAmount).toFixed(2)
  );

  if (newAmountPaid > totalBookingAmount) {
    throw new Error(
      `Payment amount cannot exceed booking due amount`
    );
  }

  bookingData.amountPaid = newAmountPaid;

  bookingData.amountDue = Number(
    Math.max(
      0,
      totalBookingAmount - newAmountPaid
    ).toFixed(2)
  );

  if (newAmountPaid <= 0) {
    bookingData.paymentStatus = "Pending";
  } else if (newAmountPaid < totalBookingAmount) {
    bookingData.paymentStatus = "Partially Paid";
  } else {
    bookingData.amountPaid = totalBookingAmount;
    bookingData.amountDue = 0;
    bookingData.paymentStatus = "Paid";
  }
};


// =====================================================
// UPDATE INVOICE PAYMENT TOTALS
// ONLY COMPLETED PAYMENTS REACH HERE
// =====================================================

const updateInvoicePaymentTotals = (
  invoiceData,
  paymentAmount
) => {
  const currentAmountPaid = Number(
    invoiceData.amountPaid || 0
  );

  const totalInvoiceAmount = Number(
    invoiceData.totalAmount || 0
  );

  const newAmountPaid = Number(
    (currentAmountPaid + paymentAmount).toFixed(2)
  );

  if (newAmountPaid > totalInvoiceAmount) {
    throw new Error(
      "Payment amount cannot exceed invoice due amount"
    );
  }

  invoiceData.amountPaid = newAmountPaid;

  invoiceData.amountDue = Number(
    Math.max(
      0,
      totalInvoiceAmount - newAmountPaid
    ).toFixed(2)
  );

  if (newAmountPaid <= 0) {
    invoiceData.paymentStatus = "Pending";
  } else if (newAmountPaid < totalInvoiceAmount) {
    invoiceData.paymentStatus = "Partially Paid";

    invoiceData.status = "Partially Paid";
  } else {
    invoiceData.amountPaid = totalInvoiceAmount;
    invoiceData.amountDue = 0;

    invoiceData.paymentStatus = "Paid";
    invoiceData.status = "Paid";
  }
};


// =====================================================
// CREATE PAYMENT
// =====================================================

const createPayment = async (req, res) => {
  const session = await mongoose.startSession();

  const bookingId = req.body.booking;

  try {
    let paymentId = null;
    let bookingSummary = null;
    let invoiceSummary = null;

    await session.withTransaction(async () => {
      const {
        booking,
        invoice,
        amount,
        paymentMethod,
        transactionId,
        paymentDate,
        status,
        notes,
      } = req.body;

      // =================================================
      // BASIC VALIDATION
      // =================================================

      if (
        !booking ||
        amount === undefined ||
        amount === null ||
        !paymentMethod
      ) {
        throw new Error(
          "Booking, amount and payment method are required"
        );
      }

      if (!isValidObjectId(booking)) {
        throw new Error("Invalid booking ID");
      }

      if (invoice && !isValidObjectId(invoice)) {
        throw new Error("Invalid invoice ID");
      }

      const paymentAmount = Number(amount);

      if (
        !Number.isFinite(paymentAmount) ||
        paymentAmount <= 0
      ) {
        throw new Error(
          "Payment amount must be a valid number greater than 0"
        );
      }

      validatePaymentMethod(paymentMethod);

      const paymentStatus = validatePaymentStatus(status);

      const finalPaymentDate =
        validatePaymentDate(paymentDate);

      // =================================================
      // FIND BOOKING
      // =================================================

      const bookingData = await Booking.findById(
        booking
      ).session(session);

      if (!bookingData) {
        throw new Error("Booking not found");
      }

      // =================================================
      // ACCESS CONTROL
      // =================================================

      const hasBookingAccess =
        await canAccessBooking(
          bookingData,
          req.user
        );

      if (!hasBookingAccess) {
        throw new Error(
          "Access denied for this booking"
        );
      }

      // =================================================
      // PREVENT PAYMENT ON CANCELLED / REFUNDED BOOKING
      // =================================================

      if (
        bookingData.status === "Cancelled" ||
        bookingData.status === "Refunded"
      ) {
        throw new Error(
          `Payment cannot be added to a ${bookingData.status.toLowerCase()} booking`
        );
      }

      // =================================================
      // DUPLICATE TRANSACTION CHECK
      // =================================================

      const cleanTransactionId =
        transactionId &&
        String(transactionId).trim()
          ? String(transactionId).trim()
          : null;

      if (cleanTransactionId) {
        const existingPayment =
          await Payment.findOne({
            transactionId: cleanTransactionId,
          }).session(session);

        if (existingPayment) {
          throw new Error(
            "Payment with this transaction ID already exists"
          );
        }
      }

      // =================================================
      // CHECK BOOKING DUE AMOUNT
      // =================================================

      const bookingAmountDue = Number(
        bookingData.amountDue || 0
      );

      if (paymentAmount > bookingAmountDue) {
        throw new Error(
          `Payment amount cannot exceed booking due amount of ${bookingAmountDue}`
        );
      }

      // =================================================
      // FIND INVOICE
      // =================================================

      let invoiceData = null;

      if (invoice) {
        invoiceData = await Invoice.findById(
          invoice
        ).session(session);

        if (!invoiceData) {
          throw new Error("Invoice not found");
        }

        // =================================================
        // INVOICE → BOOKING RELATION
        // =================================================

        if (
          invoiceData.booking &&
          invoiceData.booking.toString() !==
            bookingData._id.toString()
        ) {
          throw new Error(
            "Invoice does not belong to the selected booking"
          );
        }

        // =================================================
        // INVOICE → CUSTOMER RELATION
        // =================================================

        if (
          invoiceData.customer &&
          bookingData.customer &&
          invoiceData.customer.toString() !==
            bookingData.customer.toString()
        ) {
          throw new Error(
            "Invoice customer does not match booking customer"
          );
        }

        // =================================================
        // CANCELLED INVOICE
        // =================================================

        if (invoiceData.status === "Cancelled") {
          throw new Error(
            "Payment cannot be added to a cancelled invoice"
          );
        }

        // =================================================
        // INVOICE DUE AMOUNT
        // =================================================

        const invoiceAmountDue = Number(
          invoiceData.amountDue || 0
        );

        if (paymentAmount > invoiceAmountDue) {
          throw new Error(
            `Payment amount cannot exceed invoice due amount of ${invoiceAmountDue}`
          );
        }
      }

      // =================================================
      // GENERATE PAYMENT NUMBER
      // =================================================

      const paymentNumber =
        await generatePaymentNumber(session);

      // =================================================
      // CREATE PAYMENT
      // =================================================

      const payment = new Payment({
        booking: bookingData._id,

        invoice: invoiceData
          ? invoiceData._id
          : null,

        customer: bookingData.customer,

        enquiry:
          bookingData.enquiry || null,

        quotation:
          bookingData.quotation || null,

        paymentNumber,

        amount: paymentAmount,

        currency:
          bookingData.currency || "INR",

        paymentMethod,

        transactionId:
          cleanTransactionId,

        paymentDate:
          finalPaymentDate,

        status:
          paymentStatus,

        notes:
          notes
            ? String(notes).trim()
            : "",

        receivedBy:
          req.user.id,
      });

      await payment.save({
        session,
      });

      paymentId = payment._id;

      // =================================================
      // IMPORTANT:
      // ONLY COMPLETED PAYMENT AFFECTS FINANCIAL TOTALS
      // =================================================

      if (paymentStatus === "Completed") {
        // =================================================
        // UPDATE BOOKING PAYMENT
        // =================================================

        updateBookingPaymentTotals(
          bookingData,
          paymentAmount
        );

        await bookingData.save({
          session,
        });

        // =================================================
        // UPDATE INVOICE PAYMENT
        // =================================================

        if (invoiceData) {
          updateInvoicePaymentTotals(
            invoiceData,
            paymentAmount
          );

          await invoiceData.save({
            session,
          });
        }
      }

      // =================================================
      // PAYMENT SUMMARY
      // =================================================

      bookingSummary = {
        totalAmount:
          bookingData.totalAmount,

        amountPaid:
          bookingData.amountPaid,

        amountDue:
          bookingData.amountDue,

        paymentStatus:
          bookingData.paymentStatus,
      };

      invoiceSummary = invoiceData
        ? {
            invoiceNumber:
              invoiceData.invoiceNumber,

            totalAmount:
              invoiceData.totalAmount,

            amountPaid:
              invoiceData.amountPaid,

            amountDue:
              invoiceData.amountDue,

            paymentStatus:
              invoiceData.paymentStatus,

            status:
              invoiceData.status,
          }
        : null;
    });

    // =====================================================
    // NOTIFICATION
    // =====================================================

    try {
      const bookingData =
        await Booking.findById(bookingId);

      if (
        bookingData?.salesOwner &&
        req.body.status !== "Failed"
      ) {
        await createNotification({
          recipient:
            bookingData.salesOwner,

          type:
            "PAYMENT_RECEIVED",

          title:
            req.body.status === "Pending"
              ? "Payment Pending"
              : "Payment Received",

          message:
            `Payment of ${
              bookingData.currency || "INR"
            } ${Number(
              req.body.amount
            )} ${
              req.body.status === "Pending"
                ? "is pending"
                : "received"
            } for booking ${
              bookingData._id
            }`,

          relatedBooking:
            bookingData._id,

          relatedCustomer:
            bookingData.customer,
        });
      }
    } catch (notificationError) {
      console.log(
        "Payment notification failed:",
        notificationError.message
      );
    }

    // =====================================================
    // POPULATED PAYMENT
    // =====================================================

    const populatedPayment =
      await Payment.findById(paymentId)
        .populate(
          "booking",
          "status totalAmount amountPaid amountDue paymentStatus"
        )
        .populate(
          "invoice",
          "invoiceNumber totalAmount amountPaid amountDue paymentStatus status"
        )
        .populate(
          "customer",
          "firstName lastName email phone"
        )
        .populate(
          "enquiry",
          "destination travelDate"
        )
        .populate(
          "quotation",
          "quotationNumber totalAmount status"
        )
        .populate(
          "receivedBy",
          "name email role"
        );

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(201).json({
      message:
        "Payment created successfully",

      payment:
        populatedPayment,

      bookingPaymentSummary:
        bookingSummary,

      invoicePaymentSummary:
        invoiceSummary,
    });

  } catch (error) {
    console.error(
      "Create payment error:",
      error
    );

    // ===================================================
    // DUPLICATE KEY ERROR
    // ===================================================

    if (error.code === 11000) {
      const duplicateField =
        Object.keys(
          error.keyPattern || {}
        )[0];

      if (
        duplicateField === "transactionId"
      ) {
        return res.status(409).json({
          message:
            "Payment with this transaction ID already exists",
        });
      }

      if (
        duplicateField === "paymentNumber"
      ) {
        return res.status(409).json({
          message:
            "Payment number already exists. Please try again.",
        });
      }
    }

    const message =
      error.message ||
      "Failed to create payment";

    if (
      message === "Access denied for this booking"
    ) {
      return res.status(403).json({
        message,
      });
    }

    return res.status(400).json({
      message:
        "Failed to create payment",

      error:
        message,
    });

  } finally {
    await session.endSession();
  }
};


// =====================================================
// GET ALL PAYMENTS
// =====================================================

const getPayments = async (req, res) => {
  try {
    const {
      booking,
      invoice,
      customer,
      status,
      paymentMethod,
      page = 1,
      limit = 10,
    } = req.query;

    // =================================================
    // VALIDATE FILTER IDS
    // =================================================

    if (
      booking &&
      !isValidObjectId(booking)
    ) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    if (
      invoice &&
      !isValidObjectId(invoice)
    ) {
      return res.status(400).json({
        message: "Invalid invoice ID",
      });
    }

    if (
      customer &&
      !isValidObjectId(customer)
    ) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    // =================================================
    // VALIDATE STATUS
    // =================================================

    if (
      status &&
      !PAYMENT_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        message:
          `Invalid payment status. Allowed values: ${PAYMENT_STATUSES.join(", ")}`,
      });
    }

    // =================================================
    // VALIDATE PAYMENT METHOD
    // =================================================

    if (
      paymentMethod &&
      !PAYMENT_METHODS.includes(paymentMethod)
    ) {
      return res.status(400).json({
        message:
          `Invalid payment method. Allowed values: ${PAYMENT_METHODS.join(", ")}`,
      });
    }

    // =================================================
    // PAGINATION
    // =================================================

    const pageNumberRaw = Number(page);

    const limitNumberRaw = Number(limit);

    const pageNumber =
      Number.isFinite(pageNumberRaw) &&
      pageNumberRaw > 0
        ? Math.floor(pageNumberRaw)
        : 1;

    const limitNumber =
      Number.isFinite(limitNumberRaw) &&
      limitNumberRaw > 0
        ? Math.min(
            50,
            Math.floor(limitNumberRaw)
          )
        : 10;

    const skip =
      (pageNumber - 1) *
      limitNumber;

    // =================================================
    // BASE FILTER
    // =================================================

    const filter = {};

    if (booking) {
      filter.booking = toObjectId(booking);
    }

    if (invoice) {
      filter.invoice = toObjectId(invoice);
    }

    if (customer) {
      filter.customer = toObjectId(customer);
    }

    if (status) {
      filter.status = status;
    }

    if (paymentMethod) {
      filter.paymentMethod =
        paymentMethod;
    }

    // =================================================
    // ROLE-BASED BOOKING SCOPE
    // =================================================

    if (req.user.role === "sales") {
      filter.booking = {
        ...(booking
          ? { $eq: toObjectId(booking) }
          : {}),
      };

      const ownBookings =
        await Booking.find({
          salesOwner: req.user.id,
        }).select("_id");

      const ownBookingIds =
        ownBookings.map(
          (item) => item._id
        );

      if (booking) {
        const isOwnBooking =
          ownBookingIds.some(
            (id) =>
              id.toString() ===
              booking.toString()
          );

        if (!isOwnBooking) {
          return res.status(200).json({
            message:
              "Payments fetched successfully",
            total: 0,
            page: pageNumber,
            limit: limitNumber,
            totalPages: 0,
            payments: [],
          });
        }
      } else {
        filter.booking = {
          $in: ownBookingIds,
        };
      }
    }

    // =================================================
    // MANAGER → ACTIVE SALES TEAM ONLY
    // =================================================

    if (req.user.role === "manager") {
      const activeSalesUsers =
        await getActiveSalesUserIds();

      const teamBookings =
        await Booking.find({
          salesOwner: {
            $in: activeSalesUsers,
          },
        }).select("_id");

      const teamBookingIds =
        teamBookings.map(
          (item) => item._id
        );

      if (booking) {
        const isTeamBooking =
          teamBookingIds.some(
            (id) =>
              id.toString() ===
              booking.toString()
          );

        if (!isTeamBooking) {
          return res.status(200).json({
            message:
              "Payments fetched successfully",
            total: 0,
            page: pageNumber,
            limit: limitNumber,
            totalPages: 0,
            payments: [],
          });
        }
      } else {
        filter.booking = {
          $in: teamBookingIds,
        };
      }
    }

    // =================================================
    // ADMIN / ACCOUNTS / OPERATIONS
    // ALL PAYMENT RECORDS
    // =================================================

    if (
      ![
        "admin",
        "manager",
        "sales",
        "accounts",
        "operations",
      ].includes(req.user.role)
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    // =================================================
    // FETCH PAYMENTS
    // =================================================

    const [
      payments,
      total,
    ] = await Promise.all([
      Payment.find(filter)
        .populate(
          "booking",
          "status totalAmount amountPaid amountDue paymentStatus destination travelDate salesOwner"
        )
        .populate(
          "invoice",
          "invoiceNumber totalAmount amountPaid amountDue paymentStatus status"
        )
        .populate(
          "customer",
          "firstName lastName email phone"
        )
        .populate(
          "receivedBy",
          "name email role"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Payment.countDocuments(filter),
    ]);

    return res.status(200).json({
      message:
        "Payments fetched successfully",

      total,

      page:
        pageNumber,

      limit:
        limitNumber,

      totalPages:
        Math.ceil(
          total / limitNumber
        ),

      payments,
    });

  } catch (error) {
    console.error(
      "Get payments error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch payments",

      error:
        error.message,
    });
  }
};


// =====================================================
// GET PAYMENT BY ID
// =====================================================

const getPaymentById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    // =================================================
    // OBJECT ID VALIDATION
    // =================================================

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid payment ID",
      });
    }

    // =================================================
    // FIND PAYMENT
    // =================================================

    const payment =
      await Payment.findById(id)
        .populate(
          "booking"
        )
        .populate(
          "invoice"
        )
        .populate(
          "customer"
        )
        .populate(
          "enquiry"
        )
        .populate(
          "quotation"
        )
        .populate(
          "receivedBy",
          "name email role"
        );

    if (!payment) {
      return res.status(404).json({
        message:
          "Payment not found",
      });
    }

    // =================================================
    // BOOKING ACCESS
    // =================================================

    if (!payment.booking) {
      return res.status(400).json({
        message:
          "Payment booking reference is missing",
      });
    }

    const hasAccess =
      await canAccessBooking(
        payment.booking,
        req.user
      );

    if (!hasAccess) {
      return res.status(403).json({
        message:
          "Access denied for this payment",
      });
    }

    return res.status(200).json({
      message:
        "Payment fetched successfully",

      payment,
    });

  } catch (error) {
    console.error(
      "Get payment error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch payment",

      error:
        error.message,
    });
  }
};


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
};

