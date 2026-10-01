const Customer = require("../models/Customer");
const User = require("../models/User");
const Contact = require("../models/Contact");
const Company = require("../models/Company");
const Deal = require("../models/Trip");

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

      filter.owner = {
        $in: salesIds,
      };
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Search
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      const contacts = await Contact.find({
        $or: [
          { firstName: regex },
          { lastName: regex },
          { email: regex },
          { phone: regex },
        ],
      }).select("_id");

      const companies = await Company.find({
        name: regex,
      }).select("_id");

      filter.$or = [
        {
          contact: {
            $in: contacts.map((c) => c._id),
          },
        },
        {
          company: {
            $in: companies.map((c) => c._id),
          },
        },
      ];
    }

    // =====================================================
    // PAGINATION
    // =====================================================

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 50, 1),
      50
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    const total = await Customer.countDocuments(
      filter
    );

    const customers = await Customer.find(filter)
      .populate("contact")
      .populate("company")
      // .populate("convertedFromDeal")
      .populate("owner", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    const totalPages = Math.ceil(
      total / limitNumber
    );

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
    console.error(
      "Get Customers Error:",
      error
    );

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
    const customer = await Customer.findById(
      req.params.id
    )
      .populate("contact")
      .populate("company")
      .populate("convertedFromDeal")
      .populate("owner", "name email role");

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    if (
      req.user.role === "sales" &&
      customer.owner &&
      customer.owner._id.toString() !==
        req.user.id.toString()
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    if (req.user.role === "manager") {
      if (
        !customer.owner ||
        customer.owner.role !== "sales"
      ) {
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
    console.error(
      "Get Customer Error:",
      error
    );

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
      contact,
      company,
      convertedFromDeal,
      owner,
      customerSince,
      status,
      notes,
    } = req.body;

    if (!contact) {
      return res.status(400).json({
        message: "Contact is required",
      });
    }

    if (!convertedFromDeal) {
      return res.status(400).json({
        message: "Converted deal is required",
      });
    }

    const contactDoc =
      await Contact.findById(contact);

    if (!contactDoc) {
      return res.status(404).json({
        message: "Contact not found",
      });
    }

    const deal = await Deal.findById(
      convertedFromDeal
    );

    if (!deal) {
      return res.status(404).json({
        message: "Deal not found",
      });
    }

    if (deal.stage !== "Won") {
      return res.status(400).json({
        message:
          "Customer can be created only from a Won deal",
      });
    }

    if (!deal.contact) {
      return res.status(400).json({
        message:
          "Won deal does not have a contact",
      });
    }

    if (
      deal.contact.toString() !==
      contact.toString()
    ) {
      return res.status(400).json({
        message:
          "Selected contact does not belong to this deal",
      });
    }

    if (deal.company && company) {
      if (
        deal.company.toString() !==
        company.toString()
      ) {
        return res.status(400).json({
          message:
            "Selected company does not belong to this deal",
        });
      }
    }

    const finalCompany =
      company ||
      deal.company ||
      contactDoc.company ||
      null;

    const existingCustomer =
      await Customer.findOne({
        contact,
      });

    if (existingCustomer) {
      return res.status(409).json({
        message:
          "This contact is already a customer",
        customer: existingCustomer,
      });
    }

    let finalOwner = req.user.id;

    if (req.user.role === "sales") {
      finalOwner = req.user.id;
    } else if (owner) {
      const ownerUser =
        await User.findOne({
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

    const customer =
      await Customer.create({
        contact,
        company: finalCompany,
        convertedFromDeal,
        owner: finalOwner,
        customerSince:
          customerSince || new Date(),
        status: status || "Active",
        notes,
      });

    const populatedCustomer =
      await Customer.findById(customer._id)
        .populate("contact")
        .populate("company")
        .populate("convertedFromDeal")
        .populate("owner", "name email role");

    res.status(201).json({
      message:
        "Customer created successfully",
      customer: populatedCustomer,
    });
  } catch (error) {
    console.error(
      "Create Customer Error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "This contact is already a customer",
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
    const customer =
      await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    if (
      req.user.role === "sales" &&
      customer.owner.toString() !==
        req.user.id.toString()
    ) {
      return res.status(403).json({
        message:
          "You can update only your customers",
      });
    }

    if (req.user.role === "manager") {
      const ownerUser =
        await User.findById(customer.owner);

      if (
        !ownerUser ||
        ownerUser.role !== "sales"
      ) {
        return res.status(403).json({
          message: "Access denied",
        });
      }
    }

    const {
      status,
      notes,
      owner,
      customerSince,
    } = req.body;

    if (status !== undefined) {
      if (
        ![
          "Active",
          "Inactive",
          "Churned",
        ].includes(status)
      ) {
        return res.status(400).json({
          message:
            "Invalid customer status",
        });
      }

      customer.status = status;
    }

    if (notes !== undefined) {
      customer.notes = notes;
    }

    if (customerSince !== undefined) {
      customer.customerSince =
        customerSince;
    }

    if (
      owner &&
      req.user.role !== "sales"
    ) {
      const newOwner =
        await User.findOne({
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
          message:
            "Manager can assign only to Sales users",
        });
      }

      customer.owner = newOwner._id;
    }

    await customer.save();

    const updatedCustomer =
      await Customer.findById(customer._id)
        .populate("contact")
        .populate("company")
        .populate("convertedFromDeal")
        .populate("owner", "name email role");

    res.status(200).json({
      message:
        "Customer updated successfully",
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error(
      "Update Customer Error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to update customer",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE CUSTOMER
// =====================================================
const deleteCustomer = async (req, res) => {
  try {
    const customer =
      await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    await Customer.findByIdAndDelete(
      req.params.id
    );

    res.status(200).json({
      message:
        "Customer deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Customer Error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to delete customer",
      error: error.message,
    });
  }
};

// =====================================================
// GET ASSIGNABLE USERS
// =====================================================
const getAssignableUsers = async (
  req,
  res
) => {
  try {
    let filter = {
      isActive: true,
    };

    if (req.user.role === "manager") {
      filter.role = "sales";
    }

    if (req.user.role === "sales") {
      return res.status(403).json({
        message:
          "Sales users cannot assign customers",
      });
    }

    const users = await User.find(filter)
      .select("name email role phone")
      .sort({ name: 1 });

    res.status(200).json({
      message:
        "Assignable users fetched successfully",
      users,
    });
  } catch (error) {
    console.error(
      "Assignable Users Error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch assignable users",
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