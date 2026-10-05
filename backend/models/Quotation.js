const mongoose = require("mongoose");

/* =========================================================
   QUOTATION ITEM SCHEMAS
========================================================= */

const hotelSchema = new mongoose.Schema(
  {
    hotelName: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      trim: true,
      default: "",
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    roomType: {
      type: String,
      trim: true,
      default: "",
    },

    rooms: {
      type: Number,
      default: 1,
      min: 1,
    },

    nights: {
      type: Number,
      default: 1,
      min: 1,
    },

    mealPlan: {
      type: String,
      trim: true,
      default: "",
    },

    checkIn: {
      type: Date,
      default: null,
    },

    checkOut: {
      type: Date,
      default: null,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const transportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      trim: true,
      default: "Other",
    },

    provider: {
      type: String,
      trim: true,
      default: "",
    },

    route: {
      type: String,
      trim: true,
      default: "",
    },

    travelDate: {
      type: Date,
      default: null,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    date: {
      type: Date,
      default: null,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const otherServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

/* =========================================================
   QUOTATION SCHEMA
========================================================= */

const quotationSchema = new mongoose.Schema(
  {
    /* =====================================================
       BASIC INFORMATION
    ===================================================== */

    quotationNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Quotation title is required"],
      trim: true,
    },

    /* =====================================================
       RELATED RECORDS
    ===================================================== */

    enquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      required: [true, "Enquiry is required"],
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },

    itinerary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Itinerary",
      default: null,
    },

    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      default: null,
    },

    /*
     * Booking is created after quotation acceptance.
     *
     * Flow:
     *
     * Accepted Quotation
     *        ↓
     *     Booking
     *        ↓
     * Quotation = Converted
     */

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    /* =====================================================
       USERS
    ===================================================== */

    preparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Prepared by user is required"],
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* =====================================================
       TRAVEL INFORMATION
    ===================================================== */

    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true,
    },

    travelDate: {
      type: Date,
      default: null,
    },

    returnDate: {
      type: Date,
      default: null,
    },

    adults: {
      type: Number,
      default: 1,
      min: 0,
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

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
    },

    /* =====================================================
       QUOTATION SERVICES
    ===================================================== */

    hotels: {
      type: [hotelSchema],
      default: [],
    },

    transport: {
      type: [transportSchema],
      default: [],
    },

    activities: {
      type: [activitySchema],
      default: [],
    },

    otherServices: {
      type: [otherServiceSchema],
      default: [],
    },

    /* =====================================================
       PRICING
    ===================================================== */

    baseAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    markupType: {
      type: String,
      enum: ["Percentage", "Fixed"],
      default: "Percentage",
    },

    markupValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    markupAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountType: {
      type: String,
      enum: ["Percentage", "Fixed"],
      default: "Fixed",
    },

    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxPercentage: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    costAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    estimatedProfit: {
      type: Number,
      default: 0,
    },

    /* =====================================================
       QUOTATION STATUS
    ===================================================== */

    status: {
      type: String,

      enum: [
        "Draft",
        "Prepared",
        "Sent",
        "Viewed",
        "Negotiation",
        "Accepted",
        "Converted",
        "Rejected",
        "Expired",
        "Cancelled",
      ],

      default: "Draft",
    },

    /* =====================================================
       IMPORTANT DATES
    ===================================================== */

    validUntil: {
      type: Date,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    viewedAt: {
      type: Date,
      default: null,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    /* =====================================================
       REJECTION
    ===================================================== */

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    /* =====================================================
       CUSTOMER COMMUNICATION
    ===================================================== */

    customerSharedAt: {
      type: Date,
      default: null,
    },

    /* =====================================================
       QUOTATION CONTENT
    ===================================================== */

    inclusions: {
      type: [String],
      default: [],
    },

    exclusions: {
      type: [String],
      default: [],
    },

    termsAndConditions: {
      type: String,
      trim: true,
      default: "",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },

  {
    timestamps: true,
  }
);

/* =========================================================
   INDEXES
========================================================= */

/*
 * Related records
 */
quotationSchema.index({ enquiry: 1 });
quotationSchema.index({ customer: 1 });
quotationSchema.index({ lead: 1 });
quotationSchema.index({ trip: 1 });
quotationSchema.index({ itinerary: 1 });
quotationSchema.index({ package: 1 });
quotationSchema.index({ booking: 1 });

/*
 * Users
 */
quotationSchema.index({ preparedBy: 1 });
quotationSchema.index({ assignedTo: 1 });

/*
 * Status
 */
quotationSchema.index({ status: 1 });

/*
 * Dates
 */
quotationSchema.index({ validUntil: 1 });
quotationSchema.index({ createdAt: -1 });

/* =========================================================
   EXPORT MODEL
========================================================= */

const Quotation = mongoose.model("Quotation", quotationSchema);

module.exports = Quotation;