const mongoose = require("mongoose");

// ======================================================
// BOOKING NUMBER GENERATOR
// FORMAT: BK-FC2FD8
// ======================================================

const generateBookingNumber = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    code += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  return `BK-${code}`;
};

// ======================================================
// BOOKING SCHEMA
// ======================================================

const bookingSchema = new mongoose.Schema(
  {
    // ==================================================
    // BOOKING NUMBER
    // Example: BK-FC2FD8
    // ==================================================

    bookingNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    // ==================================================
    // BOOKING DATE
    // ==================================================

    bookingDate: {
      type: Date,
      default: Date.now,
    },

    // ==================================================
    // REFERENCES
    // ==================================================

    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      default: null,
    },

    enquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      default: null,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    travellers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Traveller",
      },
    ],

    // ==================================================
    // TRAVEL DETAILS
    // ==================================================

    destination: {
      type: String,
      required: ["Destination is required"],
      trim: true,
    },

    departureCity: {
      type: String,
      trim: true,
    },

    travelDate: {
      type: Date,
      required: ["Travel date is required"],
    },

    returnDate: {
      type: Date,
      default: null,
    },

    adults: {
      type: Number,
      default: 1,
      min: 1,
    },

    children: {
      type: Number,
      default: 0,
      min: 0,
    },

    infants: {
      type: Number,
      default: 0,
      min: 0,
    },

    travelType: {
      type: String,
      enum: [
        "Domestic",
        "International",
        "Honeymoon",
        "Family",
        "Solo",
        "Corporate",
        "Group",
        "Adventure",
        "Pilgrimage",
        "Other",
      ],
      default: "Other",
    },

    // ==================================================
    // CURRENCY
    // ==================================================

    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true,
    },

    // ==================================================
    // BOOKING STATUS
    // ==================================================

    status: {
      type: String,
      enum: [
        "Draft",
        "Pending",
        "Confirmed",
        "Partially Confirmed",
        "On Hold",
        "Completed",
        "Cancelled",
        "Refunded",
      ],
      default: "Pending",
    },

    // ==================================================
    // CONFIRMATION STATUS
    // ==================================================

    confirmationStatus: {
      hotel: {
        type: String,
        enum: [
          "Pending",
          "Partially Confirmed",
          "Confirmed",
          "Not Required",
        ],
        default: "Pending",
      },

      transport: {
        type: String,
        enum: [
          "Pending",
          "Partially Confirmed",
          "Confirmed",
          "Not Required",
        ],
        default: "Pending",
      },

      activities: {
        type: String,
        enum: [
          "Pending",
          "Partially Confirmed",
          "Confirmed",
          "Not Required",
        ],
        default: "Not Required",
      },

      overall: {
        type: String,
        enum: [
          "Pending",
          "Partially Confirmed",
          "Confirmed",
        ],
        default: "Pending",
      },
    },

    // ==================================================
    // FINANCIAL DETAILS
    // ==================================================

    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    totalCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    profitAmount: {
      type: Number,
      default: 0,
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    amountDue: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==================================================
    // PAYMENT STATUS
    // ==================================================

    paymentStatus: {
      type: String,
      enum: [
        "Pending",
        "Partially Paid",
        "Paid",
        "Overdue",
        "Refunded",
      ],
      default: "Pending",
    },

    nextPaymentDueDate: {
      type: Date,
      default: null,
    },

    // ==================================================
    // OWNERS
    // ==================================================

    salesOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    operationsOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ==================================================
    // CANCELLATION
    // ==================================================

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ==================================================
    // REFUND
    // ==================================================

    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    refundStatus: {
      type: String,
      enum: [
        "Not Applicable",
        "Pending",
        "Partially Refunded",
        "Refunded",
      ],
      default: "Not Applicable",
    },

    refundProcessedAt: {
      type: Date,
      default: null,
    },

    // ==================================================
    // NOTES
    // ==================================================

    specialRequests: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    internalNotes: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    // ==================================================
    // CREATED BY
    // ==================================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ======================================================
// AUTO GENERATE BOOKING NUMBER
// FORMAT: BK-FC2FD8
// ======================================================

bookingSchema.pre("validate", async function (next) {
  try {
    // Existing booking number ko overwrite mat karo
    if (this.bookingNumber) {
      this.bookingNumber =
        String(this.bookingNumber)
          .trim()
          .toUpperCase();

      return next();
    }

    let bookingNumber;
    let exists = true;

    while (exists) {
      bookingNumber =
        generateBookingNumber();

      exists =
        await mongoose
          .model("Booking")
          .exists({
            bookingNumber,
          });
    }

    this.bookingNumber =
      bookingNumber;

    next();
  } catch (error) {
    next(error);
  }
});

// ======================================================
// PAYMENT CALCULATION
// ======================================================

bookingSchema.pre("save", function (next) {
  const total = Math.max(
    0,
    Number(this.totalAmount) || 0
  );

  const paid = Math.max(
    0,
    Number(this.amountPaid) || 0
  );

  this.totalAmount = total;
  this.amountPaid = paid;

  this.amountDue = Math.max(
    0,
    total - paid
  );

  if (paid <= 0) {
    this.paymentStatus = "Pending";
  } else if (paid < total) {
    this.paymentStatus = "Partially Paid";
  } else {
    this.paymentStatus = "Paid";
  }

  next();
});

// ======================================================
// INDEXES
// ======================================================

bookingSchema.index({
  customer: 1,
});

bookingSchema.index({
  company: 1,
});

bookingSchema.index({
  quotation: 1,
});

bookingSchema.index({
  enquiry: 1,
});

bookingSchema.index({
  trip: 1,
});

bookingSchema.index({
  lead: 1,
});

bookingSchema.index({
  travellers: 1,
});

bookingSchema.index({
  travelDate: 1,
});

bookingSchema.index({
  status: 1,
});

bookingSchema.index({
  paymentStatus: 1,
});

bookingSchema.index({
  salesOwner: 1,
});

bookingSchema.index({
  operationsOwner: 1,
});

bookingSchema.index({
  createdAt: -1,
});

// ======================================================
// EXPORT
// ======================================================

module.exports =
  mongoose.model("Booking", bookingSchema);