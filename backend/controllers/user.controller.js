const fs = require("fs").promises;
const path = require("path");

const USERS_FILE = path.join(__dirname, "../data/users.json");

/**
 * Get all users (admin only)
 * Excludes sensitive fields like password, totpSecret
 */
exports.getAllUsers = async (req, res) => {
  try {
    console.log("=== getAllUsers called ===");
    console.log("User from token:", req.user);
    console.log("Reading file from:", USERS_FILE);

    const data = await fs.readFile(USERS_FILE, "utf8");
    const users = JSON.parse(data);

    console.log(`Found ${users.length} users in database`);

    // Remove sensitive fields
    const sanitizedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles || (user.role ? [user.role] : ["buyer"]),
      role: user.role,
      mfaEnabled: user.mfaEnabled || false,
      birthCity: user.birthCity,
      createdAt: user.createdAt,
    }));

    console.log("Sending response with", sanitizedUsers.length, "users");

    res.status(200).json({
      success: true,
      users: sanitizedUsers,
      total: sanitizedUsers.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

/**
 * Get user statistics
 */
exports.getUserStats = async (req, res) => {
  try {
    console.log("=== getUserStats called ===");
    console.log("User from token:", req.user);

    const data = await fs.readFile(USERS_FILE, "utf8");
    const users = JSON.parse(data);

    console.log(`Calculating stats for ${users.length} users`);

    const stats = {
      total: users.length,
      buyers: 0,
      sellers: 0,
      admins: 0,
      both: 0,
      mfaEnabled: 0,
    };

    users.forEach((user) => {
      const userRoles = user.roles || (user.role ? [user.role] : ["buyer"]);

      if (userRoles.includes("admin")) {
        stats.admins++;
      }
      if (userRoles.includes("buyer") && userRoles.includes("seller")) {
        stats.both++;
      } else if (userRoles.includes("buyer")) {
        stats.buyers++;
      } else if (userRoles.includes("seller")) {
        stats.sellers++;
      }

      if (user.mfaEnabled) {
        stats.mfaEnabled++;
      }
    });

    console.log("Stats calculated:", stats);

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user statistics",
      error: error.message,
    });
  }
};
