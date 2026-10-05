const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const Invoice = require("../models/Invoice");

const {
  createNotification,
} = require("../services/notificationService");

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
// GET COMPLETED PAYMENT TOTAL FOR BOOKING
// =====================================================

const getCompletedBookingPaymentsTotal = async (
  bookingId,
  session
) => {
  const result = await Payment.aggregate([
    {
      $match: {
        booking: new mongoose.Types.ObjectId(bookingId),
        status: "Completed",
      },
    },
    {
      $group: {
        _id: null,
        totalPaid: {
          $sum: "$amount",
        },
      },
    },
  ]).session(session);

  return Number(result[0]?.totalPaid || 0);
};

// =====================================================
// GET COMPLETED PAYMENT TOTAL FOR INVOICE
// =====================================================

const getCompletedInvoicePaymentsTotal = async (
  invoiceId,
  session
) => {
  const result = await Payment.aggregate([
    {
      $match: {
        invoice: new mongoose.Types.ObjectId(invoiceId),
        status: "Completed",
      },
    },
    {
      $group: {
        _id: null,
        totalPaid: {
          $sum: "$amount",
        },
      },
    },
  ]).session(session);

  return Number(result[0]?.totalPaid || 0);
};

// =====================================================
// UPDATE BOOKING PAYMENT SUMMARY
// =====================================================

const updateBookingPaymentSummary = async (
  bookingData,
  paidAmount
) => {
  const totalBookingAmount = Number(
    bookingData.totalAmount || 0
  );

  const normalizedPaid = Number(
    Math.min(
      Math.max(paidAmount, 0),
      totalBookingAmount
    ).toFixed(2)
  );

  bookingData.amountPaid = normalizedPaid;

  bookingData.amountDue = Number(
    Math.max(
      0,
      totalBookingAmount - normalizedPaid
    ).toFixed(2)
  );

  if (normalizedPaid <= 0) {
    bookingData.paymentStatus = "Pending";
  } else if (
    normalizedPaid < totalBookingAmount
  ) {
    bookingData.paymentStatus = "Partially Paid";
  } else {
    bookingData.amountPaid =
      totalBookingAmount;

    bookingData.amountDue = 0;

    bookingData.paymentStatus = "Paid";
  }

  return bookingData;
};

// =====================================================
// UPDATE INVOICE PAYMENT SUMMARY
// =====================================================

const updateInvoicePaymentSummary = async (
  invoiceData,
  paidAmount
) => {
  const totalInvoiceAmount = Number(
    invoiceData.totalAmount || 0
  );

  const normalizedPaid = Number(
    Math.min(
      Math.max(paidAmount, 0),
      totalInvoiceAmount
    ).toFixed(2)
  );

  invoiceData.amountPaid =
    normalizedPaid;

  invoiceData.amountDue = Number(
    Math.max(
      0,
      totalInvoiceAmount - normalizedPaid
    ).toFixed(2)
  );

  if (
    invoiceData.status === "Cancelled"
  ) {
    invoiceData.paymentStatus =
      "Cancelled";

    return invoiceData;
  }

  if (normalizedPaid <= 0) {
    invoiceData.paymentStatus =
      "Pending";

    if (
      ![
        "Draft",
        "Issued",
        "Sent",
        "Viewed",
      ].includes(invoiceData.status)
    ) {
      invoiceData.status = "Issued";
    }
  } else if (
    normalizedPaid < totalInvoiceAmount
  ) {
    invoiceData.paymentStatus =
      "Partially Paid";

    invoiceData.status =
      "Partially Paid";
  } else {
    invoiceData.amountPaid =
      totalInvoiceAmount;

    invoiceData.amountDue = 0;

    invoiceData.paymentStatus =
      "Paid";

    invoiceData.status =
      "Paid";
  }

  return invoiceData;
};

// =====================================================
// CREATE PAYMENT
// =====================================================

const createPayment = async (req, res) => {
  const session =
    await mongoose.startSession();

  const bookingId =
    req.body.booking;

  try {
    let paymentId = null;
    let bookingSummary = null;
    let invoiceSummary = null;

    await session.withTransaction(
      async () => {
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
          !paymentMethod
        ) {
          throw new Error(
            "Booking, amount and payment method are required"
          );
        }

        if (
          !mongoose.Types.ObjectId.isValid(
            booking
          )
        ) {
          throw new Error(
            "Invalid booking ID"
          );
        }

        if (
          invoice &&
          !mongoose.Types.ObjectId.isValid(
            invoice
          )
        ) {
          throw new Error(
            "Invalid invoice ID"
          );
        }

        const paymentAmount =
          Number(amount);

        if (
          !Number.isFinite(
            paymentAmount
          ) ||
          paymentAmount <= 0
        ) {
          throw new Error(
            "Payment amount must be a valid number greater than 0"
          );
        }

        const paymentStatus =
          status || "Completed";

        const allowedStatuses = [
          "Pending",
          "Completed",
          "Failed",
          "Refunded",
        ];

        if (
          !allowedStatuses.includes(
            paymentStatus
          )
        ) {
          throw new Error(
            `Invalid payment status. Allowed statuses: ${allowedStatuses.join(
              ", "
            )}`
          );
        }

        // =================================================
        // FIND BOOKING
        // =================================================

        const bookingData =
          await Booking.findById(
            booking
          ).session(session);

        if (!bookingData) {
          throw new Error(
            "Booking not found"
          );
        }

        // =================================================
        // DUPLICATE TRANSACTION CHECK
        // =================================================

        if (transactionId) {
          const existingPayment =
            await Payment.findOne({
              transactionId:
                transactionId.trim(),
            }).session(session);

          if (existingPayment) {
            throw new Error(
              "Payment with this transaction ID already exists"
            );
          }
        }

        // =================================================
        // PREVENT PAYMENT ON CANCELLED / REFUNDED BOOKING
        // =================================================

        if (
          bookingData.status ===
            "Cancelled" ||
          bookingData.status ===
            "Refunded"
        ) {
          throw new Error(
            `Payment cannot be added to a ${bookingData.status.toLowerCase()} booking`
          );
        }

        // =================================================
        // FIND INVOICE
        // =================================================

        let invoiceData = null;

        if (invoice) {
          invoiceData =
            await Invoice.findById(
              invoice
            ).session(session);

          if (!invoiceData) {
            throw new Error(
              "Invoice not found"
            );
          }

          // =================================================
          // CHECK INVOICE-BOOKING RELATION
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
          // CHECK INVOICE CUSTOMER
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
          // PREVENT PAYMENT ON CANCELLED INVOICE
          // =================================================

          if (
            invoiceData.status ===
            "Cancelled"
          ) {
            throw new Error(
              "Payment cannot be added to a cancelled invoice"
            );
          }

          // =================================================
          // INVOICE IS PRIMARY PAYMENT LIMIT
          // =================================================

          const invoiceAmountDue =
            Number(
              invoiceData.amountDue ||
                0
            );

          if (
            paymentAmount >
            invoiceAmountDue
          ) {
            throw new Error(
              `Payment amount cannot exceed invoice due amount of ${invoiceAmountDue}`
            );
          }
        } else {
          // =================================================
          // NO INVOICE → BOOKING IS PRIMARY LIMIT
          // =================================================

          const bookingAmountDue =
            Number(
              bookingData.amountDue ||
                0
            );

          if (
            paymentAmount >
            bookingAmountDue
          ) {
            throw new Error(
              `Payment amount cannot exceed booking due amount of ${bookingAmountDue}`
            );
          }
        }

        // =================================================
        // GENERATE PAYMENT NUMBER
        // =================================================

        const paymentNumber =
          await generatePaymentNumber(
            session
          );

        // =================================================
        // CREATE PAYMENT
        // =================================================

        const payment =
          new Payment({
            booking:
              bookingData._id,

            invoice: invoiceData
              ? invoiceData._id
              : null,

            customer:
              bookingData.customer,

            enquiry:
              bookingData.enquiry ||
              null,

            quotation:
              bookingData.quotation ||
              null,

            paymentNumber,

            amount:
              paymentAmount,

            currency:
              bookingData.currency ||
              "INR",

            paymentMethod,

            transactionId:
              transactionId
                ? transactionId.trim()
                : null,

            paymentDate:
              paymentDate ||
              new Date(),

            status:
              paymentStatus,

            notes:
              notes || "",

            receivedBy:
              req.user.id,
          });

        await payment.save({
          session,
        });

        paymentId =
          payment._id;

        // =================================================
        // ONLY COMPLETED PAYMENTS AFFECT FINANCIAL TOTALS
        // =================================================

        if (
          paymentStatus ===
          "Completed"
        ) {
          // =================================================
          // RECONCILE BOOKING FROM ALL COMPLETED PAYMENTS
          // =================================================

          const bookingPaid =
            await getCompletedBookingPaymentsTotal(
              bookingData._id,
              session
            );

          // =================================================
          // IF INVOICE EXISTS
          // INVOICE TOTAL BECOMES BOOKING TOTAL
          // =================================================

          if (invoiceData) {
            bookingData.totalAmount =
              Number(
                invoiceData.totalAmount ||
                  0
              );
          }

          await updateBookingPaymentSummary(
            bookingData,
            bookingPaid
          );

          await bookingData.save({
            session,
          });

          // =================================================
          // RECONCILE INVOICE
          // =================================================

          if (invoiceData) {
            const invoiceLinkedPaid =
              await getCompletedInvoicePaymentsTotal(
                invoiceData._id,
                session
              );

            const historicalBookingPaid =
              await getCompletedBookingPaymentsTotal(
                bookingData._id,
                session
              );

            const reconciledInvoicePaid =
              Math.max(
                invoiceLinkedPaid,
                historicalBookingPaid
              );

            await updateInvoicePaymentSummary(
              invoiceData,
              reconciledInvoicePaid
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

        invoiceSummary =
          invoiceData
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
      }
    );

    // =====================================================
    // NOTIFICATION
    // =====================================================

    try {
      const bookingData =
        await Booking.findById(
          bookingId
        );

      if (
        bookingData?.salesOwner &&
        req.body.status !==
          "Failed"
      ) {
        await createNotification({
          recipient:
            bookingData.salesOwner,

          type:
            "PAYMENT_RECEIVED",

          title:
            "Payment Received",

          message:
            `Payment of ${
              bookingData.currency ||
              "INR"
            } ${Number(
              req.body.amount
            )} received for booking ${
              bookingData._id
            }`,

          relatedBooking:
            bookingData._id,

          relatedCustomer:
            bookingData.customer,
        });
      }
    } catch (
      notificationError
    ) {
      console.log(
        "Payment notification failed:",
        notificationError.message
      );
    }

    // =====================================================
    // POPULATED PAYMENT
    // =====================================================

    const populatedPayment =
      await Payment.findById(
        paymentId
      )
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

    if (
      error.code === 11000
    ) {
      const duplicateField =
        Object.keys(
          error.keyPattern || {}
        )[0];

      if (
        duplicateField ===
        "transactionId"
      ) {
        return res.status(409).json({
          message:
            "Payment with this transaction ID already exists",
        });
      }

      if (
        duplicateField ===
        "paymentNumber"
      ) {
        return res.status(409).json({
          message:
            "Payment number already exists. Please try again.",
        });
      }
    }

    return res.status(400).json({
      message:
        "Failed to create payment",

      error:
        error.message,
    });

  } finally {
    await session.endSession();
  }
};

// =====================================================
// GET ALL PAYMENTS
// =====================================================

const getPayments = async (
  req,
  res
) => {
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

    const filter = {};

    if (booking) {
      filter.booking =
        booking;
    }

    if (invoice) {
      filter.invoice =
        invoice;
    }

    if (customer) {
      filter.customer =
        customer;
    }

    if (status) {
      filter.status =
        status;
    }

    if (paymentMethod) {
      filter.paymentMethod =
        paymentMethod;
    }

    const pageNumber =
      Math.max(
        1,
        Number(page)
      );

    const limitNumber =
      Math.min(
        100,
        Math.max(
          1,
          Number(limit)
        )
      );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [
      payments,
      total,
    ] = await Promise.all([
      Payment.find(filter)
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
          "receivedBy",
          "name email role"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(
          limitNumber
        ),

      Payment.countDocuments(
        filter
      ),
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
          total /
            limitNumber
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
    const payment =
      await Payment.findById(
        req.params.id
      )
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
// RECONCILE BOOKING PAYMENTS
// =====================================================

const reconcileBookingPayments = async (
  req,
  res
) => {
  const session =
    await mongoose.startSession();

  try {
    const {
      bookingId,
    } = req.params;

    // =================================================
    // ROLE CHECK
    // =================================================

    if (
      ![
        "admin",
        "accounts",
        "manager",
      ].includes(
        req.user.role
      )
    ) {
      return res.status(403).json({
        message:
          "Only admin, accounts or manager can reconcile payments",
      });
    }

    // =================================================
    // BOOKING ID VALIDATION
    // =================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        bookingId
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid booking ID",
      });
    }

    let reconciliationResult =
      null;

    await session.withTransaction(
      async () => {
        // =================================================
        // FIND BOOKING
        // =================================================

        const bookingData =
          await Booking.findById(
            bookingId
          ).session(session);

        if (!bookingData) {
          throw new Error(
            "Booking not found"
          );
        }

        // =================================================
        // FIND ACTIVE INVOICE
        // =================================================

        const invoiceData =
          await Invoice.findOne({
            booking:
              bookingData._id,

            status: {
              $ne: "Cancelled",
            },
          })
            .sort({
              createdAt: -1,
            })
            .session(session);

        if (!invoiceData) {
          throw new Error(
            "No active invoice found for this booking"
          );
        }

        // =================================================
        // CUSTOMER VALIDATION
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
        // LINK QUOTATION IF MISSING
        // =================================================

        if (
          !invoiceData.quotation &&
          bookingData.quotation
        ) {
          invoiceData.quotation =
            bookingData.quotation;
        }

        // =================================================
        // GET ALL COMPLETED PAYMENTS
        // =================================================

        const completedPayments =
          await Payment.find({
            booking:
              bookingData._id,

            status:
              "Completed",
          })
            .sort({
              createdAt: 1,
            })
            .session(session);

        let linkedHistoricalPayments =
          0;

        // =================================================
        // LINK HISTORICAL PAYMENTS
        // =================================================

        for (
          const payment of
            completedPayments
        ) {
          // -----------------------------------------------
          // CASE 1: PAYMENT HAS NO INVOICE
          // -----------------------------------------------

          if (
            !payment.invoice
          ) {
            payment.invoice =
              invoiceData._id;

            await payment.save({
              session,
            });

            linkedHistoricalPayments++;

            continue;
          }

          // -----------------------------------------------
          // CASE 2: PAYMENT HAS AN INVOICE
          // -----------------------------------------------

          const existingInvoice =
            await Invoice.findById(
              payment.invoice
            ).session(session);

          // -----------------------------------------------
          // CASE 2A: OLD INVOICE DOES NOT EXIST
          // -----------------------------------------------

          if (
            !existingInvoice
          ) {
            payment.invoice =
              invoiceData._id;

            await payment.save({
              session,
            });

            linkedHistoricalPayments++;

            continue;
          }

          // -----------------------------------------------
          // CASE 2B: EXISTING INVOICE BELONGS TO
          // SAME BOOKING
          // -----------------------------------------------

          if (
            existingInvoice.booking &&
            existingInvoice.booking.toString() ===
              bookingData._id.toString()
          ) {
            // It is safe to relink to the current
            // active invoice.

            if (
              existingInvoice._id.toString() !==
              invoiceData._id.toString()
            ) {
              payment.invoice =
                invoiceData._id;

              await payment.save({
                session,
              });

              linkedHistoricalPayments++;
            }

            continue;
          }

          // -----------------------------------------------
          // CASE 2C: INVOICE BELONGS TO DIFFERENT BOOKING
          // -----------------------------------------------

          throw new Error(
            `Payment ${payment.paymentNumber} is linked to an invoice belonging to another booking`
          );
        }

        // =================================================
        // CALCULATE TOTAL COMPLETED PAYMENTS
        // =================================================

        const paymentAggregation =
          await Payment.aggregate([
            {
              $match: {
                booking:
                  bookingData._id,

                status:
                  "Completed",
              },
            },

            {
              $group: {
                _id: null,

                totalPaid: {
                  $sum: "$amount",
                },
              },
            },
          ]).session(session);

        const totalPaid =
          Number(
            paymentAggregation[0]
              ?.totalPaid || 0
          );

        // =================================================
        // INVOICE IS FINAL FINANCIAL SOURCE OF TRUTH
        // =================================================

        const finalBookingTotal =
          Number(
            invoiceData.totalAmount ||
              0
          );

        // =================================================
        // UPDATE BOOKING
        // =================================================

        bookingData.totalAmount =
          finalBookingTotal;

        bookingData.amountPaid =
          Number(
            Math.min(
              totalPaid,
              finalBookingTotal
            ).toFixed(2)
          );

        bookingData.amountDue =
          Number(
            Math.max(
              0,
              finalBookingTotal -
                bookingData.amountPaid
            ).toFixed(2)
          );

        if (
          bookingData.amountPaid <=
          0
        ) {
          bookingData.paymentStatus =
            "Pending";
        } else if (
          bookingData.amountPaid <
          finalBookingTotal
        ) {
          bookingData.paymentStatus =
            "Partially Paid";
        } else {
          bookingData.amountPaid =
            finalBookingTotal;

          bookingData.amountDue =
            0;

          bookingData.paymentStatus =
            "Paid";
        }

        await bookingData.save({
          session,
        });

        // =================================================
        // UPDATE INVOICE
        // =================================================

        invoiceData.amountPaid =
          Number(
            Math.min(
              totalPaid,
              Number(
                invoiceData.totalAmount ||
                  0
              )
            ).toFixed(2)
          );

        invoiceData.amountDue =
          Number(
            Math.max(
              0,
              Number(
                invoiceData.totalAmount ||
                  0
              ) -
                invoiceData.amountPaid
            ).toFixed(2)
          );

        if (
          invoiceData.amountPaid <=
          0
        ) {
          invoiceData.paymentStatus =
            "Pending";

          if (
            invoiceData.status !==
            "Cancelled"
          ) {
            invoiceData.status =
              "Issued";
          }
        } else if (
          invoiceData.amountPaid <
          Number(
            invoiceData.totalAmount ||
              0
          )
        ) {
          invoiceData.paymentStatus =
            "Partially Paid";

          invoiceData.status =
            "Partially Paid";
        } else {
          invoiceData.amountPaid =
            Number(
              invoiceData.totalAmount
            );

          invoiceData.amountDue =
            0;

          invoiceData.paymentStatus =
            "Paid";

          invoiceData.status =
            "Paid";
        }

        await invoiceData.save({
          session,
        });

        // =================================================
        // RESULT
        // =================================================

        reconciliationResult = {
          booking: {
            id:
              bookingData._id,

            totalAmount:
              bookingData.totalAmount,

            amountPaid:
              bookingData.amountPaid,

            amountDue:
              bookingData.amountDue,

            paymentStatus:
              bookingData.paymentStatus,
          },

          invoice: {
            id:
              invoiceData._id,

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
          },

          completedPayments:
            completedPayments.length,

          totalPaid,

          linkedHistoricalPayments,
        };
      }
    );

    // =================================================
    // SUCCESS RESPONSE
    // =================================================

    return res.status(200).json({
      message:
        "Booking and invoice payments reconciled successfully",

      ...reconciliationResult,
    });

  } catch (error) {
    console.error(
      "Payment reconciliation error:",
      error
    );

    return res.status(400).json({
      message:
        "Payment reconciliation failed",

      error:
        error.message,
    });

  } finally {
    await session.endSession();
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  reconcileBookingPayments,
};