const mongoose = require("mongoose");

const Trip = require("../models/Trip");
const Lead = require("../models/Lead");
const User = require("../models/User");
const Customer = require("../models/Customer");

const notificationService = require("../services/notificationService");

// =====================================================
// CONSTANTS
// =====================================================

const VALID_STATUSES = [
  "Planning",
  "Quotation",
  "Confirmed",
  "Upcoming",
  "Ongoing",
  "Completed",
  "Cancelled",
];

const VALID_TRAVEL_TYPES = [
  "Domestic",
  "International",
  "Honeymoon",
  "Family",
  "Solo",
  "Corporate",
  "Group",
  "Adventure",
  "Pilgrimage",
  "Other",
];

// =====================================================
// HELPERS
// =====================================================

const getActualUserId = (userId) => {
  if (!userId) return null;

  if (typeof userId === "string") return userId;

  if (userId instanceof mongoose.Types.ObjectId) return userId;

  if (typeof userId === "object" && userId._id) {
    return getActualUserId(userId._id);
  }

  if (typeof userId === "object" && userId.$oid) {
    return userId.$oid;
  }

  return null;
};

const validateAssignedUser = async (userId) => {
  try {
    const actualUserId = getActualUserId(userId);

    if (!actualUserId) return null;

    const user = await User.findOne({
      _id: actualUserId,
      isActive: true,
      role: { $in: ["admin", "manager", "sales"] },
    });

    return user;
  } catch (error) {
    console.error("Validate assigned user error:", error.message);
    return null;
  }
};

const getSalesUserIds = async () => {
  const salesUsers = await User.find({
    role: "sales",
    isActive: true,
  }).select("_id");

  return salesUsers.map((user) => user._id);
};

const canAccessTrip = async (trip, user) => {
  // Admin — full access
  if (user.role === "admin") return true;

  // Sales — only own trips
  if (user.role === "sales") {
    if (!trip.owner) return false;

    const tripOwnerId = getActualUserId(trip.owner);
    if (!tripOwnerId) return false;

    return tripOwnerId.toString() === user.id.toString();
  }

  // Manager — only trips owned by active sales users
  if (user.role === "manager") {
    if (!trip.owner) return false;

    const ownerId = getActualUserId(trip.owner);
    if (!ownerId) return false;

    const owner = await User.findById(ownerId).select("role isActive");

    return owner && owner.isActive && owner.role === "sales";
  }

  return false;
};

const populateTrip = async (tripId) => {
  return Trip.findById(tripId)
    .populate("customer", "name email phone status")
    .populate("company", "name industry")
    .populate("lead", "firstName lastName email status assignedTo")
    .populate("owner", "name email role");
};

const generateTripCode = async () => {
  const year = new Date().getFullYear();

  const latestTrip = await Trip.findOne({
    tripCode: { $regex: `^TRP-${year}-` },
  })
    .sort({ createdAt: -1 })
    .select("tripCode");

  let nextNumber = 1;

  if (latestTrip && latestTrip.tripCode) {
    const parts = latestTrip.tripCode.split("-");
    const lastNumber = parseInt(parts[2], 10);

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `TRP-${year}-${String(nextNumber).padStart(4, "0")}`;
};

const validateTripDates = (startDate, endDate) => {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Invalid start or end date";
  }

  if (end < start) {
    return "End date cannot be before start date";
  }

  return null;
};

const validateTravellerCounts = (adults, children, infants) => {
  if (
    adults !== undefined &&
    (Number.isNaN(Number(adults)) || Number(adults) < 1)
  ) {
    return "Adults must be at least 1";
  }

  if (
    children !== undefined &&
    (Number.isNaN(Number(children)) || Number(children) < 0)
  ) {
    return "Children cannot be negative";
  }

  if (
    infants !== undefined &&
    (Number.isNaN(Number(infants)) || Number(infants) < 0)
  ) {
    return "Infants cannot be negative";
  }

  return null;
};

const validateAmount = (value, fieldName) => {
  if (value === undefined) return null;

  const numericValue = Number(value);

  if (Number.isNaN(numericValue) || numericValue < 0) {
    return `${fieldName} must be a valid non-negative number`;
  }

  return null;
};

// =====================================================
// CREATE TRIP
// =====================================================

const createTrip = async (req, res) => {
  try {
    const {
      title,
      destination,
      tripCode,
      startDate,
      endDate,
      travelType,
      adults,
      children,
      infants,
      status,
      estimatedValue,
      totalAmount,
      totalCost,
      customer,
      company,
      lead,
      owner,
      description,
    } = req.body;

    // Title
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Trip title is required" });
    }

    // Destination
    if (!destination || !destination.trim()) {
      return res.status(400).json({ message: "Destination is required" });
    }

    // Travel type
    if (travelType !== undefined && !VALID_TRAVEL_TYPES.includes(travelType)) {
      return res.status(400).json({ message: "Invalid travel type" });
    }

    // Status
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid trip status" });
    }

    // New trip restriction
    if (status === "Completed" || status === "Cancelled") {
      return res.status(400).json({
        message:
          "A new trip cannot be created directly as Completed or Cancelled",
      });
    }

    // Dates
    const dateError = validateTripDates(startDate, endDate);
    if (dateError) {
      return res.status(400).json({ message: dateError });
    }

    // Travellers
    const travellerError = validateTravellerCounts(adults, children, infants);
    if (travellerError) {
      return res.status(400).json({ message: travellerError });
    }

    // Amounts
    const estimatedValueError = validateAmount(
      estimatedValue,
      "Estimated value"
    );
    if (estimatedValueError) {
      return res.status(400).json({ message: estimatedValueError });
    }

    const totalAmountError = validateAmount(totalAmount, "Total amount");
    if (totalAmountError) {
      return res.status(400).json({ message: totalAmountError });
    }

    const totalCostError = validateAmount(totalCost, "Total cost");
    if (totalCostError) {
      return res.status(400).json({ message: totalCostError });
    }

    // Lead
    let selectedLead = null;

    if (lead) {
      if (!mongoose.isValidObjectId(lead)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }

      selectedLead = await Lead.findById(lead).lean();

      if (!selectedLead) {
        return res.status(404).json({ message: "Lead not found" });
      }
    }

    // Owner resolution
    let tripOwner = req.user.id;

    // Owner from lead's assignedTo
    if (selectedLead && selectedLead.assignedTo) {
      const assignedUserId = getActualUserId(selectedLead.assignedTo);

      if (assignedUserId) {
        const assignedUser = await validateAssignedUser(assignedUserId);

        if (assignedUser) {
          tripOwner = assignedUser._id;
        }
      }
    }

    // Admin assignment
    if (owner && req.user.role === "admin") {
      const assignedUser = await validateAssignedUser(owner);

      if (!assignedUser) {
        return res.status(400).json({
          message: "Assigned user not found or inactive",
        });
      }

      tripOwner = assignedUser._id;
    }

    // Manager assignment
    if (owner && req.user.role === "manager") {
      const assignedUser = await validateAssignedUser(owner);

      if (!assignedUser) {
        return res.status(400).json({
          message: "Assigned user not found or inactive",
        });
      }

      if (assignedUser.role !== "sales") {
        return res.status(403).json({
          message: "Manager can assign trips only to Sales users",
        });
      }

      tripOwner = assignedUser._id;
    }

    // Sales always owns own trips
    if (req.user.role === "sales") {
      tripOwner = req.user.id;
    }

    // Trip code
    let finalTripCode = tripCode;

    if (finalTripCode) {
      finalTripCode = finalTripCode.trim().toUpperCase();

      const existingTrip = await Trip.findOne({ tripCode: finalTripCode });

      if (existingTrip) {
        return res.status(400).json({ message: "Trip code already exists" });
      }
    } else {
      finalTripCode = await generateTripCode();
    }

    // Profit
    const amount = Number(totalAmount || 0);
    const cost = Number(totalCost || 0);
    const profit = amount - cost;

    // Create
    const trip = await Trip.create({
      title: title.trim(),
      tripCode: finalTripCode,
      destination: destination.trim(),
      startDate,
      endDate,
      travelType: travelType || "Other",
      adults: adults !== undefined ? Number(adults) : 1,
      children: children !== undefined ? Number(children) : 0,
      infants: infants !== undefined ? Number(infants) : 0,
      status: status || "Planning",
      estimatedValue:
        estimatedValue !== undefined ? Number(estimatedValue) : 0,
      totalAmount: amount,
      totalCost: cost,
      profit,
      customer: customer || null,
      company: company || null,
      lead: lead || null,
      owner: tripOwner,
      description: description ? description.trim() : undefined,
    });

    // Assignment notification (non-blocking)
    try {
      if (notificationService.createTripAssignedNotification) {
        await notificationService.createTripAssignedNotification({
          recipient: tripOwner,
          trip: trip._id,
          tripTitle: trip.title,
        });
      }
    } catch (notificationError) {
      console.error(
        "Trip Assignment Notification Error:",
        notificationError
      );
    }

    const populatedTrip = await populateTrip(trip._id);

    return res.status(201).json({
      message: "Trip created successfully",
      trip: populatedTrip,
    });
  } catch (error) {
    console.error("Create trip error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL TRIPS
// =====================================================

const getTrips = async (req, res) => {
  try {
    const {
      search,
      status,
      travelType,
      destination,
      customer,
      company,
      owner,
      page = 1,
      limit = 50,
    } = req.query;

    // Pagination
    const currentPage = Math.max(parseInt(page) || 1, 1);
    const recordsPerPage = Math.min(Math.max(parseInt(limit) || 50, 1), 50);
    const skip = (currentPage - 1) * recordsPerPage;

    // Base filter
    const filter = {};

    // Role filter
    if (req.user.role === "admin") {
      // Admin sees all
    } else if (req.user.role === "sales") {
      filter.owner = req.user.id;
    } else if (req.user.role === "manager") {
      const salesUserIds = await getSalesUserIds();
      filter.owner = { $in: salesUserIds };
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    // Search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { destination: { $regex: search, $options: "i" } },
        { tripCode: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Status
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid trip status" });
      }

      filter.status = status;
    }

    // Travel type
    if (travelType) {
      if (!VALID_TRAVEL_TYPES.includes(travelType)) {
        return res.status(400).json({ message: "Invalid travel type" });
      }

      filter.travelType = travelType;
    }

    // Destination
    if (destination) {
      filter.destination = { $regex: destination, $options: "i" };
    }

    // Customer
    if (customer) {
      if (!mongoose.isValidObjectId(customer)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }

      filter.customer = customer;
    }

    // Company
    if (company) {
      if (!mongoose.isValidObjectId(company)) {
        return res.status(400).json({ message: "Invalid company ID" });
      }

      filter.company = company;
    }

    // Owner
    if (owner) {
      if (!mongoose.isValidObjectId(owner)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }

      if (req.user.role === "sales") {
        if (owner.toString() !== req.user.id.toString()) {
          return res.status(403).json({
            message: "You can only view your own trips",
          });
        }
      }

      if (req.user.role === "manager") {
        const ownerUser = await User.findOne({
          _id: owner,
          role: "sales",
          isActive: true,
        });

        if (!ownerUser) {
          return res.status(403).json({
            message: "Manager can only view Sales users' trips",
          });
        }
      }

      filter.owner = owner;
    }

    // Count + fetch
    const total = await Trip.countDocuments(filter);

    const trips = await Trip.find(filter)
      .populate("customer", "name email phone status")
      .populate("company", "name industry")
      .populate("lead", "firstName lastName email status")
      .populate("owner", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(recordsPerPage);

    const totalPages = Math.ceil(total / recordsPerPage);

    return res.status(200).json({
      message: "Trips fetched successfully",
      count: trips.length,
      total,
      page: currentPage,
      limit: recordsPerPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      trips,
    });
  } catch (error) {
    console.error("Get trips error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// =====================================================
// GET SINGLE TRIP
// =====================================================

const getTripById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const hasAccess = await canAccessTrip(trip, req.user);

    if (!hasAccess) {
      return res.status(403).json({
        message: "You do not have permission to view this trip",
      });
    }

    const populatedTrip = await populateTrip(trip._id);

    return res.status(200).json({
      message: "Trip fetched successfully",
      trip: populatedTrip,
    });
  } catch (error) {
    console.error("Get trip error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE TRIP
// =====================================================

const updateTrip = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const hasAccess = await canAccessTrip(trip, req.user);

    if (!hasAccess) {
      return res.status(403).json({
        message: "You do not have permission to update this trip",
      });
    }

    const previousOwner = getActualUserId(trip.owner);

    const {
      title,
      tripCode,
      destination,
      startDate,
      endDate,
      travelType,
      adults,
      children,
      infants,
      status,
      estimatedValue,
      totalAmount,
      totalCost,
      customer,
      company,
      lead,
      owner,
      description,
      cancellationReason,
    } = req.body;

    // Title
    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({ message: "Trip title is required" });
      }

      trip.title = title.trim();
    }

    // Trip code
    if (tripCode !== undefined) {
      const cleanTripCode = tripCode ? tripCode.trim().toUpperCase() : "";

      if (!cleanTripCode) {
        return res.status(400).json({
          message: "Trip code cannot be empty",
        });
      }

      const existingTrip = await Trip.findOne({
        tripCode: cleanTripCode,
        _id: { $ne: trip._id },
      });

      if (existingTrip) {
        return res.status(400).json({ message: "Trip code already exists" });
      }

      trip.tripCode = cleanTripCode;
    }

    // Destination
    if (destination !== undefined) {
      if (!destination || !destination.trim()) {
        return res.status(400).json({ message: "Destination is required" });
      }

      trip.destination = destination.trim();
    }

    // Dates
    const newStartDate =
      startDate !== undefined ? startDate : trip.startDate;
    const newEndDate = endDate !== undefined ? endDate : trip.endDate;

    const dateError = validateTripDates(newStartDate, newEndDate);

    if (dateError) {
      return res.status(400).json({ message: dateError });
    }

    if (startDate !== undefined) trip.startDate = startDate;
    if (endDate !== undefined) trip.endDate = endDate;

    // Travel type
    if (travelType !== undefined) {
      if (!VALID_TRAVEL_TYPES.includes(travelType)) {
        return res.status(400).json({ message: "Invalid travel type" });
      }

      trip.travelType = travelType;
    }

    // Travellers
    const travellerError = validateTravellerCounts(
      adults !== undefined ? adults : trip.adults,
      children !== undefined ? children : trip.children,
      infants !== undefined ? infants : trip.infants
    );

    if (travellerError) {
      return res.status(400).json({ message: travellerError });
    }

    if (adults !== undefined) trip.adults = Number(adults);
    if (children !== undefined) trip.children = Number(children);
    if (infants !== undefined) trip.infants = Number(infants);

    // Status
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid trip status" });
      }

      if (status === "Cancelled") {
        if (!cancellationReason || !cancellationReason.trim()) {
          return res.status(400).json({
            message: "Cancellation reason is required when cancelling a trip",
          });
        }

        trip.status = "Cancelled";
        trip.cancellationReason = cancellationReason.trim();
        trip.cancelledAt = new Date();
      } else {
        trip.status = status;
        trip.cancellationReason = null;
        trip.cancelledAt = null;
      }
    }

    // Estimated value
    if (estimatedValue !== undefined) {
      const amountError = validateAmount(
        estimatedValue,
        "Estimated value"
      );

      if (amountError) {
        return res.status(400).json({ message: amountError });
      }

      trip.estimatedValue = Number(estimatedValue);
    }

    // Total amount
    if (totalAmount !== undefined) {
      const amountError = validateAmount(totalAmount, "Total amount");

      if (amountError) {
        return res.status(400).json({ message: amountError });
      }

      trip.totalAmount = Number(totalAmount);
    }

    // Total cost
    if (totalCost !== undefined) {
      const costError = validateAmount(totalCost, "Total cost");

      if (costError) {
        return res.status(400).json({ message: costError });
      }

      trip.totalCost = Number(totalCost);
    }

    // Profit
    trip.profit =
      Number(trip.totalAmount || 0) - Number(trip.totalCost || 0);

    // Customer
    if (customer !== undefined) {
      if (customer && !mongoose.isValidObjectId(customer)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }

      trip.customer = customer || null;
    }

    // Company
    if (company !== undefined) {
      if (company && !mongoose.isValidObjectId(company)) {
        return res.status(400).json({ message: "Invalid company ID" });
      }

      trip.company = company || null;
    }

    // Lead
    if (lead !== undefined) {
      if (lead && !mongoose.isValidObjectId(lead)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }

      if (lead) {
        const selectedLead = await Lead.findById(lead);

        if (!selectedLead) {
          return res.status(404).json({ message: "Lead not found" });
        }
      }

      trip.lead = lead || null;
    }

    // Description
    if (description !== undefined) {
      trip.description = description ? description.trim() : "";
    }

    // Owner
    if (owner !== undefined) {
      if (req.user.role === "sales") {
        return res.status(403).json({
          message: "Sales users cannot change trip owner",
        });
      }

      const assignedUser = await validateAssignedUser(owner);

      if (!assignedUser) {
        return res.status(400).json({
          message: "Assigned user not found or inactive",
        });
      }

      if (req.user.role === "manager" && assignedUser.role !== "sales") {
        return res.status(403).json({
          message: "Manager can assign trips only to Sales users",
        });
      }

      trip.owner = assignedUser._id;
    }

    await trip.save();

    const newOwner = getActualUserId(trip.owner);

    const ownerChanged =
      previousOwner &&
      newOwner &&
      previousOwner.toString() !== newOwner.toString();

    if (ownerChanged) {
      try {
        if (notificationService.createTripAssignedNotification) {
          await notificationService.createTripAssignedNotification({
            recipient: newOwner,
            trip: trip._id,
            tripTitle: trip.title,
          });
        }
      } catch (notificationError) {
        console.error(
          "Trip Reassignment Notification Error:",
          notificationError
        );
      }
    }

    const updatedTrip = await populateTrip(trip._id);

    return res.status(200).json({
      message: "Trip updated successfully",
      trip: updatedTrip,
    });
  } catch (error) {
    console.error("Update trip error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE TRIP
// =====================================================

const deleteTrip = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admin can delete trips",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const trip = await Trip.findByIdAndDelete(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    return res.status(200).json({
      message: "Trip deleted successfully",
    });
  } catch (error) {
    console.error("Delete trip error:", error);

    return res.status(500).json({ message: "Server error" });
  }
};

// =====================================================
// GET ASSIGNABLE USERS
// =====================================================

const getAssignableUsers = async (req, res) => {
  try {
    let filter = { isActive: true };

    if (req.user.role === "admin") {
      filter.role = { $in: ["admin", "manager", "sales"] };
    } else if (req.user.role === "manager") {
      filter.role = "sales";
    } else {
      return res.status(403).json({
        message: "Sales users cannot access assignable users",
      });
    }

    const users = await User.find(filter)
      .select("name email role isActive")
      .sort({ name: 1 });

    return res.status(200).json({
      message: "Assignable users fetched successfully",
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get assignable users error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  getAssignableUsers,
};