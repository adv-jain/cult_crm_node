
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // User authenticated nahi hai
    if (!req.user) {
      return res.status(401).json({
        message: "Not authorized"
      });
    }

    // User ka role allowed nahi hai
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    next();
  };
};

module.exports = authorize;

