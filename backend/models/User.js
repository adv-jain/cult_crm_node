const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // ==================================================
    // BASIC USER INFORMATION
    // ==================================================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    // ==================================================
    // ROLE
    // ==================================================

    role: {
      type: String,
      enum: [
        "admin",
        "manager",
        "sales",
        "operations",
        "accounts",
      ],
      default: "sales",
    },

    // ==================================================
    // PHONE
    // ==================================================

    phone: {
      type: String,
      trim: true,
    },

    // ==================================================
    // PROFILE
    // ==================================================

    profileImage: {
      type: String,
      default: null,
    },

    designation: {
      type: String,
      trim: true,
      default: null,
    },

    // ==================================================
    // ACCOUNT STATUS
    // ==================================================

    isActive: {
      type: Boolean,
      default: true,
    },

    // ==================================================
    // PASSWORD RESET
    // ==================================================

    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);