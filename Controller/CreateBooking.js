
import Razorpay from "razorpay";
import Box from "../models/BoxSchema.js";
import Booking from "../models/Booking.js";
import Group from "../models/Group.js";
import mongoose from "mongoose";


 const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});


// Helper function to parse date and time into Date object
const parseDateTime = (dateStr, timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date;
};
const calculateDuration = (startTime, endTime) => {
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  return (end - start) / (1000 * 60 * 60);
};

// Helper function to check if two time ranges overlap
const hasTimeOverlap = (start1, end1, start2, end2) => {
  return (start1 < end2) && (end1 > start2);
};

export const isAvailableBooking = async (req, res) => {
  const boxId = req.params.boxId;
  const { date, startTimes, endTimes, courtId } = req.body;

  try {
    
    if (!date || !startTimes || !endTimes) {
      return res.status(400).json({
        success: false,
        message: "Date, start time, and end time are required"
      });
    }

    // Find the box
    const box = await Box.findById(boxId);
    console.log("box id not foune",box);
    
    if (!box) {
      return res.status(404).json({
        success: false,
        message: "Box not found"
      });
    }

    // Parse requested time range
    const requestStart = parseDateTime(date, startTimes);
    const requestEnd = parseDateTime(date, endTimes);
    const now = new Date();

    // Validate time range
    if (requestStart < now) {
      return res.status(200).json({
        success: true,
        isAvailable: false,
        message: "Booking time cannot be in the past"
      });
    }

    if (requestEnd <= requestStart) {
      return res.status(200).json({
        success: true,
        isAvailable: false,
        message: "End time must be after start time"
      });
    }

    // Get day of week and check operating hours
   const dayOfWeek = requestStart
  .toLocaleDateString('en-US', { weekday: 'long' })
  .toLowerCase();

const operatingHour = box.operatingHours[dayOfWeek];
   
   if (!operatingHour) {
  return res.status(200).json({
    success: true,
    isAvailable: false,
    message: "Operating hours not configured for this day"
  });
}

    if (operatingHour?.isClosed) {
      return res.status(200).json({
        success: true,
        isAvailable: false,
        message: `Box is closed on ${dayOfWeek}s`
      });
    }

    // if (operatingHour?.open && operatingHour?.close) {
    //   const openTime = parseDateTime(date, operatingHour.open);
    //   const closeTime = parseDateTime(date, operatingHour.close);

    //   if (requestStart < openTime || requestEnd > closeTime) {
    //     return res.status(200).json({
    //       success: true,
    //       isAvailable: false,
    //       message: `Booking must be within operating hours: ${operatingHour.open} - ${operatingHour.close}`
    //     });
    //   }
    // }

    // Check if specific court is requested
    let availableCourts = [];
    
    if (courtId) {
      // Check specific court
      const court = box.courts.id(courtId);
      console.log("court found",court);
      
      if (!court) {
        return res.status(404).json({
          success: false,
          message: "Court not found"
        });
      }
      
      if (!court.isAvailable) {
        return res.status(200).json({
          success: true,
          isAvailable: false,
          message: `${court.courtName || 'Court'} is not available`
        });
      }
      
      availableCourts = [court];
    } else {
      // Get all available courts
      availableCourts = box.courts.filter(court => court.isAvailable);
      
      if (availableCourts.length === 0) {
        return res.status(200).json({
          success: true,
          isAvailable: false,
          message: "All courts are currently unavailable"
        });
      }
    }

    // Check for blocked time slots
    const hasBlockedSlot = box.timeSlots.some(slot => {
      if (slot.date === date) {
        const slotStart = parseDateTime(slot.date, slot.startTime);
        const slotEnd = parseDateTime(slot.date, slot.endTime);
        return hasTimeOverlap(requestStart, requestEnd, slotStart, slotEnd);
      }
      return false;
    });

    

    if (hasBlockedSlot) {
      return res.status(200).json({
        success: true,
        isAvailable: false,
        message: "This time slot is blocked for maintenance or other reasons"
      });
    }

    // Check existing bookings for the requested date and time
    // const existingBookings = await Booking.find({
    //   box: boxId,
    //   date: date,
    //   bookingStatus: { $ne: 'cancelled' }
    // });
    // console.log("existingbooking",existingBookings);
    

 
    console.log(boxId);
    console.log(courtId);
    console.log(date);
    console.log("sgtart tume ",requestStart);
    console.log("end time :",requestEnd);
   
    
  
    // Check availability
// const requestStart = parseDateTime(date, startTime);
// const requestEnd = parseDateTime(date, endTime);



const sample = await Booking.findOne({});
console.log("---------------------------------sample start----------------------------");

console.log(sample);
console.log("---------------------sample end==------------------------------");

console.log({
  boxIdType: typeof boxId,
  courtIdType: typeof courtId,
  startTimes,
  endTimes,
});
 
const existingBookings = await Booking.find({
  box: new mongoose.Types.ObjectId(boxId),
  courtId: new mongoose.Types.ObjectId(courtId), 

  bookingStatus: { $ne: "cancelled" },

  // ✅ CORRECT overlap logic
  startTime: { $lt: endTimes},
  endTime: { $gt: startTimes },


  $or: [
    { paymentStatus: "success" },
    {
      paymentStatus: "pending",
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
    }
  ]
});



    console.log({
  requestStart,
  requestEnd,
  isoStart: requestStart.toISOString(),
  isoEnd: requestEnd.toISOString()
});

    console.log("exisitng bookings",existingBookings);
    

    // const requestStart = parseDateTime(date, startTime);
    // const requestEnd = parseDateTime(date, endTime);

    // Check for overlaps
    const hasConflict = existingBookings.some(booking => {
      const bookingStart = parseDateTime(booking.date, booking.startTime);
      const bookingEnd = parseDateTime(booking.date, booking.endTime);
      return (requestStart < bookingEnd) && (requestEnd > bookingStart);
    });

    if (hasConflict) {
      return res.status(200).json({
        success: false,
        message: "Time slot is already booked or temporarily held"
      });
    }

  
       // // Find which courts have conflicting bookings
    const courtsWithConflicts = new Set();
    
    existingBookings.forEach(booking => {
      const bookingStart = parseDateTime(booking.date, booking.startTime);
      const bookingEnd = parseDateTime(booking.date, booking.endTime);
      
      if (hasTimeOverlap(requestStart, requestEnd, bookingStart, bookingEnd)) {
        courtsWithConflicts.add(booking.courtId.toString());
      }
    });
   

     const court = box.courts.id(courtId);
    if (!court) {
      return res.status(404).json({ success: false, message: "Court not found" });
    }

    // Find available courts (no conflicts)
    const finalAvailableCourts = availableCourts.filter(
      court => !courtsWithConflicts.has(court._id.toString())
    );

    if (finalAvailableCourts.length === 0) {
      return res.status(200).json({
        success: true,
        isAvailable: false,
        message: courtId 
          ? "This court is already booked for the selected time slot"
          : "All courts are booked for the selected time slot",
        availableCourts: []
      });
    }

    // Success - courts available
    return res.status(200).json({
      success: true,
      isAvailable: true,
      message: "Court(s) available for booking",
      availableCourts: finalAvailableCourts.map(court => ({
        courtId: court._id,
        courtNumber: court.courtNumber,
        courtName: court.courtName,
        surfaceType: court.surfaceType,
        maxPlayers: court.maxPlayers
      })),
      pricePerHour: box.pricePerHour
    });

  } catch (error) {
    console.log("isAvailableBooking error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while checking availability",
      error: error.message
    });
  }
};

export const offlinebooking=async(req,res)=>{ 
  const userId=req.user.id;
  const { boxId, courtId, date, startTime, endTime,  guestDetails } = req.body;
  try {
    // Validate input
    if (!boxId || !courtId  || !date || !startTime || !endTime  || !guestDetails) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }
    const box = await Box.findById(boxId);
    if (!box) {
      return res.status(404).json({ success: false, message: "Box not found" });
    }
    if(!courtId){
       return res.status(400).json({
        success: false,
        message: "Court ID is required"
      });
    }
   //check if the booking user is own that box thaen only booking done
   if(box.admin.toString()!==userId){
     return res.status(403).json({
        success: false,
        message: "You are not authorized to  dirctly book on this box"
      });
   }
    const court = box.courts.id(courtId);
    if (!court) {
      return res.status(404).json({ success: false, message: "Court not found" });
    }
    // Calculate pricing
    const duration = calculateDuration(startTime, endTime);
    const totalAmount = duration * box.pricePerHour;
    // Create booking 
    const booking = new Booking({
      user: userId,
      box: boxId,
      courtId: courtId,
      date,
      startTime,
      endTime,
      duration,
      pricePerHour: box.pricePerHour,
      totalAmount,
      paymentStatus: 'pending',
      bookingStatus: 'completed',
      bookedBy: userId,
      bookingSource: "OFFLINE",
      guestDetails: guestDetails
    });
    await booking.save();
    return res.status(201).json({
      success: true,
      message: "Offline booking created successfully",
      booking
    });
  } catch (error) {
    console.error("offlinebooking error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating offline booking",
      error: error.message
    });
  }
}

export const temporaryBooking= async(req,res)=>{
  const { boxId, courtId, date, startTime, endTime, userId } = req.body;

  try {
    // Validate input
    if (!boxId || !courtId  || !date || !startTime || !endTime || !userId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if(!boxId){
       return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const box = await Box.findById(boxId);
    if (!box) {
      return res.status(404).json({ success: false, message: "Box not found" });
    }

    const court = box.courts.id(courtId);
    if (!court) {
      return res.status(404).json({ success: false, message: "Court not found" });
    }

    // Check availability
   const existingBookings = await Booking.find({
  box: boxId,
  courtId,
  date, // "2026-01-01"
  bookingStatus: { $ne: "cancelled" },
  $or: [
    { paymentStatus: "success" },
    {
      paymentStatus: "pending",
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
    }
  ],
  // OVERLAP LOGIC
  startTime: { $lt: endTime }, // "13:00" < "14:00"
  endTime: { $gt: startTime }  // "14:00" > "13:00"
});

console.log("existing bookings:", existingBookings);


    const requestStart = parseDateTime(date, startTime);
    const requestEnd = parseDateTime(date, endTime);

    // Check for overlaps
    const hasConflict = existingBookings.some(booking => {
      const bookingStart = parseDateTime(booking.date, booking.startTime);
      const bookingEnd = parseDateTime(booking.date, booking.endTime);
      return (requestStart < bookingEnd) && (requestEnd > bookingStart);
    });

    if (hasConflict) {
      return res.status(200).json({
        success: false,
        message: "Time slot is already booked or temporarily held"
      });
    }

    // Calculate pricing
    const duration = calculateDuration(startTime, endTime);
    const totalAmount = duration * box.pricePerHour;

    // Create temporary booking
    const tempBooking = new Booking({
      user: userId,
      box: boxId,
      courtId: courtId,
      date,
      startTime,
      endTime,
      duration,
      pricePerHour: box.pricePerHour,
      totalAmount,
      paymentStatus: 'pending',
      bookingStatus: 'upcoming',
      bookedBy: userId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    await tempBooking.save();

    // Set expiry time (15 minutes from now)
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000);

    return res.status(201).json({
      success: true,
      message: "Temporary booking created. Complete payment within 15 minutes",
      booking: tempBooking,
      expiryTime,
      expiresIn: "15 minutes"
    });

  } catch (error) {
    console.error("createTemporaryBooking error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
}
export const confirmBooking=async(req,res)=>{
  
  const { bookingId, paymentId, orderId } = req.body;

  try {
    if (!bookingId || !paymentId || !orderId) {
      return res.status(400).json({
        success: false,
        message: "Missing payment details"
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    if (booking.paymentStatus === "success") {
      return res.status(400).json({
        success: false,
        message: "Booking already confirmed"
      });
    }

    //  Check expiration
    if (booking.expiresAt && booking.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Booking expired"
      });
    }

    booking.paymentStatus = "success";
    booking.bookingStatus="completed";
    booking.paymentId = paymentId;
    booking.orderId = orderId;

    //  REMOVE TTL (important)
    booking.expiresAt = null;

    await booking.save();

   

    res.status(200).json({
      success: true,
      message: "Booking confirmed",
      booking
    });

  } catch (error) {
    console.error("confirmBooking:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }


}
export const getBookingStatus=async(req,res)=>{
  const { bookingId } = req.params;

  try {
    const booking = await Booking.findById(bookingId)
      

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or expired"
      });
    }

    res.status(200).json({
      success: true,
      booking,
      PaymentStatus: booking.paymentStatus === "success",
      BookingStatus:booking.bookingStatus==="completed",
      expiresAt: booking.expiresAt
    });

  } catch (error) {
    console.error("getBookingStatus:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }

}


export const Mybooking = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await Booking.find({
      user: userId,
      paymentStatus: "success",
    })
      .sort({ createdAt: -1 });

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No successful bookings found",
      });
    }

    const bookingsWithStatus = await Promise.all(
      bookings.map(async (booking) => {
        const boxDetails = await Box.findById(booking.box);
        const status = new Date(booking.date) > new Date() ? "upcoming" : "past";
        return {
          ...booking.toObject(),
          status,
          boxName: boxDetails?.name || "Unknown"
        };
      })
    );

    const box_name = bookingsWithStatus.map(b => b.boxName);
    


    res.status(200).json({
      success: true,
      bookings: bookingsWithStatus,
      boxNames: box_name
    });
  } catch (error) {
    console.error("Mybooking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const cancelTemporary=async(req,res)=>{
    const { bookingId } = req.params;
  const { userId } = req.body;

  try {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    if (booking.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    if (booking.paymentStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only temporary bookings can be cancelled"
      });
    }

    await Booking.findByIdAndDelete(bookingId);

    res.status(200).json({
      success: true,
      message: "Temporary booking cancelled"
    });

  } catch (error) {
    console.error("cancelTemporaryBooking:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }

}

// export const CancelBooking=async(req,res)=>{
   
// }

export const createBookingOrder = async (req, res) => {
  const { bookingId } = req.body;

  console.log("booking Id from frotned ",bookingId);
  
  const booking = await Booking.findById(bookingId);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const order = await razorpay.orders.create({
    amount: booking.totalAmount*100 ,
    currency: "INR",
    receipt: `booking_${bookingId}`,
  });


  console.log("razorpay er`ror ",order);
  
  booking.orderId = order.id;
  await booking.save();

  res.json({
    success: true,
    order,
  });
};





