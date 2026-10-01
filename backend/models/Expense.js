const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true
    },

    title: {
      type: String,
      required: [true, "Expense title is required"],
      trim: true,
      maxlength: 200
    },

    description: {
      type: String,
      trim: true,
      maxlength: 3000
    },

    category: {
      type: String,
      enum: [
        "Hotel",
        "Transport",
        "Flight",
        "Train",
        "Activity",
        "Supplier",
        "Visa",
        "Travel Insurance",
        "Food",
        "Guide",
        "Agent Commission",
        "Marketing",
        "Office",
        "Refund",
        "Other"
      ],
      required: true
    },

    subCategory: {
      type: String,
      trim: true,
      maxlength: 100
    },

    amount: {
      type: Number,
      required: [true, "Expense amount is required"],
      min: 0
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true
    },

    expenseDate: {
      type: Date,
      default: Date.now
    },

    paymentMethod: {
      type: String,
      enum: [
        "Cash",
        "UPI",
        "Credit Card",
        "Debit Card",
        "Net Banking",
        "Bank Transfer",
        "Cheque",
        "Wallet",
        "Other"
      ],
      default: "Bank Transfer"
    },

    transactionId: {
      type: String,
      trim: true,
      maxlength: 200
    },

    receiptNumber: {
      type: String,
      trim: true,
      maxlength: 200
    },

    receiptUrl: {
      type: String,
      trim: true
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null
    },

    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null
    },

    transport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transport",
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

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    approvedAt: {
      type: Date,
      default: null
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Approved",
        "Rejected",
        "Paid",
        "Cancelled"
      ],
      default: "Pending"
    },

    isBillable: {
      type: Boolean,
      default: false
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
expenseSchema.index({ category: 1 });
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ supplier: 1 });
expenseSchema.index({ hotel: 1 });
expenseSchema.index({ transport: 1 });
expenseSchema.index({ booking: 1 });
expenseSchema.index({ quotation: 1 });
expenseSchema.index({ trip: 1 });
expenseSchema.index({ customer: 1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ createdBy: 1 });


module.exports = mongoose.model("Expense", expenseSchema);