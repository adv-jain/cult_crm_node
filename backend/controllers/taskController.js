const mongoose = require("mongoose");

const Task = require("../models/Task");
const User = require("../models/User");
const Lead = require("../models/Lead");
const Trip = require("../models/Trip");
const Contact = require("../models/Contact");
const Company = require("../models/Company");
const Customer = require("../models/Customer");
const Booking = require("../models/Booking");

const {
  createTaskAssignedNotification,
} = require("../services/notificationService");

// ========================================
// HELPER: VALIDATE OBJECT ID
// ========================================

const isValidId = (id) => {
  return (
    id &&
    mongoose.isValidObjectId(id)
  );
};

// ========================================
// HELPER: GET ACTIVE SALES USER IDS
// ========================================

const getActiveSalesUserIds =
  async () => {
    const salesUsers =
      await User.find({
        role: "sales",
        isActive: true,
      }).select("_id");

    return salesUsers.map(
      (user) => user._id
    );
  };

// ========================================
// HELPER: VALIDATE ASSIGNED USER
// ========================================

const validateAssignedUser =
  async (
    userId,
    currentUserRole
  ) => {
    if (!userId) {
      return {
        valid: false,
        message:
          "Assigned user is required",
      };
    }

    if (!isValidId(userId)) {
      return {
        valid: false,
        message:
          "Invalid assigned user ID",
      };
    }

    const user =
      await User.findOne({
        _id: userId,
        isActive: true,
      });

    if (!user) {
      return {
        valid: false,
        message:
          "Assigned user not found or inactive",
      };
    }

    if (
      currentUserRole ===
        "manager" &&
      user.role !== "sales"
    ) {
      return {
        valid: false,
        message:
          "Manager can assign tasks only to Sales users",
      };
    }

    return {
      valid: true,
      user,
    };
  };

// ========================================
// HELPER: VALIDATE CRM RECORD
// ========================================

const validateRelation =
  async (
    Model,
    id,
    fieldName
  ) => {
    if (!id) {
      return {
        valid: true,
        record: null,
      };
    }

    if (!isValidId(id)) {
      return {
        valid: false,
        message:
          `Invalid ${fieldName} ID`,
      };
    }

    const record =
      await Model.findById(id);

    if (!record) {
      return {
        valid: false,
        message:
          `${fieldName} not found`,
      };
    }

    return {
      valid: true,
      record,
    };
  };

// ========================================
// HELPER: VALIDATE TASK RELATIONSHIP
// ========================================

const validateTaskRelations =
  async ({
    relatedLead,
    relatedContact,
    relatedCompany,
    relatedTrip,
    relatedCustomer,
    relatedBooking,
  }) => {
    let lead = null;
    let contact = null;
    let company = null;
    let trip = null;
    let customer = null;
    let booking = null;

    // LEAD

    if (relatedLead) {
      const result =
        await validateRelation(
          Lead,
          relatedLead,
          "Related lead"
        );

      if (!result.valid) {
        return result;
      }

      lead = result.record;
    }

    // CONTACT

    if (relatedContact) {
      const result =
        await validateRelation(
          Contact,
          relatedContact,
          "Related contact"
        );

      if (!result.valid) {
        return result;
      }

      contact = result.record;
    }

    // COMPANY

    if (relatedCompany) {
      const result =
        await validateRelation(
          Company,
          relatedCompany,
          "Related company"
        );

      if (!result.valid) {
        return result;
      }

      company = result.record;
    }

    // TRIP

    if (relatedTrip) {
      const result =
        await validateRelation(
          Trip,
          relatedTrip,
          "Related trip"
        );

      if (!result.valid) {
        return result;
      }

      trip = result.record;
    }

    // CUSTOMER

    if (relatedCustomer) {
      const result =
        await validateRelation(
          Customer,
          relatedCustomer,
          "Related customer"
        );

      if (!result.valid) {
        return result;
      }

      customer = result.record;
    }

    // BOOKING

    if (relatedBooking) {
      const result =
        await validateRelation(
          Booking,
          relatedBooking,
          "Related booking"
        );

      if (!result.valid) {
        return result;
      }

      booking = result.record;
    }

    // LEAD ↔ CONTACT

    if (lead && contact) {
      if (
        !contact.lead ||
        contact.lead.toString() !==
          lead._id.toString()
      ) {
        return {
          valid: false,
          message:
            "Related contact does not belong to the selected lead",
        };
      }
    }

    // LEAD ↔ COMPANY

    if (lead && company) {
      if (
        !lead.company ||
        lead.company.toString() !==
          company._id.toString()
      ) {
        return {
          valid: false,
          message:
            "Related lead does not belong to the selected company",
        };
      }
    }

    // CONTACT ↔ COMPANY

    if (contact && company) {
      if (
        !contact.company ||
        contact.company.toString() !==
          company._id.toString()
      ) {
        return {
          valid: false,
          message:
            "Related contact does not belong to the selected company",
        };
      }
    }

    // TRIP ↔ LEAD

    if (trip && lead) {
      if (
        !trip.lead ||
        trip.lead.toString() !==
          lead._id.toString()
      ) {
        return {
          valid: false,
          message:
            "Related trip does not belong to the selected lead",
        };
      }
    }

    // TRIP ↔ COMPANY

    if (trip && company) {
      if (
        !trip.company ||
        trip.company.toString() !==
          company._id.toString()
      ) {
        return {
          valid: false,
          message:
            "Related trip does not belong to the selected company",
        };
      }
    }

    // TRIP ↔ CUSTOMER

    if (trip && customer) {
      if (
        trip.customer &&
        trip.customer.toString() !==
          customer._id.toString()
      ) {
        return {
          valid: false,
          message:
            "Related trip does not belong to the selected customer",
        };
      }
    }

    // BOOKING ↔ CUSTOMER

    if (booking && customer) {
      if (
        booking.customer &&
        booking.customer.toString() !==
          customer._id.toString()
      ) {
        return {
          valid: false,
          message:
            "Related booking does not belong to the selected customer",
        };
      }
    }

    return {
      valid: true,
      lead,
      contact,
      company,
      trip,
      customer,
      booking,
    };
  };

// ========================================
// CREATE TASK
// ========================================

const createTask = async (
  req,
  res
) => {
  try {
    const {
      title,
      description,
      type,
      assignedTo,
      dueDate,
      startDate,
      priority,
      status,
      reminder,
      relatedLead,
      relatedContact,
      relatedCompany,
      relatedTrip,
      relatedCustomer,
      relatedBooking,
      notes,
      tags,
    } = req.body;

    // BASIC VALIDATION

    if (
      !title ||
      !title.trim()
    ) {
      return res.status(400).json({
        message:
          "Task title is required",
      });
    }

    if (!dueDate) {
      return res.status(400).json({
        message:
          "Due date is required",
      });
    }

    // ASSIGNMENT

    let finalAssignedTo =
      assignedTo;

    if (
      req.user.role ===
      "sales"
    ) {
      finalAssignedTo =
        req.user.id;
    }

    const assignedUserValidation =
      await validateAssignedUser(
        finalAssignedTo,
        req.user.role
      );

    if (
      !assignedUserValidation.valid
    ) {
      return res.status(400).json({
        message:
          assignedUserValidation.message,
      });
    }

    // RELATION VALIDATION

    const relationValidation =
      await validateTaskRelations({
        relatedLead,
        relatedContact,
        relatedCompany,
        relatedTrip,
        relatedCustomer,
        relatedBooking,
      });

    if (
      !relationValidation.valid
    ) {
      return res.status(400).json({
        message:
          relationValidation.message,
      });
    }

    // CREATE TASK

    const task =
      await Task.create({
        title:
          title.trim(),

        description:
          description || "",

        type:
          type || "Follow-up",

        assignedTo:
          finalAssignedTo,

        createdBy:
          req.user.id,

        status:
          status || "Pending",

        priority:
          priority || "Medium",

        startDate:
          startDate || null,

        dueDate,

        reminder:
          reminder || {
            enabled: false,
            reminderAt: null,
          },

        relatedLead:
          relatedLead || null,

        relatedContact:
          relatedContact || null,

        relatedCompany:
          relatedCompany || null,

        relatedTrip:
          relatedTrip || null,

        relatedCustomer:
          relatedCustomer || null,

        relatedBooking:
          relatedBooking || null,

        notes:
          notes || "",

        tags:
          Array.isArray(tags)
            ? tags
            : [],
      });

    // NOTIFICATION

    try {
      await createTaskAssignedNotification({
        recipient:
          finalAssignedTo,

        task:
          task._id,

        taskTitle:
          task.title,
      });
    } catch (
      notificationError
    ) {
      console.error(
        "Task Assignment Notification Error:",
        notificationError
      );
    }

    // POPULATE

    const populatedTask =
      await Task.findById(
        task._id
      )
        .populate(
          "assignedTo",
          "name email role"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .populate(
          "relatedLead",
          "firstName lastName email"
        )
        .populate(
          "relatedContact",
          "firstName lastName email"
        )
        .populate(
          "relatedCompany",
          "name email"
        )
        .populate(
          "relatedTrip",
          "title tripCode destination startDate endDate travelType status estimatedValue totalAmount owner lead company customer"
        )
        .populate(
          "relatedCustomer",
          "name email phone owner"
        )
        .populate(
          "relatedBooking",
          "bookingNumber destination status totalAmount amountDue"
        );

    return res.status(201).json({
      message:
        "Task created successfully",

      task:
        populatedTask,
    });
  } catch (error) {
    console.error(
      "Create Task Error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error",
      error:
        error.message,
    });
  }
};

// ========================================
// GET ALL TASKS
// ========================================

const getTasks = async (
  req,
  res
) => {
  try {
    const {
      search,
      status,
      priority,
      assignedTo,
      type,

      page = 1,
      limit = 50,

      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = {};

    // ROLE FILTER

    if (
      req.user.role ===
      "sales"
    ) {
      filter.assignedTo =
        req.user.id;
    }

    if (
      req.user.role ===
      "manager"
    ) {
      const salesUserIds =
        await getActiveSalesUserIds();

      filter.assignedTo = {
        $in:
          salesUserIds,
      };
    }

    // ASSIGNEE FILTER

    if (assignedTo) {
      if (!isValidId(assignedTo)) {
        return res.status(400).json({
          message:
            "Invalid assigned user ID",
        });
      }

      if (
        req.user.role ===
        "sales"
      ) {
        if (
          assignedTo !==
          req.user.id
        ) {
          return res.status(403).json({
            message:
              "Sales users can only view their own tasks",
          });
        }
      }

      if (
        req.user.role ===
        "manager"
      ) {
        const assignedUser =
          await User.findOne({
            _id: assignedTo,
            role: "sales",
            isActive: true,
          });

        if (!assignedUser) {
          return res.status(403).json({
            message:
              "Manager can view only Sales users' tasks",
          });
        }
      }

      filter.assignedTo =
        assignedTo;
    }

    // FILTERS

    if (status) {
      filter.status =
        status;
    }

    if (priority) {
      filter.priority =
        priority;
    }

    if (type) {
      filter.type =
        type;
    }

    // SEARCH

    if (
      search &&
      search.trim()
    ) {
      filter.$or = [
        {
          title: {
            $regex:
              search.trim(),
            $options: "i",
          },
        },

        {
          description: {
            $regex:
              search.trim(),
            $options: "i",
          },
        },

        {
          notes: {
            $regex:
              search.trim(),
            $options: "i",
          },
        },
      ];
    }

    // PAGINATION

    const pageNumber =
      Math.max(
        parseInt(page) || 1,
        1
      );

    const limitNumber =
      Math.min(
        Math.max(
          parseInt(limit) || 50,
          1
        ),
        50
      );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    // SORT

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "dueDate",
      "priority",
      "status",
      "title",
    ];

    const safeSortBy =
      allowedSortFields.includes(
        sortBy
      )
        ? sortBy
        : "createdAt";

    const safeSortOrder =
      sortOrder === "asc"
        ? 1
        : -1;

    // FETCH

    const tasks =
      await Task.find(filter)
        .populate(
          "assignedTo",
          "name email role"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .populate(
          "relatedLead",
          "firstName lastName email"
        )
        .populate(
          "relatedContact",
          "firstName lastName email"
        )
        .populate(
          "relatedCompany",
          "name email"
        )
        .populate(
          "relatedTrip",
          "title tripCode destination startDate endDate travelType status estimatedValue totalAmount owner lead company customer"
        )
        .populate(
          "relatedCustomer",
          "name email phone owner"
        )
        .populate(
          "relatedBooking",
          "bookingNumber destination status totalAmount amountDue"
        )
        .sort({
          [safeSortBy]:
            safeSortOrder,
        })
        .skip(skip)
        .limit(limitNumber);

    const total =
      await Task.countDocuments(
        filter
      );

    const totalPages =
      Math.ceil(
        total /
          limitNumber
      );

    const hasNextPage =
      pageNumber <
      totalPages;

    const hasPreviousPage =
      pageNumber >
      1;

    return res.status(200).json({
      message:
        "Tasks fetched successfully",

      count:
        tasks.length,

      total,

      page:
        pageNumber,

      limit:
        limitNumber,

      totalPages,

      hasNextPage,

      hasPreviousPage,

      tasks,
    });
  } catch (error) {
    console.error(
      "Get Tasks Error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error",
      error:
        error.message,
    });
  }
};

// ========================================
// GET SINGLE TASK
// ========================================

const getTaskById = async (
  req,
  res
) => {
  try {
    if (
      !isValidId(
        req.params.id
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid task ID",
      });
    }

    const task =
      await Task.findById(
        req.params.id
      )
        .populate(
          "assignedTo",
          "name email role"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .populate(
          "relatedLead",
          "firstName lastName email"
        )
        .populate(
          "relatedContact",
          "firstName lastName email"
        )
        .populate(
          "relatedCompany",
          "name email"
        )
        .populate(
          "relatedTrip",
          "title tripCode destination startDate endDate travelType status estimatedValue totalAmount owner lead company customer"
        )
        .populate(
          "relatedCustomer",
          "name email phone owner"
        )
        .populate(
          "relatedBooking",
          "bookingNumber destination status totalAmount amountDue"
        );

    if (!task) {
      return res.status(404).json({
        message:
          "Task not found",
      });
    }

    if (
      req.user.role ===
        "sales" &&
      task.assignedTo?._id.toString() !==
        req.user.id
    ) {
      return res.status(403).json({
        message:
          "Access denied",
      });
    }

    if (
      req.user.role ===
        "manager" &&
      task.assignedTo?.role !==
        "sales"
    ) {
      return res.status(403).json({
        message:
          "Managers can only access Sales users' tasks",
      });
    }

    return res.status(200).json({
      message:
        "Task fetched successfully",

      task,
    });
  } catch (error) {
    console.error(
      "Get Task Error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error",
      error:
        error.message,
    });
  }
};

// ========================================
// UPDATE TASK
// ========================================

const updateTask = async (
  req,
  res
) => {
  try {
    if (
      !isValidId(
        req.params.id
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid task ID",
      });
    }

    const task =
      await Task.findById(
        req.params.id
      );

    if (!task) {
      return res.status(404).json({
        message:
          "Task not found",
      });
    }

    const previousAssignedTo =
      task.assignedTo
        ? task.assignedTo.toString()
        : null;

    // SALES ACCESS

    if (
      req.user.role ===
        "sales" &&
      task.assignedTo.toString() !==
        req.user.id
    ) {
      return res.status(403).json({
        message:
          "You can only update your assigned tasks",
      });
    }

    // MANAGER ACCESS

    if (
      req.user.role ===
      "manager"
    ) {
      const assignedUser =
        await User.findOne({
          _id:
            task.assignedTo,
          role:
            "sales",
          isActive:
            true,
        });

      if (!assignedUser) {
        return res.status(403).json({
          message:
            "Managers can only update Sales users' tasks",
        });
      }
    }

    const {
      title,
      description,
      type,
      assignedTo,
      dueDate,
      startDate,
      priority,
      status,
      reminder,
      relatedLead,
      relatedContact,
      relatedCompany,
      relatedTrip,
      relatedCustomer,
      relatedBooking,
      notes,
      tags,
    } = req.body;

    // BASIC FIELDS

    if (title !== undefined) {
      if (
        typeof title !==
          "string" ||
        !title.trim()
      ) {
        return res.status(400).json({
          message:
            "Task title cannot be empty",
        });
      }

      task.title =
        title.trim();
    }

    if (
      description !==
      undefined
    ) {
      task.description =
        description;
    }

    if (type !== undefined) {
      task.type =
        type;
    }

    if (
      dueDate !==
      undefined
    ) {
      task.dueDate =
        dueDate;
    }

    if (
      startDate !==
      undefined
    ) {
      task.startDate =
        startDate;
    }

    if (
      priority !==
      undefined
    ) {
      task.priority =
        priority;
    }

    if (
      status !==
      undefined
    ) {
      task.status =
        status;
    }

    if (
      reminder !==
      undefined
    ) {
      task.reminder =
        reminder;
    }

    if (notes !== undefined) {
      task.notes =
        notes;
    }

    if (tags !== undefined) {
      task.tags =
        Array.isArray(tags)
          ? tags
          : [];
    }

    // ASSIGNMENT

    if (
      assignedTo !==
      undefined
    ) {
      if (
        req.user.role ===
        "sales"
      ) {
        if (
          assignedTo !==
          req.user.id
        ) {
          return res.status(403).json({
            message:
              "Sales users cannot reassign tasks",
          });
        }
      } else {
        const assignedUserValidation =
          await validateAssignedUser(
            assignedTo,
            req.user.role
          );

        if (
          !assignedUserValidation.valid
        ) {
          return res.status(400).json({
            message:
              assignedUserValidation.message,
          });
        }

        task.assignedTo =
          assignedTo;
      }
    }

    // FINAL RELATIONS

    const finalRelatedLead =
      relatedLead !==
      undefined
        ? relatedLead
        : task.relatedLead;

    const finalRelatedContact =
      relatedContact !==
      undefined
        ? relatedContact
        : task.relatedContact;

    const finalRelatedCompany =
      relatedCompany !==
      undefined
        ? relatedCompany
        : task.relatedCompany;

    const finalRelatedTrip =
      relatedTrip !==
      undefined
        ? relatedTrip
        : task.relatedTrip;

    const finalRelatedCustomer =
      relatedCustomer !==
      undefined
        ? relatedCustomer
        : task.relatedCustomer;

    const finalRelatedBooking =
      relatedBooking !==
      undefined
        ? relatedBooking
        : task.relatedBooking;

    // VALIDATE RELATIONS

    const relationValidation =
      await validateTaskRelations({
        relatedLead:
          finalRelatedLead,

        relatedContact:
          finalRelatedContact,

        relatedCompany:
          finalRelatedCompany,

        relatedTrip:
          finalRelatedTrip,

        relatedCustomer:
          finalRelatedCustomer,

        relatedBooking:
          finalRelatedBooking,
      });

    if (
      !relationValidation.valid
    ) {
      return res.status(400).json({
        message:
          relationValidation.message,
      });
    }

    // UPDATE RELATIONS

    if (
      relatedLead !==
      undefined
    ) {
      task.relatedLead =
        relatedLead || null;
    }

    if (
      relatedContact !==
      undefined
    ) {
      task.relatedContact =
        relatedContact || null;
    }

    if (
      relatedCompany !==
      undefined
    ) {
      task.relatedCompany =
        relatedCompany || null;
    }

    if (
      relatedTrip !==
      undefined
    ) {
      task.relatedTrip =
        relatedTrip || null;
    }

    if (
      relatedCustomer !==
      undefined
    ) {
      task.relatedCustomer =
        relatedCustomer || null;
    }

    if (
      relatedBooking !==
      undefined
    ) {
      task.relatedBooking =
        relatedBooking || null;
    }

    // SAVE

    await task.save();

    const newAssignedTo =
      task.assignedTo
        ? task.assignedTo.toString()
        : null;

    const assignmentChanged =
      previousAssignedTo &&
      newAssignedTo &&
      previousAssignedTo !==
        newAssignedTo;

    // REASSIGNMENT NOTIFICATION

    if (
      assignmentChanged
    ) {
      try {
        await createTaskAssignedNotification({
          recipient:
            newAssignedTo,

          task:
            task._id,

          taskTitle:
            task.title,
        });
      } catch (
        notificationError
      ) {
        console.error(
          "Task Reassignment Notification Error:",
          notificationError
        );
      }
    }

    // POPULATE

    const updatedTask =
      await Task.findById(
        task._id
      )
        .populate(
          "assignedTo",
          "name email role"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .populate(
          "relatedLead",
          "firstName lastName email"
        )
        .populate(
          "relatedContact",
          "firstName lastName email"
        )
        .populate(
          "relatedCompany",
          "name email"
        )
        .populate(
          "relatedTrip",
          "title tripCode destination startDate endDate travelType status estimatedValue totalAmount owner lead company customer"
        )
        .populate(
          "relatedCustomer",
          "name email phone owner"
        )
        .populate(
          "relatedBooking",
          "bookingNumber destination status totalAmount amountDue"
        );

    return res.status(200).json({
      message:
        "Task updated successfully",

      task:
        updatedTask,
    });
  } catch (error) {
    console.error(
      "Update Task Error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error",
      error:
        error.message,
    });
  }
};

// ========================================
// DELETE TASK
// ========================================

const deleteTask = async (
  req,
  res
) => {
  try {
    if (
      !isValidId(
        req.params.id
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid task ID",
      });
    }

    const task =
      await Task.findById(
        req.params.id
      );

    if (!task) {
      return res.status(404).json({
        message:
          "Task not found",
      });
    }

    if (
      req.user.role !==
      "admin"
    ) {
      return res.status(403).json({
        message:
          "Only admin can delete tasks",
      });
    }

    await Task.findByIdAndDelete(
      req.params.id
    );

    return res.status(200).json({
      message:
        "Task deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Task Error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error",
    });
  }
};

// ========================================
// GET ASSIGNABLE USERS
// ========================================

const getAssignableUsers =
  async (req, res) => {
    try {
      const filter = {
        isActive: true,
      };

      if (
        req.user.role ===
        "admin"
      ) {
        filter.role = {
          $in: [
            "admin",
            "manager",
            "sales",
          ],
        };
      }

      if (
        req.user.role ===
        "manager"
      ) {
        filter.role =
          "sales";
      }

      const users =
        await User.find(
          filter
        )
          .select(
            "name email role isActive"
          )
          .sort({
            name: 1,
          });

      return res.status(200).json({
        message:
          "Assignable users fetched successfully",

        count:
          users.length,

        users,
      });
    } catch (error) {
      console.error(
        "Get Assignable Users Error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error",
      });
    }
  };

// ========================================
// EXPORT
// ========================================

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getAssignableUsers,
};