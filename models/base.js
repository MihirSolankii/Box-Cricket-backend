// ==================== BASE ACCOUNT SCHEMA (Common for both) ====================
const baseAccountSchema = {
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  
  // Verification fields
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetToken: String,
  otp: String,
  otpExpires: Date,
  
  // OAuth fields
  googleId: String,
  facebookId: String,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};


// ==================== USER SCHEMA ====================
const userSchema = new Schema({
  ...baseAccountSchema,
  
  nickname: { type: String, unique: true, sparse: true }, // For friend search
  
  // Location for nearby search
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  
  // Friends list
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  
  // User preferences
  preferences: {
    notificationsEnabled: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true }
  }
});

// Geospatial index for location-based search
userSchema.index({ location: '2dsphere' });
userSchema.index({ nickname: 1 });


// ==================== ADMIN SCHEMA ====================
const adminSchema = new Schema({
  ...baseAccountSchema,
  
  // Business details
  businessName: { type: String, required: true },
  businessRegistrationNumber: String,
  
  // Admin specific location (business address)
  businessAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    fullAddress: String
  },
  
  // Document verification (for admin approval)
  documents: [{
    type: { type: String, enum: ['aadhar', 'pan', 'gst', 'business_license'] },
    documentUrl: String,
    isVerified: { type: Boolean, default: false }
  }],
  
  // Admin status
  isApproved: { type: Boolean, default: false }, // Super admin approval
  approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  approvedAt: Date,
  
  // Bank details for payments
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String
  },
  
  // Statistics
  totalBoxes: { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 }
});

adminSchema.index({ email: 1 });
adminSchema.index({ isVerified: 1, isApproved: 1 });


// ==================== BOX/TURF SCHEMA ====================
const boxSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  
  // Admin who owns this box
  admin: { 
    type: Schema.Types.ObjectId, 
    ref: 'Admin', 
    required: true 
  },
  
  // Location details
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
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
    isAvailable: { type: Boolean, default: true }
  }],
  
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
  totalReviews: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Geospatial index for nearby search
boxSchema.index({ location: '2dsphere' });
boxSchema.index({ admin: 1 });


// ==================== BOOKING SCHEMA ====================
const bookingSchema = new Schema({
  box: { 
    type: Schema.Types.ObjectId, 
    ref: 'Box', 
    required: true 
  },
  courtNumber: { type: Number, required: true },
  
  // User who made the booking
  bookedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Friends added to the booking
  participants: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  
  // Booking details
  bookingDate: { type: Date, required: true },
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true },   // "11:00"
  duration: { type: Number, required: true },  // in hours
  
  // Payment
  totalAmount: { type: Number, required: true },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'pending' 
  },
  paymentId: String,
  paymentMethod: String,
  paidAt: Date,
  
  // Booking status
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'], 
    default: 'pending' 
  },
  
  // Expense split group reference
  expenseGroup: { 
    type: Schema.Types.ObjectId, 
    ref: 'ExpenseGroup' 
  },
  
  // Admin reference (from box)
  admin: { 
    type: Schema.Types.ObjectId, 
    ref: 'Admin' 
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

bookingSchema.index({ box: 1, bookingDate: 1 });
bookingSchema.index({ bookedBy: 1 });
bookingSchema.index({ admin: 1 });


// ==================== EXPENSE GROUP SCHEMA (Splitwise-like) ====================
const expenseGroupSchema = new Schema({
  booking: { 
    type: Schema.Types.ObjectId, 
    ref: 'Booking', 
    required: true 
  },
  
  totalAmount: { type: Number, required: true },
  
  // Who paid initially
  paidBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Split details
  splits: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    isPaid: { type: Boolean, default: false },
    paidAt: Date
  }],
  
  // Settlement tracking
  settlements: [{
    from: { type: Schema.Types.ObjectId, ref: 'User' },
    to: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    settledAt: { type: Date, default: Date.now }
  }],
  
  isSettled: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

expenseGroupSchema.index({ booking: 1 });


// ==================== PLAYER FINDER SCHEMA (Optional Feature) ====================
const playerFinderSchema = new Schema({
  box: { 
    type: Schema.Types.ObjectId, 
    ref: 'Box', 
    required: true 
  },
  
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  matchDate: { type: Date, required: true },
  matchTime: String,
  
  playersNeeded: { type: Number, required: true },
  currentPlayers: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  
  description: String,
  skillLevel: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced', 'any'],
    default: 'any'
  },
  
  status: { 
    type: String, 
    enum: ['open', 'full', 'cancelled'], 
    default: 'open' 
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

playerFinderSchema.index({ matchDate: 1, status: 1 });
playerFinderSchema.index({ box: 1 });


// ==================== REVIEW SCHEMA ====================
const reviewSchema = new Schema({
  box: { 
    type: Schema.Types.ObjectId, 
    ref: 'Box', 
    required: true 
  },
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  booking: { 
    type: Schema.Types.ObjectId, 
    ref: 'Booking' 
  },
  
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
  images: [String],
  
  // Admin response
  adminResponse: {
    message: String,
    respondedAt: Date
  },
  
  createdAt: { type: Date, default: Date.now }
});

reviewSchema.index({ box: 1 });
reviewSchema.index({ user: 1, box: 1 }, { unique: true });


// ==================== NOTIFICATION SCHEMA ====================
const notificationSchema = new Schema({
  recipient: { 
    type: Schema.Types.ObjectId, 
    required: true 
  },
  recipientModel: {
    type: String,
    enum: ['User', 'Admin'],
    required: true
  },
  
  type: { 
    type: String, 
    enum: ['booking', 'payment', 'friend_request', 'player_request', 'expense', 'review', 'general'],
    required: true 
  },
  
  title: String,
  message: String,
  
  relatedId: Schema.Types.ObjectId,
  relatedModel: String, // 'Booking', 'ExpenseGroup', etc.
  
  isRead: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ recipient: 1, recipientModel: 1, isRead: 1 });


// ==================== FRIEND REQUEST SCHEMA ====================
const friendRequestSchema = new Schema({
  from: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  to: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });
friendRequestSchema.index({ to: 1, status: 1 });


// ==================== EXPORT ====================
module.exports = {
  User: mongoose.model('User', userSchema),
  Admin: mongoose.model('Admin', adminSchema),
  Box: mongoose.model('Box', boxSchema),
  Booking: mongoose.model('Booking', bookingSchema),
  ExpenseGroup: mongoose.model('ExpenseGroup', expenseGroupSchema),
  PlayerFinder: mongoose.model('PlayerFinder', playerFinderSchema),
  Review: mongoose.model('Review', reviewSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  FriendRequest: mongoose.model('FriendRequest', friendRequestSchema)
};