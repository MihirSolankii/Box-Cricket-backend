import mongoose from "mongoose";
import BaseUser from './BaseUser.js';
const userSchema = new mongoose.Schema({
 nickname: { type: String, unique: true, sparse: true },
 friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },

});


 const User = BaseUser.discriminator("user", userSchema);
 export default User;