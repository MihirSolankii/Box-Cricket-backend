import { GoogleAuth } from "google-auth-library";
import mongoose from "mongoose";
const baseOptions = {
  discriminatorKey: "role", // this will tell Mongoose which model it is
  collection: "accounts",   // optional: store both in same collection
};
const baseUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetToken: String,
  otp: String,
  phoneNumber: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  otpExpires: Date,
},baseOptions)
const BaseUser = mongoose.model("BaseUser", baseUserSchema);
export default BaseUser;







