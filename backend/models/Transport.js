const mongoose = require("mongoose");

const transportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Transport name is required"],
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

    type: {
      type: String,
      enum: [
        "Flight",
        "Train",
        "Bus",
        "Private Cab",
        "Rental Car",
        "Cruise",
        "Other"
      ],
      required: true
    },

    provider: {
      type: String,
      trim: true
    },

    providerCode: {
      type: String,
      trim: true,
      uppercase: true
    },

    departure: {
      location: {
        type: String,
        trim: true
      },

      terminal: {
        type: String,
        trim: true
      },

      dateTime: {
        type: Date,
        default: null
      }
    },

    arrival: {
      location: {
        type: String,
        trim: true
      },

      terminal: {
        type: String,
        trim: true
      },

      dateTime: {
        type: Date,
        default: null
      }
    },

    duration: {
      type: Number,
      default: 0,
      min: 0
    },

    class: {
      type: String,
      enum: [
        "Economy",
        "Premium Economy",
        "Business",
        "First Class",
        "Sleeper",
        "AC",
        "Non AC",
        "Standard",
        "Luxury",
        "Other"
      ],
      default: "Economy"
    },

    vehicleDetails: {
      vehicleType: {
        type: String,
        trim: true
      },

      vehicleNumber: {
        type: String,
        trim: true,
        uppercase: true
      },

      capacity: {
        type: Number,
        default: 0,
        min: 0
      },

      driverName: {
        type: String,
        trim: true
      },

      driverPhone: {
        type: String,
        trim: true
      }
    },

    fare: {
      type: Number,
      default: 0,
      min: 0
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true
    },

    cancellationPolicy: {
      type: String,
      trim: true,
      maxlength: 5000
    },

    baggageAllowance: {
      type: String,
      trim: true
    },

    amenities: {
      type: [String],
      default: []
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null
    },

    contactPerson: {
      name: {
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
      }
    },

    status: {
      type: String,
      enum: [
        "Available",
        "Reserved",
        "Confirmed",
        "Cancelled",
        "Completed",
        "Inactive"
      ],
      default: "Available"
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
transportSchema.index({ type: 1 });
transportSchema.index({ provider: 1 });
transportSchema.index({ supplier: 1 });
transportSchema.index({ "departure.location": 1 });
transportSchema.index({ "arrival.location": 1 });
transportSchema.index({ "departure.dateTime": 1 });
transportSchema.index({ status: 1 });


module.exports = mongoose.model("Transport", transportSchema);