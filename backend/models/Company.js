const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    industry: {
      type: String,
      trim: true
    },

    website: {
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

    address: {
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
    },

    employees: {
      type: Number,
      min: 0
    },

    // Corporate travel settings
    corporateTravelEnabled: {
      type: Boolean,
      default: false
    },

    travelPolicy: {
      type: String,
      trim: true
    },

    // Employee responsible for this company
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    status: {
      type: String,
      enum: [
        "Active",
        "Inactive",
        "Prospect"
      ],
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

// Indexes
companySchema.index({ owner: 1 });
companySchema.index({ status: 1 });
companySchema.index({ corporateTravelEnabled: 1 });

module.exports = mongoose.model("Company", companySchema);