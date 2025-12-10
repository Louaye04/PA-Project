const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const USERS_DB_PATH = path.join(__dirname, "../data/users.json");

async function ensureAdmin() {
  try {
    let users = [];
    if (fs.existsSync(USERS_DB_PATH)) {
      const raw = fs.readFileSync(USERS_DB_PATH, "utf8");
      users = JSON.parse(raw || "[]");
    } else {
      // ensure data directory exists
      const dataDir = path.dirname(USERS_DB_PATH);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    }

    const adminEmail = "admin@gmail.com";
    const existing = users.find(
      (u) => String(u.email || "").toLowerCase() === adminEmail.toLowerCase()
    );
    if (existing) {
      console.log("Admin account already exists:", existing.email);
      process.exit(0);
    }

    const plain = "Admin123";
    const hash = bcrypt.hashSync(plain, 10);

    const nextId =
      users.reduce((max, u) => Math.max(max, Number(u.id || 0)), 0) + 1;

    const adminUser = {
      id: nextId,
      email: adminEmail,
      password: hash,
      name: "Admin",
      roles: ["admin"],
      role: "admin",
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
    };

    users.push(adminUser);

    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(users, null, 2), "utf8");

    console.log("Admin user created:");
    console.log("  email:", adminUser.email);
    console.log("  password:", plain);
    process.exit(0);
  } catch (err) {
    console.error("Failed to create admin user:", err);
    process.exit(1);
  }
}

ensureAdmin();
