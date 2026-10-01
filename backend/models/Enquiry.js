const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    enquiryNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },

    title: {
      type: String,
      required: [true, "Enquiry title is required"],
      trim: true,
      maxlength: 200
    },

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true
    },

    departureCity: {
      type: String,
      trim: true
    },

    travelDate: {
      type: Date
    },

    returnDate: {
      type: Date
    },

    flexibleDates: {
      type: Boolean,
      default: false
    },

    adults: {
      type: Number,
      default: 1,
      min: 1
    },

    children: {
      type: Number,
      default: 0,
      min: 0
    },

    infants: {
      type: Number,
      default: 0,
      min: 0
    },

    travelType: {
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
        "Other"
      ],
      default: "Other"
    },

    tripDuration: {
      type: Number,
      min: 0
    },

    hotelCategory: {
      type: String,
      enum: [
        "Any",
        "Budget",
        "3 Star",
        "4 Star",
        "5 Star",
        "Luxury"
      ],
      default: "Any"
    },

    roomPreference: {
      type: String,
      trim: true
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
        "Not Required"
      ],
      default: "Not Required"
    },

    mealPreference: {
      type: String,
      enum: [
        "Room Only",
        "Breakfast",
        "Half Board",
        "Full Board",
        "All Inclusive",
        "Not Specified"
      ],
      default: "Not Specified"
    },

    budgetMin: {
      type: Number,
      default: 0,
      min: 0
    },

    budgetMax: {
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

    specialRequirements: {
      type: String,
      trim: true,
      maxlength: 3000
    },

    status: {
      type: String,
      enum: [
        "New",
        "In Progress",
        "Waiting for Customer",
        "Quotation Prepared",
        "Quotation Sent",
        "Confirmed",
        "Cancelled",
        "Closed"
      ],
      default: "New"
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium"
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
        "WhatsApp",
        "Walk In",
        "Cold Call",
        "Email Campaign",
        "Other"
      ],
      default: "Other"
    },

    quotationRequired: {
      type: Boolean,
      default: true
    },

    quotationDueDate: {
      type: Date,
      default: null
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
    }
  },
  {
    timestamps: true
  }
);


// Indexes

enquirySchema.index({ lead: 1 });
enquirySchema.index({ customer: 1 });
enquirySchema.index({ assignedTo: 1 });
enquirySchema.index({ status: 1 });
enquirySchema.index({ priority: 1 });
enquirySchema.index({ travelDate: 1 });
enquirySchema.index({ destination: 1 });
enquirySchema.index({ createdAt: -1 });


module.exports = mongoose.model("Enquiry", enquirySchema);