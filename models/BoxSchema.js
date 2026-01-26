import mongoose from "mongoose";
const boxSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  
  phoneno: { type: String },
  
  googlePlaceId: { type: String, required: true, unique: true },
  // Admin who owns this box
  admin: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'admin', 
    required: true 
  },
  
  mapurl: { type: String },
  // Location details
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  address: {
    fullAddress: String
  },
  
  // Pricing
  pricePerHour: { type: Number, required: true },
  
  // Amenities
  amenities: [{
    name: String, // e.g., "Parking", "Washroom", "Lighting", "Seating"
    available: { type: Boolean, default: true }
  }],
  
  // Court/Turf details
  courts: [{
    courtNumber: { type: Number, required: true },
    courtName: String,
    surfaceType: String, // Grass, Artificial turf, Concrete
    isAvailable: { type: Boolean, default: true },
    maxPlayers:{type:Number,required:true},
   images: [String],
  }],
   timeSlots: [{
    date: { type: String },       // "2025-02-14"
    startTime: { type: String },  // "17:00"
    endTime: { type: String },
    reason :{type:String},     // "18:00"
  }]
  ,
  // Availability
  isActive: { type: Boolean, default: true },
  operatingHours: {
    monday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    friday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, isClosed: { type: Boolean, default: false } }
  },
  
  // Images
  images: [String],
  
  // Rating
  averageRating: { type: Number, default: 0 },
  reviews: [
    {
      author_name: String,
      rating: Number,
      text: String,
      time: String, // optional: timestamp of review
      profile_photo_url: String, // optional: reviewer image
    },
  ],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


const Box = mongoose.model('Box', boxSchema);

export default Box;