import mongoose from "mongoose";
 
const bookingSchema = new mongoose.Schema({
  // 1. User ID ને Optional બનાવો (કેમ કે ઓફલાઈન વાળા પાસે ID નહિ હોય)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Changed from true to false
  },
 
  // 2. Booking Source ઉમેરો (ઓળખવા માટે)
  bookingSource: {
    type: String,
    enum: ["ONLINE", "OFFLINE"],
    default: "ONLINE",
    required: true
  },
 
  // 3. Offline/Guest User Details (ખાસ ફોન નંબર માટે)
  guestDetails: {
    name: { type: String },
    phone: { type: String }, // આના પરથી આપણે ટ્રેક કરીશું
  },
 
  box: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Box",
    required: true,
  },
 
  courtId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
 
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  duration: { type: Number, required: true },
 
  pricePerHour: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
 
  // Group System (Optional)
  groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  groupMembers: [
    {
      memberId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      status: { type: String, enum: ["pending", "accepted", "blocked"], default: "pending" },
      unpaidWarnings: { type: Number, default: 0 }
    }
  ],
 
  // જો ઓનલાઈન હોય તો user નો નંબર, ઓફલાઈન હોય તો guestDetails નો નંબર અહી કોપી કરી શકાય
  contactNumber: { type: String, required: true },
 
  paymentStatus: {
    type: String,
    enum: ["pending", "success", "cancelled", "partially_paid"], // Offline માટે partially_paid ઉમેરી શકાય
    default: "pending",
  },
  paymentId: String,
  orderId: String,
 
  // 4. Booking Status માં 'noshow' ઉમેરો
  bookingStatus: {
    type: String,
    enum: ["upcoming", "completed", "cancelled", "noshow"], // "noshow" એટલે બુક કરીને ના આવ્યો
    default: "upcoming",
  },
 
  payoutStatus: {
    type: String,
    enum: ["paid", "pending"],
    default: "pending",
  },
 
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: {
    type: Date,
    index: { expires: 0 }
  },
 
  createdAt: { type: Date, default: Date.now }
});
 
const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;