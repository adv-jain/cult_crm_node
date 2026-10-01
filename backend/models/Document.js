const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    documentNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },

    name: {
      type: String,
      required: [true, "Document name is required"],
      trim: true,
      maxlength: 200
    },

    type: {
      type: String,
      enum: [
        "Passport",
        "Visa",
        "Aadhaar",
        "PAN Card",
        "Driving License",
        "Voter ID",
        "Travel Insurance",
        "Flight Ticket",
        "Train Ticket",
        "Bus Ticket",
        "Hotel Voucher",
        "Booking Confirmation",
        "Invoice",
        "Payment Receipt",
        "Itinerary",
        "Other"
      ],
      required: true
    },

    traveller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Traveller",
      default: null
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null
    },

    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      default: null
    },

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
      default: null
    },

    // File information
    fileName: {
      type: String,
      trim: true
    },

    originalFileName: {
      type: String,
      trim: true
    },

    fileUrl: {
      type: String,
      trim: true
    },

    storageProvider: {
      type: String,
      enum: ["Local", "Cloudinary", "AWS S3", "Other"],
      default: "Local"
    },

    mimeType: {
      type: String,
      trim: true
    },

    fileSize: {
      type: Number,
      min: 0,
      default: 0
    },

    // Document dates
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
      trim: true
    },

    // Verification
    verificationStatus: {
      type: String,
      enum: [
        "Pending",
        "Under Review",
        "Verified",
        "Rejected",
        "Expired"
      ],
      default: "Pending"
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    verifiedAt: {
      type: Date,
      default: null
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 2000
    },

    // Reminder
    expiryReminderEnabled: {
      type: Boolean,
      default: true
    },

    reminderDaysBefore: {
      type: Number,
      default: 30,
      min: 0
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Deleted"],
      default: "Active"
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 3000
    },

    uploadedBy: {
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
documentSchema.index({ documentNumber: 1 });
documentSchema.index({ traveller: 1 });
documentSchema.index({ customer: 1 });
documentSchema.index({ booking: 1 });
documentSchema.index({ quotation: 1 });
documentSchema.index({ trip: 1 });
documentSchema.index({ type: 1 });
documentSchema.index({ verificationStatus: 1 });
documentSchema.index({ expiryDate: 1 });
documentSchema.index({ uploadedBy: 1 });


module.exports = mongoose.model("Document", documentSchema);