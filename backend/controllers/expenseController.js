const mongoose = require("mongoose");

const Expense = require("../models/Expense");
const Booking = require("../models/Booking");
const Supplier = require("../models/Supplier");
const Hotel = require("../models/Hotel");
const Transport = require("../models/Transport");
const Quotation = require("../models/Quotation");
const Deal = require("../models/Trip");
const Customer = require("../models/Customer");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ==========================================
// GENERATE EXPENSE NUMBER
// ==========================================
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

// ==========================================
// CREATE EXPENSE
// ==========================================
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

    // Required fields
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

    if (amount === undefined || amount === null || Number(amount) < 0) {
      return res.status(400).json({
        message: "Valid expense amount is required",
      });
    }

    // Validate references
    if (supplier && !isValidObjectId(supplier)) {
      return res.status(400).json({
        message: "Invalid supplier ID",
      });
    }

    if (hotel && !isValidObjectId(hotel)) {
      return res.status(400).json({
        message: "Invalid hotel ID",
      });
    }

    if (transport && !isValidObjectId(transport)) {
      return res.status(400).json({
        message: "Invalid transport ID",
      });
    }

    if (booking && !isValidObjectId(booking)) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    if (quotation && !isValidObjectId(quotation)) {
      return res.status(400).json({
        message: "Invalid quotation ID",
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

    // Validate referenced documents
    if (supplier && !(await Supplier.exists({ _id: supplier }))) {
      return res.status(404).json({
        message: "Supplier not found",
      });
    }

    if (hotel && !(await Hotel.exists({ _id: hotel }))) {
      return res.status(404).json({
        message: "Hotel not found",
      });
    }

    if (transport && !(await Transport.exists({ _id: transport }))) {
      return res.status(404).json({
        message: "Transport not found",
      });
    }

    if (booking && !(await Booking.exists({ _id: booking }))) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (quotation && !(await Quotation.exists({ _id: quotation }))) {
      return res.status(404).json({
        message: "Quotation not found",
      });
    }

    if (trip && !(await Deal.exists({ _id: trip }))) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    if (customer && !(await Customer.exists({ _id: customer }))) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const expenseNumber = await generateExpenseNumber();

    const expense = await Expense.create({
      expenseNumber,
      title: title.trim(),
      description: description || "",
      category,
      subCategory: subCategory || "",
      amount: Number(amount),
      currency: currency || "INR",
      expenseDate: expenseDate || new Date(),
      paymentMethod: paymentMethod || "Bank Transfer",
      transactionId: transactionId || "",
      receiptNumber: receiptNumber || "",
      receiptUrl: receiptUrl || "",
      supplier: supplier || null,
      hotel: hotel || null,
      transport: transport || null,
      booking: booking || null,
      quotation: quotation || null,
      trip: trip || null,
      customer: customer || null,
      isBillable: Boolean(isBillable),
      notes: notes || "",
      createdBy: req.user.id,
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate("supplier")
      .populate("hotel")
      .populate("transport")
      .populate("booking")
      .populate("quotation")
      .populate("trip")
      .populate("customer")
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role");

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

// ==========================================
// GET ALL EXPENSES
// ==========================================
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

    if (category) filter.category = category;
    if (status) filter.status = status;

    if (booking) {
      if (!isValidObjectId(booking)) {
        return res.status(400).json({
          message: "Invalid booking ID",
        });
      }

      filter.booking = booking;
    }

    if (quotation) {
      if (!isValidObjectId(quotation)) {
        return res.status(400).json({
          message: "Invalid quotation ID",
        });
      }

      filter.quotation = quotation;
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

    if (supplier) {
      if (!isValidObjectId(supplier)) {
        return res.status(400).json({
          message: "Invalid supplier ID",
        });
      }

      filter.supplier = supplier;
    }

    if (hotel) {
      if (!isValidObjectId(hotel)) {
        return res.status(400).json({
          message: "Invalid hotel ID",
        });
      }

      filter.hotel = hotel;
    }

    if (transport) {
      if (!isValidObjectId(transport)) {
        return res.status(400).json({
          message: "Invalid transport ID",
        });
      }

      filter.transport = transport;
    }

    if (isBillable !== undefined) {
      filter.isBillable = isBillable === "true";
    }

    if (startDate || endDate) {
      filter.expenseDate = {};

      if (startDate) {
        filter.expenseDate.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.expenseDate.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { subCategory: { $regex: search, $options: "i" } },
        { expenseNumber: { $regex: search, $options: "i" } },
      ];
    }

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const [expenses, total, summary] = await Promise.all([
      Expense.find(filter)
        .populate("supplier")
        .populate("hotel")
        .populate("transport")
        .populate("booking")
        .populate("quotation")
        .populate("trip")
        .populate("customer")
        .populate("createdBy", "name email role")
        .populate("approvedBy", "name email role")
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),

      Expense.countDocuments(filter),

      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalAmount = summary[0]?.totalAmount || 0;

    const totalPages = Math.ceil(total / limitNumber);

    return res.status(200).json({
      message: "Expenses fetched successfully",
      count: expenses.length,
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages,
      hasNextPage: pageNumber < totalPages,
      hasPreviousPage: pageNumber > 1,
      totalAmount,
      expenses,
    });
  } catch (error) {
    console.error("Get Expenses Error:", error);

    return res.status(500).json({
      message: "Failed to fetch expenses",
      error: error.message,
    });
  }
};

// ==========================================
// GET EXPENSE BY ID
// ==========================================
const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findById(id)
      .populate("supplier")
      .populate("hotel")
      .populate("transport")
      .populate("booking")
      .populate("quotation")
      .populate("trip")
      .populate("customer")
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role");

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
    console.error("Get Expense By ID Error:", error);

    return res.status(500).json({
      message: "Failed to fetch expense",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE EXPENSE
// ==========================================
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
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
      if (req.body[field] !== undefined) {
        expense[field] = req.body[field];
      }
    });

    if (!expense.title?.trim()) {
      return res.status(400).json({
        message: "Expense title is required",
      });
    }

    if (expense.amount < 0) {
      return res.status(400).json({
        message: "Expense amount cannot be negative",
      });
    }

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate("supplier")
      .populate("hotel")
      .populate("transport")
      .populate("booking")
      .populate("quotation")
      .populate("trip")
      .populate("customer")
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role");

    return res.status(200).json({
      message: "Expense updated successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    console.error("Update Expense Error:", error);

    return res.status(500).json({
      message: "Failed to update expense",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE EXPENSE
// ==========================================
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    await Expense.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Delete Expense Error:", error);

    return res.status(500).json({
      message: "Failed to delete expense",
      error: error.message,
    });
  }
};

// ==========================================
// APPROVE EXPENSE
// ==========================================
const approveExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    if (expense.status !== "Pending") {
      return res.status(400).json({
        message: `Only Pending expenses can be approved. Current status: ${expense.status}`,
      });
    }

    expense.status = "Approved";
    expense.approvedBy = req.user.id;
    expense.approvedAt = new Date();

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role")
      .populate("booking")
      .populate("supplier")
      .populate("hotel")
      .populate("transport")
      .populate("customer");

    return res.status(200).json({
      message: "Expense approved successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    console.error("Approve Expense Error:", error);

    return res.status(500).json({
      message: "Failed to approve expense",
      error: error.message,
    });
  }
};

// ==========================================
// REJECT EXPENSE
// ==========================================
const rejectExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    if (expense.status !== "Pending") {
      return res.status(400).json({
        message: `Only Pending expenses can be rejected. Current status: ${expense.status}`,
      });
    }

    expense.status = "Rejected";
    expense.approvedBy = req.user.id;
    expense.approvedAt = new Date();

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role")
      .populate("booking")
      .populate("supplier")
      .populate("hotel")
      .populate("transport")
      .populate("customer");

    return res.status(200).json({
      message: "Expense rejected successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    console.error("Reject Expense Error:", error);

    return res.status(500).json({
      message: "Failed to reject expense",
      error: error.message,
    });
  }
};

// ==========================================
// MARK EXPENSE AS PAID
// ==========================================
const markExpensePaid = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    if (!["Approved", "Pending"].includes(expense.status)) {
      return res.status(400).json({
        message: `Expense cannot be marked Paid from ${expense.status} status`,
      });
    }

    expense.status = "Paid";

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role")
      .populate("booking")
      .populate("supplier")
      .populate("hotel")
      .populate("transport")
      .populate("customer");

    return res.status(200).json({
      message: "Expense marked as paid successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    console.error("Mark Expense Paid Error:", error);

    return res.status(500).json({
      message: "Failed to mark expense as paid",
      error: error.message,
    });
  }
};

// ==========================================
// BOOKING EXPENSE SUMMARY
// ==========================================
const getBookingExpenseSummary = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    const expenses = await Expense.find({
      booking: bookingId,
    })
      .populate("supplier")
      .populate("hotel")
      .populate("transport")
      .populate("createdBy", "name email role");

    const totalExpense = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );

    const categorySummary = {};

    expenses.forEach((expense) => {
      const category = expense.category || "Other";

      categorySummary[category] =
        (categorySummary[category] || 0) + Number(expense.amount || 0);
    });

    return res.status(200).json({
      message: "Booking expense summary fetched successfully",
      booking: bookingId,
      expenseCount: expenses.length,
      totalExpense,
      categorySummary,
      expenses,
    });
  } catch (error) {
    console.error("Booking Expense Summary Error:", error);

    return res.status(500).json({
      message: "Failed to fetch booking expense summary",
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
  getBookingExpenseSummary,
};