
const mongoose = require("mongoose");

const Traveller = require("../models/Traveller");
const Customer = require("../models/Customer");
const User = require("../models/User");

// =====================================================
// HELPERS
// =====================================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const getUserId = (req) => {
  return req.user?._id || req.user?.id;
};

const isAdmin = (req) => req.user?.role === "admin";

const isManager = (req) => req.user?.role === "manager";

const isSales = (req) => req.user?.role === "sales";

// Manager ke liye active sales users
const getManagerSalesIds = async () => {
  const users = await User.find({
    role: "sales",
    isActive: true
  }).select("_id");

  return users.map((user) => user._id);
};

// =====================================================
// CREATE TRAVELLER
// POST /api/travellers
// =====================================================

const createTraveller = async (req, res) => {
  try {
    const userId = getUserId(req);

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      nationality,
      travellerType,
      relationshipToCustomer,
      phone,
      email,
      whatsapp,
      customer,
      company,
      emergencyContact,
      identityDocument,
      visaRequired,
      visaStatus,
      status,
      notes
    } = req.body;

    // ---------------------------------------------
    // Required validation
    // ---------------------------------------------

    if (!firstName || !firstName.trim()) {
      return res.status(400).json({
        message: "Traveller first name is required"
      });
    }

    if (!customer) {
      return res.status(400).json({
        message: "Customer is required"
      });
    }

    if (!isValidObjectId(customer)) {
      return res.status(400).json({
        message: "Invalid customer ID"
      });
    }

    // ---------------------------------------------
    // Customer check
    // ---------------------------------------------

    const customerExists = await Customer.findById(customer);

    if (!customerExists) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    // ---------------------------------------------
    // Date validation
    // ---------------------------------------------

    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);

      if (Number.isNaN(dob.getTime())) {
        return res.status(400).json({
          message: "Invalid date of birth"
        });
      }

      if (dob > new Date()) {
        return res.status(400).json({
          message: "Date of birth cannot be in the future"
        });
      }
    }

    // ---------------------------------------------
    // Identity document validation
    // ---------------------------------------------

    if (identityDocument?.issueDate && identityDocument?.expiryDate) {
      const issueDate = new Date(identityDocument.issueDate);
      const expiryDate = new Date(identityDocument.expiryDate);

      if (
        Number.isNaN(issueDate.getTime()) ||
        Number.isNaN(expiryDate.getTime())
      ) {
        return res.status(400).json({
          message: "Invalid identity document dates"
        });
      }

      if (expiryDate <= issueDate) {
        return res.status(400).json({
          message: "Identity document expiry date must be after issue date"
        });
      }
    }

    // ---------------------------------------------
    // Visa validation
    // ---------------------------------------------

    if (visaRequired === true && visaStatus === "Not Required") {
      return res.status(400).json({
        message: "Visa status cannot be Not Required when visa is required"
      });
    }

    // ---------------------------------------------
    // Ownership
    // ---------------------------------------------

    let owner = userId;

    // Admin/Manager can assign owner
    if (req.body.owner) {
      if (!isValidObjectId(req.body.owner)) {
        return res.status(400).json({
          message: "Invalid owner ID"
        });
      }

      const ownerUser = await User.findById(req.body.owner);

      if (!ownerUser || !ownerUser.isActive) {
        return res.status(400).json({
          message: "Owner must be an active user"
        });
      }

      if (
        !["admin", "manager", "sales"].includes(ownerUser.role)
      ) {
        return res.status(400).json({
          message: "Owner must be admin, manager or sales"
        });
      }

      // Manager can assign only to active sales users
      if (
        isManager(req) &&
        ownerUser.role !== "sales"
      ) {
        return res.status(403).json({
          message: "Manager can assign traveller only to sales users"
        });
      }

      // Sales cannot assign traveller to another user
      if (
        isSales(req) &&
        String(ownerUser._id) !== String(userId)
      ) {
        return res.status(403).json({
          message: "Sales user can assign traveller only to self"
        });
      }

      owner = ownerUser._id;
    }

    // ---------------------------------------------
    // Create traveller
    // ---------------------------------------------

    const traveller = await Traveller.create({
      firstName: firstName.trim(),
      lastName,
      dateOfBirth,
      gender,
      nationality,
      travellerType,
      relationshipToCustomer,
      phone,
      email,
      whatsapp,
      customer,
      company: company || null,
      emergencyContact,
      identityDocument,
      visaRequired,
      visaStatus,
      status: status || "Active",
      owner,
      notes
    });

    const populatedTraveller = await Traveller.findById(
      traveller._id
    )
      .populate("customer", "firstName lastName email phone")
      .populate("company", "name")
      .populate("owner", "name email role");

    return res.status(201).json({
      message: "Traveller created successfully",
      traveller: populatedTraveller
    });

  } catch (error) {
    console.error("Create Traveller Error:", error);

    return res.status(500).json({
      message: "Failed to create traveller",
      error: error.message
    });
  }
};


// =====================================================
// GET ALL TRAVELLERS
// GET /api/travellers
// =====================================================

const getTravellers = async (req, res) => {
  try {
    const {
      customer,
      company,
      owner,
      travellerType,
      status,
      visaStatus,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const userId = getUserId(req);

    const filter = {};

    // ---------------------------------------------
    // Filters
    // ---------------------------------------------

    if (customer) {
      if (!isValidObjectId(customer)) {
        return res.status(400).json({
          message: "Invalid customer ID"
        });
      }

      filter.customer = customer;
    }

    if (company) {
      if (!isValidObjectId(company)) {
        return res.status(400).json({
          message: "Invalid company ID"
        });
      }

      filter.company = company;
    }

    if (owner) {
      if (!isValidObjectId(owner)) {
        return res.status(400).json({
          message: "Invalid owner ID"
        });
      }
    }

    if (travellerType) {
      if (!["Adult", "Child", "Infant"].includes(travellerType)) {
        return res.status(400).json({
          message: "Invalid traveller type"
        });
      }

      filter.travellerType = travellerType;
    }

    if (status) {
      if (!["Active", "Inactive"].includes(status)) {
        return res.status(400).json({
          message: "Invalid traveller status"
        });
      }

      filter.status = status;
    }

    if (visaStatus) {
      const allowedVisaStatuses = [
        "Not Required",
        "Required",
        "Pending",
        "Applied",
        "Approved",
        "Rejected",
        "Expired"
      ];

      if (!allowedVisaStatuses.includes(visaStatus)) {
        return res.status(400).json({
          message: "Invalid visa status"
        });
      }

      filter.visaStatus = visaStatus;
    }

    // ---------------------------------------------
    // Role-based access
    // ---------------------------------------------

    if (isSales(req)) {
      // Sales can see only their own travellers
      filter.owner = userId;
    }

    if (isManager(req)) {
      // Manager can see active sales team travellers
      const salesIds = await getManagerSalesIds();

      filter.owner = {
        $in: salesIds
      };
    }

    if (isAdmin(req)) {
      // Admin can see everything
      if (owner) {
        filter.owner = owner;
      }
    }

    // ---------------------------------------------
    // Search
    // ---------------------------------------------

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");

      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { whatsapp: searchRegex },
        { "identityDocument.documentNumber": searchRegex }
      ];
    }

    // ---------------------------------------------
    // Pagination
    // ---------------------------------------------

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);

    const perPage = Math.min(
      Math.max(parseInt(limit, 10) || 20, 1),
      50
    );

    const skip = (currentPage - 1) * perPage;

    // ---------------------------------------------
    // Query
    // ---------------------------------------------

    const [travellers, total] = await Promise.all([
      Traveller.find(filter)
        .populate("customer", "firstName lastName email phone")
        .populate("company", "name")
        .populate("owner", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage),

      Traveller.countDocuments(filter)
    ]);

    return res.status(200).json({
      message: "Travellers fetched successfully",
      count: travellers.length,
      total,
      page: currentPage,
      pages: Math.ceil(total / perPage),
      travellers
    });

  } catch (error) {
    console.error("Get Travellers Error:", error);

    return res.status(500).json({
      message: "Failed to fetch travellers",
      error: error.message
    });
  }
};


// =====================================================
// GET TRAVELLER BY ID
// GET /api/travellers/:id
// =====================================================

const getTravellerById = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = getUserId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid traveller ID"
      });
    }

    const traveller = await Traveller.findById(id)
      .populate("customer", "firstName lastName email phone")
      .populate("company", "name")
      .populate("owner", "name email role");

    if (!traveller) {
      return res.status(404).json({
        message: "Traveller not found"
      });
    }

    // Sales can access only own traveller
    if (
      isSales(req) &&
      String(traveller.owner?._id) !== String(userId)
    ) {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    // Manager can access only active sales team travellers
    if (isManager(req)) {
      const ownerUser = await User.findById(
        traveller.owner?._id
      ).select("role isActive");

      if (
        !ownerUser ||
        ownerUser.role !== "sales" ||
        !ownerUser.isActive
      ) {
        return res.status(403).json({
          message: "Access denied"
        });
      }
    }

    return res.status(200).json({
      message: "Traveller fetched successfully",
      traveller
    });

  } catch (error) {
    console.error("Get Traveller Error:", error);

    return res.status(500).json({
      message: "Failed to fetch traveller",
      error: error.message
    });
  }
};


// =====================================================
// GET TRAVELLERS BY CUSTOMER
// GET /api/travellers/customer/:customerId
// =====================================================

const getTravellersByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    const userId = getUserId(req);

    if (!isValidObjectId(customerId)) {
      return res.status(400).json({
        message: "Invalid customer ID"
      });
    }

    const customerExists = await Customer.findById(customerId)
      .select("_id");

    if (!customerExists) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    const filter = {
      customer: customerId
    };

    if (isSales(req)) {
      filter.owner = userId;
    }

    if (isManager(req)) {
      const salesIds = await getManagerSalesIds();

      filter.owner = {
        $in: salesIds
      };
    }

    const travellers = await Traveller.find(filter)
      .populate("customer", "firstName lastName email phone")
      .populate("company", "name")
      .populate("owner", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Customer travellers fetched successfully",
      count: travellers.length,
      travellers
    });

  } catch (error) {
    console.error("Get Customer Travellers Error:", error);

    return res.status(500).json({
      message: "Failed to fetch customer travellers",
      error: error.message
    });
  }
};


// =====================================================
// UPDATE TRAVELLER
// PUT /api/travellers/:id
// =====================================================

const updateTraveller = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = getUserId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid traveller ID"
      });
    }

    const traveller = await Traveller.findById(id);

    if (!traveller) {
      return res.status(404).json({
        message: "Traveller not found"
      });
    }

    // ---------------------------------------------
    // Access control
    // ---------------------------------------------

    if (
      isSales(req) &&
      String(traveller.owner) !== String(userId)
    ) {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    if (isManager(req)) {
      const ownerUser = await User.findById(
        traveller.owner
      ).select("role isActive");

      if (
        !ownerUser ||
        ownerUser.role !== "sales" ||
        !ownerUser.isActive
      ) {
        return res.status(403).json({
          message: "Access denied"
        });
      }
    }

    // ---------------------------------------------
    // Customer cannot be changed to another customer
    // ---------------------------------------------

    if (req.body.customer) {
      if (!isValidObjectId(req.body.customer)) {
        return res.status(400).json({
          message: "Invalid customer ID"
        });
      }

      const customerExists = await Customer.findById(
        req.body.customer
      );

      if (!customerExists) {
        return res.status(404).json({
          message: "Customer not found"
        });
      }
    }

    // ---------------------------------------------
    // Date validation
    // ---------------------------------------------

    if (req.body.dateOfBirth) {
      const dob = new Date(req.body.dateOfBirth);

      if (Number.isNaN(dob.getTime())) {
        return res.status(400).json({
          message: "Invalid date of birth"
        });
      }

      if (dob > new Date()) {
        return res.status(400).json({
          message: "Date of birth cannot be in the future"
        });
      }
    }

    if (
      req.body.identityDocument?.issueDate &&
      req.body.identityDocument?.expiryDate
    ) {
      const issueDate = new Date(
        req.body.identityDocument.issueDate
      );

      const expiryDate = new Date(
        req.body.identityDocument.expiryDate
      );

      if (
        Number.isNaN(issueDate.getTime()) ||
        Number.isNaN(expiryDate.getTime())
      ) {
        return res.status(400).json({
          message: "Invalid identity document dates"
        });
      }

      if (expiryDate <= issueDate) {
        return res.status(400).json({
          message: "Identity document expiry date must be after issue date"
        });
      }
    }

    // ---------------------------------------------
    // Visa validation
    // ---------------------------------------------

    if (
      req.body.visaRequired === true &&
      req.body.visaStatus === "Not Required"
    ) {
      return res.status(400).json({
        message: "Visa status cannot be Not Required when visa is required"
      });
    }

    // ---------------------------------------------
    // Allowed fields
    // ---------------------------------------------

    const allowedFields = [
      "firstName",
      "lastName",
      "dateOfBirth",
      "gender",
      "nationality",
      "travellerType",
      "relationshipToCustomer",
      "phone",
      "email",
      "whatsapp",
      "customer",
      "company",
      "emergencyContact",
      "identityDocument",
      "visaRequired",
      "visaStatus",
      "status",
      "notes"
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        traveller[field] = req.body[field];
      }
    });

    // Owner change is restricted
    if (req.body.owner !== undefined) {
      if (!isAdmin(req) && !isManager(req)) {
        return res.status(403).json({
          message: "Only admin or manager can change traveller owner"
        });
      }

      if (!isValidObjectId(req.body.owner)) {
        return res.status(400).json({
          message: "Invalid owner ID"
        });
      }

      const newOwner = await User.findById(req.body.owner);

      if (!newOwner || !newOwner.isActive) {
        return res.status(400).json({
          message: "Owner must be an active user"
        });
      }

      if (!["admin", "manager", "sales"].includes(newOwner.role)) {
        return res.status(400).json({
          message: "Owner must be admin, manager or sales"
        });
      }

      if (
        isManager(req) &&
        newOwner.role !== "sales"
      ) {
        return res.status(403).json({
          message: "Manager can assign traveller only to sales users"
        });
      }

      traveller.owner = newOwner._id;
    }

    await traveller.save();

    const updatedTraveller = await Traveller.findById(
      traveller._id
    )
      .populate("customer", "firstName lastName email phone")
      .populate("company", "name")
      .populate("owner", "name email role");

    return res.status(200).json({
      message: "Traveller updated successfully",
      traveller: updatedTraveller
    });

  } catch (error) {
    console.error("Update Traveller Error:", error);

    return res.status(500).json({
      message: "Failed to update traveller",
      error: error.message
    });
  }
};


// =====================================================
// CHANGE TRAVELLER STATUS
// PUT /api/travellers/:id/status
// =====================================================

const updateTravellerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const userId = getUserId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid traveller ID"
      });
    }

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        message: "Status must be Active or Inactive"
      });
    }

    const traveller = await Traveller.findById(id);

    if (!traveller) {
      return res.status(404).json({
        message: "Traveller not found"
      });
    }

    if (
      isSales(req) &&
      String(traveller.owner) !== String(userId)
    ) {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    if (isManager(req)) {
      const ownerUser = await User.findById(
        traveller.owner
      ).select("role isActive");

      if (
        !ownerUser ||
        ownerUser.role !== "sales" ||
        !ownerUser.isActive
      ) {
        return res.status(403).json({
          message: "Access denied"
        });
      }
    }

    traveller.status = status;

    await traveller.save();

    return res.status(200).json({
      message: "Traveller status updated successfully",
      traveller
    });

  } catch (error) {
    console.error("Update Traveller Status Error:", error);

    return res.status(500).json({
      message: "Failed to update traveller status",
      error: error.message
    });
  }
};


// =====================================================
// DELETE TRAVELLER
// DELETE /api/travellers/:id
// =====================================================

const deleteTraveller = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid traveller ID"
      });
    }

    const traveller = await Traveller.findById(id);

    if (!traveller) {
      return res.status(404).json({
        message: "Traveller not found"
      });
    }

    // Hard delete only admin
    await Traveller.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Traveller deleted successfully"
    });

  } catch (error) {
    console.error("Delete Traveller Error:", error);

    return res.status(500).json({
      message: "Failed to delete traveller",
      error: error.message
    });
  }
};


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createTraveller,
  getTravellers,
  getTravellerById,
  getTravellersByCustomer,
  updateTraveller,
  updateTravellerStatus,
  deleteTraveller
};

