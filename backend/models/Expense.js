const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    title: {
      type: String,
      required: [true, "Expense title is required"],
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
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
        "Other",
      ],
      required: [true, "Expense category is required"],
    },

    subCategory: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    amount: {
      type: Number,
      required: [true, "Expense amount is required"],
      min: [0.01, "Expense amount must be greater than 0"],
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },

    expenseDate: {
      type: Date,
      default: Date.now,
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
        "Other",
      ],
      default: "Bank Transfer",
    },

    transactionId: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    receiptNumber: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    receiptUrl: {
      type: String,
      trim: true,
      default: "",
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
    },

    transport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transport",
      default: null,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      default: null,
    },

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Approved",
        "Rejected",
        "Paid",
        "Cancelled",
      ],
      default: "Pending",
      index: true,
    },

    isBillable: {
      type: Boolean,
      default: false,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.index({ category: 1 });
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ supplier: 1 });
expenseSchema.index({ hotel: 1 });
expenseSchema.index({ transport: 1 });
expenseSchema.index({ booking: 1 });
expenseSchema.index({ quotation: 1 });
expenseSchema.index({ trip: 1 });
expenseSchema.index({ customer: 1 });

expenseSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Expense", expenseSchema);