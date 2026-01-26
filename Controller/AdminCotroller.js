import Admin from '../models/Admin.js';
import BaseUser from '../models/BaseUser.js';
import Booking from '../models/Booking.js';
import Box from '../models/BoxSchema.js';

import mongoose from 'mongoose';

export const updateBoxDetails=async(req,res)=>{
    const adminId= req.user.id;
    const boxId =req.params.boxId;

     const {
    name,
    description,
    pricePerHour,
    courts,
    amenities,
    isActive
  } = req.body;

    if (!mongoose.Types.ObjectId.isValid(boxId)) {
    return res.status(400).json({ success: false, message: 'Invalid Box ID' });
  }
  try {
    const box=await Box.findOne({ _id: boxId, admin: adminId });
    if(!box){
        return res.status(404).json({ success: false, message: 'Box not found or access denied' });
    }

    
     if (name) box.name = name;
    if (description) box.description = description;
    if (pricePerHour !== undefined) box.pricePerHour = pricePerHour;
    if (courts) box.courts = courts;
    if (amenities) box.amenities = amenities;
    
    if (isActive !== undefined) box.isActive = isActive;
     box.updatedAt = new Date();

     const updatedBox = await box.save();
     return res.status(200).json({ success: true, message: 'Box details updated successfully', box: updatedBox });
    
  } catch (error) {
     console.error('updateBoxDetails error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}
export const updateCourtAvailability=async(req,res)=>{
    const adminId= req.user.id;
    const boxId =req.params.boxId;
    const {  courtNumber, isAvailable } = req.body;

  if (!mongoose.Types.ObjectId.isValid(boxId)) {
    return res.status(400).json({ success: false, message: 'Invalid Box ID' });
  }
  try {
    
    const box=await Box.findOne({ _id: boxId, admin: adminId });
    if(!box){
        return res.status(404).json({ success: false, message: 'Box not found or access denied' });
    }
    const court=box.courts.find(courts=>courts.courtNumber===courtNumber);
    if(!court){
        return res.status(404).json({ success: false, message: 'Court not found' });
    }
    court.isAvailable=isAvailable;
    box.updatedAt = new Date();
    const updatedBox = await box.save();
     return res.status(200).json({ success: true, message: 'Court availability updated successfully', box: updatedBox });

  } catch (error) {
       console.error('updateBoxDetails error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }

}

export const updateOperatingHours=async(req,res)=>{
    const adminId= req.user.id;
    const boxId =req.params.boxId;
    console.log(boxId);
    
    const operatingHours = req.body;
     console.log("operating hours .......",operatingHours);
    if (!mongoose.Types.ObjectId.isValid(boxId)) {
    return res.status(400).json({ success: false, message: 'Invalid Box ID' });
  }
  try {
    const box=await Box.findOne({_id:boxId,admin:adminId});
    if(!box){
        return res.status(404).json({ success: false, message: 'Box not found or access denied' });
    }
    box.operatingHours = operatingHours;
    box.updatedAt = new Date();
    const updatedBox = await box.save();
     return res.status(200).json({ success: true, message: 'Operating hours updated successfully', box: updatedBox });
  } catch (error) {
      console.error('updateBoxDetails error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}

export const DeleteBox =async(req,res)=>{
    const adminId= req.user.id;
    const boxId =req.params.boxId;
    if (!mongoose.Types.ObjectId.isValid(boxId)) {
    return res.status(400).json({ success: false, message: 'Invalid Box ID' });
  }
  try {
    const box=await Box.findOneAndDelete({ _id: boxId, admin: adminId });
    if(!box){
        return res.status(404).json({ success: false, message: 'Box not found or access denied' });
    }
    await Admin.findByIdAndUpdate(adminId, { $pull: { boxes: boxId } });
    return res.status(200).json({ success: true, message: 'Box deleted successfully' });

  } catch (error) {
    console.error('deleteBox error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}
// export const myturfbooking=async(req,res)=>{
//   const adminId= req.user.id;
//   try {
//    //find boxes of this admin
//     const boxes=await Box.find({admin:adminId}).select('_id name');
//     const boxIds=boxes.map(box=>box._id);
    



//     //find bookings for these boxes
//     const bookings=await Booking.find({box:{$in:boxIds}})
    
    
//     //from booking courtid get the court details from box 
//     const bookingsWithCourtDetails=await Promise.all(bookings.map(async(booking)=>{
//         const box=await Box.findById(booking.box);
        

           
//         const court=box.courts.find(c=>c._id.toString()===booking.courtId.toString());
      
//         return {
//             ...booking._doc,
//             boxName:box.name,
//             courtDetails:court
//         }
//     }));

//     return res.status(200).json({ success: true, bookings: bookingsWithCourtDetails });

//   } catch (error) {
//      console.log(error);
//      return res.status(500).json({ success: false, message: 'Server error', error: error.message });
//   }
// }

export const myturfbooking = async (req, res) => {
  const adminId = req.user.id;

  try {
    // 1️⃣ Fetch ALL boxes owned by this admin
    // We get full details (not just _id) because you need them for the TurfManagement forms
    const boxes = await Box.find({ admin: adminId }).lean();

    // If no boxes, return empty arrays immediately
    if (!boxes || boxes.length === 0) {
      return res.status(200).json({ 
        success: true, 
        boxes: [], 
        bookings: [] 
      });
    }

    // Extract IDs for the booking query
    const boxIds = boxes.map((box) => box._id);

    // 2️⃣ Fetch ALL bookings for these boxes in one go
    const bookings = await Booking.find({ box: { $in: boxIds } })
      .sort({ createdAt: -1 }) // Optional: Sort by newest first
      .lean();

    // 3️⃣ Merge Data in Memory (No more DB calls inside loop)
    const bookingsWithCourtDetails = bookings.map((booking) => {
      // Find the specific box from our already fetched 'boxes' array
      const relatedBox = boxes.find(
        (b) => b._id.toString() === booking.box.toString()
      );

      let courtDetails = null;
      let boxName = "Unknown Box";

      if (relatedBox) {
        boxName = relatedBox.name;
        
        // Find the specific court within that box
        // Checks both courtNumber (if number) or _id (if string)
        if (relatedBox.courts) {
          courtDetails = relatedBox.courts.find(
            (c) => c._id.toString() === booking.courtId?.toString() || 
                   c.courtNumber === booking.courtId
          );
        }
      }

      return {
        ...booking,
        boxName,
        courtDetails,
      };
    });

    // 4️⃣ Return BOTH data sets
    return res.status(200).json({
      success: true,
      boxes: boxes,                     // <--- Used for Dropdown & Forms
      bookings: bookingsWithCourtDetails // <--- Used for Dashboard/Calendar
    });

  } catch (error) {
    console.error("MyTurfBooking Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch data", 
      error: error.message 
    });
  }
};

export const getTurfsByUser = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find turfs created by this user
    const turfs = await Box.find({ admin: userId });

    if (!turfs || turfs.length === 0) {
      return res.status(404).json({
        data: [],
        turfId: null,
      });
    }

    const turfId = turfs[0]._id;

    return res.status(200).json({
      data: turfs,
      turfId,
    });
  } catch (error) {
    console.error("Error fetching user turfs:", error);
    return res.status(500).json({
      data: [],
      turfId: null,
    });
  }
};

export const analyticsDashboard=async(req,res)=>{
  const adminId= req.user.id;
  try {
    
    const turf=await Box.find({admin:adminId});
    const turfIds=turf.map(t=>t._id);
    const bookings=await Booking.find({box:{$in:turfIds}});
    //calculate total earnings
    let totalEarnings=0;
    bookings.forEach(booking=>{
      totalEarnings+=booking.totalAmount;
    });
    //calaculate total bookings
    const totalBookings=bookings.length;
    //calculate upcoming bookings
    const currentDate=new Date();
    const upcomingBookings=bookings.filter(booking=>booking.startTime>currentDate).length;
    

    return res.status(200).json({
      success:true,
      data:{
        totalEarnings,
        totalBookings,
        upcomingBookings,
      }
    })

  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}



