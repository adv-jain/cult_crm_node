const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    title: {
      type: String,
      required: [true, "Quotation title is required"],
      trim: true,
      maxlength: 200,
    },

    enquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      required: true,
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

    // Itinerary linked with this quotation
    itinerary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Itinerary",
      default: null,
    },

    // Package linked with this quotation (optional)
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      default: null,
    },

    preparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

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

    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true,
    },

    // =====================================================
    // HOTELS
    // =====================================================

    hotels: [
      {
        name: {
          type: String,
          trim: true,
        },

        city: {
          type: String,
          trim: true,
        },

        category: {
          type: String,
          trim: true,
        },

        roomType: {
          type: String,
          trim: true,
        },

        nights: {
          type: Number,
          default: 0,
          min: 0,
        },

        rooms: {
          type: Number,
          default: 1,
          min: 1,
        },

        amount: {
          type: Number,
          default: 0,
          min: 0,
        },

        inclusions: {
          type: [String],
          default: [],
        },

        notes: {
          type: String,
          trim: true,
        },
      },
    ],

    // =====================================================
    // TRANSPORT
    // =====================================================

    transport: [
      {
        type: {
          type: String,
          enum: [
            "Flight",
            "Train",
            "Bus",
            "Private Cab",
            "Rental Car",
            "Cruise",
            "Other",
          ],
        },

        provider: {
          type: String,
          trim: true,
        },

        route: {
          type: String,
          trim: true,
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
        },
      },
    ],

    // =====================================================
    // ACTIVITIES
    // =====================================================

    activities: [
      {
        name: {
          type: String,
          trim: true,
        },

        location: {
          type: String,
          trim: true,
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
        },
      },
    ],

    // =====================================================
    // OTHER SERVICES
    // =====================================================

    otherServices: [
      {
        name: {
          type: String,
          trim: true,
        },

        description: {
          type: String,
          trim: true,
        },

        amount: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],

    // =====================================================
    // PRICING
    // =====================================================

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
      max: 100,
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

    // =====================================================
    // STATUS
    // =====================================================

    status: {
      type: String,
      enum: [
        "Draft",
        "Prepared",
        "Sent",
        "Viewed",
        "Accepted",
        "Rejected",
        "Expired",
        "Cancelled",
      ],
      default: "Draft",
    },

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

    rejectionReason: {
      type: String,
      trim: true,
    },

    // =====================================================
    // TERMS
    // =====================================================

    termsAndConditions: {
      type: String,
      trim: true,
      maxlength: 10000,
    },

    inclusions: {
      type: [String],
      default: [],
    },

    exclusions: {
      type: [String],
      default: [],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// INDEXES
// =====================================================

quotationSchema.index({ enquiry: 1 });
quotationSchema.index({ customer: 1 });
quotationSchema.index({ lead: 1 });
quotationSchema.index({ trip: 1 });
quotationSchema.index({ itinerary: 1 });
quotationSchema.index({ package: 1 });
quotationSchema.index({ preparedBy: 1 });
quotationSchema.index({ assignedTo: 1 });
quotationSchema.index({ status: 1 });
quotationSchema.index({ validUntil: 1 });
quotationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Quotation", quotationSchema);