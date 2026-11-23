require("dotenv").config();

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("JWT_SECRET must be set and contain at least 32 characters.");
}

module.exports = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  jwtSecret: secret,
  databasePath: process.env.POCKETTRACK_DB_PATH || null,
  isProduction: process.env.NODE_ENV === "production"
});
