import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
    name: {
    type: String,
    required: true,
    trim: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
    unique: true
  },

  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true
  },

//   members: [
//     {
//       user: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User"
//       },
//       role: {
//         type: String,
//         enum: ["admin", "player"],
//         default: "player"
//       }
//     }
//   ],

  invites: [
    {
      nickname: String,
      invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
      },
      inviteeId: { type: mongoose.Schema.Types.ObjectId, ref: "user" }, // <--- ADD THIS (The Friend)
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending"
      }
    }
  ],
   settlement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Settlement",
    default: null
  },

  status: {
    type: String,
    enum: ["active", "completed"],
    default: "active"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Group", groupSchema);
