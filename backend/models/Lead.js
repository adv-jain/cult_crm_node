const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    // ==============================
    // CONTACT INFORMATION
    // ==============================

    firstName: {
  type: String,
  required: true,
  trim: true,
  set: (value) =>
    typeof value === "string"
      ? value
          .trim()
          .toLowerCase()
          .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
      : value,
},

lastName: {
  type: String,
  trim: true,
  default: "",
  set: (value) =>
    typeof value === "string"
      ? value
          .trim()
          .toLowerCase()
          .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
      : value,
},
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    // ==============================
    // LEAD INFORMATION
    // ==============================

    destination: {
      type: String,
      required: true,
      trim: true,
    },

    source: {
      type: String,
      enum: [
        "Website",
        "Facebook",
        "Instagram",
        "Google Ads",
        "LinkedIn",
        "Referral",
        "Cold Call",
        "Email Campaign",
        "WhatsApp",
        "Walk In",
        "Other",
      ],
      default: "Website",
    },

    status: {
      type: String,
      enum: [
        "New",
        "Contacted",
        "Qualified",
        "Proposal",
        "Negotiation",
        "Won",
        "Lost",
      ],
      default: "New",
    },

    priority: {
      type: String,
      enum: [
        "Low",
        "Medium",
        "High",
      ],
      default: "Medium",
    },

    // ==============================
    // ASSIGNMENT
    // ==============================

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ==============================
    // NOTES
    // ==============================

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // ==============================
    // CONVERSION
    // ==============================

    isConverted: {
      type: Boolean,
      default: false,
    },

    convertedAt: {
      type: Date,
    },

    // Lead → Enquiry
    convertedEnquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
    },

    // Kept for backward compatibility
    // with existing CRM data/code.
    convertedCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },

    convertedContact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
    },
  },
  {
    timestamps: true,
  }
);

// ==============================
// INDEXES
// ==============================

leadSchema.index({
  assignedTo: 1,
});

leadSchema.index({
  status: 1,
});

leadSchema.index({
  source: 1,
});

leadSchema.index({
  priority: 1,
});

leadSchema.index({
  destination: 1,
});

leadSchema.index({
  createdAt: -1,
});

leadSchema.index({
  isConverted: 1,
});

module.exports = mongoose.model(
  "Lead",
  leadSchema
);