const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// =====================================================
// CREATE USER
// =====================================================

const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message:
          "Name, email and password are required",
      });
    }

    const existingUser =
      await User.findOne({
        email: email
          .toLowerCase()
          .trim(),
      });

    if (existingUser) {
      return res.status(400).json({
        message:
          "User with this email already exists",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    const user = await User.create({
      name: name.trim(),
      email: email
        .toLowerCase()
        .trim(),
      password: hashedPassword,
      role: role || "sales",
      phone: phone?.trim() || "",
    });

    res.status(201).json({
      message:
        "User created successfully",
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "Create User Error:",
      error
    );

    res.status(500).json({
      message: "Failed to create user",
      error: error.message,
    });
  }
};

// =====================================================
// SIGNUP
// =====================================================

const signupUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message:
          "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters",
      });
    }

    const normalizedEmail =
      email.toLowerCase().trim();

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(400).json({
        message:
          "User with this email already exists",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "sales",
      phone: phone?.trim() || "",
    });

    res.status(201).json({
      message:
        "Account created successfully",
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "Signup User Error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to create account",
      error: error.message,
    });
  }
};

// =====================================================
// LOGIN
// =====================================================

const loginUser = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and password are required",
      });
    }

    const user =
      await User.findOne({
        email: email
          .toLowerCase()
          .trim(),
      });

    if (!user) {
      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message:
          "Your account is inactive",
      });
    }

    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isMatch) {
      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    const token =
      jwt.sign(
        {
          id: user._id,
          role: user.role,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "1d",
        }
      );

    res.status(200).json({
      message:
        "Login successful",
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error(
      "Login User Error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to login",
      error: error.message,
    });
  }
};

// =====================================================
// FORGOT PASSWORD
// =====================================================

const forgotPassword = async (
  req,
  res
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user =
      await User.findOne({
        email: email
          .toLowerCase()
          .trim(),
      });

    if (!user) {
      return res.status(200).json({
        message:
          "If the email exists, a password reset link has been generated",
      });
    }

    const resetToken =
      crypto.randomBytes(32).toString("hex");

    const hashedToken =
      crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    user.resetPasswordToken =
      hashedToken;

    user.resetPasswordExpire =
      Date.now() +
      15 * 60 * 1000;

    await user.save();

    const resetUrl =
      `${req.protocol}://${req.get(
        "host"
      )}/reset-password/${resetToken}`;

    res.status(200).json({
      message:
        "Password reset link generated successfully",
      resetUrl,
    });
  } catch (error) {
    console.error(
      "Forgot Password Error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to process forgot password request",
      error: error.message,
    });
  }
};

// =====================================================
// RESET PASSWORD
// =====================================================

const resetPassword = async (
  req,
  res
) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message:
          "Password is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters",
      });
    }

    const hashedToken =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const user =
      await User.findOne({
        resetPasswordToken:
          hashedToken,
        resetPasswordExpire: {
          $gt: Date.now(),
        },
      });

    if (!user) {
      return res.status(400).json({
        message:
          "Invalid or expired reset token",
      });
    }

    user.password =
      await bcrypt.hash(
        password,
        10
      );

    user.resetPasswordToken =
      undefined;

    user.resetPasswordExpires =
      undefined;

    await user.save();

    res.status(200).json({
      message:
        "Password reset successfully",
    });
  } catch (error) {
    console.error(
      "Reset Password Error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to reset password",
      error: error.message,
    });
  }
};

// =====================================================
// GET USERS WITH PAGINATION
// =====================================================

const getUsers = async (
  req,
  res
) => {
  try {
    const {
      page = 1,
      limit = 50,
    } = req.query;

    const currentPage = Math.max(
      parseInt(page) || 1,
      1
    );

    const recordsPerPage = Math.min(
      Math.max(
        parseInt(limit) || 50,
        1
      ),
      50
    );

    const skip =
      (currentPage - 1) *
      recordsPerPage;

    const total =
      await User.countDocuments();

    const users =
      await User.find()
        .select("-password")
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(recordsPerPage);

    const totalPages =
      Math.ceil(
        total /
          recordsPerPage
      );

    res.status(200).json({
      message:
        "Users fetched successfully",
      count: users.length,
      total,
      page: currentPage,
      limit: recordsPerPage,
      totalPages,
      hasNextPage:
        currentPage <
        totalPages,
      hasPreviousPage:
        currentPage > 1,
      users,
    });
  } catch (error) {
    console.error(
      "Get Users Error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch users",
      error: error.message,
    });
  }
};

// =====================================================
// GET USER BY ID
// =====================================================

const getUserById = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.params.id
      ).select("-password");

    if (!user) {
      return res.status(404).json({
        message:
          "User not found",
      });
    }

    res.status(200).json({
      message:
        "User fetched successfully",
      user,
    });
  } catch (error) {
    console.error(
      "Get User Error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch user",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE USER
// =====================================================

const updateUser = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.params.id
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User not found",
      });
    }

    const {
      name,
      email,
      password,
      role,
      phone,
    } = req.body;

    if (name !== undefined) {
      user.name =
        name.trim();
    }

    if (email !== undefined) {
      const normalizedEmail =
        email
          .toLowerCase()
          .trim();

      const existingUser =
        await User.findOne({
          email: normalizedEmail,
          _id: {
            $ne: user._id,
          },
        });

      if (existingUser) {
        return res.status(400).json({
          message:
            "User with this email already exists",
        });
      }

      user.email =
        normalizedEmail;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          message:
            "Password must be at least 6 characters",
        });
      }

      user.password =
        await bcrypt.hash(
          password,
          10
        );
    }

    if (role !== undefined) {
      user.role = role;
    }

    if (phone !== undefined) {
      user.phone =
        phone.trim();
    }

    await user.save();

    res.status(200).json({
      message:
        "User updated successfully",
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        createdAt:
          user.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "Update User Error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to update user",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE USER STATUS
// =====================================================

const updateUserStatus =
  async (req, res) => {
    try {
      const {
        isActive,
      } = req.body;

      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      user.isActive =
        Boolean(isActive);

      await user.save();

      res.status(200).json({
        message:
          user.isActive
            ? "User activated successfully"
            : "User deactivated successfully",
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          isActive:
            user.isActive,
        },
      });
    } catch (error) {
      console.error(
        "Update User Status Error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update user status",
        error: error.message,
      });
    }
  };

// =====================================================
// DELETE USER
// =====================================================

const deleteUser = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.params.id
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User not found",
      });
    }

    await User.findByIdAndDelete(
      req.params.id
    );

    res.status(200).json({
      message:
        "User deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete User Error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to delete user",
      error: error.message,
    });
  }
};

module.exports = {
  createUser,
  signupUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser,
};