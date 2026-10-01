const mongoose = require("mongoose");

const Activity = require("../models/Activity");
const User = require("../models/User");
const Lead = require("../models/Lead");
const Contact = require("../models/Contact");
const Company = require("../models/Company");
const Trip = require("../models/Trip");
const Customer = require("../models/Customer");
const Booking = require("../models/Booking");

// =====================================================
// HELPERS
// =====================================================

const isValidId = (id) => {
  return id && mongoose.isValidObjectId(id);
};

// =====================================================
// VALIDATE RELATION
// =====================================================

const validateRelation = async (
  Model,
  id,
  fieldName
) => {
  if (!id) {
    return null;
  }

  if (!isValidId(id)) {
    throw new Error(
      `Invalid ${fieldName} ID`
    );
  }

  const document =
    await Model.findById(id);

  if (!document) {
    throw new Error(
      `${fieldName} not found`
    );
  }

  return document;
};

// =====================================================
// VALIDATE ACTIVITY RELATIONS
// =====================================================

const validateActivityRelations = async ({
  lead,
  customer,
  contact,
  company,
  trip,
  booking,
}) => {
  const [
    leadDoc,
    customerDoc,
    contactDoc,
    companyDoc,
    tripDoc,
    bookingDoc,
  ] = await Promise.all([
    validateRelation(
      Lead,
      lead,
      "Lead"
    ),

    validateRelation(
      Customer,
      customer,
      "Customer"
    ),

    validateRelation(
      Contact,
      contact,
      "Contact"
    ),

    validateRelation(
      Company,
      company,
      "Company"
    ),

    validateRelation(
      Trip,
      trip,
      "Trip"
    ),

    validateRelation(
      Booking,
      booking,
      "Booking"
    ),
  ]);

  // ===================================================
  // Lead ↔ Contact
  // ===================================================

  if (leadDoc && contactDoc) {
    if (
      !contactDoc.lead ||
      contactDoc.lead.toString() !==
        leadDoc._id.toString()
    ) {
      throw new Error(
        "Selected contact does not belong to the selected lead"
      );
    }
  }

  // ===================================================
  // Lead ↔ Company
  // ===================================================

  if (leadDoc && companyDoc) {
    if (
      !leadDoc.company ||
      leadDoc.company.toString() !==
        companyDoc._id.toString()
    ) {
      throw new Error(
        "Selected lead does not belong to the selected company"
      );
    }
  }

  // ===================================================
  // Contact ↔ Company
  // ===================================================

  if (contactDoc && companyDoc) {
    if (
      !contactDoc.company ||
      contactDoc.company.toString() !==
        companyDoc._id.toString()
    ) {
      throw new Error(
        "Selected contact does not belong to the selected company"
      );
    }
  }

  // ===================================================
  // Trip ↔ Lead
  // ===================================================

  if (tripDoc && leadDoc) {
    if (
      !tripDoc.lead ||
      tripDoc.lead.toString() !==
        leadDoc._id.toString()
    ) {
      throw new Error(
        "Selected trip does not belong to the selected lead"
      );
    }
  }

  // ===================================================
  // Trip ↔ Company
  // ===================================================

  if (tripDoc && companyDoc) {
    if (
      !tripDoc.company ||
      tripDoc.company.toString() !==
        companyDoc._id.toString()
    ) {
      throw new Error(
        "Selected trip does not belong to the selected company"
      );
    }
  }

  // ===================================================
  // Trip ↔ Customer
  // ===================================================

  if (tripDoc && customerDoc) {
    if (
      tripDoc.customer &&
      tripDoc.customer.toString() !==
        customerDoc._id.toString()
    ) {
      throw new Error(
        "Selected trip does not belong to the selected customer"
      );
    }
  }

  // ===================================================
  // Booking ↔ Customer
  // ===================================================

  if (bookingDoc && customerDoc) {
    if (
      bookingDoc.customer &&
      bookingDoc.customer.toString() !==
        customerDoc._id.toString()
    ) {
      throw new Error(
        "Selected booking does not belong to the selected customer"
      );
    }
  }

  return {
    lead: leadDoc,
    customer: customerDoc,
    contact: contactDoc,
    company: companyDoc,
    trip: tripDoc,
    booking: bookingDoc,
  };
};

// =====================================================
// POPULATE ACTIVITY
// =====================================================

const populateActivity = (query) => {
  return query
    .populate(
      "createdBy",
      "name email role"
    )
    .populate(
      "lead",
      "firstName lastName email phone status assignedTo company"
    )
    .populate(
      "customer",
      "name email phone owner"
    )
    .populate(
      "contact",
      "firstName lastName email phone designation owner company lead"
    )
    .populate(
      "company",
      "name industry email phone owner"
    )
    .populate(
      "trip",
      "title tripCode destination startDate endDate travelType status estimatedValue totalAmount totalCost profit customer company lead owner"
    )
    .populate(
      "booking",
      "bookingNumber customer enquiry quotation destination departure travelStartDate travelEndDate status totalAmount amountPaid amountDue paymentStatus salesOwner operationsOwner"
    );
};

// =====================================================
// GET ACTIVE SALES USER IDS
// =====================================================

const getActiveSalesUserIds = async () => {
  const salesUsers =
    await User.find({
      role: "sales",
      isActive: true,
    }).select("_id");

  return salesUsers.map(
    (user) => user._id
  );
};

// =====================================================
// GET SALES RELATED RECORD IDS
// =====================================================

const getSalesRelatedActivityIds =
  async (userId) => {
    const [
      userLeads,
      userContacts,
      userCompanies,
      userTrips,
      userCustomers,
      userBookings,
    ] = await Promise.all([
      Lead.find({
        assignedTo: userId,
      }).select("_id"),

      Contact.find({
        owner: userId,
      }).select("_id"),

      Company.find({
        owner: userId,
      }).select("_id"),

      Trip.find({
        owner: userId,
      }).select("_id"),

      Customer.find({
        owner: userId,
      }).select("_id"),

      Booking.find({
        $or: [
          {
            salesOwner: userId,
          },
          {
            createdBy: userId,
          },
        ],
      }).select("_id"),
    ]);

    return {
      leadIds:
        userLeads.map(
          (item) => item._id
        ),

      contactIds:
        userContacts.map(
          (item) => item._id
        ),

      companyIds:
        userCompanies.map(
          (item) => item._id
        ),

      tripIds:
        userTrips.map(
          (item) => item._id
        ),

      customerIds:
        userCustomers.map(
          (item) => item._id
        ),

      bookingIds:
        userBookings.map(
          (item) => item._id
        ),
    };
  };

// =====================================================
// CHECK SALES ACCESS
// =====================================================

const canSalesAccessActivity = (
  activity,
  userId
) => {
  const currentUserId =
    userId.toString();

  if (
    activity.createdBy?._id?.toString() ===
    currentUserId
  ) {
    return true;
  }

  if (
    activity.lead?.assignedTo?.toString() ===
    currentUserId
  ) {
    return true;
  }

  if (
    activity.contact?.owner?.toString() ===
    currentUserId
  ) {
    return true;
  }

  if (
    activity.company?.owner?.toString() ===
    currentUserId
  ) {
    return true;
  }

  if (
    activity.trip?.owner?.toString() ===
    currentUserId
  ) {
    return true;
  }

  if (
    activity.customer?.owner?.toString() ===
    currentUserId
  ) {
    return true;
  }

  if (
    activity.booking?.salesOwner?.toString() ===
    currentUserId
  ) {
    return true;
  }

  return false;
};

// =====================================================
// CREATE ACTIVITY
// =====================================================

const createActivity = async (
  req,
  res
) => {
  try {
    const {
      type,
      title,
      description,
      activityDate,
      outcome,
      lead,
      customer,
      contact,
      company,
      trip,
      booking,
      notes,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        message:
          "Activity title is required",
      });
    }

    if (!type) {
      return res.status(400).json({
        message:
          "Activity type is required",
      });
    }

    await validateActivityRelations({
      lead,
      customer,
      contact,
      company,
      trip,
      booking,
    });

    const activity =
      await Activity.create({
        type,

        title:
          title.trim(),

        description:
          description || "",

        activityDate:
          activityDate || new Date(),

        outcome:
          outcome || "Completed",

        createdBy:
          req.user.id,

        lead:
          lead || null,

        customer:
          customer || null,

        contact:
          contact || null,

        company:
          company || null,

        trip:
          trip || null,

        booking:
          booking || null,

        notes:
          notes || "",
      });

    const populatedActivity =
      await populateActivity(
        Activity.findById(
          activity._id
        )
      );

    return res.status(201).json({
      message:
        "Activity created successfully",

      activity:
        populatedActivity,
    });
  } catch (error) {
    console.error(
      "Create activity error:",
      error
    );

    return res.status(400).json({
      message:
        error.message ||
        "Failed to create activity",
    });
  }
};

// =====================================================
// GET ACTIVITIES
// =====================================================

const getActivities = async (
  req,
  res
) => {
  try {
    const {
      search = "",
      type = "",
      outcome = "",
      createdBy = "",
      lead = "",
      customer = "",
      contact = "",
      company = "",
      trip = "",
      booking = "",

      page = 1,
      limit = 50,

      sortBy = "activityDate",
      sortOrder = "desc",
    } = req.query;

    const filter = {};

    // SEARCH

    if (search.trim()) {
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

    // TYPE

    if (type) {
      filter.type = type;
    }

    // OUTCOME

    if (outcome) {
      filter.outcome = outcome;
    }

    // CREATED BY

    if (createdBy) {
      if (!isValidId(createdBy)) {
        return res.status(400).json({
          message:
            "Invalid createdBy ID",
        });
      }

      filter.createdBy =
        createdBy;
    }

    // LEAD

    if (lead) {
      if (!isValidId(lead)) {
        return res.status(400).json({
          message:
            "Invalid lead ID",
        });
      }

      filter.lead = lead;
    }

    // CUSTOMER

    if (customer) {
      if (!isValidId(customer)) {
        return res.status(400).json({
          message:
            "Invalid customer ID",
        });
      }

      filter.customer =
        customer;
    }

    // CONTACT

    if (contact) {
      if (!isValidId(contact)) {
        return res.status(400).json({
          message:
            "Invalid contact ID",
        });
      }

      filter.contact =
        contact;
    }

    // COMPANY

    if (company) {
      if (!isValidId(company)) {
        return res.status(400).json({
          message:
            "Invalid company ID",
        });
      }

      filter.company =
        company;
    }

    // TRIP

    if (trip) {
      if (!isValidId(trip)) {
        return res.status(400).json({
          message:
            "Invalid trip ID",
        });
      }

      filter.trip =
        trip;
    }

    // BOOKING

    if (booking) {
      if (!isValidId(booking)) {
        return res.status(400).json({
          message:
            "Invalid booking ID",
        });
      }

      filter.booking =
        booking;
    }

    // SALES ACCESS

    if (
      req.user.role ===
      "sales"
    ) {
      const userId =
        req.user.id;

      const {
        leadIds,
        contactIds,
        companyIds,
        tripIds,
        customerIds,
        bookingIds,
      } =
        await getSalesRelatedActivityIds(
          userId
        );

      filter.$and =
        filter.$and || [];

      filter.$and.push({
        $or: [
          {
            createdBy:
              userId,
          },

          {
            lead: {
              $in: leadIds,
            },
          },

          {
            contact: {
              $in:
                contactIds,
            },
          },

          {
            company: {
              $in:
                companyIds,
            },
          },

          {
            trip: {
              $in:
                tripIds,
            },
          },

          {
            customer: {
              $in:
                customerIds,
            },
          },

          {
            booking: {
              $in:
                bookingIds,
            },
          },
        ],
      });
    }

    // MANAGER ACCESS

    if (
      req.user.role ===
      "manager"
    ) {
      const salesUserIds =
        await getActiveSalesUserIds();

      filter.$and =
        filter.$and || [];

      const [
        salesLeadIds,
        salesContactIds,
        salesCompanyIds,
        salesTripIds,
        salesCustomerIds,
        salesBookingIds,
      ] = await Promise.all([
        Lead.find({
          assignedTo: {
            $in:
              salesUserIds,
          },
        }).distinct("_id"),

        Contact.find({
          owner: {
            $in:
              salesUserIds,
          },
        }).distinct("_id"),

        Company.find({
          owner: {
            $in:
              salesUserIds,
          },
        }).distinct("_id"),

        Trip.find({
          owner: {
            $in:
              salesUserIds,
          },
        }).distinct("_id"),

        Customer.find({
          owner: {
            $in:
              salesUserIds,
          },
        }).distinct("_id"),

        Booking.find({
          salesOwner: {
            $in:
              salesUserIds,
          },
        }).distinct("_id"),
      ]);

      filter.$and.push({
        $or: [
          {
            createdBy: {
              $in:
                salesUserIds,
            },
          },

          {
            lead: {
              $in:
                salesLeadIds,
            },
          },

          {
            contact: {
              $in:
                salesContactIds,
            },
          },

          {
            company: {
              $in:
                salesCompanyIds,
            },
          },

          {
            trip: {
              $in:
                salesTripIds,
            },
          },

          {
            customer: {
              $in:
                salesCustomerIds,
            },
          },

          {
            booking: {
              $in:
                salesBookingIds,
            },
          },
        ],
      });
    }

    // PAGINATION

    const currentPage =
      Math.max(
        Number(page) || 1,
        1
      );

    const pageLimit =
      Math.min(
        Math.max(
          Number(limit) || 50,
          1
        ),
        50
      );

    const skip =
      (currentPage - 1) *
      pageLimit;

    // SORT

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "activityDate",
      "title",
      "type",
      "outcome",
    ];

    const safeSortField =
      allowedSortFields.includes(
        sortBy
      )
        ? sortBy
        : "activityDate";

    const sortDirection =
      sortOrder === "asc"
        ? 1
        : -1;

    // FETCH

    const [
      activities,
      total,
    ] = await Promise.all([
      populateActivity(
        Activity.find(filter)
          .sort({
            [safeSortField]:
              sortDirection,
          })
          .skip(skip)
          .limit(pageLimit)
      ),

      Activity.countDocuments(
        filter
      ),
    ]);

    const totalPages =
      Math.ceil(
        total /
          pageLimit
      );

    const hasNextPage =
      currentPage <
      totalPages;

    const hasPreviousPage =
      currentPage >
      1;

    return res.status(200).json({
      message:
        "Activities fetched successfully",

      count:
        activities.length,

      total,

      page:
        currentPage,

      limit:
        pageLimit,

      totalPages,

      hasNextPage,

      hasPreviousPage,

      activities,
    });
  } catch (error) {
    console.error(
      "Get activities error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch activities",

      error:
        error.message,
    });
  }
};

// =====================================================
// GET SINGLE ACTIVITY
// =====================================================

const getActivityById = async (
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
          "Invalid activity ID",
      });
    }

    const activity =
      await populateActivity(
        Activity.findById(
          req.params.id
        )
      );

    if (!activity) {
      return res.status(404).json({
        message:
          "Activity not found",
      });
    }

    if (
      req.user.role ===
      "sales"
    ) {
      const allowed =
        canSalesAccessActivity(
          activity,
          req.user.id
        );

      if (!allowed) {
        return res.status(403).json({
          message:
            "Access denied",
        });
      }
    }

    if (
      req.user.role ===
      "manager"
    ) {
      const salesUserIds =
        await getActiveSalesUserIds();

      const createdById =
        activity.createdBy?._id?.toString();

      const hasAccess =
        createdById &&
        salesUserIds.some(
          (id) =>
            id.toString() ===
            createdById
        );

      if (!hasAccess) {
        return res.status(403).json({
          message:
            "Managers can only access Sales team activities",
        });
      }
    }

    return res.status(200).json({
      message:
        "Activity fetched successfully",

      activity,
    });
  } catch (error) {
    console.error(
      "Get activity error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch activity",
    });
  }
};

// =====================================================
// UPDATE ACTIVITY
// =====================================================

const updateActivity = async (
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
          "Invalid activity ID",
      });
    }

    const activity =
      await Activity.findById(
        req.params.id
      );

    if (!activity) {
      return res.status(404).json({
        message:
          "Activity not found",
      });
    }

    if (
      req.user.role ===
        "sales" &&
      activity.createdBy.toString() !==
        req.user.id.toString()
    ) {
      return res.status(403).json({
        message:
          "Sales users can only update activities created by themselves",
      });
    }

    if (
      req.user.role ===
      "manager"
    ) {
      const creator =
        await User.findOne({
          _id:
            activity.createdBy,

          role:
            "sales",

          isActive:
            true,
        });

      if (!creator) {
        return res.status(403).json({
          message:
            "Managers can only update Sales team activities",
        });
      }
    }

    const {
      type,
      title,
      description,
      activityDate,
      outcome,
      lead,
      customer,
      contact,
      company,
      trip,
      booking,
      notes,
    } = req.body;

    if (title !== undefined) {
      if (
        typeof title !==
          "string" ||
        !title.trim()
      ) {
        return res.status(400).json({
          message:
            "Activity title cannot be empty",
        });
      }

      activity.title =
        title.trim();
    }

    if (type !== undefined) {
      activity.type =
        type;
    }

    if (
      description !==
      undefined
    ) {
      activity.description =
        description;
    }

    if (
      activityDate !==
      undefined
    ) {
      activity.activityDate =
        activityDate;
    }

    if (
      outcome !==
      undefined
    ) {
      activity.outcome =
        outcome;
    }

    if (notes !== undefined) {
      activity.notes =
        notes;
    }

    const finalLead =
      lead !== undefined
        ? lead
        : activity.lead;

    const finalCustomer =
      customer !== undefined
        ? customer
        : activity.customer;

    const finalContact =
      contact !== undefined
        ? contact
        : activity.contact;

    const finalCompany =
      company !== undefined
        ? company
        : activity.company;

    const finalTrip =
      trip !== undefined
        ? trip
        : activity.trip;

    const finalBooking =
      booking !== undefined
        ? booking
        : activity.booking;

    await validateActivityRelations({
      lead:
        finalLead,

      customer:
        finalCustomer,

      contact:
        finalContact,

      company:
        finalCompany,

      trip:
        finalTrip,

      booking:
        finalBooking,
    });

    if (lead !== undefined) {
      activity.lead =
        lead || null;
    }

    if (
      customer !==
      undefined
    ) {
      activity.customer =
        customer || null;
    }

    if (
      contact !==
      undefined
    ) {
      activity.contact =
        contact || null;
    }

    if (
      company !==
      undefined
    ) {
      activity.company =
        company || null;
    }

    if (trip !== undefined) {
      activity.trip =
        trip || null;
    }

    if (
      booking !==
      undefined
    ) {
      activity.booking =
        booking || null;
    }

    await activity.save();

    const updatedActivity =
      await populateActivity(
        Activity.findById(
          activity._id
        )
      );

    return res.status(200).json({
      message:
        "Activity updated successfully",

      activity:
        updatedActivity,
    });
  } catch (error) {
    console.error(
      "Update activity error:",
      error
    );

    return res.status(400).json({
      message:
        error.message ||
        "Failed to update activity",
    });
  }
};

// =====================================================
// DELETE ACTIVITY
// =====================================================

const deleteActivity = async (
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
          "Invalid activity ID",
      });
    }

    const activity =
      await Activity.findById(
        req.params.id
      );

    if (!activity) {
      return res.status(404).json({
        message:
          "Activity not found",
      });
    }

    if (
      req.user.role !==
      "admin"
    ) {
      return res.status(403).json({
        message:
          "Only admin can delete activities",
      });
    }

    await Activity.findByIdAndDelete(
      req.params.id
    );

    return res.status(200).json({
      message:
        "Activity deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete activity error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to delete activity",
    });
  }
};

// =====================================================
// ACTIVITY USERS
// =====================================================

const getActivityUsers = async (
  req,
  res
) => {
  try {
    const users =
      await User.find({
        isActive: true,

        role: {
          $in: [
            "admin",
            "manager",
            "sales",
          ],
        },
      })
        .select(
          "name email role isActive"
        )
        .sort({
          name: 1,
        });

    return res.status(200).json({
      message:
        "Users fetched successfully",

      count:
        users.length,

      users,
    });
  } catch (error) {
    console.error(
      "Get activity users error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch users",
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  getActivityUsers,
};