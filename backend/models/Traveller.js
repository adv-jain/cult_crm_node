const mongoose = require("mongoose");

const travellerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Traveller first name is required"],
      trim: true,
      maxlength: 100
    },

    lastName: {
      type: String,
      trim: true,
      maxlength: 100
    },

    dateOfBirth: {
      type: Date,
      default: null
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
      default: "Prefer not to say"
    },

    nationality: {
      type: String,
      trim: true,
      default: "Indian"
    },

    travellerType: {
      type: String,
      enum: ["Adult", "Child", "Infant"],
      default: "Adult"
    },

    relationshipToCustomer: {
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
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Traveller must belong to a customer"]
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null
    },

    emergencyContact: {
      name: {
        type: String,
        trim: true
      },

      relationship: {
        type: String,
        trim: true
      },

      phone: {
        type: String,
        trim: true
      }
    },

    identityDocument: {
      type: {
        type: String,
        enum: [
          "Passport",
          "Aadhaar",
          "Driving License",
          "Voter ID",
          "Other"
        ],
        default: null
      },

      documentNumber: {
        type: String,
        trim: true,
        default: null
      },

      issueDate: {
        type: Date,
        default: null
      },

      expiryDate: {
        type: Date,
        default: null
      },

      issuingCountry: {
        type: String,
        trim: true,
        default: null
      }
    },

    visaRequired: {
      type: Boolean,
      default: false
    },

    visaStatus: {
      type: String,
      enum: [
        "Not Required",
        "Required",
        "Pending",
        "Applied",
        "Approved",
        "Rejected",
        "Expired"
      ],
      default: "Not Required"
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 3000
    }
  },
  {
    timestamps: true
  }
);


// Indexes
travellerSchema.index({ customer: 1 });
travellerSchema.index({ company: 1 });
travellerSchema.index({ owner: 1 });
travellerSchema.index({ travellerType: 1 });
travellerSchema.index({ status: 1 });
travellerSchema.index({ "identityDocument.expiryDate": 1 });
travellerSchema.index({ visaStatus: 1 });


module.exports = mongoose.model("Traveller", travellerSchema);