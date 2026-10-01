const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    supplierCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true
    },

    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
      maxlength: 200
    },

    supplierType: {
      type: String,
      enum: [
        "Hotel",
        "Transport",
        "Flight",
        "Activity",
        "Tour Operator",
        "DMC",
        "Visa Service",
        "Travel Insurance",
        "Cruise",
        "Restaurant",
        "Guide",
        "Other"
      ],
      required: true
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null
    },

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

      alternatePhone: {
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

    address: {
      street: {
        type: String,
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
        trim: true,
        default: "India"
      },

      postalCode: {
        type: String,
        trim: true
      }
    },

    website: {
      type: String,
      trim: true
    },

    destinations: {
      type: [String],
      default: []
    },

    services: {
      type: [String],
      default: []
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true
    },

    paymentTerms: {
      type: String,
      trim: true,
      maxlength: 3000
    },

    cancellationPolicy: {
      type: String,
      trim: true,
      maxlength: 5000
    },

    creditLimit: {
      type: Number,
      default: 0,
      min: 0
    },

    outstandingAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Blacklisted", "Pending"],
      default: "Active"
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 5000
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
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
supplierSchema.index({ name: 1 });
supplierSchema.index({ supplierType: 1 });
supplierSchema.index({ company: 1 });
supplierSchema.index({ status: 1 });
supplierSchema.index({ owner: 1 });
supplierSchema.index({ destinations: 1 });


module.exports = mongoose.model("Supplier", supplierSchema);