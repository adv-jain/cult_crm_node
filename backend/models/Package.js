const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    packageCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true
    },

    name: {
      type: String,
      required: [true, "Package name is required"],
      trim: true,
      maxlength: 200
    },

    shortDescription: {
      type: String,
      trim: true,
      maxlength: 1000
    },

    description: {
      type: String,
      trim: true,
      maxlength: 10000
    },

    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true
    },

    destinations: {
      type: [String],
      default: []
    },

    country: {
      type: String,
      trim: true
    },

    packageType: {
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
        "Luxury",
        "Beach",
        "Wildlife",
        "Other"
      ],
      default: "Other"
    },

    duration: {
      days: {
        type: Number,
        required: true,
        min: 1
      },

      nights: {
        type: Number,
        required: true,
        min: 0
      }
    },

    suitableFor: {
      type: [String],
      default: []
    },

    hotelCategory: {
      type: String,
      enum: [
        "Budget",
        "3 Star",
        "4 Star",
        "5 Star",
        "Luxury",
        "Resort",
        "Villa",
        "Apartment",
        "Any"
      ],
      default: "3 Star"
    },

    mealPlan: {
      type: String,
      enum: [
        "Room Only",
        "Breakfast",
        "Half Board",
        "Full Board",
        "All Inclusive"
      ],
      default: "Breakfast"
    },

    transportation: {
      type: String,
      enum: [
        "Flight",
        "Train",
        "Bus",
        "Private Cab",
        "Rental Car",
        "Cruise",
        "Mixed",
        "Not Included"
      ],
      default: "Not Included"
    },

    itinerary: [
      {
        dayNumber: {
          type: Number,
          required: true,
          min: 1
        },

        title: {
          type: String,
          required: true,
          trim: true
        },

        description: {
          type: String,
          trim: true
        },

        destination: {
          type: String,
          trim: true
        },

        activities: {
          type: [String],
          default: []
        },

        meals: {
          type: [String],
          default: []
        },

        overnightStay: {
          type: String,
          trim: true
        },

        notes: {
          type: String,
          trim: true
        }
      }
    ],

    inclusions: {
      type: [String],
      default: []
    },

    exclusions: {
      type: [String],
      default: []
    },

    hotels: [
      {
        hotel: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Hotel",
          default: null
        },

        roomType: {
          type: String,
          trim: true
        },

        nights: {
          type: Number,
          default: 0,
          min: 0
        },

        rooms: {
          type: Number,
          default: 1,
          min: 1
        },

        notes: {
          type: String,
          trim: true
        }
      }
    ],

    transportServices: [
      {
        transport: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Transport",
          default: null
        },

        type: {
          type: String,
          trim: true
        },

        description: {
          type: String,
          trim: true
        },

        amount: {
          type: Number,
          default: 0,
          min: 0
        }
      }
    ],

    activities: [
      {
        name: {
          type: String,
          required: true,
          trim: true
        },

        description: {
          type: String,
          trim: true
        },

        location: {
          type: String,
          trim: true
        },

        duration: {
          type: Number,
          default: 0,
          min: 0
        },

        amount: {
          type: Number,
          default: 0,
          min: 0
        },

        included: {
          type: Boolean,
          default: true
        },

        supplier: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Supplier",
          default: null
        }
      }
    ],

    pricing: {
      currency: {
        type: String,
        default: "INR",
        trim: true,
        uppercase: true
      },

      adultPrice: {
        type: Number,
        default: 0,
        min: 0
      },

      childPrice: {
        type: Number,
        default: 0,
        min: 0
      },

      infantPrice: {
        type: Number,
        default: 0,
        min: 0
      },

      singleSupplement: {
        type: Number,
        default: 0,
        min: 0
      },

      baseCost: {
        type: Number,
        default: 0,
        min: 0
      },

      markupType: {
        type: String,
        enum: ["Percentage", "Fixed"],
        default: "Percentage"
      },

      markupValue: {
        type: Number,
        default: 0,
        min: 0
      },

      discountType: {
        type: String,
        enum: ["Percentage", "Fixed"],
        default: "Fixed"
      },

      discountValue: {
        type: Number,
        default: 0,
        min: 0
      }
    },

    validity: {
      validFrom: {
        type: Date,
        default: null
      },

      validUntil: {
        type: Date,
        default: null
      }
    },

    minTravellers: {
      type: Number,
      default: 1,
      min: 1
    },

    maxTravellers: {
      type: Number,
      default: 50,
      min: 1
    },

    images: {
      type: [String],
      default: []
    },

    tags: {
      type: [String],
      default: []
    },

    status: {
      type: String,
      enum: [
        "Draft",
        "Active",
        "Inactive",
        "Archived"
      ],
      default: "Draft"
    },

    featured: {
      type: Boolean,
      default: false
    },

    termsAndConditions: {
      type: String,
      trim: true,
      maxlength: 10000
    },

    cancellationPolicy: {
      type: String,
      trim: true,
      maxlength: 5000
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 5000
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);


// Indexes
packageSchema.index({ name: 1 });
packageSchema.index({ destination: 1 });
packageSchema.index({ packageType: 1 });
packageSchema.index({ status: 1 });
packageSchema.index({ featured: 1 });
packageSchema.index({ "validity.validFrom": 1 });
packageSchema.index({ "validity.validUntil": 1 });
packageSchema.index({ createdBy: 1 });


module.exports = mongoose.model("Package", packageSchema);