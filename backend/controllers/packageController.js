const mongoose = require("mongoose");
const Package = require("../models/Package");
const Hotel = require("../models/Hotel");
const Transport = require("../models/Transport");
const Supplier = require("../models/Supplier");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ===============================
// CREATE PACKAGE
// ===============================
const createPackage = async (req, res) => {
  try {
    const {
      packageCode,
      name,
      shortDescription,
      description,
      destination,
      destinations,
      country,
      packageType,
      duration,
      suitableFor,
      hotelCategory,
      mealPlan,
      transportation,
      itinerary,
      inclusions,
      exclusions,
      hotels,
      transportServices,
      activities,
      pricing,
      validity,
      minTravellers,
      maxTravellers,
      images,
      tags,
      status,
      featured,
      termsAndConditions,
      cancellationPolicy,
      notes,
    } = req.body;

    // Required fields
    if (!name || !destination) {
      return res.status(400).json({
        message: "Package name and destination are required",
      });
    }

    if (!duration || !duration.days || duration.nights === undefined) {
      return res.status(400).json({
        message: "Duration days and nights are required",
      });
    }

    // Validate duration
    if (duration.days < 1 || duration.nights < 0) {
      return res.status(400).json({
        message: "Invalid package duration",
      });
    }

    // Validate traveller limits
    if (
      minTravellers &&
      maxTravellers &&
      Number(minTravellers) > Number(maxTravellers)
    ) {
      return res.status(400).json({
        message: "minTravellers cannot be greater than maxTravellers",
      });
    }

    // Validate hotels
    if (Array.isArray(hotels) && hotels.length > 0) {
      for (const item of hotels) {
        if (item.hotel && !isValidObjectId(item.hotel)) {
          return res.status(400).json({
            message: `Invalid hotel ID: ${item.hotel}`,
          });
        }

        if (item.hotel) {
          const hotelExists = await Hotel.findById(item.hotel);

          if (!hotelExists) {
            return res.status(404).json({
              message: `Hotel not found: ${item.hotel}`,
            });
          }
        }
      }
    }

    // Validate transport services
    if (
      Array.isArray(transportServices) &&
      transportServices.length > 0
    ) {
      for (const item of transportServices) {
        if (item.transport && !isValidObjectId(item.transport)) {
          return res.status(400).json({
            message: `Invalid transport ID: ${item.transport}`,
          });
        }

        if (item.transport) {
          const transportExists = await Transport.findById(item.transport);

          if (!transportExists) {
            return res.status(404).json({
              message: `Transport not found: ${item.transport}`,
            });
          }
        }
      }
    }

    // Validate activity suppliers
    if (Array.isArray(activities) && activities.length > 0) {
      for (const activity of activities) {
        if (activity.supplier) {
          if (!isValidObjectId(activity.supplier)) {
            return res.status(400).json({
              message: `Invalid supplier ID: ${activity.supplier}`,
            });
          }

          const supplierExists = await Supplier.findById(activity.supplier);

          if (!supplierExists) {
            return res.status(404).json({
              message: `Supplier not found: ${activity.supplier}`,
            });
          }
        }
      }
    }

    // Check duplicate package code
    if (packageCode) {
      const existingPackage = await Package.findOne({
        packageCode: packageCode.toUpperCase(),
      });

      if (existingPackage) {
        return res.status(400).json({
          message: "Package code already exists",
        });
      }
    }

    // Create package
    const newPackage = await Package.create({
      packageCode,
      name,
      shortDescription,
      description,
      destination,
      destinations,
      country,
      packageType,
      duration,
      suitableFor,
      hotelCategory,
      mealPlan,
      transportation,
      itinerary,
      inclusions,
      exclusions,
      hotels,
      transportServices,
      activities,
      pricing,
      validity,
      minTravellers,
      maxTravellers,
      images,
      tags,
      status,
      featured,
      termsAndConditions,
      cancellationPolicy,
      notes,
      createdBy: req.user.id,
    });

    const populatedPackage = await Package.findById(newPackage._id)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("hotels.hotel", "name code destination city category")
      .populate(
        "transportServices.transport",
        "name code type provider fare status"
      )
      .populate(
        "activities.supplier",
        "name supplierCode type contactPerson phone email"
      );

    return res.status(201).json({
      message: "Package created successfully",
      package: populatedPackage,
    });
  } catch (error) {
    console.error("Create Package Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Package code already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to create package",
      error: error.message,
    });
  }
};

// ===============================
// GET ALL PACKAGES
// ===============================
const getPackages = async (req, res) => {
  try {
    const {
      destination,
      packageType,
      status,
      featured,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};

    if (destination) {
      query.destination = {
        $regex: destination,
        $options: "i",
      };
    }

    if (packageType) {
      query.packageType = packageType;
    }

    if (status) {
      query.status = status;
    }

    if (featured !== undefined) {
      query.featured = featured === "true";
    }

    if (search) {
      query.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          packageCode: {
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

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const [packages, total] = await Promise.all([
      Package.find(query)
        .populate("createdBy", "name email role")
        .populate("updatedBy", "name email role")
        .populate(
          "hotels.hotel",
          "name code destination city category rating"
        )
        .populate(
          "transportServices.transport",
          "name code type provider fare status"
        )
        .populate(
          "activities.supplier",
          "name supplierCode type contactPerson phone email"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),

      Package.countDocuments(query),
    ]);

    return res.status(200).json({
      message: "Packages fetched successfully",
      count: packages.length,
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      hasNextPage: pageNumber < Math.ceil(total / limitNumber),
      hasPreviousPage: pageNumber > 1,
      packages,
    });
  } catch (error) {
    console.error("Get Packages Error:", error);

    return res.status(500).json({
      message: "Failed to fetch packages",
      error: error.message,
    });
  }
};

// ===============================
// GET PACKAGE BY ID
// ===============================
const getPackageById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid package ID",
      });
    }

    const packageData = await Package.findById(id)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate(
        "hotels.hotel",
        "name code destination city category rating"
      )
      .populate(
        "transportServices.transport",
        "name code type provider fare status"
      )
      .populate(
        "activities.supplier",
        "name supplierCode type contactPerson phone email"
      );

    if (!packageData) {
      return res.status(404).json({
        message: "Package not found",
      });
    }

    return res.status(200).json({
      message: "Package fetched successfully",
      package: packageData,
    });
  } catch (error) {
    console.error("Get Package By ID Error:", error);

    return res.status(500).json({
      message: "Failed to fetch package",
      error: error.message,
    });
  }
};

// ===============================
// UPDATE PACKAGE
// ===============================
const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid package ID",
      });
    }

    const packageData = await Package.findById(id);

    if (!packageData) {
      return res.status(404).json({
        message: "Package not found",
      });
    }

    const allowedFields = [
      "packageCode",
      "name",
      "shortDescription",
      "description",
      "destination",
      "destinations",
      "country",
      "packageType",
      "duration",
      "suitableFor",
      "hotelCategory",
      "mealPlan",
      "transportation",
      "itinerary",
      "inclusions",
      "exclusions",
      "hotels",
      "transportServices",
      "activities",
      "pricing",
      "validity",
      "minTravellers",
      "maxTravellers",
      "images",
      "tags",
      "status",
      "featured",
      "termsAndConditions",
      "cancellationPolicy",
      "notes",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        packageData[field] = req.body[field];
      }
    }

    if (
      packageData.minTravellers &&
      packageData.maxTravellers &&
      packageData.minTravellers > packageData.maxTravellers
    ) {
      return res.status(400).json({
        message: "minTravellers cannot be greater than maxTravellers",
      });
    }

    packageData.updatedBy = req.user.id;

    await packageData.save();

    const populatedPackage = await Package.findById(packageData._id)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate(
        "hotels.hotel",
        "name code destination city category rating"
      )
      .populate(
        "transportServices.transport",
        "name code type provider fare status"
      )
      .populate(
        "activities.supplier",
        "name supplierCode type contactPerson phone email"
      );

    return res.status(200).json({
      message: "Package updated successfully",
      package: populatedPackage,
    });
  } catch (error) {
    console.error("Update Package Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Package code already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to update package",
      error: error.message,
    });
  }
};

// ===============================
// DELETE PACKAGE
// ===============================
const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid package ID",
      });
    }

    const packageData = await Package.findById(id);

    if (!packageData) {
      return res.status(404).json({
        message: "Package not found",
      });
    }

    await Package.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Package deleted successfully",
    });
  } catch (error) {
    console.error("Delete Package Error:", error);

    return res.status(500).json({
      message: "Failed to delete package",
      error: error.message,
    });
  }
};

// ===============================
// ACTIVATE PACKAGE
// ===============================
const activatePackage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid package ID",
      });
    }

    const packageData = await Package.findById(id);

    if (!packageData) {
      return res.status(404).json({
        message: "Package not found",
      });
    }

    packageData.status = "Active";
    packageData.updatedBy = req.user.id;

    await packageData.save();

    const populatedPackage = await Package.findById(packageData._id)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate(
        "hotels.hotel",
        "name code destination city category rating"
      )
      .populate(
        "transportServices.transport",
        "name code type provider fare status"
      )
      .populate(
        "activities.supplier",
        "name supplierCode type contactPerson phone email"
      );

    return res.status(200).json({
      message: "Package activated successfully",
      package: populatedPackage,
    });
  } catch (error) {
    console.error("Activate Package Error:", error);

    return res.status(500).json({
      message: "Failed to activate package",
      error: error.message,
    });
  }
};

// ===============================
// ARCHIVE PACKAGE
// ===============================
const archivePackage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid package ID",
      });
    }

    const packageData = await Package.findById(id);

    if (!packageData) {
      return res.status(404).json({
        message: "Package not found",
      });
    }

    packageData.status = "Archived";
    packageData.updatedBy = req.user.id;

    await packageData.save();

    return res.status(200).json({
      message: "Package archived successfully",
      package: packageData,
    });
  } catch (error) {
    console.error("Archive Package Error:", error);

    return res.status(500).json({
      message: "Failed to archive package",
      error: error.message,
    });
  }
};

module.exports = {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  activatePackage,
  archivePackage,
};