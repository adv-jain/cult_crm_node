const mongoose = require("mongoose");

const hotelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Hotel name is required"],
      trim: true,
      maxlength: 200
    },

    code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true
    },

    description: {
      type: String,
      trim: true,
      maxlength: 5000
    },

    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true
    },

    city: {
      type: String,
      trim: true
    },

    state: {
      type: String,
      trim: true
    },

    country: {
      type: String,
      required: true,
      trim: true
    },

    address: {
      type: String,
      trim: true
    },

    postalCode: {
      type: String,
      trim: true
    },

    location: {
      latitude: {
        type: Number,
        default: null
      },

      longitude: {
        type: Number,
        default: null
      }
    },

    category: {
      type: String,
      enum: [
        "Budget",
        "2 Star",
        "3 Star",
        "4 Star",
        "5 Star",
        "Luxury",
        "Resort",
        "Boutique",
        "Villa",
        "Apartment",
        "Hostel",
        "Other"
      ],
      default: "3 Star"
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },

    checkInTime: {
      type: String,
      trim: true,
      default: "14:00"
    },

    checkOutTime: {
      type: String,
      trim: true,
      default: "12:00"
    },

    amenities: {
      type: [String],
      default: []
    },

    roomTypes: [
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

        maxAdults: {
          type: Number,
          default: 2,
          min: 1
        },

        maxChildren: {
          type: Number,
          default: 1,
          min: 0
        },

        bedType: {
          type: String,
          trim: true
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
          default: "Room Only"
        },

        pricePerNight: {
          type: Number,
          default: 0,
          min: 0
        },

        availableRooms: {
          type: Number,
          default: 0,
          min: 0
        }
      }
    ],

    contactPerson: {
      name: {
        type: String,
        trim: true
      },

      designation: {
        type: String,
        trim: true
      },

      phone: {
        type: String,
        trim: true
      },

      email: {
        type: String,
        trim: true,
        lowercase: true
      },

      whatsapp: {
        type: String,
        trim: true
      }
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null
    },

    cancellationPolicy: {
      type: String,
      trim: true,
      maxlength: 5000
    },

    paymentTerms: {
      type: String,
      trim: true,
      maxlength: 3000
    },

    website: {
      type: String,
      trim: true
    },

    images: {
      type: [String],
      default: []
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 3000
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


// Indexes
hotelSchema.index({ name: 1 });

hotelSchema.index({ destination: 1 });
hotelSchema.index({ city: 1 });
hotelSchema.index({ country: 1 });
hotelSchema.index({ category: 1 });
hotelSchema.index({ supplier: 1 });
hotelSchema.index({ status: 1 });


module.exports = mongoose.model("Hotel", hotelSchema);