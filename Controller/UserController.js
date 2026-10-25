import BaseUser from '../models/BaseUser.js';
import Admin from '../models/Admin.js';
import Box from '../models/BoxSchema.js';
import User from '../models/User.js';
// import getLocationFromAddress from '../utils/Geocoding.js';
// import { searchBoxCricketNearby } from '../utils/googleApi.js';
// import {fetchPlaceDetailsFromGoogle,searchBoxCricketbyCity} from "../utils/googleApi.js"
 import client from '../middleware/redis.js';
export const getAllboxes=async(req,res,next)=>{


  try {
   const { lat, lng } = req.body;

    if (!lat || !lng) {
      const cacheKey = "boxesList_all";
      try {
        const cachedBoxes = await client.get(cacheKey);
        if (cachedBoxes) {
          return res.status(200).json({
            success: true,
            message: "boxes from cache",
            boxes: JSON.parse(cachedBoxes),
            fromCache: true
          });
        }
      } catch (cacheErr) {
        console.warn("Redis cache read error:", cacheErr.message);
      }

      const boxes = await Box.find({ isActive: true });

      try {
        await client.setex(cacheKey, 3600, JSON.stringify(boxes));
      } catch (cacheErr) {
        console.warn("Redis cache write error:", cacheErr.message);
      }

      return res.status(200).json({
        success: true,
        boxes,
        fromCache: false
      });
    }

    // Create a unique cache key based on coordinates
    const cacheKey = `boxesList_${lat}_${lng}`;
    
    // Check if data exists in cache for this specific location
    try {
      const cachedBoxes = await client.get(cacheKey);
      if (cachedBoxes) {
        return res.status(200).json({
          success: true,
          message: "boxes from cache",
          boxes: JSON.parse(cachedBoxes),
          fromCache: true
        });
      }
    } catch (cacheErr) {
      console.warn("Redis cache read error:", cacheErr.message);
    }

    // Fetch fresh data if not in cache
    // const boxesList = await searchBoxCricketNearby(lat, lng);
     //in this update the box based on box loactio in db
     const coordinates=[lat,lng];
   
   const boxes = await Box.find({
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)] // [lng, lat]
          },
          $maxDistance: 10000 // 5 km radius
        }
      }
    });
      
    // Cache with location-specific key for 1 hour
    await client.setex(cacheKey, 3600, JSON.stringify(boxes));

    return res.status(200).json({
      success: true,
      boxes,
      fromCache: false
    });
      
  } catch (error) {
    console.error("getallboxes error:", error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching boxes',
      error: error.message
    });
  }
}

export const getRegsiterdBoxes = async (req, res) => {

   
    const{lat,lng}=req.boy
    //  const nearbyBoxes = req.boxesList;
    const userId = req.user.id;
    try {
        // const user = await User.findById(userId);
        // if (!user) {
        //     return res.status(404).json({
        //         success: false,
        //         message: 'User not found'
        //     });
        // }

        if (!Array.isArray(user.location.coordinates) || user.location.coordinates.length < 2) {
            return res.status(400).json({
                success: false,
                message: "User coordinates not found or incomplete"
            });
        }

//         const [lng, lat] = user.location.coordinates;
//         console.log("user coordinates", lat, lng);
// const [userLng, userLat] = user.location.coordinates;
// console.log(userLng,userLat);





 const boxes = await Box.find({
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)] // [lng, lat]
          },
          $maxDistance: 5000 // 5 km radius
        }
      }
    });
        return res.status(200).json({
            success: true,
            nearbyBoxes,
            boxes
        });

    } catch (error) {
        console.error("getallboxes error:", error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching boxes',
            error: error.message
        });
    }
}

export const getBoxDetails=async(req,res)=>{
  try {
    
    const{id}=req.params;


    const box=await Box.findById(id);

      if (!box) {
      return res.status(404).json({
        success: false,
        message: "Box not found"
      });
    }
     res.status(200).json({
      success: true,
      box
    });
  } catch (error) {
     res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

// export const cityBasedBoxes=async(req,res)=>{
//   try {
//     const{city}=req.body; 
//     const boxes=await searchBoxCricketbyCity(city);
  


  
//     if(boxes.length===0){
//       return res.status(404).json({
//         success:false,
//         message:"No boxes found for this city"
//       });
//     }
//       res.status(200).json({
//       success: true,
//       boxes
//     });
//   } catch (error) {
//      res.status(500).json({
//       success: false, });
//       console.log(error);
//      }
//     }
      
export const getAllboxDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Place id is required",
      });
    }

    // 1. Fetch from Google Places
    // const googleData = await fetchPlaceDetailsFromGoogle(id);

    // 2. Check in DB
    const box = await Box.findOne({ googlePlaceId: id });

    // 3. Build unified response
    let unifiedData;

    // if (box) {
    //   // Box is registered - use DB data with Google fallbacks
    //   unifiedData = {
    //     _id: box._id,
    //     googlePlaceId: box.googlePlaceId,
    //     name: box.name || googleData.name,
    //     description: box.description || googleData.editorial_summary?.overview || "No description available",
    //     address: {
    //       fullAddress: box.address?.fullAddress || googleData.formatted_address,
    //       city: box.address?.city || googleData.address_components?.find(c => c.types.includes('locality'))?.long_name,
    //       state: box.address?.state || googleData.address_components?.find(c => c.types.includes('administrative_area_level_1'))?.long_name,
    //       pincode: box.address?.pincode || googleData.address_components?.find(c => c.types.includes('postal_code'))?.long_name,
    //     },
    //     phoneno: box.phoneno || googleData.formatted_phone_number || googleData.international_phone_number,
    //     images: box.images?.length > 0 
    //       ? box.images 
    //       : googleData.photos?.map(p => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${process.env.GOOGLE_API_KEY}`) || [],
    //     amenities: box.amenities || [],
    //     pricePerHour: box.pricePerHour || 0,
    //     averageRating: box.rating || googleData.rating || 0,
    //     reviews: box.reviews?.length > 0 ? box.reviews : (googleData.reviews || []),
    //     location: box.location || {
    //       type: "Point",
    //       coordinates: [googleData.geometry?.location?.lng, googleData.geometry?.location?.lat]
    //     },
    //     openingHours: googleData.current_opening_hours || googleData.opening_hours,
    //     courts: box.courts || [],
    //     isRegistered: true,
    //     boxId: box._id
    //   };
    // } else {
    //   // Box NOT registered - use Google data only
    //   unifiedData = {
    //     googlePlaceId: id,
    //     name: googleData.name,
    //     description: googleData.editorial_summary?.overview || "No description available",
    //     address: {
    //       fullAddress: googleData.formatted_address,
    //       city: googleData.address_components?.find(c => c.types.includes('locality'))?.long_name || '',
    //       state: googleData.address_components?.find(c => c.types.includes('administrative_area_level_1'))?.long_name || '',
    //       pincode: googleData.address_components?.find(c => c.types.includes('postal_code'))?.long_name || '',
    //     },
    //     phoneno: googleData.formatted_phone_number || googleData.international_phone_number || null,
    //     images: googleData.photos?.map(p => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${process.env.GOOGLE_API_KEY}`) || [],
    //     amenities: [],
    //     pricePerHour: 0,
    //     averageRating: googleData.rating || 0,
    //     reviews: googleData.reviews || [],
    //     location: {
    //       type: "Point",
    //       coordinates: [googleData.geometry?.location?.lng, googleData.geometry?.location?.lat]
    //     },
    //     openingHours: googleData.current_opening_hours || googleData.opening_hours,
    //     // courts: box.courts || [],
    //     isRegistered: false,
    //     boxId: null
    //   };
    // }

        unifiedData = {
        _id: box._id,
        googlePlaceId: box.googlePlaceId,
        name: box.name ,
        description: box.description ||  "No description available",
        address: {
          fullAddress: box.address?.fullAddress
          // city: box.address?.city || googleData.address_components?.find(c => c.types.includes('locality'))?.long_name,
          // state: box.address?.state || googleData.address_components?.find(c => c.types.includes('administrative_area_level_1'))?.long_name,
          // pincode: box.address?.pincode || googleData.address_components?.find(c => c.types.includes('postal_code'))?.long_name,
        },
        phoneno: box.phoneno ,
        images: box.images?.length > 0 
          ? box.images 
          : googleData.photos?.map(p => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${process.env.GOOGLE_API_KEY}`) || [],
        amenities: box.amenities || [],
        pricePerHour: box.pricePerHour || 0,
        averageRating: box.rating || 0,
        reviews: box.reviews?.length > 0 ? box.reviews :  [],
        location: box.location ,
        openingHours: box.operatingHours ,
        courts: box.courts || [],
        isRegistered: true,
        boxId: box._id
      };




    const cacheKey = `boxDetails_${id}`;
    const cachedData = await client.get(cacheKey);
//add into redis cache
if(cachedData){
  return res.status(200).json({
    success: true,
    response: JSON.parse(cachedData),
  });
} 
    await client.setex(cacheKey, 3600, JSON.stringify(unifiedData));
    return res.status(200).json({
      success: true,
      response: unifiedData, 
      // googleData:googleData,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch box details",
    });
  }
};
// export const updateUserDetails =async(req,res)=>{
//   const userid=req.user.id;
// const {nickname,email}=req.body;
// const  user=await User.findById(userid);
// console.log(user);
// if(!user){
//   return res.json({
//     success:false,
//     message:"uSER NOT FOUND"
//   })
// }


// }

