const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");

const connectDB = require("./config/db");

// ======================================================
// ROUTES
// ======================================================

const userRoutes = require("./routes/userRoutes");
const leadRoutes = require("./routes/leadRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const quotationRoutes = require("./routes/quotationRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const contactRoutes = require("./routes/contactRoutes");
const hotelRoutes = require("./routes/hotelRoutes");
const transportRoutes = require("./routes/transportRoutes");
const itineraryRoutes = require("./routes/itineraryRoutes");
const packageRoutes = require("./routes/packageRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const refundRoutes = require("./routes/refundRoutes");
const commissionRoutes = require("./routes/commissionRoutes");
const companyRoutes = require("./routes/companyRoutes");
const tripRoutes = require("./routes/tripRoutes");
const taskRoutes = require("./routes/taskRoutes");
const activityRoutes = require("./routes/activityRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");
const travellerRoutes = require("./routes/travellerRoutes");
const customerRoutes = require("./routes/customerRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
dotenv.config();
const {
  startPaymentReminderScheduler,
} = require("./services/paymentReminderScheduler");
const app = express();

// ======================================================
// DATABASE
// ======================================================

connectDB();

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// ======================================================
// API ROUTES
// ======================================================

// Core CRM
app.use("/api/users", userRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/customers", customerRoutes);

// Travel operations
app.use("/api/trips", tripRoutes);
app.use("/api/travellers", travellerRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/transports", transportRoutes);
app.use("/api/itineraries", itineraryRoutes);
app.use("/api/packages", packageRoutes);

// Finance
app.use("/api/invoices", invoiceRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api/commissions", commissionRoutes);

// Workflow
app.use("/api/tasks", taskRoutes);
app.use("/api/activities", activityRoutes);

// Analytics + notifications
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Travel CRM API is running",
  });
});

// ======================================================
// 404 HANDLER
// ======================================================

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    message: "Internal server error",
  });
});

// ======================================================
// SERVER + DATABASE + PAYMENT REMINDER SCHEDULER
// ======================================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);

      startPaymentReminderScheduler();
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();