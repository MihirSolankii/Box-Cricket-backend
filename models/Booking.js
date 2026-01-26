import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  bookingSource: {
    type: String,
    enum: ["ONLINE", "OFFLINE"],
    default: "ONLINE",
  },
  guestDetails: {
    name: { type: String },
    phone: { type: String }, 
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

  // Booking details
  date: { type: String, required: true },         // "2025-02-14"
  startTime: { type: String, required: true },    // "17:00"
  endTime: { type: String, required: true },      // "18:00"
  duration: { type: Number, required: true },     // in hours

  pricePerHour: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  // Group System
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  groupMembers: [          // nickname or userId
    {
      memberId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      status: { type: String, enum: ["pending", "accepted", "blocked"], default: "pending" },
      unpaidWarnings: { type: Number, default: 0 }
    }
  ],
   contactNumber: { type: String },
   paymentStatus:{
     type:String,
     enum: ["pending", "success", "cancelled"],
     default: "pending",

   },
   paymentId:String,
   orderId:String,
  bookingStatus: {
    type: String,
    enum: ["upcoming", "completed", "cancelled"],
    default: "upcoming",
  },
  payoutStatus:{
     type: String,
    enum: ["paid", "pending"],
    default: "pending",
  },
 bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: {
      type: Date,
      index: { expires: 0 } // MongoDB auto delete
    },
 
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
