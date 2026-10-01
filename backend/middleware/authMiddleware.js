const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized, token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // console.log("JWT DECODED USER:", decoded);

    // JWT me id ho ya _id, dono handle honge
    req.user = {
      ...decoded,
      _id: decoded._id || decoded.id || decoded.userId,
    };

    // Agar kisi bhi form me user ID nahi mili
    if (!req.user._id) {
      return res.status(401).json({
        message: "User ID not found in authentication token",
      });
    }

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);

    return res.status(401).json({
      message: "Not authorized, invalid token",
    });
  }
};

module.exports = protect;