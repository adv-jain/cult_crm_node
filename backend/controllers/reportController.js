
const mongoose = require("mongoose");

const Lead = require("../models/Lead");
const Enquiry = require("../models/Enquiry");
const Quotation = require("../models/Quotation");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Expense = require("../models/Expense");
const Refund = require("../models/Refund");
const Commission = require("../models/Commission");
const Customer = require("../models/Customer");
const User = require("../models/User");


// =====================================================
// HELPERS
// =====================================================

const isValidObjectId = (id) => {
  return id && mongoose.Types.ObjectId.isValid(id);
};


const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};


const getDateFilter = (query, field = "createdAt") => {
  const filter = {};

  if (query.from || query.to) {
    filter[field] = {};

    if (query.from) {
      const from = new Date(query.from);
      if (!Number.isNaN(from.getTime())) {
        filter[field].$gte = from;
      }
    }

    if (query.to) {
      const to = new Date(query.to);
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        filter[field].$lte = to;
      }
    }

    if (Object.keys(filter[field]).length === 0) {
      delete filter[field];
    }
  }

  return filter;
};


const addObjectIdFilter = (filter, field, value) => {
  if (isValidObjectId(value)) {
    filter[field] = new mongoose.Types.ObjectId(value);
  }
};


const addCommonBookingFilters = (filter, query) => {
  if (query.status) {
    filter.status = query.status;
  }

  if (query.paymentStatus) {
    filter.paymentStatus = query.paymentStatus;
  }

  if (query.destination) {
    filter.destination = {
      $regex: query.destination,
      $options: "i"
    };
  }

  if (query.travelType) {
    filter.travelType = query.travelType;
  }

  addObjectIdFilter(filter, "salesOwner", query.salesOwner);
  addObjectIdFilter(filter, "customer", query.customer);

  return filter;
};


// =====================================================
// 1. SALES REPORT
// =====================================================

const getSalesReport = async (req, res) => {
  try {
    const leadFilter = {
      ...getDateFilter(req.query)
    };

    const enquiryFilter = {
      ...getDateFilter(req.query)
    };

    const quotationFilter = {
      ...getDateFilter(req.query)
    };

    const bookingFilter = {
      ...getDateFilter(req.query),
      ...addCommonBookingFilters({}, req.query)
    };

    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      totalEnquiries,
      totalQuotations,
      totalBookings,
      bookingStats
    ] = await Promise.all([
      Lead.countDocuments(leadFilter),

      Lead.countDocuments({
        ...leadFilter,
        status: "New"
      }),

      Lead.countDocuments({
        ...leadFilter,
        status: "Qualified"
      }),

      Lead.countDocuments({
        ...leadFilter,
        status: "Converted"
      }),

      Enquiry.countDocuments(enquiryFilter),

      Quotation.countDocuments(quotationFilter),

      Booking.countDocuments(bookingFilter),

      Booking.aggregate([
        { $match: bookingFilter },
        {
          $group: {
            _id: null,
            bookingValue: { $sum: { $ifNull: ["$totalAmount", 0] } },
            bookingCost: { $sum: { $ifNull: ["$totalCost", 0] } },
            profit: { $sum: { $ifNull: ["$profitAmount", 0] } }
          }
        }
      ])
    ]);

    const stats = bookingStats[0] || {
      bookingValue: 0,
      bookingCost: 0,
      profit: 0
    };

    const conversionRate =
      totalLeads > 0
        ? Number(((totalBookings / totalLeads) * 100).toFixed(2))
        : 0;

    res.json({
      message: "Sales report fetched successfully",
      filters: {
        from: req.query.from || null,
        to: req.query.to || null,
        salesOwner: req.query.salesOwner || null
      },
      report: {
        totalLeads,
        newLeads,
        qualifiedLeads,
        convertedLeads,
        totalEnquiries,
        totalQuotations,
        totalBookings,
        bookingValue: toNumber(stats.bookingValue),
        bookingCost: toNumber(stats.bookingCost),
        profit: toNumber(stats.profit),
        conversionRate
      }
    });

  } catch (error) {
    console.error("Sales report error:", error);

    res.status(500).json({
      message: "Failed to fetch sales report",
      error: error.message
    });
  }
};


// =====================================================
// 2. BOOKING REPORT
// =====================================================

const getBookingReport = async (req, res) => {
  try {
    const filter = {
      ...getDateFilter(req.query, "createdAt")
    };

    addCommonBookingFilters(filter, req.query);

    const [
      summary,
      statusBreakdown,
      destinationBreakdown,
      travelTypeBreakdown,
      bookings
    ] = await Promise.all([
      Booking.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            totalAmount: { $sum: { $ifNull: ["$totalAmount", 0] } },
            totalCost: { $sum: { $ifNull: ["$totalCost", 0] } },
            totalProfit: { $sum: { $ifNull: ["$profitAmount", 0] } },
            totalPaid: { $sum: { $ifNull: ["$amountPaid", 0] } },
            totalDue: { $sum: { $ifNull: ["$amountDue", 0] } }
          }
        }
      ]),

      Booking.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            bookingCount: { $sum: 1 },
            totalAmount: { $sum: { $ifNull: ["$totalAmount", 0] } }
          }
        },
        { $sort: { bookingCount: -1 } }
      ]),

      Booking.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$destination",
            bookingCount: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
            profit: { $sum: { $ifNull: ["$profitAmount", 0] } }
          }
        },
        { $sort: { revenue: -1 } }
      ]),

      Booking.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$travelType",
            bookingCount: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$totalAmount", 0] } }
          }
        },
        { $sort: { revenue: -1 } }
      ]),

      Booking.find(filter)
        .populate("customer", "name email phone")
        .populate("salesOwner", "name email role")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean()
    ]);

    const data = summary[0] || {
      totalBookings: 0,
      totalAmount: 0,
      totalCost: 0,
      totalProfit: 0,
      totalPaid: 0,
      totalDue: 0
    };

    res.json({
      message: "Booking report fetched successfully",
      summary: data,

      statusBreakdown: statusBreakdown.map(item => ({
        status: item._id || "Unknown",
        bookingCount: item.bookingCount,
        totalAmount: toNumber(item.totalAmount)
      })),

      destinationBreakdown: destinationBreakdown.map(item => ({
        destination: item._id || "Unknown",
        bookingCount: item.bookingCount,
        revenue: toNumber(item.revenue),
        profit: toNumber(item.profit)
      })),

      travelTypeBreakdown: travelTypeBreakdown.map(item => ({
        travelType: item._id || "Unknown",
        bookingCount: item.bookingCount,
        revenue: toNumber(item.revenue)
      })),

      bookings
    });

  } catch (error) {
    console.error("Booking report error:", error);

    res.status(500).json({
      message: "Failed to fetch booking report",
      error: error.message
    });
  }
};


// =====================================================
// 3. REVENUE REPORT
// =====================================================

const getRevenueReport = async (req, res) => {
  try {
    const bookingFilter = {
      ...getDateFilter(req.query, "createdAt")
    };

    addCommonBookingFilters(bookingFilter, req.query);

    const paymentFilter = {
      ...getDateFilter(req.query, "paymentDate")
    };

    if (req.query.paymentStatus) {
      paymentFilter.status = req.query.paymentStatus;
    }

    addObjectIdFilter(paymentFilter, "customer", req.query.customer);

    const [
      bookingRevenue,
      paymentRevenue,
      monthlyRevenue,
      destinationRevenue,
      salespersonRevenue
    ] = await Promise.all([
      Booking.aggregate([
        { $match: bookingFilter },
        {
          $group: {
            _id: null,
            revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
            paid: { $sum: { $ifNull: ["$amountPaid", 0] } },
            due: { $sum: { $ifNull: ["$amountDue", 0] } }
          }
        }
      ]),

      Payment.aggregate([
        { $match: paymentFilter },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: { $ifNull: ["$amount", 0] } },
            paymentCount: { $sum: 1 }
          }
        }
      ]),

      Booking.aggregate([
        { $match: bookingFilter },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
            bookings: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),

      Booking.aggregate([
        { $match: bookingFilter },
        {
          $group: {
            _id: "$destination",
            revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
            bookings: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } }
      ]),

      Booking.aggregate([
        { $match: bookingFilter },
        {
          $group: {
            _id: "$salesOwner",
            revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
            bookings: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } }
      ])
    ]);

    const bookingData = bookingRevenue[0] || {
      revenue: 0,
      paid: 0,
      due: 0
    };

    const paymentData = paymentRevenue[0] || {
      totalPayments: 0,
      paymentCount: 0
    };

    const salesOwnerIds = salespersonRevenue
      .map(item => item._id)
      .filter(Boolean);

    const users = salesOwnerIds.length
      ? await User.find({
          _id: { $in: salesOwnerIds }
        }).select("name email role").lean()
      : [];

    const userMap = new Map(
      users.map(user => [String(user._id), user])
    );

    res.json({
      message: "Revenue report fetched successfully",

      summary: {
        bookingRevenue: toNumber(bookingData.revenue),
        amountPaid: toNumber(bookingData.paid),
        amountDue: toNumber(bookingData.due),
        paymentRevenue: toNumber(paymentData.totalPayments),
        paymentCount: paymentData.paymentCount
      },

      monthlyRevenue: monthlyRevenue.map(item => ({
        year: item._id.year,
        month: item._id.month,
        revenue: toNumber(item.revenue),
        bookings: item.bookings
      })),

      destinationRevenue: destinationRevenue.map(item => ({
        destination: item._id || "Unknown",
        revenue: toNumber(item.revenue),
        bookings: item.bookings
      })),

      salespersonRevenue: salespersonRevenue.map(item => ({
        salesperson: userMap.get(String(item._id)) || null,
        revenue: toNumber(item.revenue),
        bookings: item.bookings
      }))
    });

  } catch (error) {
    console.error("Revenue report error:", error);

    res.status(500).json({
      message: "Failed to fetch revenue report",
      error: error.message
    });
  }
};


// =====================================================
// 4. EXPENSE REPORT
// =====================================================

const getExpenseReport = async (req, res) => {
  try {
    const filter = {
      ...getDateFilter(req.query, "expenseDate")
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }

    addObjectIdFilter(filter, "booking", req.query.booking);
    addObjectIdFilter(filter, "customer", req.query.customer);

    const [
      summary,
      categoryBreakdown,
      monthlyExpenses,
      expenses
    ] = await Promise.all([
      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $ifNull: ["$amount", 0] } },
            expenseCount: { $sum: 1 }
          }
        }
      ]),

      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$category",
            amount: { $sum: { $ifNull: ["$amount", 0] } },
            count: { $sum: 1 }
          }
        },
        { $sort: { amount: -1 } }
      ]),

      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              year: { $year: "$expenseDate" },
              month: { $month: "$expenseDate" }
            },
            amount: { $sum: { $ifNull: ["$amount", 0] } }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),

      Expense.find(filter)
        .populate("booking")
        .populate("customer", "name email")
        .populate("approvedBy", "name email")
        .sort({ expenseDate: -1 })
        .limit(100)
        .lean()
    ]);

    const data = summary[0] || {
      totalAmount: 0,
      expenseCount: 0
    };

    res.json({
      message: "Expense report fetched successfully",

      summary: {
        totalAmount: toNumber(data.totalAmount),
        expenseCount: data.expenseCount
      },

      categoryBreakdown: categoryBreakdown.map(item => ({
        category: item._id || "Unknown",
        amount: toNumber(item.amount),
        count: item.count
      })),

      monthlyExpenses: monthlyExpenses.map(item => ({
        year: item._id.year,
        month: item._id.month,
        amount: toNumber(item.amount)
      })),

      expenses
    });

  } catch (error) {
    console.error("Expense report error:", error);

    res.status(500).json({
      message: "Failed to fetch expense report",
      error: error.message
    });
  }
};


// =====================================================
// 5. REFUND REPORT
// =====================================================

const getRefundReport = async (req, res) => {
  try {
    const filter = {
      ...getDateFilter(req.query, "refundDate")
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    addObjectIdFilter(filter, "booking", req.query.booking);
    addObjectIdFilter(filter, "customer", req.query.customer);

    const [
      summary,
      statusBreakdown,
      monthlyRefunds,
      refunds
    ] = await Promise.all([
      Refund.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalRefundAmount: {
              $sum: { $ifNull: ["$amount", 0] }
            },
            refundCount: { $sum: 1 }
          }
        }
      ]),

      Refund.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            amount: { $sum: { $ifNull: ["$amount", 0] } },
            count: { $sum: 1 }
          }
        },
        { $sort: { amount: -1 } }
      ]),

      Refund.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              year: { $year: "$refundDate" },
              month: { $month: "$refundDate" }
            },
            amount: { $sum: { $ifNull: ["$amount", 0] } }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),

      Refund.find(filter)
        .populate("booking")
        .populate("customer", "name email")
        .populate("payment")
        .populate("invoice")
        .populate("requestedBy", "name email role")
        .populate("approvedBy", "name email role")
        .populate("processedBy", "name email role")
        .sort({ refundDate: -1 })
        .limit(100)
        .lean()
    ]);

    const data = summary[0] || {
      totalRefundAmount: 0,
      refundCount: 0
    };

    res.json({
      message: "Refund report fetched successfully",

      summary: {
        totalRefundAmount: toNumber(data.totalRefundAmount),
        refundCount: data.refundCount
      },

      statusBreakdown: statusBreakdown.map(item => ({
        status: item._id || "Unknown",
        amount: toNumber(item.amount),
        count: item.count
      })),

      monthlyRefunds: monthlyRefunds.map(item => ({
        year: item._id.year,
        month: item._id.month,
        amount: toNumber(item.amount)
      })),

      refunds
    });

  } catch (error) {
    console.error("Refund report error:", error);

    res.status(500).json({
      message: "Failed to fetch refund report",
      error: error.message
    });
  }
};


// =====================================================
// 6. COMMISSION REPORT
// =====================================================

const getCommissionReport = async (req, res) => {
  try {
    const filter = {
      ...getDateFilter(req.query, "createdAt")
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    addObjectIdFilter(filter, "salesPerson", req.query.salesPerson);
    addObjectIdFilter(filter, "booking", req.query.booking);

    const [
      summary,
      statusBreakdown,
      salespersonBreakdown,
      commissions
    ] = await Promise.all([
      Commission.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalCommission: {
              $sum: { $ifNull: ["$commissionAmount", 0] }
            },
            commissionCount: { $sum: 1 }
          }
        }
      ]),

      Commission.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            amount: {
              $sum: { $ifNull: ["$commissionAmount", 0] }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { amount: -1 } }
      ]),

      Commission.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$salesPerson",
            amount: {
              $sum: { $ifNull: ["$commissionAmount", 0] }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { amount: -1 } }
      ]),

      Commission.find(filter)
        .populate("booking")
        .populate("salesPerson", "name email role")
        .populate("customer", "name email")
        .populate("approvedBy", "name email")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean()
    ]);

    const data = summary[0] || {
      totalCommission: 0,
      commissionCount: 0
    };

    const salespersonIds = salespersonBreakdown
      .map(item => item._id)
      .filter(Boolean);

    const users = salespersonIds.length
      ? await User.find({
          _id: { $in: salespersonIds }
        }).select("name email role").lean()
      : [];

    const userMap = new Map(
      users.map(user => [String(user._id), user])
    );

    res.json({
      message: "Commission report fetched successfully",

      summary: {
        totalCommission: toNumber(data.totalCommission),
        commissionCount: data.commissionCount
      },

      statusBreakdown: statusBreakdown.map(item => ({
        status: item._id || "Unknown",
        amount: toNumber(item.amount),
        count: item.count
      })),

      salespersonBreakdown: salespersonBreakdown.map(item => ({
        salesperson: userMap.get(String(item._id)) || null,
        amount: toNumber(item.amount),
        count: item.count
      })),

      commissions
    });

  } catch (error) {
    console.error("Commission report error:", error);

    res.status(500).json({
      message: "Failed to fetch commission report",
      error: error.message
    });
  }
};


// =====================================================
// 7. PROFIT & LOSS REPORT
// =====================================================

const getProfitLossReport = async (req, res) => {
  try {
    const bookingFilter = {
      ...getDateFilter(req.query, "createdAt")
    };

    addCommonBookingFilters(bookingFilter, req.query);

    const refundFilter = {
      ...getDateFilter(req.query, "refundDate"),
      status: "Completed"
    };

    addObjectIdFilter(refundFilter, "booking", req.query.booking);

    const commissionFilter = {
      ...getDateFilter(req.query, "createdAt"),
      status: "Paid"
    };

    addObjectIdFilter(
      commissionFilter,
      "salesPerson",
      req.query.salesPerson
    );

    const expenseFilter = {
      ...getDateFilter(req.query, "expenseDate")
    };

    if (req.query.expenseStatus) {
      expenseFilter.status = req.query.expenseStatus;
    }

    const [
      bookingData,
      refundData,
      commissionData,
      expenseData
    ] = await Promise.all([
      Booking.aggregate([
        { $match: bookingFilter },
        {
          $group: {
            _id: null,
            revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
            bookingCost: { $sum: { $ifNull: ["$totalCost", 0] } },
            grossProfit: { $sum: { $ifNull: ["$profitAmount", 0] } },
            bookings: { $sum: 1 }
          }
        }
      ]),

      Refund.aggregate([
        { $match: refundFilter },
        {
          $group: {
            _id: null,
            refunds: { $sum: { $ifNull: ["$amount", 0] } }
          }
        }
      ]),

      Commission.aggregate([
        { $match: commissionFilter },
        {
          $group: {
            _id: null,
            commissions: {
              $sum: { $ifNull: ["$commissionAmount", 0] }
            }
          }
        }
      ]),

      Expense.aggregate([
        { $match: expenseFilter },
        {
          $group: {
            _id: null,
            expenses: { $sum: { $ifNull: ["$amount", 0] } }
          }
        }
      ])
    ]);

    const booking = bookingData[0] || {
      revenue: 0,
      bookingCost: 0,
      grossProfit: 0,
      bookings: 0
    };

    const refund = refundData[0] || {
      refunds: 0
    };

    const commission = commissionData[0] || {
      commissions: 0
    };

    const expense = expenseData[0] || {
      expenses: 0
    };

    /*
      IMPORTANT ACCOUNTING RULE:

      Booking.totalCost already represents the operational
      cost used to calculate Booking.profitAmount.

      Therefore we do NOT subtract Expense again from
      gross profit, otherwise the same cost can be counted
      twice.

      Expense is returned separately for reporting/reference.
    */

    const revenue = toNumber(booking.revenue);
    const bookingCost = toNumber(booking.bookingCost);
    const grossProfit = toNumber(booking.grossProfit);
    const refunds = toNumber(refund.refunds);
    const commissions = toNumber(commission.commissions);
    const recordedExpenses = toNumber(expense.expenses);

    const netProfit = grossProfit - refunds - commissions;

    const netMargin =
      revenue > 0
        ? Number(((netProfit / revenue) * 100).toFixed(2))
        : 0;

    res.json({
      message: "Profit and loss report fetched successfully",

      report: {
        revenue,
        bookingCost,
        grossProfit,
        refunds,
        commissions,
        netProfit,
        netMargin,
        bookings: booking.bookings,

        recordedExpenses,
        expenseTreatment:
          "Shown separately because bookingCost may already include operational expenses. It is not subtracted again from netProfit."
      }
    });

  } catch (error) {
    console.error("Profit loss report error:", error);

    res.status(500).json({
      message: "Failed to fetch profit and loss report",
      error: error.message
    });
  }
};


// =====================================================
// 8. AGENT / SALESPERSON PERFORMANCE
// =====================================================

const getAgentPerformanceReport = async (req, res) => {
  try {
    const bookingFilter = {
      ...getDateFilter(req.query, "createdAt")
    };

    addCommonBookingFilters(bookingFilter, req.query);

    const bookingPerformance = await Booking.aggregate([
      { $match: bookingFilter },
      {
        $group: {
          _id: "$salesOwner",
          bookings: { $sum: 1 },
          revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
          cost: { $sum: { $ifNull: ["$totalCost", 0] } },
          profit: { $sum: { $ifNull: ["$profitAmount", 0] } },
          paid: { $sum: { $ifNull: ["$amountPaid", 0] } },
          due: { $sum: { $ifNull: ["$amountDue", 0] } }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    const salesOwnerIds = bookingPerformance
      .map(item => item._id)
      .filter(Boolean);

    const users = salesOwnerIds.length
      ? await User.find({
          _id: { $in: salesOwnerIds }
        }).select("name email role isActive").lean()
      : [];

    const userMap = new Map(
      users.map(user => [String(user._id), user])
    );

    const result = bookingPerformance.map(item => ({
      salesperson: userMap.get(String(item._id)) || null,
      bookings: item.bookings,
      revenue: toNumber(item.revenue),
      cost: toNumber(item.cost),
      profit: toNumber(item.profit),
      paid: toNumber(item.paid),
      due: toNumber(item.due)
    }));

    res.json({
      message: "Agent performance report fetched successfully",
      agents: result
    });

  } catch (error) {
    console.error("Agent performance error:", error);

    res.status(500).json({
      message: "Failed to fetch agent performance report",
      error: error.message
    });
  }
};


// =====================================================
// 9. DESTINATION REPORT
// =====================================================

const getDestinationReport = async (req, res) => {
  try {
    const filter = {
      ...getDateFilter(req.query, "createdAt")
    };

    addCommonBookingFilters(filter, req.query);

    const destinations = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$destination",

          bookings: {
            $sum: 1
          },

          revenue: {
            $sum: {
              $ifNull: ["$totalAmount", 0]
            }
          },

          cost: {
            $sum: {
              $ifNull: ["$totalCost", 0]
            }
          },

          profit: {
            $sum: {
              $ifNull: ["$profitAmount", 0]
            }
          },

          paid: {
            $sum: {
              $ifNull: ["$amountPaid", 0]
            }
          },

          due: {
            $sum: {
              $ifNull: ["$amountDue", 0]
            }
          }
        }
      },
      {
        $sort: {
          revenue: -1
        }
      }
    ]);

    res.json({
      message: "Destination report fetched successfully",

      destinations: destinations.map(item => ({
        destination: item._id || "Unknown",
        bookings: item.bookings,
        revenue: toNumber(item.revenue),
        cost: toNumber(item.cost),
        profit: toNumber(item.profit),
        paid: toNumber(item.paid),
        due: toNumber(item.due)
      }))
    });

  } catch (error) {
    console.error("Destination report error:", error);

    res.status(500).json({
      message: "Failed to fetch destination report",
      error: error.message
    });
  }
};


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getSalesReport,
  getBookingReport,
  getRevenueReport,
  getExpenseReport,
  getRefundReport,
  getCommissionReport,
  getProfitLossReport,
  getAgentPerformanceReport,
  getDestinationReport
};

