const Customer = require("../models/Customer");
const User = require("../models/User");
const Company = require("../models/Company");

// =====================================================
// GET ALL CUSTOMERS
// =====================================================

const getCustomers = async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      page = 1,
      limit = 50,
    } = req.query;

    let filter = {};

    // Sales → only own customers
    if (req.user.role === "sales") {
      filter.owner = req.user.id;
    }

    // Manager → customers owned by Sales users
    if (req.user.role === "manager") {
      const salesUsers = await User.find({
        role: "sales",
        isActive: true,
      }).select("_id");

      const salesIds = salesUsers.map((user) => user._id);

      filter.owner = { $in: salesIds };
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Search — Customer ke apne fields me (firstName, lastName, email, phone)
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    // =====================================================
    // PAGINATION
    // =====================================================

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(limit) || 50, 1),
      50
    );

    const skip = (pageNumber - 1) * limitNumber;

    const total = await Customer.countDocuments(filter);

    const customers = await Customer.find(filter)
      .populate("company")
      .populate("lead")
      .populate("owner", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    const totalPages = Math.ceil(total / limitNumber);

    res.status(200).json({
      message: "Customers fetched successfully",
      count: customers.length,
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages,
      hasNextPage: pageNumber < totalPages,
      hasPreviousPage: pageNumber > 1,
      customers,
    });
  } catch (error) {
    console.error("Get Customers Error:", error);

    res.status(500).json({
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};

// =====================================================
// GET CUSTOMER BY ID
// =====================================================

const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate("company")
      .populate("lead")
      .populate("owner", "name email role");

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    if (
      req.user.role === "sales" &&
      customer.owner &&
      customer.owner._id.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    if (req.user.role === "manager") {
      if (!customer.owner || customer.owner.role !== "sales") {
        return res.status(403).json({
          message: "Access denied",
        });
      }
    }

    res.status(200).json({
      message: "Customer fetched successfully",
      customer,
    });
  } catch (error) {
    console.error("Get Customer Error:", error);

    res.status(500).json({
      message: "Failed to fetch customer",
      error: error.message,
    });
  }
};

// =====================================================
// CREATE CUSTOMER
// =====================================================

const createCustomer = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      alternatePhone,
      whatsapp,
      company,
      customerType,
      address,
      emergencyContact,
      lead,
      owner,
      customerSince,
      status,
      notes,
    } = req.body;

    // Basic validation
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({
        message: "First name is required",
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        message: "Phone is required",
      });
    }

    // Duplicate check — same phone wala customer exist karta hai?
    const existingCustomer = await Customer.findOne({
      phone: phone.trim(),
    });

    if (existingCustomer) {
      return res.status(409).json({
        message: "Customer with this phone already exists",
        customer: existingCustomer,
      });
    }

    // Owner decide karo
    let finalOwner = req.user.id;

    if (req.user.role === "sales") {
      finalOwner = req.user.id;
    } else if (owner) {
      const ownerUser = await User.findOne({
        _id: owner,
        isActive: true,
      });

      if (!ownerUser) {
        return res.status(400).json({
          message: "Invalid owner",
        });
      }

      if (
        req.user.role === "manager" &&
        ownerUser.role !== "sales"
      ) {
        return res.status(403).json({
          message:
            "Manager can assign customers only to Sales users",
        });
      }

      finalOwner = ownerUser._id;
    }

    // Company validate karo (agar diya)
    if (company) {
      const companyDoc = await Company.findById(company);

      if (!companyDoc) {
        return res.status(404).json({
          message: "Company not found",
        });
      }
    }

    const customer = await Customer.create({
      firstName: firstName.trim(),
      lastName: lastName?.trim() || "",
      email: email?.trim().toLowerCase() || "",
      phone: phone.trim(),
      alternatePhone: alternatePhone?.trim() || "",
      whatsapp: whatsapp?.trim() || "",
      company: company || null,
      customerType: customerType || "Individual",
      address: address || {},
      emergencyContact: emergencyContact || {},
      lead: lead || null,
      owner: finalOwner,
      customerSince: customerSince || new Date(),
      status: status || "Active",
      notes: notes?.trim() || "",
    });

    const populatedCustomer = await Customer.findById(customer._id)
      .populate("company")
      .populate("lead")
      .populate("owner", "name email role");

    res.status(201).json({
      message: "Customer created successfully",
      customer: populatedCustomer,
    });
  } catch (error) {
    console.error("Create Customer Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Customer with this phone already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create customer",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE CUSTOMER
// =====================================================

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    // Permissions
    if (
      req.user.role === "sales" &&
      customer.owner.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({
        message: "You can update only your customers",
      });
    }

    if (req.user.role === "manager") {
      const ownerUser = await User.findById(customer.owner);

      if (!ownerUser || ownerUser.role !== "sales") {
        return res.status(403).json({
          message: "Access denied",
        });
      }
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      alternatePhone,
      whatsapp,
      company,
      customerType,
      address,
      emergencyContact,
      lead,
      status,
      notes,
      owner,
      customerSince,
    } = req.body;

    // Basic fields update
    if (firstName !== undefined) {
      customer.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      customer.lastName = lastName.trim();
    }

    if (email !== undefined) {
      customer.email = email.trim().toLowerCase();
    }

    if (phone !== undefined) {
      // Duplicate check if phone changed
      if (phone !== customer.phone) {
        const duplicate = await Customer.findOne({
          phone: phone.trim(),
          _id: { $ne: customer._id },
        });

        if (duplicate) {
          return res.status(409).json({
            message: "Customer with this phone already exists",
          });
        }
      }

      customer.phone = phone.trim();
    }

    if (alternatePhone !== undefined) {
      customer.alternatePhone = alternatePhone.trim();
    }

    if (whatsapp !== undefined) {
      customer.whatsapp = whatsapp.trim();
    }

    if (company !== undefined) {
      if (company) {
        const companyDoc = await Company.findById(company);

        if (!companyDoc) {
          return res.status(404).json({
            message: "Company not found",
          });
        }
      }
      customer.company = company || null;
    }

    if (customerType !== undefined) {
      customer.customerType = customerType;
    }

    if (address !== undefined) {
      customer.address = address;
    }

    if (emergencyContact !== undefined) {
      customer.emergencyContact = emergencyContact;
    }

    if (lead !== undefined) {
      customer.lead = lead || null;
    }

    if (status !== undefined) {
      if (
        !["Active", "Inactive", "Potential"].includes(status)
      ) {
        return res.status(400).json({
          message: "Invalid customer status",
        });
      }

      customer.status = status;
    }

    if (notes !== undefined) {
      customer.notes = notes.trim();
    }

    if (customerSince !== undefined) {
      customer.customerSince = customerSince;
    }

    // Owner change (only admin/manager)
    if (owner && req.user.role !== "sales") {
      const newOwner = await User.findOne({
        _id: owner,
        isActive: true,
      });

      if (!newOwner) {
        return res.status(400).json({
          message: "Invalid owner",
        });
      }

      if (
        req.user.role === "manager" &&
        newOwner.role !== "sales"
      ) {
        return res.status(403).json({
          message: "Manager can assign only to Sales users",
        });
      }

      customer.owner = newOwner._id;
    }

    await customer.save();

    const updatedCustomer = await Customer.findById(customer._id)
      .populate("company")
      .populate("lead")
      .populate("owner", "name email role");

    res.status(200).json({
      message: "Customer updated successfully",
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Update Customer Error:", error);

    res.status(500).json({
      message: "Failed to update customer",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE CUSTOMER
// =====================================================

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    await Customer.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete Customer Error:", error);

    res.status(500).json({
      message: "Failed to delete customer",
      error: error.message,
    });
  }
};

// =====================================================
// GET ASSIGNABLE USERS
// =====================================================

const getAssignableUsers = async (req, res) => {
  try {
    let filter = { isActive: true };

    if (req.user.role === "manager") {
      filter.role = "sales";
    }

    if (req.user.role === "sales") {
      return res.status(403).json({
        message: "Sales users cannot assign customers",
      });
    }

    const users = await User.find(filter)
      .select("name email role phone")
      .sort({ name: 1 });

    res.status(200).json({
      message: "Assignable users fetched successfully",
      users,
    });
  } catch (error) {
    console.error("Assignable Users Error:", error);

    res.status(500).json({
      message: "Failed to fetch assignable users",
      error: error.message,
    });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getAssignableUsers,
};