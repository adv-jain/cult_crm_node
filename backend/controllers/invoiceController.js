const mongoose = require("mongoose");

const Invoice = require("../models/Invoice");
const Booking = require("../models/Booking");
const Customer = require("../models/Customer");
const Quotation = require("../models/Quotation");
const Trip = require("../models/Trip");

// ============================================
// BOOKING POPULATE
// ============================================

const bookingPopulate = {
  path: "booking",
  select:
    "bookingNumber destination departureCity travelDate returnDate adults children infants travelType totalAmount amountPaid amountDue paymentStatus status",
};

// ============================================
// CUSTOMER POPULATE
// ============================================

const customerPopulate = {
  path: "customer",
  select:
    "firstName lastName email phone address city state country postalCode",
};

// ============================================
// TRIP POPULATE
// ============================================

const tripPopulate = {
  path: "trip",
  select: "tripCode destination title name",
};

// ============================================
// CALCULATE INVOICE TOTALS
// ============================================

const calculateTotals = (
  items = [],
  discountType = "Fixed",
  discountValue = 0,
  taxPercentage = 0
) => {
  let subtotal = 0;

  const calculatedItems = items.map((item) => {
    const quantity = Number(item.quantity || 1);
    const unitPrice = Number(item.unitPrice || 0);

    const amount = Number((quantity * unitPrice).toFixed(2));

    subtotal += amount;

    return {
      ...item,
      quantity,
      unitPrice,
      amount,
    };
  });

  subtotal = Number(subtotal.toFixed(2));

  let discountAmount = 0;

  if (discountType === "Percentage") {
    discountAmount = Number(
      ((subtotal * Number(discountValue || 0)) / 100).toFixed(2)
    );
  } else {
    discountAmount = Number(
      Math.min(Number(discountValue || 0), subtotal).toFixed(2)
    );
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  const taxAmount = Number(
    ((taxableAmount * Number(taxPercentage || 0)) / 100).toFixed(2)
  );

  const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));

  return {
    calculatedItems,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
  };
};

// ============================================
// CREATE INVOICE
// ============================================

const createInvoice = async (req, res) => {
  try {
    const {
      booking,
      quotation,
      customer,
      company,
      trip,
      invoiceDate,
      dueDate,
      currency,
      items,
      discountType,
      discountValue,
      taxPercentage,
      amountPaid,
      billingAddress,
      notes,
      termsAndConditions,
      pdfUrl,
    } = req.body;

    // ============================================
    // VALIDATE BOOKING
    // ============================================

    if (!mongoose.Types.ObjectId.isValid(booking)) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    const bookingData = await Booking.findById(booking);

    if (!bookingData) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (bookingData.status === "Cancelled") {
      return res.status(400).json({
        message: "Cannot create invoice for a cancelled booking",
      });
    }

    // ============================================
    // VALIDATE CUSTOMER
    // ============================================

    if (!mongoose.Types.ObjectId.isValid(customer)) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    const customerData = await Customer.findById(customer);

    if (!customerData) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    if (
      bookingData.customer &&
      bookingData.customer.toString() !== customer.toString()
    ) {
      return res.status(400).json({
        message: "Customer does not match booking customer",
      });
    }

    // ============================================
    // VALIDATE QUOTATION
    // ============================================

    if (quotation) {
      if (!mongoose.Types.ObjectId.isValid(quotation)) {
        return res.status(400).json({
          message: "Invalid quotation ID",
        });
      }

      const quotationData = await Quotation.findById(quotation);

      if (!quotationData) {
        return res.status(404).json({
          message: "Quotation not found",
        });
      }
    }

    // ============================================
    // VALIDATE TRIP
    // ============================================

    if (trip) {
      if (!mongoose.Types.ObjectId.isValid(trip)) {
        return res.status(400).json({
          message: "Invalid trip ID",
        });
      }

      const tripData = await Trip.findById(trip);

      if (!tripData) {
        return res.status(404).json({
          message: "Trip not found",
        });
      }
    }

    // ============================================
    // ITEMS VALIDATION
    // ============================================

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "At least one invoice item is required",
      });
    }

    // ============================================
    // CALCULATE TOTALS
    // ============================================

    const {
      calculatedItems,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
    } = calculateTotals(
      items,
      discountType || "Fixed",
      discountValue || 0,
      taxPercentage || 0
    );

    const paidAmount = Number(amountPaid || 0);

    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      return res.status(400).json({
        message: "Amount paid cannot be negative",
      });
    }

    if (paidAmount > totalAmount) {
      return res.status(400).json({
        message: "Amount paid cannot exceed invoice total",
      });
    }

    const amountDue = Number(
      Math.max(0, totalAmount - paidAmount).toFixed(2)
    );

    // ============================================
    // PAYMENT STATUS
    // ============================================

    let paymentStatus = "Pending";

    if (paidAmount <= 0) {
      paymentStatus = "Pending";
    } else if (paidAmount < totalAmount) {
      paymentStatus = "Partially Paid";
    } else {
      paymentStatus = "Paid";
    }

    // ============================================
    // CREATE INVOICE
    // ============================================
    //
    // NOTE: invoiceNumber is auto-generated by the
    // Invoice model's pre-save hook (format INV-YYYY-XXXXXXXX)
    // Do NOT pass invoiceNumber here.

    const invoice = await Invoice.create({
      booking,
      quotation: quotation || null,
      customer,
      company: company || bookingData.company || null,
      trip: trip || bookingData.trip || null,
      invoiceDate: invoiceDate || new Date(),
      dueDate: dueDate || null,
      currency: currency || "INR",
      items: calculatedItems,
      subtotal,
      discountType: discountType || "Fixed",
      discountValue: Number(discountValue || 0),
      discountAmount,
      taxPercentage: Number(taxPercentage || 0),
      taxAmount,
      totalAmount,
      amountPaid: paidAmount,
      amountDue,
      paymentStatus,
      status:
        paidAmount >= totalAmount && totalAmount > 0
          ? "Paid"
          : paidAmount > 0
          ? "Partially Paid"
          : "Draft",
      billingAddress: billingAddress || {
        name: `${customerData.firstName || ""} ${customerData.lastName || ""}`.trim(),
        country: "India",
      },
      notes,
      termsAndConditions,
      pdfUrl: pdfUrl || null,
      createdBy: req.user.id,
    });

    // ============================================
    // POPULATED RESPONSE
    // ============================================

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate(bookingPopulate)
      .populate(customerPopulate)
      .populate("quotation")
      .populate("company")
      .populate(tripPopulate)
      .populate("createdBy", "name email role");

    return res.status(201).json({
      message: "Invoice created successfully",
      invoice: populatedInvoice,
    });
  } catch (error) {
    console.error("Create Invoice Error:", error);

    return res.status(500).json({
      message: "Failed to create invoice",
      error: error.message,
    });
  }
};

// ============================================
// GET ALL INVOICES
// ============================================

const getInvoices = async (req, res) => {
  try {
    const {
      booking,
      customer,
      quotation,
      company,
      trip,
      status,
      paymentStatus,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (booking) filter.booking = booking;
    if (customer) filter.customer = customer;
    if (quotation) filter.quotation = quotation;
    if (company) filter.company = company;
    if (trip) filter.trip = trip;
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    // ============================================
    // SEARCH
    // ============================================

    if (search) {
      filter.$or = [
        {
          invoiceNumber: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // ============================================
    // PAGINATION
    // ============================================

    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNumber - 1) * limitNumber;

    // ============================================
    // FETCH INVOICES
    // ============================================

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate(bookingPopulate)
        .populate(customerPopulate)
        .populate("quotation", "title totalAmount")
        .populate("company", "name")
        .populate(tripPopulate)
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),

      Invoice.countDocuments(filter),
    ]);

    // ============================================
    // TOTALS
    // ============================================

    const totals = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalInvoiceAmount: { $sum: "$totalAmount" },
          totalPaid: { $sum: "$amountPaid" },
          totalDue: { $sum: "$amountDue" },
        },
      },
    ]);

    return res.status(200).json({
      message: "Invoices fetched successfully",
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      totals: totals[0] || {
        totalInvoiceAmount: 0,
        totalPaid: 0,
        totalDue: 0,
      },
      invoices,
    });
  } catch (error) {
    console.error("Get Invoices Error:", error);

    return res.status(500).json({
      message: "Failed to fetch invoices",
      error: error.message,
    });
  }
};

// ============================================
// GET SINGLE INVOICE
// ============================================

const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid invoice ID",
      });
    }

    const invoice = await Invoice.findById(id)
      .populate(bookingPopulate)
      .populate(customerPopulate)
      .populate("quotation")
      .populate("company")
      .populate(tripPopulate)
      .populate("createdBy", "name email role");

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    return res.status(200).json({
      message: "Invoice fetched successfully",
      invoice,
    });
  } catch (error) {
    console.error("Get Invoice Error:", error);

    return res.status(500).json({
      message: "Failed to fetch invoice",
      error: error.message,
    });
  }
};

// ============================================
// UPDATE INVOICE
// ============================================

const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid invoice ID",
      });
    }

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    // ============================================
    // LOCK PAID / CANCELLED INVOICE
    // ============================================

    if (invoice.status === "Paid" || invoice.status === "Cancelled") {
      return res.status(400).json({
        message: `Cannot update invoice with status ${invoice.status}`,
      });
    }

    // ============================================
    // ALLOWED FIELDS
    // ============================================

    const allowedFields = [
      "invoiceDate",
      "dueDate",
      "currency",
      "items",
      "discountType",
      "discountValue",
      "taxPercentage",
      "billingAddress",
      "notes",
      "termsAndConditions",
      "pdfUrl",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        invoice[field] = req.body[field];
      }
    });

    // ============================================
    // RECALCULATE
    // ============================================

    if (
      req.body.items !== undefined ||
      req.body.discountType !== undefined ||
      req.body.discountValue !== undefined ||
      req.body.taxPercentage !== undefined
    ) {
      const {
        calculatedItems,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
      } = calculateTotals(
        invoice.items,
        invoice.discountType,
        invoice.discountValue,
        invoice.taxPercentage
      );

      invoice.items = calculatedItems;
      invoice.subtotal = subtotal;
      invoice.discountAmount = discountAmount;
      invoice.taxAmount = taxAmount;
      invoice.totalAmount = totalAmount;

      invoice.amountDue = Number(
        Math.max(0, totalAmount - invoice.amountPaid).toFixed(2)
      );

      if (invoice.amountPaid <= 0) {
        invoice.paymentStatus = "Pending";
      } else if (invoice.amountPaid < totalAmount) {
        invoice.paymentStatus = "Partially Paid";
      } else {
        invoice.paymentStatus = "Paid";
      }
    }

    await invoice.save();

    // ============================================
    // UPDATED POPULATED INVOICE
    // ============================================

    const updatedInvoice = await Invoice.findById(invoice._id)
      .populate(bookingPopulate)
      .populate(customerPopulate)
      .populate("quotation")
      .populate("company")
      .populate(tripPopulate)
      .populate("createdBy", "name email role");

    return res.status(200).json({
      message: "Invoice updated successfully",
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error("Update Invoice Error:", error);

    return res.status(500).json({
      message: "Failed to update invoice",
      error: error.message,
    });
  }
};

// ============================================
// ISSUE INVOICE
// ============================================

const issueInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    if (invoice.status !== "Draft") {
      return res.status(400).json({
        message: `Only Draft invoice can be issued. Current status: ${invoice.status}`,
      });
    }

    invoice.status = "Issued";
    invoice.sentAt = null;

    await invoice.save();

    return res.status(200).json({
      message: "Invoice issued successfully",
      invoice,
    });
  } catch (error) {
    console.error("Issue Invoice Error:", error);

    return res.status(500).json({
      message: "Failed to issue invoice",
      error: error.message,
    });
  }
};

// ============================================
// SEND INVOICE
// ============================================

const sendInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    if (!["Issued", "Viewed"].includes(invoice.status)) {
      return res.status(400).json({
        message: "Only Issued or Viewed invoice can be sent",
      });
    }

    invoice.status = "Sent";
    invoice.sentAt = new Date();

    await invoice.save();

    return res.status(200).json({
      message: "Invoice sent successfully",
      invoice,
    });
  } catch (error) {
    console.error("Send Invoice Error:", error);

    return res.status(500).json({
      message: "Failed to send invoice",
      error: error.message,
    });
  }
};

// ============================================
// MARK INVOICE AS VIEWED
// ============================================

const markInvoiceViewed = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    if (invoice.status === "Sent") {
      invoice.status = "Viewed";
      await invoice.save();
    }

    return res.status(200).json({
      message: "Invoice marked as viewed",
      invoice,
    });
  } catch (error) {
    console.error("View Invoice Error:", error);

    return res.status(500).json({
      message: "Failed to update invoice",
      error: error.message,
    });
  }
};

// ============================================
// RECORD INVOICE PAYMENT
// ============================================
//
// NOTE:
// Central payment flow should use /api/payments.
// This function is kept for backward compatibility.

const recordInvoicePayment = async (req, res) => {
  try {
    const amount = req.body?.amount;
    const paymentAmount = Number(amount);

    // ============================================
    // VALIDATE AMOUNT
    // ============================================

    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0
    ) {
      return res.status(400).json({
        message: "Valid payment amount is required",
      });
    }

    // ============================================
    // FIND INVOICE
    // ============================================

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    if (invoice.status === "Cancelled") {
      return res.status(400).json({
        message: "Cannot record payment for cancelled invoice",
      });
    }

    if (Number(invoice.amountDue || 0) <= 0) {
      return res.status(400).json({
        message: "Invoice is already fully paid",
      });
    }

    if (paymentAmount > Number(invoice.amountDue || 0)) {
      return res.status(400).json({
        message: `Payment cannot exceed amount due. Amount due: ${invoice.amountDue}`,
      });
    }

    // ============================================
    // UPDATE
    // ============================================

    invoice.amountPaid = Number(
      (Number(invoice.amountPaid || 0) + paymentAmount).toFixed(2)
    );

    invoice.amountDue = Number(
      Math.max(
        0,
        Number(invoice.totalAmount || 0) - invoice.amountPaid
      ).toFixed(2)
    );

    if (invoice.amountDue === 0) {
      invoice.paymentStatus = "Paid";
      invoice.status = "Paid";
    } else {
      invoice.paymentStatus = "Partially Paid";
      invoice.status = "Partially Paid";
    }

    await invoice.save();

    // ============================================
    // POPULATED RESPONSE
    // ============================================

    const updatedInvoice = await Invoice.findById(invoice._id)
      .populate(bookingPopulate)
      .populate(customerPopulate)
      .populate("quotation")
      .populate("company")
      .populate(tripPopulate)
      .populate("createdBy", "name email role");

    return res.status(200).json({
      message: "Invoice payment recorded successfully",
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error("Record Invoice Payment Error:", error);

    return res.status(500).json({
      message: "Failed to record invoice payment",
      error: error.message,
    });
  }
};

// ============================================
// CANCEL INVOICE
// ============================================

const cancelInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    if (invoice.status === "Paid") {
      return res.status(400).json({
        message: "Paid invoice cannot be cancelled",
      });
    }

    if (invoice.status === "Cancelled") {
      return res.status(400).json({
        message: "Invoice is already cancelled",
      });
    }

    invoice.status = "Cancelled";
    invoice.paymentStatus = "Cancelled";

    await invoice.save();

    return res.status(200).json({
      message: "Invoice cancelled successfully",
      invoice,
    });
  } catch (error) {
    console.error("Cancel Invoice Error:", error);

    return res.status(500).json({
      message: "Failed to cancel invoice",
      error: error.message,
    });
  }
};

// ============================================
// DELETE INVOICE
// ============================================

const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    if (
      invoice.status === "Issued" ||
      invoice.status === "Sent" ||
      invoice.status === "Viewed" ||
      invoice.status === "Partially Paid" ||
      invoice.status === "Paid"
    ) {
      return res.status(400).json({
        message: "Issued/sent/paid invoice cannot be deleted",
      });
    }

    await Invoice.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    console.error("Delete Invoice Error:", error);

    return res.status(500).json({
      message: "Failed to delete invoice",
      error: error.message,
    });
  }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  issueInvoice,
  sendInvoice,
  markInvoiceViewed,
  recordInvoicePayment,
  cancelInvoice,
  deleteInvoice,
};