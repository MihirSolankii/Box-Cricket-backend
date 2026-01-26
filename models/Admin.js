import mongoose from "mongoose";
import BaseUser from './BaseUser.js';

const adminSchema = new mongoose.Schema({
 BankAccount:{type:String},
  IFSCode:{type:String},
  // razorPayContactId: { type: String, unique: true, sparse: true },
  // razorPayFundAccountId:{type:String},
  
  isOnBoardforPayout:{type:Boolean,default:false},
  boxSchemas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Box" }],
  adminApproved: { type: String,enum: ['pending', 'prfile_completed', 'rejected','approved'], default: 'pending' },
});
 const Admin = BaseUser.discriminator("admin", adminSchema);
  export default Admin; 