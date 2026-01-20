// Global error observers - MUST be first to catch all errors
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err.message);
  console.error(err.stack);
  // Don't exit in development to make debugging easier
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  // Don't exit in development to make debugging easier
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
});

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const dhRoutes = require("./routes/dh.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const webhookRoutes = require("./routes/webhook.routes");
const userRoutes = require("./routes/user.routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();
let PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
// Avoid accidentally binding backend to frontend dev port (3000)
if (PORT === 3000) {
  console.warn('Warning: PORT 3000 is typically used by the frontend dev server. Forcing backend to use 5000 to avoid conflict.');
  PORT = 5000;
}

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Log all requests in development
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting during local development or for specific endpoints
  skip: (req) => {
    if (process.env.NODE_ENV === 'development') return true;
    if (req.originalUrl && req.originalUrl.startsWith('/api/dh/messages')) return true;
    return false;
  }
});
app.use("/api/", limiter);

// Polling-intensive DH message endpoint gets its own higher limit
const dhMessageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // allow frequent polling without tripping the general limiter
  message: "Trop de requêtes vers les messages sécurisés, réduisez la fréquence des polling.",
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/dh/messages', dhMessageLimiter);

// Body parser middleware
// Allow very large payloads when requested (WARNING: large values may exhaust memory).
// 20 TB = 20 * 1024^4 = 21990232555520 bytes
const LARGE_UPLOAD_LIMIT_BYTES = '21990232555520';
app.use(express.json({ limit: LARGE_UPLOAD_LIMIT_BYTES }));
app.use(express.urlencoded({ extended: true, limit: LARGE_UPLOAD_LIMIT_BYTES }));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dh", dhRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/users", userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const BIND_HOST = process.env.BIND_HOST || "0.0.0.0";

if (require.main === module) {
  app.listen(PORT, BIND_HOST, () => {
    console.log(`✓ Server running on ${BIND_HOST}:${PORT}`);
    console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
