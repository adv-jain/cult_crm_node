const mongoose = require("mongoose");

const itinerarySchema = new mongoose.Schema(
  {
    // =====================================================
    // ITINERARY BASIC INFO
    // =====================================================

    itineraryNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    title: {
      type: String,
      required: [true, "Itinerary title is required"],
      trim: true,
      maxlength: 200,
    },

    // =====================================================
    // QUOTATION RELATION
    // =====================================================

    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      required: true,
    },

    // =====================================================
    // TRIP RELATION
    // =====================================================

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },

    // =====================================================
    // BOOKING RELATION
    // =====================================================

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    // =====================================================
    // CUSTOMER RELATION
    // =====================================================

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    // =====================================================
    // TRAVEL INFORMATION
    // =====================================================

    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true,
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    totalDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalNights: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =====================================================
    // STATUS
    // =====================================================

    status: {
      type: String,
      enum: [
        "Draft",
        "Planning",
        "Ready",
        "Shared",
        "Approved",
        "Completed",
        "Cancelled",
      ],
      default: "Draft",
    },

    // =====================================================
    // DAY-WISE ITINERARY
    // =====================================================

    days: [
      {
        dayNumber: {
          type: Number,
          required: true,
          min: 1,
        },

        date: {
          type: Date,
          default: null,
        },

        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: 200,
        },

        description: {
          type: String,
          trim: true,
          maxlength: 5000,
        },

        city: {
          type: String,
          trim: true,
        },

        location: {
          type: String,
          trim: true,
        },

        // =================================================
        // DAY ACTIVITIES
        // =================================================

        activities: [
          {
            name: {
              type: String,
              required: true,
              trim: true,
            },

            description: {
              type: String,
              trim: true,
            },

            startTime: {
              type: String,
              trim: true,
            },

            endTime: {
              type: String,
              trim: true,
            },

            location: {
              type: String,
              trim: true,
            },

            duration: {
              type: Number,
              default: 0,
              min: 0,
            },

            amount: {
              type: Number,
              default: 0,
              min: 0,
            },

            included: {
              type: Boolean,
              default: true,
            },

            notes: {
              type: String,
              trim: true,
            },
          },
        ],

        // =================================================
        // HOTEL
        // =================================================

        hotel: {
          hotel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hotel",
            default: null,
          },

          roomType: {
            type: String,
            trim: true,
          },

          checkIn: {
            type: String,
            trim: true,
          },

          checkOut: {
            type: String,
            trim: true,
          },

          nights: {
            type: Number,
            default: 0,
            min: 0,
          },

          notes: {
            type: String,
            trim: true,
          },
        },

        // =================================================
        // TRANSPORT
        // (type has NO enum — any string is allowed,
        //  because we save Transport name + route here)
        // =================================================

        transport: [
          {
            transport: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Transport",
              default: null,
            },

            type: {
              type: String,
              trim: true,
              default: "",
            },

            capacity: {
              type: Number,
              default: null,
              min: 0,
            },

            from: {
              type: String,
              trim: true,
            },

            to: {
              type: String,
              trim: true,
            },

            departureTime: {
              type: String,
              trim: true,
            },

            arrivalTime: {
              type: String,
              trim: true,
            },

            notes: {
              type: String,
              trim: true,
            },
          },
        ],

        // =================================================
        // MEALS
        // =================================================

        meals: [
          {
            type: {
              type: String,
              enum: [
                "Breakfast",
                "Lunch",
                "Dinner",
                "Snacks",
                "Other",
              ],
            },

            included: {
              type: Boolean,
              default: true,
            },

            restaurant: {
              type: String,
              trim: true,
            },

            notes: {
              type: String,
              trim: true,
            },
          },
        ],

        // =================================================
        // FREE TIME
        // =================================================

        freeTime: {
          type: String,
          trim: true,
        },

        // =================================================
        // DAY NOTES
        // =================================================

        notes: {
          type: String,
          trim: true,
          maxlength: 3000,
        },
      },
    ],

    // =====================================================
    // GENERAL INCLUSIONS / EXCLUSIONS
    // =====================================================

    inclusions: {
      type: [String],
      default: [],
    },

    exclusions: {
      type: [String],
      default: [],
    },

    importantNotes: {
      type: [String],
      default: [],
    },

    // =====================================================
    // EMERGENCY CONTACT
    // =====================================================

    emergencyContact: {
      name: {
        type: String,
        trim: true,
      },

      phone: {
        type: String,
        trim: true,
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
    },

    // =====================================================
    // PREPARED / APPROVAL INFORMATION
    // =====================================================

    preparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    customerSharedAt: {
      type: Date,
      default: null,
    },

    // =====================================================
    // GENERAL NOTES
    // =====================================================

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

// =========================================================
// INDEXES
// =========================================================

itinerarySchema.index({ quotation: 1 });
itinerarySchema.index({ trip: 1 });
itinerarySchema.index({ booking: 1 });
itinerarySchema.index({ customer: 1 });
itinerarySchema.index({ destination: 1 });
itinerarySchema.index({ startDate: 1 });
itinerarySchema.index({ status: 1 });
itinerarySchema.index({ preparedBy: 1 });

module.exports = mongoose.model("Itinerary", itinerarySchema);