const mongoose = require("mongoose");

const Supplier = require("../models/Supplier");
const Company = require("../models/Company");
const User = require("../models/User");

// =====================================================
// CONSTANTS
// =====================================================

const SUPPLIER_TYPES = [
  "Hotel",
  "Transport",
  "Flight",
  "Activity",
  "Tour Operator",
  "DMC",
  "Visa Service",
  "Travel Insurance",
  "Cruise",
  "Restaurant",
  "Guide",
  "Other",
];

const SUPPLIER_STATUSES = [
  "Active",
  "Inactive",
  "Blacklisted",
  "Pending",
];

const ASSIGNABLE_ROLES = [
  "admin",
  "manager",
  "sales",
  "operations",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// =====================================================
// HELPERS
// =====================================================

const isValidObjectId = (id) => {
  return id && mongoose.isValidObjectId(id);
};

// -----------------------------------------------------
// Normalize string
// -----------------------------------------------------

const normalizeString = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value).trim();
};

// -----------------------------------------------------
// Normalize array
// -----------------------------------------------------

const normalizeArray = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

// -----------------------------------------------------
// Validate supplier type
// -----------------------------------------------------

const validateSupplierType = (supplierType) => {
  return SUPPLIER_TYPES.includes(supplierType);
};

// -----------------------------------------------------
// Validate supplier status
// -----------------------------------------------------

const validateSupplierStatus = (status) => {
  return SUPPLIER_STATUSES.includes(status);
};

// -----------------------------------------------------
// Validate number
// -----------------------------------------------------

const validateNumber = (
  value,
  fieldName,
  min = 0,
  max = null
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `${fieldName} must be a valid number`;
  }

  if (number < min) {
    return `${fieldName} cannot be less than ${min}`;
  }

  if (
    max !== null &&
    number > max
  ) {
    return `${fieldName} cannot be greater than ${max}`;
  }

  return null;
};

// -----------------------------------------------------
// Validate email
// -----------------------------------------------------

const validateEmail = (
  email,
  fieldName = "Email"
) => {
  if (!email) {
    return null;
  }

  if (!EMAIL_REGEX.test(String(email).trim())) {
    return `${fieldName} must be a valid email address`;
  }

  return null;
};

// -----------------------------------------------------
// Validate company
// -----------------------------------------------------

const validateCompany = async (company) => {
  if (!company) {
    return null;
  }

  if (!isValidObjectId(company)) {
    return "Invalid company ID";
  }

  const existingCompany =
    await Company.findById(company).select("_id");

  if (!existingCompany) {
    return "Company not found";
  }

  return null;
};

// -----------------------------------------------------
// Validate owner
// -----------------------------------------------------

const validateOwner = async (owner) => {
  if (!owner) {
    return null;
  }

  if (!isValidObjectId(owner)) {
    return "Invalid owner ID";
  }

  const existingUser =
    await User.findById(owner).select(
      "_id role isActive"
    );

  if (!existingUser) {
    return "Owner not found";
  }

  if (existingUser.isActive === false) {
    return "Owner is inactive";
  }

  return null;
};

// -----------------------------------------------------
// Generate supplier code
// -----------------------------------------------------

const generateSupplierCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `SUP-${year}-`;

  const latestSupplier =
    await Supplier.findOne({
      supplierCode: {
        $regex: `^${prefix}`,
      },
    })
      .sort({
        supplierCode: -1,
      })
      .select("supplierCode")
      .lean();

  let nextNumber = 1;

  if (latestSupplier?.supplierCode) {
    const lastNumber = parseInt(
      latestSupplier.supplierCode.replace(
        prefix,
        ""
      ),
      10
    );

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(
    nextNumber
  ).padStart(4, "0")}`;
};

// -----------------------------------------------------
// Populate supplier
// -----------------------------------------------------

const populateSupplier = (query) => {
  return query
    .populate(
      "company",
      "name industry email phone"
    )
    .populate(
      "owner",
      "name email role isActive"
    )
    .populate(
      "createdBy",
      "name email role isActive"
    );
};

// =====================================================
// CREATE SUPPLIER
// =====================================================

const createSupplier = async (req, res) => {
  try {
    const {
      supplierCode,
      name,
      supplierType,
      company,
      contactPerson,
      address,
      website,
      destinations,
      services,
      currency,
      paymentTerms,
      cancellationPolicy,
      creditLimit,
      outstandingAmount,
      rating,
      status,
      notes,
      owner,
    } = req.body;

    // -------------------------------------------------
    // Basic validation
    // -------------------------------------------------

    const normalizedName =
      normalizeString(name);

    if (!normalizedName) {
      return res.status(400).json({
        message:
          "Supplier name is required",
      });
    }

    if (!supplierType) {
      return res.status(400).json({
        message:
          "Supplier type is required",
      });
    }

    if (
      !validateSupplierType(
        supplierType
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid supplier type",
        allowedTypes:
          SUPPLIER_TYPES,
      });
    }

    if (
      status &&
      !validateSupplierStatus(status)
    ) {
      return res.status(400).json({
        message:
          "Invalid supplier status",
        allowedStatuses:
          SUPPLIER_STATUSES,
      });
    }

    // -------------------------------------------------
    // Company validation
    // -------------------------------------------------

    const companyError =
      await validateCompany(company);

    if (companyError) {
      return res.status(400).json({
        message: companyError,
      });
    }

    // -------------------------------------------------
    // Owner validation
    // -------------------------------------------------

    const ownerError =
      await validateOwner(owner);

    if (ownerError) {
      return res.status(400).json({
        message: ownerError,
      });
    }

    // -------------------------------------------------
    // Contact person validation
    // -------------------------------------------------

    const contact = contactPerson || {};

    const contactEmailError =
      validateEmail(
        contact.email,
        "Contact person email"
      );

    if (contactEmailError) {
      return res.status(400).json({
        message: contactEmailError,
      });
    }

    // -------------------------------------------------
    // Number validation
    // -------------------------------------------------

    const creditLimitError =
      validateNumber(
        creditLimit,
        "Credit limit",
        0
      );

    if (creditLimitError) {
      return res.status(400).json({
        message: creditLimitError,
      });
    }

    const outstandingAmountError =
      validateNumber(
        outstandingAmount,
        "Outstanding amount",
        0
      );

    if (outstandingAmountError) {
      return res.status(400).json({
        message:
          outstandingAmountError,
      });
    }

    const ratingError =
      validateNumber(
        rating,
        "Rating",
        0,
        5
      );

    if (ratingError) {
      return res.status(400).json({
        message: ratingError,
      });
    }

    // -------------------------------------------------
    // Supplier code
    // -------------------------------------------------

    let finalSupplierCode =
      normalizeString(
        supplierCode
      )?.toUpperCase();

    if (finalSupplierCode) {
      const existingSupplier =
        await Supplier.findOne({
          supplierCode:
            finalSupplierCode,
        }).select("_id");

      if (existingSupplier) {
        return res.status(409).json({
          message:
            "Supplier code already exists",
        });
      }
    } else {
      finalSupplierCode =
        await generateSupplierCode();

      while (
        await Supplier.exists({
          supplierCode:
            finalSupplierCode,
        })
      ) {
        finalSupplierCode =
          await generateSupplierCode();
      }
    }

    // -------------------------------------------------
    // Create supplier
    // -------------------------------------------------

    const supplier =
      await Supplier.create({
        supplierCode:
          finalSupplierCode,

        name:
          normalizedName,

        supplierType,

        company:
          company || null,

        contactPerson: {
          name:
            normalizeString(
              contact.name
            ),

          designation:
            normalizeString(
              contact.designation
            ),

          phone:
            normalizeString(
              contact.phone
            ),

          alternatePhone:
            normalizeString(
              contact.alternatePhone
            ),

          email:
            normalizeString(
              contact.email
            )?.toLowerCase(),

          whatsapp:
            normalizeString(
              contact.whatsapp
            ),
        },

        address: {
          street:
            normalizeString(
              address?.street
            ),

          city:
            normalizeString(
              address?.city
            ),

          state:
            normalizeString(
              address?.state
            ),

          country:
            normalizeString(
              address?.country
            ) || "India",

          postalCode:
            normalizeString(
              address?.postalCode
            ),
        },

        website:
          normalizeString(
            website
          ),

        destinations:
          normalizeArray(
            destinations
          ) || [],

        services:
          normalizeArray(
            services
          ) || [],

        currency:
          normalizeString(
            currency
          )?.toUpperCase() ||
          "INR",

        paymentTerms:
          normalizeString(
            paymentTerms
          ),

        cancellationPolicy:
          normalizeString(
            cancellationPolicy
          ),

        creditLimit:
          creditLimit !==
            undefined &&
          creditLimit !== null &&
          creditLimit !== ""
            ? Number(
                creditLimit
              )
            : 0,

        outstandingAmount:
          outstandingAmount !==
            undefined &&
          outstandingAmount !== null &&
          outstandingAmount !== ""
            ? Number(
                outstandingAmount
              )
            : 0,

        rating:
          rating !== undefined &&
          rating !== null &&
          rating !== ""
            ? Number(rating)
            : 0,

        status:
          status || "Active",

        notes:
          normalizeString(
            notes
          ),

        owner:
          owner || null,

        createdBy:
          req.user.id,
      });

    const populatedSupplier =
      await populateSupplier(
        Supplier.findById(
          supplier._id
        )
      );

    return res.status(201).json({
      message:
        "Supplier created successfully",
      supplier:
        populatedSupplier,
    });
  } catch (error) {
    console.error(
      "Create Supplier Error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "Supplier code already exists",
      });
    }

    return res.status(500).json({
      message:
        "Failed to create supplier",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL SUPPLIERS
// =====================================================

const getSuppliers = async (
  req,
  res
) => {
  try {
    const {
      search = "",
      supplierType = "",
      status = "",
      company = "",
      owner = "",
      destination = "",
      page = 1,
      limit = 10,
    } = req.query;

    const currentPage =
      Math.max(
        Number(page) || 1,
        1
      );

    const perPage =
      Math.min(
        Math.max(
          Number(limit) || 10,
          1
        ),
        100
      );

    const filter = {};

    // -------------------------------------------------
    // Supplier type
    // -------------------------------------------------

    if (supplierType) {
      if (
        !validateSupplierType(
          supplierType
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid supplier type",
          allowedTypes:
            SUPPLIER_TYPES,
        });
      }

      filter.supplierType =
        supplierType;
    }

    // -------------------------------------------------
    // Status
    // -------------------------------------------------

    if (status) {
      if (
        !validateSupplierStatus(
          status
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid supplier status",
          allowedStatuses:
            SUPPLIER_STATUSES,
        });
      }

      filter.status = status;
    }

    // -------------------------------------------------
    // Company
    // -------------------------------------------------

    if (company) {
      if (
        !isValidObjectId(company)
      ) {
        return res.status(400).json({
          message:
            "Invalid company ID",
        });
      }

      filter.company = company;
    }

    // -------------------------------------------------
    // Owner
    // -------------------------------------------------

    if (owner) {
      if (
        !isValidObjectId(owner)
      ) {
        return res.status(400).json({
          message:
            "Invalid owner ID",
        });
      }

      filter.owner = owner;
    }

    // -------------------------------------------------
    // Destination
    // -------------------------------------------------

    if (destination.trim()) {
      filter.destinations = {
        $regex:
          destination.trim(),
        $options: "i",
      };
    }

    // -------------------------------------------------
    // Search
    // -------------------------------------------------

    if (search.trim()) {
      const searchRegex = {
        $regex:
          search.trim(),
        $options: "i",
      };

      filter.$or = [
        {
          supplierCode:
            searchRegex,
        },
        {
          name:
            searchRegex,
        },
        {
          supplierType:
            searchRegex,
        },
        {
          "contactPerson.name":
            searchRegex,
        },
        {
          "contactPerson.phone":
            searchRegex,
        },
        {
          "contactPerson.email":
            searchRegex,
        },
        {
          "address.city":
            searchRegex,
        },
        {
          "address.state":
            searchRegex,
        },
        {
          "address.country":
            searchRegex,
        },
        {
          destinations:
            searchRegex,
        },
        {
          services:
            searchRegex,
        },
      ];
    }

    // -------------------------------------------------
    // Pagination
    // -------------------------------------------------

    const skip =
      (currentPage - 1) *
      perPage;

    // -------------------------------------------------
    // Fetch
    // -------------------------------------------------

    const [total, suppliers] =
      await Promise.all([
        Supplier.countDocuments(
          filter
        ),

        populateSupplier(
          Supplier.find(filter)
            .sort({
              createdAt: -1,
            })
            .skip(skip)
            .limit(perPage)
        ),
      ]);

    const totalPages =
      Math.ceil(
        total / perPage
      );

    return res.status(200).json({
      message:
        "Suppliers fetched successfully",

      total,

      count:
        suppliers.length,

      page:
        currentPage,

      limit:
        perPage,

      totalPages,

      hasNextPage:
        currentPage <
        totalPages,

      hasPreviousPage:
        currentPage > 1,

      suppliers,
    });
  } catch (error) {
    console.error(
      "Get Suppliers Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch suppliers",
      error: error.message,
    });
  }
};

// =====================================================
// GET SUPPLIER BY ID
// =====================================================

const getSupplierById = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message:
          "Invalid supplier ID",
      });
    }

    const supplier =
      await populateSupplier(
        Supplier.findById(id)
      );

    if (!supplier) {
      return res.status(404).json({
        message:
          "Supplier not found",
      });
    }

    return res.status(200).json({
      message:
        "Supplier fetched successfully",
      supplier,
    });
  } catch (error) {
    console.error(
      "Get Supplier Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch supplier",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE SUPPLIER
// =====================================================

const updateSupplier = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message:
          "Invalid supplier ID",
      });
    }

    const supplier =
      await Supplier.findById(id);

    if (!supplier) {
      return res.status(404).json({
        message:
          "Supplier not found",
      });
    }

    const {
      supplierCode,
      name,
      supplierType,
      company,
      contactPerson,
      address,
      website,
      destinations,
      services,
      currency,
      paymentTerms,
      cancellationPolicy,
      creditLimit,
      outstandingAmount,
      rating,
      status,
      notes,
      owner,
    } = req.body;

    // -------------------------------------------------
    // Supplier code
    // -------------------------------------------------

    if (
      supplierCode !== undefined
    ) {
      const normalizedCode =
        normalizeString(
          supplierCode
        )?.toUpperCase();

      if (!normalizedCode) {
        return res.status(400).json({
          message:
            "Supplier code cannot be empty",
        });
      }

      const duplicate =
        await Supplier.findOne({
          supplierCode:
            normalizedCode,
          _id: {
            $ne: id,
          },
        }).select("_id");

      if (duplicate) {
        return res.status(409).json({
          message:
            "Supplier code already exists",
        });
      }

      supplier.supplierCode =
        normalizedCode;
    }

    // -------------------------------------------------
    // Name
    // -------------------------------------------------

    if (name !== undefined) {
      const normalizedName =
        normalizeString(name);

      if (!normalizedName) {
        return res.status(400).json({
          message:
            "Supplier name cannot be empty",
        });
      }

      supplier.name =
        normalizedName;
    }

    // -------------------------------------------------
    // Supplier type
    // -------------------------------------------------

    if (
      supplierType !==
      undefined
    ) {
      if (
        !validateSupplierType(
          supplierType
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid supplier type",
          allowedTypes:
            SUPPLIER_TYPES,
        });
      }

      supplier.supplierType =
        supplierType;
    }

    // -------------------------------------------------
    // Company
    // -------------------------------------------------

    if (
      company !== undefined
    ) {
      const companyError =
        await validateCompany(
          company
        );

      if (companyError) {
        return res.status(400).json({
          message:
            companyError,
        });
      }

      supplier.company =
        company || null;
    }

    // -------------------------------------------------
    // Contact person
    // -------------------------------------------------

    if (
      contactPerson !==
      undefined
    ) {
      const emailError =
        validateEmail(
          contactPerson?.email,
          "Contact person email"
        );

      if (emailError) {
        return res.status(400).json({
          message:
            emailError,
        });
      }

      const currentContact =
        supplier.contactPerson?.toObject
          ? supplier.contactPerson.toObject()
          : supplier.contactPerson || {};

      supplier.contactPerson = {
        ...currentContact,
        ...contactPerson,
      };

      if (
        supplier.contactPerson.email
      ) {
        supplier.contactPerson.email =
          String(
            supplier.contactPerson.email
          )
            .trim()
            .toLowerCase();
      }

      if (
        supplier.contactPerson.name
      ) {
        supplier.contactPerson.name =
          String(
            supplier.contactPerson.name
          ).trim();
      }

      if (
        supplier.contactPerson.designation
      ) {
        supplier.contactPerson.designation =
          String(
            supplier.contactPerson.designation
          ).trim();
      }

      if (
        supplier.contactPerson.phone
      ) {
        supplier.contactPerson.phone =
          String(
            supplier.contactPerson.phone
          ).trim();
      }

      if (
        supplier.contactPerson.alternatePhone
      ) {
        supplier.contactPerson.alternatePhone =
          String(
            supplier.contactPerson.alternatePhone
          ).trim();
      }

      if (
        supplier.contactPerson.whatsapp
      ) {
        supplier.contactPerson.whatsapp =
          String(
            supplier.contactPerson.whatsapp
          ).trim();
      }
    }

    // -------------------------------------------------
    // Address
    // -------------------------------------------------

    if (
      address !== undefined
    ) {
      const currentAddress =
        supplier.address?.toObject
          ? supplier.address.toObject()
          : supplier.address || {};

      supplier.address = {
        ...currentAddress,
        ...address,
      };

      Object.keys(
        supplier.address
      ).forEach((key) => {
        if (
          supplier.address[key] !==
          undefined &&
          supplier.address[key] !==
          null
        ) {
          supplier.address[key] =
            String(
              supplier.address[key]
            ).trim();
        }
      });

      if (
        !supplier.address.country
      ) {
        supplier.address.country =
          "India";
      }
    }

    // -------------------------------------------------
    // Website
    // -------------------------------------------------

    if (
      website !== undefined
    ) {
      supplier.website =
        normalizeString(
          website
        );
    }

    // -------------------------------------------------
    // Destinations
    // -------------------------------------------------

    if (
      destinations !==
      undefined
    ) {
      supplier.destinations =
        normalizeArray(
          destinations
        ) || [];
    }

    // -------------------------------------------------
    // Services
    // -------------------------------------------------

    if (
      services !== undefined
    ) {
      supplier.services =
        normalizeArray(
          services
        ) || [];
    }

    // -------------------------------------------------
    // Currency
    // -------------------------------------------------

    if (
      currency !== undefined
    ) {
      supplier.currency =
        normalizeString(
          currency
        )?.toUpperCase() ||
        "INR";
    }

    // -------------------------------------------------
    // Payment terms
    // -------------------------------------------------

    if (
      paymentTerms !==
      undefined
    ) {
      supplier.paymentTerms =
        normalizeString(
          paymentTerms
        );
    }

    // -------------------------------------------------
    // Cancellation policy
    // -------------------------------------------------

    if (
      cancellationPolicy !==
      undefined
    ) {
      supplier.cancellationPolicy =
        normalizeString(
          cancellationPolicy
        );
    }

    // -------------------------------------------------
    // Credit limit
    // -------------------------------------------------

    if (
      creditLimit !==
      undefined
    ) {
      const error =
        validateNumber(
          creditLimit,
          "Credit limit",
          0
        );

      if (error) {
        return res.status(400).json({
          message: error,
        });
      }

      supplier.creditLimit =
        Number(
          creditLimit
        );
    }

    // -------------------------------------------------
    // Outstanding amount
    // -------------------------------------------------

    if (
      outstandingAmount !==
      undefined
    ) {
      const error =
        validateNumber(
          outstandingAmount,
          "Outstanding amount",
          0
        );

      if (error) {
        return res.status(400).json({
          message: error,
        });
      }

      supplier.outstandingAmount =
        Number(
          outstandingAmount
        );
    }

    // -------------------------------------------------
    // Rating
    // -------------------------------------------------

    if (
      rating !== undefined
    ) {
      const error =
        validateNumber(
          rating,
          "Rating",
          0,
          5
        );

      if (error) {
        return res.status(400).json({
          message: error,
        });
      }

      supplier.rating =
        Number(rating);
    }

    // -------------------------------------------------
    // Status
    // -------------------------------------------------

    if (
      status !== undefined
    ) {
      if (
        !validateSupplierStatus(
          status
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid supplier status",
          allowedStatuses:
            SUPPLIER_STATUSES,
        });
      }

      supplier.status =
        status;
    }

    // -------------------------------------------------
    // Notes
    // -------------------------------------------------

    if (
      notes !== undefined
    ) {
      supplier.notes =
        normalizeString(
          notes
        );
    }

    // -------------------------------------------------
    // Owner
    // -------------------------------------------------

    if (
      owner !== undefined
    ) {
      const ownerError =
        await validateOwner(
          owner
        );

      if (ownerError) {
        return res.status(400).json({
          message:
            ownerError,
        });
      }

      supplier.owner =
        owner || null;
    }

    // -------------------------------------------------
    // Save
    // -------------------------------------------------

    await supplier.save();

    const updatedSupplier =
      await populateSupplier(
        Supplier.findById(
          supplier._id
        )
      );

    return res.status(200).json({
      message:
        "Supplier updated successfully",
      supplier:
        updatedSupplier,
    });
  } catch (error) {
    console.error(
      "Update Supplier Error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "Supplier code already exists",
      });
    }

    return res.status(500).json({
      message:
        "Failed to update supplier",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE SUPPLIER
// =====================================================

const deleteSupplier = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message:
          "Invalid supplier ID",
      });
    }

    const supplier =
      await Supplier.findById(id);

    if (!supplier) {
      return res.status(404).json({
        message:
          "Supplier not found",
      });
    }

    await Supplier.findByIdAndDelete(
      id
    );

    return res.status(200).json({
      message:
        "Supplier deleted successfully",
      supplierId: id,
    });
  } catch (error) {
    console.error(
      "Delete Supplier Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to delete supplier",
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
    const users =
      await User.find({
        isActive: true,
        role: {
          $in: ASSIGNABLE_ROLES,
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
        "Assignable users fetched successfully",

      count:
        users.length,

      users,
    });
  } catch (error) {
    console.error(
      "Get Supplier Assignable Users Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch assignable users",
      error: error.message,
    });
  }
};

// =====================================================
// GET SUPPLIER TYPES
// =====================================================

const getSupplierTypes = (
  req,
  res
) => {
  return res.status(200).json({
    message:
      "Supplier types fetched successfully",

    supplierTypes:
      SUPPLIER_TYPES,
  });
};

// =====================================================
// GET SUPPLIER STATUSES
// =====================================================

const getSupplierStatuses = (
  req,
  res
) => {
  return res.status(200).json({
    message:
      "Supplier statuses fetched successfully",

    supplierStatuses:
      SUPPLIER_STATUSES,
  });
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  getAssignableUsers,
  getSupplierTypes,
  getSupplierStatuses,
};