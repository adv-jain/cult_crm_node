const mongoose = require("mongoose");

const Lead = require("../models/Lead");
const User = require("../models/User");
const Enquiry = require("../models/Enquiry");

const {
  createLeadAssignedNotification,
  createNotification,
} = require("../services/notificationService");

// =====================================================
// HELPER - ASSIGNMENT VALIDATION
// =====================================================

const validateAssignedUser = async ({
  assignedTo,
  currentUser,
}) => {
  if (!assignedTo) {
    return {
      error: null,
      assignedUserId: currentUser.id,
    };
  }

  if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
    return {
      error: {
        status: 400,
        message: "Invalid assigned user ID",
      },
    };
  }

  const assignedUser = await User.findOne({
    _id: assignedTo,
    isActive: true,
  });

  if (!assignedUser) {
    return {
      error: {
        status: 400,
        message: "Assigned user not found or inactive",
      },
    };
  }

  // Manager → only Sales
  if (
    currentUser.role === "manager" &&
    assignedUser.role !== "sales"
  ) {
    return {
      error: {
        status: 403,
        message:
          "Manager can assign leads only to Sales users",
      },
    };
  }

  // Admin → Admin / Manager / Sales
  if (
    currentUser.role === "admin" &&
    !["admin", "manager", "sales"].includes(
      assignedUser.role
    )
  ) {
    return {
      error: {
        status: 400,
        message:
          "Leads can only be assigned to Admin, Manager or Sales users",
      },
    };
  }

  return {
    error: null,
    assignedUserId: assignedUser._id,
  };
};

// =====================================================
// CREATE LEAD
// =====================================================

const createLead = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      destination,
      source,
      priority,
      assignedTo,
      notes,
    } = req.body;

    // =================================================
    // BASIC VALIDATION
    // =================================================

    if (!firstName || !String(firstName).trim()) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    if (!phone && !email) {
      return res.status(400).json({
        message: "Phone or email is required",
      });
    }

    if (email && !String(email).trim()) {
      return res.status(400).json({
        message: "Email cannot be empty",
      });
    }

    if (!destination || !String(destination).trim()) {
      return res.status(400).json({
        message: "Destination is required",
      });
    }

    // =================================================
    // ASSIGNMENT
    // =================================================

    let finalAssignedTo = req.user.id;

    if (
      req.user.role === "admin" ||
      req.user.role === "manager"
    ) {
      const assignment = await validateAssignedUser({
        assignedTo,
        currentUser: req.user,
      });

      if (assignment.error) {
        return res.status(
          assignment.error.status
        ).json({
          message: assignment.error.message,
        });
      }

      finalAssignedTo = assignment.assignedUserId;
    }

    // =================================================
    // CREATE LEAD
    // =================================================

    const lead = await Lead.create({
      firstName: String(firstName).trim(),

      lastName: lastName
        ? String(lastName).trim()
        : "",

      email: email
        ? String(email).toLowerCase().trim()
        : "",

      phone: phone
        ? String(phone).trim()
        : "",

      destination: String(destination).trim(),

      source:
        source || "Website",

      status: "New",

      priority:
        priority || "Medium",

      assignedTo: finalAssignedTo,

      notes: notes
        ? String(notes).trim()
        : "",

      isConverted: false,
    });

    // =================================================
    // ASSIGNMENT NOTIFICATION
    // =================================================

    if (lead.assignedTo) {
      await createLeadAssignedNotification({
        recipient: lead.assignedTo,
        lead: lead._id,
        leadName:
          `${lead.firstName} ${
            lead.lastName || ""
          }`.trim(),
      });
    }

    // =================================================
    // POPULATE
    // =================================================

    const populatedLead =
      await Lead.findById(lead._id)
        .populate(
          "assignedTo",
          "name email role"
        );

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(201).json({
      message: "Lead created successfully",
      lead: populatedLead,
    });
  } catch (error) {
    console.error(
      "Create Lead Error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// =====================================================
// GET LEADS
// =====================================================

const getLeads = async (req, res) => {
  try {
    const {
      status,
      source,
      priority,
      destination,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    // =================================================
    // PAGINATION
    // =================================================

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

    // =================================================
    // BASE FILTER
    // =================================================

    const filter = {
      isConverted: {
        $ne: true,
      },
    };

    // =================================================
    // ROLE ACCESS
    // =================================================

    if (req.user.role === "manager") {
      const salesUsers = await User.find({
        role: "sales",
        isActive: true,
      }).select("_id");

      filter.assignedTo = {
        $in: salesUsers.map(
          (user) => user._id
        ),
      };
    }

    if (req.user.role === "sales") {
      filter.assignedTo = req.user.id;
    }

    // =================================================
    // FILTERS
    // =================================================

    if (status) {
      filter.status = status;
    }

    if (source) {
      filter.source = source;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (destination) {
      filter.destination = {
        $regex: destination,
        $options: "i",
      };
    }

    // =================================================
    // SEARCH
    // =================================================

    if (search) {
      filter.$or = [
        {
          firstName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          lastName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: search,
            $options: "i",
          },
        },
        {
          destination: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // =================================================
    // COUNT
    // =================================================

    const total =
      await Lead.countDocuments(filter);

    // =================================================
    // FETCH
    // =================================================

    const leads =
      await Lead.find(filter)
        .populate(
          "assignedTo",
          "name email role"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(recordsPerPage);

    // =================================================
    // PAGINATION
    // =================================================

    const totalPages =
      Math.ceil(
        total /
          recordsPerPage
      );

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      message: "Leads fetched successfully",
      count: leads.length,
      total,
      page: currentPage,
      limit: recordsPerPage,
      totalPages,
      hasNextPage:
        currentPage < totalPages,
      hasPreviousPage:
        currentPage > 1,
      leads,
    });
  } catch (error) {
    console.error(
      "Get Leads Error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE LEAD
// =====================================================

const updateLead = async (req, res) => {
  try {
    // =================================================
    // VALIDATE ID
    // =================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        message: "Invalid lead ID",
      });
    }

    const lead =
      await Lead.findById(
        req.params.id
      );

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found",
      });
    }

    // =================================================
    // CONVERTED LEAD
    // =================================================

    if (lead.isConverted) {
      return res.status(400).json({
        message:
          "Converted leads cannot be updated from Leads",
      });
    }

    // =================================================
    // SALES ACCESS
    // =================================================

    if (
      req.user.role === "sales" &&
      String(lead.assignedTo) !==
        String(req.user.id)
    ) {
      return res.status(403).json({
        message:
          "You can update only your assigned leads",
      });
    }

    // =================================================
    // MANAGER ACCESS
    // =================================================

    if (req.user.role === "manager") {
      const assignedUser =
        await User.findById(
          lead.assignedTo
        );

      if (
        !assignedUser ||
        assignedUser.role !== "sales"
      ) {
        return res.status(403).json({
          message:
            "Manager can update only Sales leads",
        });
      }
    }

    // =================================================
    // COPY BODY
    // =================================================

    const updateData = {
      ...req.body,
    };

    // =================================================
    // SALES CANNOT CHANGE ASSIGNMENT
    // =================================================

    if (req.user.role === "sales") {
      delete updateData.assignedTo;
    }

    // =================================================
    // PROTECT SYSTEM FIELDS
    // =================================================

    delete updateData.isConverted;
    delete updateData.convertedAt;
    delete updateData.convertedCustomer;
    delete updateData.convertedContact;

    // =================================================
    // NORMALIZE NAME
    // =================================================

    if (
      updateData.firstName !== undefined
    ) {
      if (
        !String(
          updateData.firstName
        ).trim()
      ) {
        return res.status(400).json({
          message: "Name cannot be empty",
        });
      }

      updateData.firstName =
        String(
          updateData.firstName
        ).trim();
    }

    if (
      updateData.lastName !== undefined
    ) {
      updateData.lastName =
        String(
          updateData.lastName || ""
        ).trim();
    }

    // =================================================
    // NORMALIZE EMAIL
    // =================================================

    if (
      updateData.email !== undefined
    ) {
      updateData.email =
        String(
          updateData.email || ""
        )
          .toLowerCase()
          .trim();
    }

    // =================================================
    // NORMALIZE PHONE
    // =================================================

    if (
      updateData.phone !== undefined
    ) {
      updateData.phone =
        String(
          updateData.phone || ""
        ).trim();
    }

    // =================================================
    // PHONE / EMAIL VALIDATION
    // =================================================

    const finalPhone =
      updateData.phone !== undefined
        ? updateData.phone
        : lead.phone;

    const finalEmail =
      updateData.email !== undefined
        ? updateData.email
        : lead.email;

    if (!finalPhone && !finalEmail) {
      return res.status(400).json({
        message:
          "Phone or email is required",
      });
    }

    // =================================================
    // DESTINATION
    // =================================================

    if (
      updateData.destination !== undefined
    ) {
      if (
        !String(
          updateData.destination
        ).trim()
      ) {
        return res.status(400).json({
          message:
            "Destination cannot be empty",
        });
      }

      updateData.destination =
        String(
          updateData.destination
        ).trim();
    }

    // =================================================
    // NOTES
    // =================================================

    if (
      updateData.notes !== undefined
    ) {
      updateData.notes =
        String(
          updateData.notes || ""
        ).trim();
    }

    // =================================================
    // ASSIGNMENT
    // =================================================

    if (
      updateData.assignedTo !== undefined
    ) {
      const assignment =
        await validateAssignedUser({
          assignedTo:
            updateData.assignedTo,
          currentUser: req.user,
        });

      if (assignment.error) {
        return res.status(
          assignment.error.status
        ).json({
          message:
            assignment.error.message,
        });
      }

      updateData.assignedTo =
        assignment.assignedUserId;
    }

    // =================================================
    // STORE PREVIOUS ASSIGNEE
    // =================================================

    const previousAssignedTo =
      lead.assignedTo
        ? String(lead.assignedTo)
        : null;

    // =================================================
    // UPDATE
    // =================================================

    Object.assign(
      lead,
      updateData
    );

    const updatedLead =
      await lead.save();

    // =================================================
    // NEW ASSIGNEE
    // =================================================

    const newAssignedTo =
      updatedLead.assignedTo
        ? String(
            updatedLead.assignedTo
          )
        : null;

    // =================================================
    // NOTIFICATION
    // =================================================

    if (
      previousAssignedTo &&
      newAssignedTo &&
      previousAssignedTo !==
        newAssignedTo
    ) {
      await createLeadAssignedNotification({
        recipient:
          updatedLead.assignedTo,
        lead:
          updatedLead._id,
        leadName:
          `${updatedLead.firstName} ${
            updatedLead.lastName || ""
          }`.trim(),
      });
    }

    // =================================================
    // POPULATE
    // =================================================

    const populatedLead =
      await Lead.findById(
        updatedLead._id
      ).populate(
        "assignedTo",
        "name email role"
      );

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      message:
        "Lead updated successfully",
      lead: populatedLead,
    });
  } catch (error) {
    console.error(
      "Update Lead Error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE LEAD
// =====================================================

const deleteLead = async (req, res) => {
  try {
    // =================================================
    // VALIDATE ID
    // =================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        message: "Invalid lead ID",
      });
    }

    const lead =
      await Lead.findById(
        req.params.id
      );

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found",
      });
    }

    // =================================================
    // CONVERTED LEAD
    // =================================================

    if (lead.isConverted) {
      return res.status(400).json({
        message:
          "Converted leads cannot be deleted",
      });
    }

    // =================================================
    // SALES CANNOT DELETE
    // =================================================

    if (req.user.role === "sales") {
      return res.status(403).json({
        message:
          "Sales users cannot delete leads",
      });
    }

    // =================================================
    // MANAGER ACCESS
    // =================================================

    if (req.user.role === "manager") {
      const assignedUser =
        await User.findById(
          lead.assignedTo
        );

      if (
        !assignedUser ||
        assignedUser.role !== "sales"
      ) {
        return res.status(403).json({
          message:
            "Manager can delete only Sales leads",
        });
      }
    }

    // =================================================
    // DELETE
    // =================================================

    await Lead.findByIdAndDelete(
      req.params.id
    );

    return res.status(200).json({
      message:
        "Lead deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Lead Error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// =====================================================
// GET SINGLE LEAD
// =====================================================

const getLeadById = async (req, res) => {
  try {
    // =================================================
    // VALIDATE ID
    // =================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        message: "Invalid lead ID",
      });
    }

    const lead =
      await Lead.findById(
        req.params.id
      ).populate(
        "assignedTo",
        "name email role"
      );

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found",
      });
    }

    // =================================================
    // SALES ACCESS
    // =================================================

    if (
      req.user.role === "sales" &&
      (
        !lead.assignedTo ||
        String(
          lead.assignedTo._id
        ) !==
          String(req.user.id)
      )
    ) {
      return res.status(403).json({
        message:
          "You can view only your assigned leads",
      });
    }

    // =================================================
    // MANAGER ACCESS
    // =================================================

    if (req.user.role === "manager") {
      if (
        !lead.assignedTo ||
        lead.assignedTo.role !== "sales"
      ) {
        return res.status(403).json({
          message:
            "Manager can view only Sales leads",
        });
      }
    }

    return res.status(200).json({
      message:
        "Lead fetched successfully",
      lead,
    });
  } catch (error) {
    console.error(
      "Get Lead By ID Error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
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

    // Manager → Sales only
    if (req.user.role === "manager") {
      filter.role = "sales";
    }

    // Admin → Admin / Manager / Sales
    else if (req.user.role === "admin") {
      filter.role = {
        $in: [
          "admin",
          "manager",
          "sales",
        ],
      };
    }

    // Sales → no assignment permission
    else {
      return res.status(403).json({
        message:
          "Sales users cannot assign leads",
      });
    }

    const users =
      await User.find(filter)
        .select(
          "_id name email role"
        )
        .sort({
          name: 1,
        });

    return res.status(200).json({
      message:
        "Assignable users fetched successfully",
      users,
    });
  } catch (error) {
    console.error(
      "Get Assignable Users Error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// =====================================================
// CREATE ENQUIRY FROM LEAD
//
// Lead
//   ↓
// Enquiry
//
// Customer / Contact are NOT created here.
// =====================================================

const convertLead = async (req, res) => {
  const session =
    await mongoose.startSession();

  try {
    session.startTransaction();

    // =================================================
    // VALIDATE LEAD ID
    // =================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Invalid lead ID",
      });
    }

    // =================================================
    // FIND LEAD
    // =================================================

    const lead =
      await Lead.findById(
        req.params.id
      ).session(session);

    if (!lead) {
      await session.abortTransaction();

      return res.status(404).json({
        message: "Lead not found",
      });
    }

    // =================================================
    // ACCESS
    // =================================================

    if (
      req.user.role === "sales" &&
      String(lead.assignedTo) !==
        String(req.user.id)
    ) {
      await session.abortTransaction();

      return res.status(403).json({
        message:
          "You can create enquiry only for your assigned leads",
      });
    }

    if (req.user.role === "manager") {
      const assignedUser =
        await User.findById(
          lead.assignedTo
        ).session(session);

      if (
        !assignedUser ||
        assignedUser.role !== "sales" ||
        !assignedUser.isActive
      ) {
        await session.abortTransaction();

        return res.status(403).json({
          message:
            "Manager can create enquiry only for active Sales leads",
        });
      }
    }

    // =================================================
    // ALREADY CONVERTED
    // =================================================

    if (lead.isConverted) {
      await session.abortTransaction();

      return res.status(400).json({
        message:
          "Enquiry has already been created for this lead",
        enquiryId:
          lead.convertedEnquiry || null,
      });
    }

    // =================================================
    // ASSIGNED USER
    // =================================================

    if (!lead.assignedTo) {
      await session.abortTransaction();

      return res.status(400).json({
        message:
          "Lead must be assigned to a user before creating enquiry",
      });
    }

    // =================================================
    // CREATE ENQUIRY
    // =================================================

    const enquiryData = {
  title:
    `${lead.firstName} ${
      lead.lastName || ""
    }`.trim(),

  lead:
    lead._id,

  assignedTo:
    lead.assignedTo,

  destination:
    lead.destination,

      source:
        lead.source || "Website",

      status:
        "New",

      priority:
        lead.priority || "Medium",

      quotationRequired:
        true,

      createdBy:
        req.user.id,

      notes:
        lead.notes || "",
    };

    const createdEnquiries =
      await Enquiry.create(
        [enquiryData],
        {
          session,
        }
      );

    const enquiry =
      createdEnquiries[0];

    // =================================================
    // MARK LEAD AS CONVERTED
    // =================================================

    lead.isConverted = true;

    lead.convertedAt =
      new Date();

    // Lead model may not have this field yet.
    // It will be added in the next Lead model update.
    lead.convertedEnquiry =
      enquiry._id;

    // Keep these fields for backward compatibility.
    lead.convertedCustomer =
      null;

    lead.convertedContact =
      null;

    // Lead is no longer an active sales lead.
    lead.status = "Won";

    await lead.save({
      session,
    });

    // =================================================
    // COMMIT
    // =================================================

    await session.commitTransaction();

    // =================================================
    // NOTIFICATION
    // =================================================

    await createNotification({
      recipient:
        lead.assignedTo,

      type:
        "LEAD_CONVERTED",

      title:
        "Lead Converted to Enquiry",

      message:
        `${lead.firstName} ${
          lead.lastName || ""
        } has been converted into an Enquiry.`,

      relatedLead:
        lead._id,

      metadata: {
        enquiryId:
          enquiry._id,
      },
    });

    // =================================================
    // POPULATE ENQUIRY
    // =================================================

    const populatedEnquiry =
      await Enquiry.findById(
        enquiry._id
      )
        .populate(
          "lead",
          "firstName lastName email phone destination"
        )
        .populate(
          "assignedTo",
          "name email role"
        );

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(201).json({
      message:
        "Enquiry created successfully",
      enquiry:
        populatedEnquiry,
    });
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (abortError) {
      console.error(
        "Transaction Abort Error:",
        abortError
      );
    }

    console.error(
      "Create Enquiry From Lead Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to create enquiry",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createLead,
  getLeads,
  updateLead,
  deleteLead,
  getLeadById,
  getAssignableUsers,
  convertLead,
};