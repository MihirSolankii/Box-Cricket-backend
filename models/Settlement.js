// models/Settlement.js
import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ["UPI", "Cash", "Bank Transfer", "Other"],
      required: true
    },
    paidAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["success", "failed", "refunded"],
      default: "success"
    }
  },
  { _id: false }
);

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user"
    },
    nickname: String,

    amountOwed: {
      type: Number,
      required: true
    },

    amountPaid: {
      type: Number,
      default: 0
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid"],
      default: "pending"
    },

    transactions: [transactionSchema]
  },
  { _id: false }
);

const settlementSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true,
    index: true
  },

  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
    index: true
  },

  totalAmount: {
    type: Number,
    required: true
  },

  splitType: {
    type: String,
    enum: ["equal", "custom", "percentage"],
    default: "equal"
  },

  participants: [participantSchema],

  paidBy: {
    // Admin who initially paid full amount
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true
  },

  settlementStatus: {
    type: String,
    enum: ["pending", "partial", "completed"],
    default: "pending"
  },


  completedAt: Date,

  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null }, // Link to DB Document
  matchStringId: { type: String, default: null }, // Link to Socket Room ID

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Settlement", settlementSchema);
