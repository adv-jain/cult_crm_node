const mongoose = require("mongoose");

const Expense = require("../models/Expense");
const Booking = require("../models/Booking");
const Supplier = require("../models/Supplier");
const Hotel = require("../models/Hotel");
const Transport = require("../models/Transport");
const Quotation = require("../models/Quotation");
const Trip = require("../models/Trip");
const Customer = require("../models/Customer");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const populateExpense = (query) => {
  return query
    .populate("supplier")
    .populate("hotel")
    .populate("transport")
    .populate("booking")
    .populate("quotation")
    .populate("trip")
    .populate("customer")
    .populate("createdBy", "name email role")
    .populate("approvedBy", "name email role");
};

const validateOptionalObjectId = (value, fieldName) => {
  if (!value) return null;

  if (!isValidObjectId(value)) {
    return `${fieldName} ID is invalid`;
  }

  return null;
};

const generateExpenseNumber = async () => {
  const year = new Date().getFullYear();

  const lastExpense = await Expense.findOne({
    expenseNumber: new RegExp(`^EXP-${year}-`),
  })
    .sort({ expenseNumber: -1 })
    .select("expenseNumber");

  let nextNumber = 1;

  if (lastExpense?.expenseNumber) {
    const lastNumber = parseInt(
      lastExpense.expenseNumber.split("-").pop(),
      10
    );

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `EXP-${year}-${String(nextNumber).padStart(4, "0")}`;
};

/* =========================================================
   CREATE EXPENSE
========================================================= */

const createExpense = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subCategory,
      amount,
      currency,
      expenseDate,
      paymentMethod,
      transactionId,
      receiptNumber,
      receiptUrl,
      supplier,
      hotel,
      transport,
      booking,
      quotation,
      trip,
      customer,
      isBillable,
      notes,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        message: "Expense title is required",
      });
    }

    if (!category) {
      return res.status(400).json({
        message: "Expense category is required",
      });
    }

    const numericAmount = Number(amount);

    if (
      amount === undefined ||
      amount === null ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        message: "Expense amount must be greater than 0",
      });
    }

    const references = [
      [supplier, "Supplier"],
      [hotel, "Hotel"],
      [transport, "Transport"],
      [booking, "Booking"],
      [quotation, "Quotation"],
      [trip, "Trip"],
      [customer, "Customer"],
    ];

    for (const [value, fieldName] of references) {
      const error = validateOptionalObjectId(
        value,
        fieldName
      );

      if (error) {
        return res.status(400).json({
          message: error,
        });
      }
    }

    if (
      supplier &&
      !(await Supplier.exists({ _id: supplier }))
    ) {
      return res.status(404).json({
        message: "Supplier not found",
      });
    }

    if (
      hotel &&
      !(await Hotel.exists({ _id: hotel }))
    ) {
      return res.status(404).json({
        message: "Hotel not found",
      });
    }

    if (
      transport &&
      !(await Transport.exists({ _id: transport }))
    ) {
      return res.status(404).json({
        message: "Transport not found",
      });
    }

    if (
      booking &&
      !(await Booking.exists({ _id: booking }))
    ) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (
      quotation &&
      !(await Quotation.exists({ _id: quotation }))
    ) {
      return res.status(404).json({
        message: "Quotation not found",
      });
    }

    if (
      trip &&
      !(await Trip.exists({ _id: trip }))
    ) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    if (
      customer &&
      !(await Customer.exists({ _id: customer }))
    ) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const expenseNumber =
      await generateExpenseNumber();

    const expense = await Expense.create({
      expenseNumber,
      title: title.trim(),
      description: description?.trim() || "",
      category,
      subCategory: subCategory?.trim() || "",
      amount: numericAmount,
      currency: currency || "INR",
      expenseDate: expenseDate || new Date(),
      paymentMethod:
        paymentMethod || "Bank Transfer",
      transactionId:
        transactionId?.trim() || "",
      receiptNumber:
        receiptNumber?.trim() || "",
      receiptUrl:
        receiptUrl?.trim() || "",
      supplier: supplier || null,
      hotel: hotel || null,
      transport: transport || null,
      booking: booking || null,
      quotation: quotation || null,
      trip: trip || null,
      customer: customer || null,
      isBillable: Boolean(isBillable),
      notes: notes?.trim() || "",
      status: "Pending",
      createdBy: req.user.id,
    });

    const populatedExpense = await populateExpense(
      Expense.findById(expense._id)
    );

    return res.status(201).json({
      message: "Expense created successfully",
      expense: populatedExpense,
    });
  } catch (error) {
    console.error("Create Expense Error:", error);

    return res.status(500).json({
      message: "Failed to create expense",
      error: error.message,
    });
  }
};

/* =========================================================
   GET ALL EXPENSES
========================================================= */

const getExpenses = async (req, res) => {
  try {
    const {
      category,
      status,
      booking,
      quotation,
      trip,
      customer,
      supplier,
      hotel,
      transport,
      isBillable,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    }

    const objectFilters = [
      ["booking", booking],
      ["quotation", quotation],
      ["trip", trip],
      ["customer", customer],
      ["supplier", supplier],
      ["hotel", hotel],
      ["transport", transport],
    ];

    for (const [field, value] of objectFilters) {
      if (value) {
        if (!isValidObjectId(value)) {
          return res.status(400).json({
            message: `Invalid ${field} ID`,
          });
        }

        filter[field] = value;
      }
    }

    if (isBillable !== undefined) {
      filter.isBillable =
        isBillable === "true";
    }

    if (startDate || endDate) {
      filter.expenseDate = {};

      if (startDate) {
        const start = new Date(startDate);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            message: "Invalid startDate",
          });
        }

        filter.expenseDate.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            message: "Invalid endDate",
          });
        }

        end.setHours(23, 59, 59, 999);

        filter.expenseDate.$lte = end;
      }
    }

    if (search?.trim()) {
      const safeSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        {
          title: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          description: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          category: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          subCategory: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          expenseNumber: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 50, 1),
      100
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    const [
      expenses,
      total,
      allSummary,
      paidSummary,
      pendingSummary,
      approvedSummary,
    ] = await Promise.all([
      populateExpense(
        Expense.find(filter)
          .sort({
            expenseDate: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(limitNumber)
      ),

      Expense.countDocuments(filter),

      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: {
              $sum: "$amount",
            },
          },
        },
      ]),

      Expense.aggregate([
        {
          $match: {
            ...filter,
            status: "Paid",
          },
        },
        {
          $group: {
            _id: null,
            amount: {
              $sum: "$amount",
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]),

      Expense.aggregate([
        {
          $match: {
            ...filter,
            status: "Pending",
          },
        },
        {
          $group: {
            _id: null,
            amount: {
              $sum: "$amount",
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]),

      Expense.aggregate([
        {
          $match: {
            ...filter,
            status: "Approved",
          },
        },
        {
          $group: {
            _id: null,
            amount: {
              $sum: "$amount",
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]),
    ]);

    const totalPages =
      Math.ceil(total / limitNumber);

    return res.status(200).json({
      message: "Expenses fetched successfully",

      expenses,

      count: expenses.length,

      total,

      page: pageNumber,

      limit: limitNumber,

      totalPages,

      hasNextPage:
        pageNumber < totalPages,

      hasPreviousPage:
        pageNumber > 1,

      summary: {
        totalAmount:
          allSummary[0]?.totalAmount || 0,

        totalPaidAmount:
          paidSummary[0]?.amount || 0,

        pendingAmount:
          pendingSummary[0]?.amount || 0,

        approvedAmount:
          approvedSummary[0]?.amount || 0,

        paidExpenseCount:
          paidSummary[0]?.count || 0,

        pendingExpenseCount:
          pendingSummary[0]?.count || 0,

        approvedExpenseCount:
          approvedSummary[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error(
      "Get Expenses Error:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch expenses",
      error: error.message,
    });
  }
};

/* =========================================================
   GET EXPENSE BY ID
========================================================= */

const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid expense ID",
      });
    }

    const expense = await populateExpense(
      Expense.findById(id)
    );

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    return res.status(200).json({
      message: "Expense fetched successfully",
      expense,
    });
  } catch (error) {
    console.error(
      "Get Expense By ID Error:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch expense",
      error: error.message,
    });
  }
};

/* =========================================================
   UPDATE EXPENSE
========================================================= */

const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid expense ID",
      });
    }

    const expense =
      await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    if (
      ["Paid", "Cancelled"].includes(
        expense.status
      )
    ) {
      return res.status(400).json({
        message:
          `Cannot edit expense in ${expense.status} status`,
      });
    }

    const allowedFields = [
      "title",
      "description",
      "category",
      "subCategory",
      "amount",
      "currency",
      "expenseDate",
      "paymentMethod",
      "transactionId",
      "receiptNumber",
      "receiptUrl",
      "supplier",
      "hotel",
      "transport",
      "booking",
      "quotation",
      "trip",
      "customer",
      "isBillable",
      "notes",
    ];

    allowedFields.forEach((field) => {
      if (
        req.body[field] !== undefined
      ) {
        expense[field] =
          req.body[field];
      }
    });

    if (!expense.title?.trim()) {
      return res.status(400).json({
        message: "Expense title is required",
      });
    }

    if (
      !Number.isFinite(
        Number(expense.amount)
      ) ||
      Number(expense.amount) <= 0
    ) {
      return res.status(400).json({
        message:
          "Expense amount must be greater than 0",
      });
    }

    const references = [
      ["supplier", Supplier],
      ["hotel", Hotel],
      ["transport", Transport],
      ["booking", Booking],
      ["quotation", Quotation],
      ["trip", Trip],
      ["customer", Customer],
    ];

    for (const [field, Model] of references) {
      const value = expense[field];

      if (!value) continue;

      if (!isValidObjectId(value)) {
        return res.status(400).json({
          message:
            `Invalid ${field} ID`,
        });
      }

      const exists =
        await Model.exists({
          _id: value,
        });

      if (!exists) {
        return res.status(404).json({
          message:
            `${field} not found`,
        });
      }
    }

    if (expense.status === "Approved") {
      expense.status = "Pending";
      expense.approvedBy = null;
      expense.approvedAt = null;
    }

    await expense.save();

    const updatedExpense =
      await populateExpense(
        Expense.findById(expense._id)
      );

    return res.status(200).json({
      message:
        "Expense updated successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    console.error(
      "Update Expense Error:",
      error
    );

    return res.status(500).json({
      message: "Failed to update expense",
      error: error.message,
    });
  }
};

/* =========================================================
   DELETE EXPENSE
========================================================= */

const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid expense ID",
      });
    }

    const expense =
      await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    if (expense.status === "Paid") {
      return res.status(400).json({
        message:
          "Paid expenses cannot be deleted",
      });
    }

    await Expense.findByIdAndDelete(id);

    return res.status(200).json({
      message:
        "Expense deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Expense Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to delete expense",
      error: error.message,
    });
  }
};

/* =========================================================
   APPROVE EXPENSE
========================================================= */

const approveExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid expense ID",
      });
    }

    const expense =
      await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    if (expense.status !== "Pending") {
      return res.status(400).json({
        message:
          `Only Pending expenses can be approved. Current status: ${expense.status}`,
      });
    }

    expense.status = "Approved";
    expense.approvedBy = req.user.id;
    expense.approvedAt = new Date();

    await expense.save();

    const updatedExpense =
      await populateExpense(
        Expense.findById(expense._id)
      );

    return res.status(200).json({
      message:
        "Expense approved successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    console.error(
      "Approve Expense Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to approve expense",
      error: error.message,
    });
  }
};

/* =========================================================
   REJECT EXPENSE
========================================================= */

const rejectExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid expense ID",
      });
    }

    const expense =
      await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    if (expense.status !== "Pending") {
      return res.status(400).json({
        message:
          `Only Pending expenses can be rejected. Current status: ${expense.status}`,
      });
    }

    expense.status = "Rejected";

    expense.approvedBy =
      req.user.id;

    expense.approvedAt =
      new Date();

    if (req.body?.reason) {
      expense.notes =
        expense.notes
          ? `${expense.notes}\nRejection: ${req.body.reason}`
          : `Rejection: ${req.body.reason}`;
    }

    await expense.save();

    const updatedExpense =
      await populateExpense(
        Expense.findById(expense._id)
      );

    return res.status(200).json({
      message:
        "Expense rejected successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    console.error(
      "Reject Expense Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to reject expense",
      error: error.message,
    });
  }
};

/* =========================================================
   MARK EXPENSE PAID
========================================================= */

const markExpensePaid = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid expense ID",
      });
    }

    const expense =
      await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    if (expense.status !== "Approved") {
      return res.status(400).json({
        message:
          `Only Approved expenses can be marked Paid. Current status: ${expense.status}`,
      });
    }

    if (req.body?.paymentMethod) {
      expense.paymentMethod =
        req.body.paymentMethod;
    }

    if (
      req.body?.transactionId !== undefined
    ) {
      expense.transactionId =
        req.body.transactionId;
    }

    expense.status = "Paid";

    await expense.save();

    const updatedExpense =
      await populateExpense(
        Expense.findById(expense._id)
      );

    return res.status(200).json({
      message:
        "Expense marked as paid successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    console.error(
      "Mark Expense Paid Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to mark expense as paid",
      error: error.message,
    });
  }
};

/* =========================================================
   CANCEL EXPENSE
========================================================= */

const cancelExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid expense ID",
      });
    }

    const expense =
      await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    if (
      ["Paid", "Rejected", "Cancelled"].includes(
        expense.status
      )
    ) {
      return res.status(400).json({
        message:
          `Expense cannot be cancelled from ${expense.status} status`,
      });
    }

    expense.status = "Cancelled";

    if (req.body?.reason) {
      expense.notes =
        expense.notes
          ? `${expense.notes}\nCancellation: ${req.body.reason}`
          : `Cancellation: ${req.body.reason}`;
    }

    await expense.save();

    const updatedExpense =
      await populateExpense(
        Expense.findById(expense._id)
      );

    return res.status(200).json({
      message:
        "Expense cancelled successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    console.error(
      "Cancel Expense Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to cancel expense",
      error: error.message,
    });
  }
};

/* =========================================================
   BOOKING EXPENSE SUMMARY
========================================================= */

const getBookingExpenseSummary = async (
  req,
  res
) => {
  try {
    const { bookingId } =
      req.params;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    const booking =
      await Booking.findById(
        bookingId
      );

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    const expenses =
      await populateExpense(
        Expense.find({
          booking: bookingId,
        }).sort({
          expenseDate: -1,
        })
      );

    const paidExpenses =
      expenses.filter(
        (expense) =>
          expense.status === "Paid"
      );

    const pendingExpenses =
      expenses.filter(
        (expense) =>
          expense.status === "Pending" ||
          expense.status === "Approved"
      );

    const rejectedExpenses =
      expenses.filter(
        (expense) =>
          expense.status === "Rejected"
      );

    const cancelledExpenses =
      expenses.filter(
        (expense) =>
          expense.status === "Cancelled"
      );

    const totalExpense =
      paidExpenses.reduce(
        (sum, expense) =>
          sum +
          Number(expense.amount || 0),
        0
      );

    const pendingExpense =
      pendingExpenses.reduce(
        (sum, expense) =>
          sum +
          Number(expense.amount || 0),
        0
      );

    const categorySummary = {};

    paidExpenses.forEach(
      (expense) => {
        const category =
          expense.category ||
          "Other";

        categorySummary[category] =
          (categorySummary[category] || 0) +
          Number(expense.amount || 0);
      }
    );

    const bookingRevenue =
      Number(
        booking.totalAmount ||
          booking.totalPrice ||
          0
      );

    const grossProfit =
      bookingRevenue - totalExpense;

    const profitMargin =
      bookingRevenue > 0
        ? (grossProfit /
            bookingRevenue) *
          100
        : 0;

    return res.status(200).json({
      message:
        "Booking expense summary fetched successfully",

      booking: bookingId,

      expenseCount:
        expenses.length,

      paidExpenseCount:
        paidExpenses.length,

      pendingExpenseCount:
        pendingExpenses.length,

      rejectedExpenseCount:
        rejectedExpenses.length,

      cancelledExpenseCount:
        cancelledExpenses.length,

      totalExpense,

      pendingExpense,

      bookingRevenue,

      grossProfit,

      profitMargin:
        Number(
          profitMargin.toFixed(2)
        ),

      categorySummary,

      expenses,
    });
  } catch (error) {
    console.error(
      "Booking Expense Summary Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch booking expense summary",
      error: error.message,
    });
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  approveExpense,
  rejectExpense,
  markExpensePaid,
  cancelExpense,
  getBookingExpenseSummary,
};