
const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true
    },

    invoiceDate: {
      type: Date,
      default: Date.now
    },

    dueDate: {
      type: Date,
      default: null
    },

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

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
      default: null
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true
    },

    // ============================================
    // INVOICE LINE ITEMS
    // ============================================

    items: [
      {
        description: {
          type: String,
          required: true,
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
          min: 1
        },

        unitPrice: {
          type: Number,
          default: 0,
          min: 0
        },

        amount: {
          type: Number,
          default: 0,
          min: 0
        }
      }
    ],

    // ============================================
    // AMOUNT CALCULATION
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

    // ============================================
    // PAYMENT STATUS
    // ============================================

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
    // BILLING INFORMATION
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
// PRE-SAVE CALCULATIONS
// ============================================

invoiceSchema.pre("save", async function () {

  // ============================================
  // 1. CALCULATE EACH ITEM AMOUNT
  // ============================================

  if (Array.isArray(this.items)) {
    this.items.forEach((item) => {

      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);

      item.amount = Number(
        (quantity * unitPrice).toFixed(2)
      );

    });
  }


  // ============================================
  // 2. CALCULATE SUBTOTAL
  // ============================================

  this.subtotal = Number(
    this.items
      .reduce(
        (total, item) => {
          return total + Number(item.amount || 0);
        },
        0
      )
      .toFixed(2)
  );


  // ============================================
  // 3. CALCULATE DISCOUNT
  // ============================================

  const discountValue = Number(
    this.discountValue || 0
  );

  if (this.discountType === "Percentage") {

    this.discountAmount = Number(
      (
        (this.subtotal * discountValue) /
        100
      ).toFixed(2)
    );

  } else {

    this.discountAmount = Number(
      Math.min(
        discountValue,
        this.subtotal
      ).toFixed(2)
    );

  }


  // ============================================
  // 4. CALCULATE TAXABLE AMOUNT
  // ============================================

  const taxableAmount = Math.max(
    0,
    this.subtotal - this.discountAmount
  );


  // ============================================
  // 5. CALCULATE TAX
  // ============================================

  const taxPercentage = Number(
    this.taxPercentage || 0
  );

  this.taxAmount = Number(
    (
      (taxableAmount * taxPercentage) /
      100
    ).toFixed(2)
  );


  // ============================================
  // 6. CALCULATE TOTAL AMOUNT
  // ============================================

  this.totalAmount = Number(
    (
      taxableAmount +
      this.taxAmount
    ).toFixed(2)
  );


  // ============================================
  // 7. CALCULATE AMOUNT DUE
  // ============================================

  const amountPaid = Number(
    this.amountPaid || 0
  );

  this.amountDue = Number(
    Math.max(
      0,
      this.totalAmount - amountPaid
    ).toFixed(2)
  );


  // ============================================
  // 8. CALCULATE PAYMENT STATUS
  // ============================================

  if (this.status === "Cancelled") {

    this.paymentStatus = "Cancelled";

  } else if (amountPaid <= 0) {

    this.paymentStatus = "Pending";

  } else if (amountPaid < this.totalAmount) {

    this.paymentStatus = "Partially Paid";

  } else {

    this.paymentStatus = "Paid";

  }

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

module.exports = mongoose.model(
  "Invoice",
  invoiceSchema
);

