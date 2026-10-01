
const mongoose = require("mongoose");

const Commission = require("../models/Commission");
const Booking = require("../models/Booking");
const Customer = require("../models/Customer");
const Deal = require("../models/Trip");
const User = require("../models/User");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/*
|--------------------------------------------------------------------------
| Generate Commission Number
|--------------------------------------------------------------------------
| Example: COMM-2026-0001
|--------------------------------------------------------------------------
*/
const generateCommissionNumber = async (session) => {
  const year = new Date().getFullYear();
  const prefix = `COMM-${year}-`;

  const lastCommission = await Commission.findOne({
    commissionNumber: new RegExp(`^${prefix}`),
  })
    .sort({ commissionNumber: -1 })
    .select("commissionNumber")
    .session(session)
    .lean();

  let nextNumber = 1;

  if (lastCommission?.commissionNumber) {
    const lastNumber = parseInt(
      lastCommission.commissionNumber.replace(prefix, ""),
      10
    );

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

/*
|--------------------------------------------------------------------------
| Populate Commission
|--------------------------------------------------------------------------
*/
const populateCommission = (query) => {
  return query
    .populate("booking")
    .populate("trip")
    .populate("customer")
    .populate("salesPerson", "name email role")
    .populate("approvedBy", "name email role")
    .populate("createdBy", "name email role");
};

/*
|--------------------------------------------------------------------------
| CREATE COMMISSION
|--------------------------------------------------------------------------
*/
const createCommission = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      booking,
      trip = null,
      customer = null,
      salesPerson,
      commissionType = "Percentage",
      baseAmount = 0,
      percentage = 0,
      commissionAmount,
      currency = "INR",
      notes = "",
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Basic validation
    |--------------------------------------------------------------------------
    */

    if (!booking) {
      return res.status(400).json({
        message: "Booking is required",
      });
    }

    if (!isValidObjectId(booking)) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    if (!salesPerson) {
      return res.status(400).json({
        message: "Sales person is required",
      });
    }

    if (!isValidObjectId(salesPerson)) {
      return res.status(400).json({
        message: "Invalid sales person ID",
      });
    }

    if (trip && !isValidObjectId(trip)) {
      return res.status(400).json({
        message: "Invalid trip ID",
      });
    }

    if (customer && !isValidObjectId(customer)) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    if (!["Percentage", "Fixed"].includes(commissionType)) {
      return res.status(400).json({
        message: "Invalid commission type",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate numeric values
    |--------------------------------------------------------------------------
    */

    const parsedBaseAmount = Number(baseAmount);
    const parsedPercentage = Number(percentage);
    const parsedCommissionAmount = Number(commissionAmount);

    if (!Number.isFinite(parsedBaseAmount) || parsedBaseAmount < 0) {
      return res.status(400).json({
        message: "Base amount must be a valid positive number",
      });
    }

    if (
      !Number.isFinite(parsedPercentage) ||
      parsedPercentage < 0 ||
      parsedPercentage > 100
    ) {
      return res.status(400).json({
        message: "Percentage must be between 0 and 100",
      });
    }

    if (
      !Number.isFinite(parsedCommissionAmount) ||
      parsedCommissionAmount <= 0
    ) {
      return res.status(400).json({
        message: "Commission amount must be greater than 0",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Percentage calculation validation
    |--------------------------------------------------------------------------
    */

    if (commissionType === "Percentage") {
      const expectedAmount =
        Math.round(
          ((parsedBaseAmount * parsedPercentage) / 100) * 100
        ) / 100;

      if (Math.abs(expectedAmount - parsedCommissionAmount) > 0.01) {
        return res.status(400).json({
          message:
            "Commission amount does not match the base amount and percentage",
          expectedCommissionAmount: expectedAmount,
          receivedCommissionAmount: parsedCommissionAmount,
        });
      }
    }

    await session.withTransaction(async () => {
      /*
      |--------------------------------------------------------------------------
      | Validate Booking
      |--------------------------------------------------------------------------
      */

      const bookingData = await Booking.findById(booking)
        .session(session)
        .lean();

      if (!bookingData) {
        throw new Error("BOOKING_NOT_FOUND");
      }

      if (bookingData.status === "Cancelled") {
        throw new Error("BOOKING_CANCELLED");
      }

      /*
      |--------------------------------------------------------------------------
      | Validate Sales Person
      |--------------------------------------------------------------------------
      */

      const salesPersonData = await User.findById(salesPerson)
        .session(session)
        .lean();

      if (!salesPersonData) {
        throw new Error("SALES_PERSON_NOT_FOUND");
      }

      /*
      |--------------------------------------------------------------------------
      | Validate Customer
      |--------------------------------------------------------------------------
      */

      let customerId = customer;

      if (customerId) {
        const customerData = await Customer.findById(customerId)
          .session(session)
          .lean();

        if (!customerData) {
          throw new Error("CUSTOMER_NOT_FOUND");
        }

        if (
          bookingData.customer &&
          String(bookingData.customer) !== String(customerId)
        ) {
          throw new Error("CUSTOMER_BOOKING_MISMATCH");
        }
      } else if (bookingData.customer) {
        customerId = bookingData.customer;
      }

      /*
      |--------------------------------------------------------------------------
      | Validate Trip
      |--------------------------------------------------------------------------
      */

      if (trip) {
        const tripData = await Deal.findById(trip)
          .session(session)
          .lean();

        if (!tripData) {
          throw new Error("TRIP_NOT_FOUND");
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Prevent duplicate commission for same booking + salesperson
      |--------------------------------------------------------------------------
      */

      const existingCommission = await Commission.findOne({
        booking,
        salesPerson,
        status: {
          $nin: ["Cancelled"],
        },
      })
        .session(session)
        .lean();

      if (existingCommission) {
        throw new Error("DUPLICATE_COMMISSION");
      }

      /*
      |--------------------------------------------------------------------------
      | Generate Commission Number
      |--------------------------------------------------------------------------
      */

      const commissionNumber = await generateCommissionNumber(session);

      /*
      |--------------------------------------------------------------------------
      | Create Commission
      |--------------------------------------------------------------------------
      */

      const commission = new Commission({
        commissionNumber,
        booking,
        trip,
        customer: customerId,
        salesPerson,
        commissionType,
        baseAmount: parsedBaseAmount,
        percentage: commissionType === "Percentage"
          ? parsedPercentage
          : 0,
        commissionAmount: parsedCommissionAmount,
        currency,
        status: "Pending",
        notes,
        createdBy: req.user.id,
      });

      await commission.save({ session });

      /*
      |--------------------------------------------------------------------------
      | Store created ID for response
      |--------------------------------------------------------------------------
      */

      req.createdCommissionId = commission._id;
    });

    /*
    |--------------------------------------------------------------------------
    | Fetch populated commission
    |--------------------------------------------------------------------------
    */

    const commission = await populateCommission(
      Commission.findById(req.createdCommissionId)
    );

    return res.status(201).json({
      message: "Commission created successfully",
      commission,
    });
  } catch (error) {
    console.error("Create commission error:", error);

    const errorMessages = {
      BOOKING_NOT_FOUND: {
        status: 404,
        message: "Booking not found",
      },

      BOOKING_CANCELLED: {
        status: 400,
        message: "Commission cannot be created for a cancelled booking",
      },

      SALES_PERSON_NOT_FOUND: {
        status: 404,
        message: "Sales person not found",
      },

      CUSTOMER_NOT_FOUND: {
        status: 404,
        message: "Customer not found",
      },

      CUSTOMER_BOOKING_MISMATCH: {
        status: 400,
        message: "Customer does not belong to this booking",
      },

      TRIP_NOT_FOUND: {
        status: 404,
        message: "Trip not found",
      },

      DUPLICATE_COMMISSION: {
        status: 409,
        message: "Commission already exists for this booking and sales person",
      },
    };

    if (errorMessages[error.message]) {
      return res.status(errorMessages[error.message].status).json({
        message: errorMessages[error.message].message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Duplicate commission number",
      });
    }

    return res.status(500).json({
      message: "Failed to create commission",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL COMMISSIONS
|--------------------------------------------------------------------------
*/
const getCommissions = async (req, res) => {
  try {
    const {
      booking,
      trip,
      customer,
      salesPerson,
      status,
      commissionType,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const currentLimit = Math.min(
      Math.max(Number(limit) || 50, 1),
      100
    );

    const filter = {};

    /*
    |--------------------------------------------------------------------------
    | Filters
    |--------------------------------------------------------------------------
    */

    if (booking) {
      if (!isValidObjectId(booking)) {
        return res.status(400).json({
          message: "Invalid booking ID",
        });
      }

      filter.booking = booking;
    }

    if (trip) {
      if (!isValidObjectId(trip)) {
        return res.status(400).json({
          message: "Invalid trip ID",
        });
      }

      filter.trip = trip;
    }

    if (customer) {
      if (!isValidObjectId(customer)) {
        return res.status(400).json({
          message: "Invalid customer ID",
        });
      }

      filter.customer = customer;
    }

    if (salesPerson) {
      if (!isValidObjectId(salesPerson)) {
        return res.status(400).json({
          message: "Invalid sales person ID",
        });
      }

      filter.salesPerson = salesPerson;
    }

    if (status) {
      filter.status = status;
    }

    if (commissionType) {
      filter.commissionType = commissionType;
    }

    /*
    |--------------------------------------------------------------------------
    | Date Filter
    |--------------------------------------------------------------------------
    */

    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        const startDate = new Date(fromDate);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            message: "Invalid fromDate",
          });
        }

        startDate.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);

        if (Number.isNaN(endDate.getTime())) {
          return res.status(400).json({
            message: "Invalid toDate",
          });
        }

        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    if (search) {
      filter.$or = [
        {
          commissionNumber: {
            $regex: search,
            $options: "i",
          },
        },
        {
          paymentReference: {
            $regex: search,
            $options: "i",
          },
        },
        {
          notes: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const skip = (currentPage - 1) * currentLimit;

    const [commissions, total] = await Promise.all([
      populateCommission(
        Commission.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(currentLimit)
      ),

      Commission.countDocuments(filter),
    ]);

    /*
    |--------------------------------------------------------------------------
    | Summary
    |--------------------------------------------------------------------------
    */

    const summary = await Commission.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: null,

          totalCommissionAmount: {
            $sum: "$commissionAmount",
          },

          paidCommissionAmount: {
            $sum: {
              $cond: [
                {
                  $eq: ["$status", "Paid"],
                },
                "$commissionAmount",
                0,
              ],
            },
          },

          payableCommissionAmount: {
            $sum: {
              $cond: [
                {
                  $eq: ["$status", "Payable"],
                },
                "$commissionAmount",
                0,
              ],
            },
          },

          pendingCommissionAmount: {
            $sum: {
              $cond: [
                {
                  $eq: ["$status", "Pending"],
                },
                "$commissionAmount",
                0,
              ],
            },
          },
        },
      },
    ]);

    const summaryData = summary[0] || {
      totalCommissionAmount: 0,
      paidCommissionAmount: 0,
      payableCommissionAmount: 0,
      pendingCommissionAmount: 0,
    };

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(total / currentLimit);

    return res.status(200).json({
      message: "Commissions fetched successfully",
      count: commissions.length,
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      totalCommissionAmount:
        summaryData.totalCommissionAmount,
      paidCommissionAmount:
        summaryData.paidCommissionAmount,
      payableCommissionAmount:
        summaryData.payableCommissionAmount,
      pendingCommissionAmount:
        summaryData.pendingCommissionAmount,
      commissions,
    });
  } catch (error) {
    console.error("Get commissions error:", error);

    return res.status(500).json({
      message: "Failed to fetch commissions",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET COMMISSION BY ID
|--------------------------------------------------------------------------
*/
const getCommissionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid commission ID",
      });
    }

    const commission = await populateCommission(
      Commission.findById(id)
    );

    if (!commission) {
      return res.status(404).json({
        message: "Commission not found",
      });
    }

    return res.status(200).json({
      message: "Commission fetched successfully",
      commission,
    });
  } catch (error) {
    console.error("Get commission error:", error);

    return res.status(500).json({
      message: "Failed to fetch commission",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE COMMISSION
|--------------------------------------------------------------------------
*/
const updateCommission = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid commission ID",
      });
    }

    const commission = await Commission.findById(id);

    if (!commission) {
      return res.status(404).json({
        message: "Commission not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Paid/Cancelled commissions cannot be edited
    |--------------------------------------------------------------------------
    */

    if (
      commission.status === "Paid" ||
      commission.status === "Cancelled"
    ) {
      return res.status(400).json({
        message:
          "Paid or cancelled commission cannot be updated",
      });
    }

    const allowedFields = [
      "salesPerson",
      "commissionType",
      "baseAmount",
      "percentage",
      "commissionAmount",
      "currency",
      "notes",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        commission[field] = req.body[field];
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Validate salesperson
    |--------------------------------------------------------------------------
    */

    if (commission.salesPerson) {
      if (!isValidObjectId(commission.salesPerson)) {
        return res.status(400).json({
          message: "Invalid sales person ID",
        });
      }

      const salesPerson = await User.findById(
        commission.salesPerson
      ).select("_id");

      if (!salesPerson) {
        return res.status(404).json({
          message: "Sales person not found",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Validate commission type
    |--------------------------------------------------------------------------
    */

    if (
      !["Percentage", "Fixed"].includes(
        commission.commissionType
      )
    ) {
      return res.status(400).json({
        message: "Invalid commission type",
      });
    }

    const baseAmount = Number(commission.baseAmount);
    const percentage = Number(commission.percentage);
    const commissionAmount = Number(
      commission.commissionAmount
    );

    if (!Number.isFinite(baseAmount) || baseAmount < 0) {
      return res.status(400).json({
        message: "Invalid base amount",
      });
    }

    if (
      !Number.isFinite(percentage) ||
      percentage < 0 ||
      percentage > 100
    ) {
      return res.status(400).json({
        message: "Percentage must be between 0 and 100",
      });
    }

    if (
      !Number.isFinite(commissionAmount) ||
      commissionAmount <= 0
    ) {
      return res.status(400).json({
        message: "Commission amount must be greater than 0",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate percentage calculation
    |--------------------------------------------------------------------------
    */

    if (commission.commissionType === "Percentage") {
      const expectedAmount =
        Math.round(
          ((baseAmount * percentage) / 100) * 100
        ) / 100;

      if (
        Math.abs(expectedAmount - commissionAmount) >
        0.01
      ) {
        return res.status(400).json({
          message:
            "Commission amount does not match percentage calculation",
          expectedCommissionAmount: expectedAmount,
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Save
    |--------------------------------------------------------------------------
    */

    await commission.save();

    const updatedCommission =
      await populateCommission(
        Commission.findById(commission._id)
      );

    return res.status(200).json({
      message: "Commission updated successfully",
      commission: updatedCommission,
    });
  } catch (error) {
    console.error("Update commission error:", error);

    return res.status(500).json({
      message: "Failed to update commission",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| APPROVE COMMISSION
|--------------------------------------------------------------------------
| Pending → Approved
|--------------------------------------------------------------------------
*/
const approveCommission = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid commission ID",
      });
    }

    const commission = await Commission.findById(id);

    if (!commission) {
      return res.status(404).json({
        message: "Commission not found",
      });
    }

    if (commission.status !== "Pending") {
      return res.status(400).json({
        message:
          "Only Pending commissions can be approved",
      });
    }

    commission.status = "Approved";
    commission.approvedBy = req.user.id;
    commission.approvedAt = new Date();

    await commission.save();

    const updatedCommission =
      await populateCommission(
        Commission.findById(commission._id)
      );

    return res.status(200).json({
      message: "Commission approved successfully",
      commission: updatedCommission,
    });
  } catch (error) {
    console.error("Approve commission error:", error);

    return res.status(500).json({
      message: "Failed to approve commission",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| MARK COMMISSION PAYABLE
|--------------------------------------------------------------------------
| Approved → Payable
|--------------------------------------------------------------------------
*/
const markCommissionPayable = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid commission ID",
      });
    }

    const commission = await Commission.findById(id);

    if (!commission) {
      return res.status(404).json({
        message: "Commission not found",
      });
    }

    if (commission.status !== "Approved") {
      return res.status(400).json({
        message:
          "Only Approved commissions can be marked Payable",
      });
    }

    commission.status = "Payable";

    await commission.save();

    const updatedCommission =
      await populateCommission(
        Commission.findById(commission._id)
      );

    return res.status(200).json({
      message: "Commission marked as payable",
      commission: updatedCommission,
    });
  } catch (error) {
    console.error(
      "Mark commission payable error:",
      error
    );

    return res.status(500).json({
      message: "Failed to mark commission as payable",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| MARK COMMISSION PAID
|--------------------------------------------------------------------------
| Payable → Paid
|--------------------------------------------------------------------------
*/
const markCommissionPaid = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      paymentDate,
      paymentReference,
    } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid commission ID",
      });
    }

    const commission = await Commission.findById(id);

    if (!commission) {
      return res.status(404).json({
        message: "Commission not found",
      });
    }

    if (commission.status !== "Payable") {
      return res.status(400).json({
        message:
          "Only Payable commissions can be marked as Paid",
      });
    }

    let finalPaymentDate = new Date();

    if (paymentDate) {
      const parsedDate = new Date(paymentDate);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          message: "Invalid payment date",
        });
      }

      finalPaymentDate = parsedDate;
    }

    commission.status = "Paid";
    commission.paymentDate = finalPaymentDate;
    commission.paymentReference =
      paymentReference || null;

    await commission.save();

    const updatedCommission =
      await populateCommission(
        Commission.findById(commission._id)
      );

    return res.status(200).json({
      message: "Commission marked as paid successfully",
      commission: updatedCommission,
    });
  } catch (error) {
    console.error(
      "Mark commission paid error:",
      error
    );

    return res.status(500).json({
      message: "Failed to mark commission as paid",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| CANCEL COMMISSION
|--------------------------------------------------------------------------
*/
const cancelCommission = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid commission ID",
      });
    }

    const commission = await Commission.findById(id);

    if (!commission) {
      return res.status(404).json({
        message: "Commission not found",
      });
    }

    if (commission.status === "Paid") {
      return res.status(400).json({
        message:
          "Paid commission cannot be cancelled",
      });
    }

    if (commission.status === "Cancelled") {
      return res.status(400).json({
        message: "Commission is already cancelled",
      });
    }

    commission.status = "Cancelled";

    await commission.save();

    const updatedCommission =
      await populateCommission(
        Commission.findById(commission._id)
      );

    return res.status(200).json({
      message: "Commission cancelled successfully",
      commission: updatedCommission,
    });
  } catch (error) {
    console.error(
      "Cancel commission error:",
      error
    );

    return res.status(500).json({
      message: "Failed to cancel commission",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE COMMISSION
|--------------------------------------------------------------------------
*/
const deleteCommission = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid commission ID",
      });
    }

    const commission = await Commission.findById(id);

    if (!commission) {
      return res.status(404).json({
        message: "Commission not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Do not delete financial records that are already paid
    |--------------------------------------------------------------------------
    */

    if (commission.status === "Paid") {
      return res.status(400).json({
        message:
          "Paid commission cannot be deleted",
      });
    }

    await Commission.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Commission deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete commission error:",
      error
    );

    return res.status(500).json({
      message: "Failed to delete commission",
      error: error.message,
    });
  }
};

module.exports = {
  createCommission,
  getCommissions,
  getCommissionById,
  updateCommission,
  approveCommission,
  markCommissionPayable,
  markCommissionPaid,
  cancelCommission,
  deleteCommission,
};

