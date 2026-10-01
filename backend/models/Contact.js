const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },

    lastName: {
      type: String,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    phone: {
      type: String,
      trim: true
    },

    whatsapp: {
      type: String,
      trim: true
    },

    alternatePhone: {
      type: String,
      trim: true
    },

    designation: {
      type: String,
      trim: true
    },

    department: {
      type: String,
      trim: true
    },

    contactType: {
      type: String,
      enum: [
        "Corporate",
        "Hotel",
        "Transport",
        "Supplier",
        "Partner",
        "Other"
      ],
      default: "Corporate"
    },

    preferredContactMethod: {
      type: String,
      enum: ["Phone", "Email", "WhatsApp"],
      default: "Phone"
    },

    isPrimary: {
      type: Boolean,
      default: false
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company"
    },

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead"
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    },

    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

contactSchema.index({ company: 1 });
contactSchema.index({ lead: 1 });
contactSchema.index({ owner: 1 });
contactSchema.index({ contactType: 1 });
contactSchema.index({ status: 1 });

module.exports = mongoose.model("Contact", contactSchema);