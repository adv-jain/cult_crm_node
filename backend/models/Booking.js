
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },

    bookingDate: {
      type: Date,
      default: Date.now
    },

    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      default: null
    },

    enquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      default: null
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null
    },

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null
    },

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null
    },

    travellers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Traveller"
      }
    ],

    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true
    },

    departureCity: {
      type: String,
      trim: true
    },

    travelDate: {
      type: Date,
      required: [true, "Travel date is required"]
    },

    returnDate: {
      type: Date,
      default: null
    },

    adults: {
      type: Number,
      default: 1,
      min: 1
    },

    children: {
      type: Number,
      default: 0,
      min: 0
    },

    infants: {
      type: Number,
      default: 0,
      min: 0
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
        "Other"
      ],
      default: "Other"
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true
    },

    // Booking status
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
        "Refunded"
      ],
      default: "Pending"
    },

    // Supplier / service confirmation
    confirmationStatus: {
      hotel: {
        type: String,
        enum: [
          "Pending",
          "Partially Confirmed",
          "Confirmed",
          "Not Required"
        ],
        default: "Pending"
      },

      transport: {
        type: String,
        enum: [
          "Pending",
          "Partially Confirmed",
          "Confirmed",
          "Not Required"
        ],
        default: "Pending"
      },

      activities: {
        type: String,
        enum: [
          "Pending",
          "Partially Confirmed",
          "Confirmed",
          "Not Required"
        ],
        default: "Not Required"
      },

      overall: {
        type: String,
        enum: [
          "Pending",
          "Partially Confirmed",
          "Confirmed"
        ],
        default: "Pending"
      }
    },

    // Pricing
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },

    totalCost: {
      type: Number,
      default: 0,
      min: 0
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    profitAmount: {
      type: Number,
      default: 0
    },

    // Payment summary
    amountPaid: {
      type: Number,
      default: 0,
      min: 0
    },

    amountDue: {
      type: Number,
      default: 0,
      min: 0
    },

    paymentStatus: {
      type: String,
      enum: [
        "Pending",
        "Partially Paid",
        "Paid",
        "Overdue",
        "Refunded"
      ],
      default: "Pending"
    },

    nextPaymentDueDate: {
      type: Date,
      default: null
    },

    // Assigned team
    salesOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    operationsOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // Cancellation
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 2000
    },

    cancelledAt: {
      type: Date,
      default: null
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // Refund
    refundAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    refundStatus: {
      type: String,
      enum: [
        "Not Applicable",
        "Pending",
        "Partially Refunded",
        "Refunded"
      ],
      default: "Not Applicable"
    },

    refundProcessedAt: {
      type: Date,
      default: null
    },

    // Internal information
    specialRequests: {
      type: String,
      trim: true,
      maxlength: 5000
    },

    internalNotes: {
      type: String,
      trim: true,
      maxlength: 5000
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

// ==========================================
// AUTOMATICALLY CALCULATE AMOUNT DUE
// ==========================================

bookingSchema.pre("save", function () {
  this.amountDue = Math.max(
    0,
    this.totalAmount - this.amountPaid
  );

  if (this.amountPaid <= 0) {
    this.paymentStatus = "Pending";
  } else if (this.amountPaid < this.totalAmount) {
    this.paymentStatus = "Partially Paid";
  } else if (this.amountPaid >= this.totalAmount) {
    this.paymentStatus = "Paid";
  }
});

// ==========================================
// INDEXES
// ==========================================

bookingSchema.index({ customer: 1 });
bookingSchema.index({ company: 1 });
bookingSchema.index({ quotation: 1 });
bookingSchema.index({ enquiry: 1 });
bookingSchema.index({ trip: 1 });
bookingSchema.index({ lead: 1 });
bookingSchema.index({ travellers: 1 });
bookingSchema.index({ travelDate: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ salesOwner: 1 });
bookingSchema.index({ operationsOwner: 1 });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);

