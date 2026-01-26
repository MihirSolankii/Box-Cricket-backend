

import Admin from '../models/Admin.js';
import BaseUser from '../models/BaseUser.js';
import Box from '../models/BoxSchema.js';
import mongoose from 'mongoose';


// export const AdminProfile = async (req, res) => {
//   const adminId = req.user?.id;

//   const {
//     BankAccount,
//     IFSCode,
//     name,
//     location,
//     pricePerHour,
//     courts,
//     amenities,
//     isActive,
//     description,
//   } = req.body;

//   // Basic validations
//   if (!BankAccount || !IFSCode) {
//     return res.status(400).json({
//       success: false,
//       message: 'BankAccount and IFSCode are required to complete your admin profile.',
//     });
//   }

//   if (pricePerHour && pricePerHour < 0) {
//     return res.status(400).json({
//       success: false,
//       message: 'Price per hour cannot be negative.',
//     });
//   }

//   if (!courts || !amenities || !description || isActive === undefined) {
//     return res.status(400).json({
//       success: false,
//       message: 'Please provide all box details: courts, amenities, description, and isActive status.',
//     });
//   }

//   if (!adminId) {
//     return res.status(401).json({
//       success: false,
//       message: 'Unauthorized. Admin ID missing.',
//     });
//   }

//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
  
//     const admin = await Admin.findOneAndUpdate(
//       { _id: adminId, role: 'admin' },
//       {
//         $set: {
//           BankAccount,
//           IFSCode,
//           adminApproved: 'approved', 
//         },
//       },
//       { new: true, runValidators: true, session }
//     );

//     if (!admin) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(404).json({
//         success: false,
//         message: 'Admin not found. Profile completion aborted.',
//       });
//     }

    
//     // const placeDetails = await SearchBoxCricketByName(name, location);

//     const placeDetails =await Box.findOne({name})
//     console.log("placeetails are the main thing",placeDetails);

   
    
//     const geoLocation = await getLocation(location);
//     // console.log("geoLocation",geoLocation);

//     if (!placeDetails) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(404).json({
//         success: false,
//         message: 'Could not fetch essential details for this Place.',
//       });
//     }
// const place_id="oiewnfgowenf"
  
//     const newBox = new Box({
//       name: name || placeDetails.name,
      
//       description: description || '',
//       pricePerHour: pricePerHour || 0,
//       courts: courts || [],
//       amenities:   amenities || [],
//       isActive: typeof isActive === 'boolean' ? isActive : true,
//       admin: admin._id,
//       googlePlaceId: placeDetails.placeId || place_id,
//       phoneno: placeDetails.phone || '',
//       mapurl: placeDetails.map_url || '',

//       location: {
//         type: 'Point',
//         coordinates: [
//           parseFloat(placeDetails.geometry?.location?.lng || geoLocation?.lng || 0),
//           parseFloat(placeDetails.geometry?.location?.lat || geoLocation?.lat || 0),
//         ],
//       },

//       address: {
//         fullAddress: placeDetails.address || '',
//       },

//       images:Array.isArray(placeDetails.photos) ? placeDetails.photos : [],

//       operatingHours:
//         placeDetails.opening_hours || {},

//       averageRating: placeDetails.rating || 0,
//       reviews:
//         placeDetails.reviews?.map((r) => ({
//           author_name: r.author_name,
//           rating: r.rating,
//           text: r.text,
//           time: new Date(r.time * 1000).toISOString(),
//           profile_photo_url: r.profile_photo_url,
//         })) || [],
//     });

//     const savedBox = await newBox.save({ session });

//     admin.boxSchemas.push(savedBox._id);
// await admin.save({ session });
//     await session.commitTransaction();
//     session.endSession();

//     return res.status(200).json({
//       success: true,
//       message: 'Box Owner profile and first Box listing completed successfully.',
//       box: savedBox,
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error('AdminProfile Error:', error); 
//     return res.status(500).json({
//       success: false,
//       message: 'Server error during admin profile completion.',
//       error: error.message,
//     });
//   }
// };




export const AdminProfile = async (req, res) => {
  const adminId = req.user?.id;
  
  // Define your Default "Unclaimed" Admin ID constant
  const DEFAULT_ADMIN_ID = "694bda65aa02ea75e83c960e"; 

  const {
    BankAccount,
    IFSCode,
    boxId,        // <-- SELECTED BOX ID
    // pricePerHour,
    // courts,
    // amenities,
    // isActive,
    // description,
  } = req.body;

  if (!adminId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (!BankAccount || !IFSCode) {
    return res.status(400).json({
      success: false,
      message: "BankAccount and IFSCode are required",
    });
  }

  if (!boxId) {
    return res.status(400).json({
      success: false,
      message: "Please select a box to claim",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Update admin profile (Bank Details)
    const admin = await Admin.findOneAndUpdate(
      { _id: adminId, role: "admin" },
      {
        $set: {
          BankAccount,
          IFSCode,
          adminApproved: "approved",
        },
      },
      { new: true, session }
    );

    if (!admin) throw new Error("Admin not found");

    // 2️⃣ Find existing box
    const box = await Box.findById(boxId).session(session);

    if (!box) {
      throw new Error("Box not found");
    }

    // 3️⃣ Check if already claimed
    // LOGIC UPDATE:
    // We throw an error ONLY if:
    // 1. An admin exists on the box
    // 2. That admin is NOT the current user requesting the claim
    // 3. That admin is NOT the default placeholder ID
    if (box.admin && 
        box.admin.toString() !== adminId && 
        box.admin.toString() !== DEFAULT_ADMIN_ID) {
      
      return res.status(400).json({
        success: false,
        message: "This box is already claimed by another admin",
      });
    }

    // 4️⃣ Assign ownership
    // This overwrites the Default ID with the Real Admin ID
    box.admin = adminId;

    // Optional initial updates
    // if (pricePerHour !== undefined) box.pricePerHour = pricePerHour;
    // if (courts) box.courts = courts;
    // if (amenities) box.amenities = amenities;
    // if (description) box.description = description;
    // if (typeof isActive === "boolean") box.isActive = isActive;

    await box.save({ session });

    // 5️⃣ Link box to admin (if not already linked)
    if (!admin.boxSchemas.includes(box._id)) {
      admin.boxSchemas.push(box._id);
      await admin.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Box claimed successfully. You are now the owner.",
      box,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




// In your backend controller file (e.g., boxController.js)

export const searchBoxes = async (req, res) => {
  const { query } = req.query;
  const DEFAULT_ADMIN_ID = "694bda65aa02ea75e83c960e"; // The ID that means "Unclaimed"

  if (!query) {
    return res.json({ success: true, boxes: [] });
  }

  try {
    const boxes = await Box.find({
      name: { $regex: query, $options: "i" }
    })
      .select("_id name address.fullAddress admin")
      .limit(10)
      .lean(); // IMPORTANT: returns plain JS objects so we can modify 'admin'

    // Transform the data for the frontend
    const processedBoxes = boxes.map((box) => ({
      ...box,
      // If the admin matches the Default ID, send 'null' (Claimable). 
      // Otherwise, send the ID (Taken).
      admin: box.admin && box.admin.toString() === DEFAULT_ADMIN_ID ? null : box.admin,
    }));

    return res.json({
      success: true,
      boxes: processedBoxes,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
};
