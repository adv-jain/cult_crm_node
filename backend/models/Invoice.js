
const mongoose = require("mongoose");

// ============================================
// INVOICE SCHEMA
// ============================================

const invoiceSchema = new mongoose.Schema(
  {
    // ============================================
    // INVOICE NUMBER
    // ============================================

    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true
    },

    // ============================================
    // DATES
    // ============================================

    invoiceDate: {
      type: Date,
      default: Date.now
    },

    dueDate: {
      type: Date,
      default: null
    },

    // ============================================
    // REFERENCES
    // ============================================

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking is required"]
    },

    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      default: null
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"]
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null
    },

    // Deal → Trip
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null
    },

    // ============================================
    // CURRENCY
    // ============================================

    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true
    },

    // ============================================
    // INVOICE ITEMS
    // ============================================

    items: [
      {
        description: {
          type: String,
          required: [true, "Item description is required"],
          trim: true
        },

        category: {
          type: String,
          enum: [
            "Hotel",
            "Transport",
            "Flight",
            "Train",
            "Activity",
            "Visa",
            "Insurance",
            "Package",
            "Service",
            "Other"
          ],
          default: "Service"
        },

        quantity: {
          type: Number,
          default: 1,
          min: [1, "Quantity must be at least 1"]
        },

        unitPrice: {
          type: Number,
          default: 0,
          min: [0, "Unit price cannot be negative"]
        },

        amount: {
          type: Number,
          default: 0,
          min: [0, "Amount cannot be negative"]
        }
      }
    ],

    // ============================================
    // CALCULATION FIELDS
    // ============================================

    subtotal: {
      type: Number,
      default: 0,
      min: 0
    },

    discountType: {
      type: String,
      enum: ["Percentage", "Fixed"],
      default: "Fixed"
    },

    discountValue: {
      type: Number,
      default: 0,
      min: 0
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    taxPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    // ============================================
    // PAYMENT FIELDS
    // ============================================

    amountPaid: {
      type: Number,
      default: 0,
      min: 0
    },

    amountDue: {
      type: Number,
      default: 0,
      min: 0
    },

    paymentStatus: {
      type: String,
      enum: [
        "Pending",
        "Partially Paid",
        "Paid",
        "Overdue",
        "Cancelled"
      ],
      default: "Pending"
    },

    // ============================================
    // INVOICE STATUS
    // ============================================

    status: {
      type: String,
      enum: [
        "Draft",
        "Issued",
        "Sent",
        "Viewed",
        "Partially Paid",
        "Paid",
        "Overdue",
        "Cancelled"
      ],
      default: "Draft"
    },

    // ============================================
    // BILLING ADDRESS
    // ============================================

    billingAddress: {
      name: {
        type: String,
        trim: true
      },

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

    // ============================================
    // ADDITIONAL INFORMATION
    // ============================================

    notes: {
      type: String,
      trim: true,
      maxlength: 5000
    },

    termsAndConditions: {
      type: String,
      trim: true,
      maxlength: 10000
    },

    pdfUrl: {
      type: String,
      trim: true
    },

    sentAt: {
      type: Date,
      default: null
    },

    // ============================================
    // CREATED BY
    // ============================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"]
    }
  },
  {
    timestamps: true
  }
);

// ============================================
// CALCULATE INVOICE TOTALS
// ============================================

invoiceSchema.pre("save", function () {
  // --------------------------------------------
  // Ensure items is an array
  // --------------------------------------------

  if (!Array.isArray(this.items)) {
    this.items = [];
  }

  // --------------------------------------------
  // Calculate item amounts
  // --------------------------------------------

  this.items = this.items.map((item) => {
    const quantity = Number(item.quantity || 1);
    const unitPrice = Number(item.unitPrice || 0);

    item.amount = Number(
      (quantity * unitPrice).toFixed(2)
    );

    return item;
  });

  // --------------------------------------------
  // Calculate subtotal
  // --------------------------------------------

  this.subtotal = Number(
    this.items
      .reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      )
      .toFixed(2)
  );

  // --------------------------------------------
  // Calculate discount
  // --------------------------------------------

  if (this.discountType === "Percentage") {
    this.discountAmount = Number(
      (
        (this.subtotal *
          Number(this.discountValue || 0)) /
        100
      ).toFixed(2)
    );
  } else {
    this.discountAmount = Number(
      Math.min(
        Number(this.discountValue || 0),
        this.subtotal
      ).toFixed(2)
    );
  }

  // --------------------------------------------
  // Calculate taxable amount
  // --------------------------------------------

  const taxableAmount = Math.max(
    0,
    this.subtotal - this.discountAmount
  );

  // --------------------------------------------
  // Calculate tax
  // --------------------------------------------

  this.taxAmount = Number(
    (
      (taxableAmount *
        Number(this.taxPercentage || 0)) /
      100
    ).toFixed(2)
  );

  // --------------------------------------------
  // Calculate total amount
  // --------------------------------------------

  this.totalAmount = Number(
    (taxableAmount + this.taxAmount).toFixed(2)
  );

  // --------------------------------------------
  // Calculate amount due
  // --------------------------------------------

  this.amountDue = Number(
    Math.max(
      0,
      this.totalAmount -
        Number(this.amountPaid || 0)
    ).toFixed(2)
  );

  // --------------------------------------------
  // Calculate payment status
  // --------------------------------------------

  if (this.status === "Cancelled") {
    this.paymentStatus = "Cancelled";
  } else if (this.amountPaid <= 0) {
    this.paymentStatus = "Pending";
  } else if (this.amountPaid < this.totalAmount) {
    this.paymentStatus = "Partially Paid";
  } else {
    this.paymentStatus = "Paid";
  }

  // No next() required here.
});

// ============================================
// INDEXES
// ============================================

invoiceSchema.index({
  booking: 1
});

invoiceSchema.index({
  quotation: 1
});

invoiceSchema.index({
  customer: 1
});

invoiceSchema.index({
  company: 1
});

invoiceSchema.index({
  trip: 1
});

invoiceSchema.index({
  invoiceDate: -1
});

invoiceSchema.index({
  dueDate: 1
});

invoiceSchema.index({
  paymentStatus: 1
});

invoiceSchema.index({
  status: 1
});

// ============================================
// MODEL
// ============================================

module.exports =
  mongoose.models.Invoice ||
  mongoose.model("Invoice", invoiceSchema);

