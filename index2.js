// /controllers/adminProfileAndBoxController.js

import mongoose, { Schema } from 'mongoose';
// Ensure these imports point to your correctly defined models
import Box from '../models/Box.js';       // Your Box Schema model
import Admin from '../models/Admin.js';   // Admin Discriminator model
import User from '../models/User.js';     // User Discriminator model (needed for conversion)
// You may need to import Schema/mongoose directly if not available globally
// import { Schema } from 'mongoose'; 

// --- PLACEHOLDER: Google Places API Fetch ---
// You MUST implement this function to make the actual HTTP call to Google
const fetchPlaceDetailsFromGoogle = async (placeId) => {
    console.log(`Fetching details for Place ID: ${placeId}`);
    
    // Returning Mock Data Structure based on Google's API response
    return {
        name: 'Fetched Box Name (e.g., Rajpath Box Cricket)',
        fullAddress: '123 Turf Street, Rajkot, Gujarat',
        latitude: 22.0,
        longitude: 70.0,
        // Assuming City, State, Pincode are parsed from fullAddress if needed
        city: 'Rajkot', 
        state: 'Gujarat',
        pincode: '360001',
        averageRating: 4.5, // Fetched from Google
        totalReviews: 150
    };
};

/**
 * POST /api/profile/admin/complete
 * Completes Admin Profile (saves Razorpay ID) AND creates the first Box listing.
 * This function performs the model CONVERSION from 'user' to 'admin'.
 */
export const completeAdminProfileAndBox = async (req, res) => {
    const userId = req.user.id; // ID of the user currently logged in (role: 'user')
    const { 
        razorpayAccountId, 
        googlePlaceId, 
        pricePerHour, 
        courts, 
        amenities,
        description,
        operatingHours,
        // User can optionally submit address components to override Google's
        address: customAddress
    } = req.body;

    // 1. Validation
    if (!razorpayAccountId || !googlePlaceId || !pricePerHour || !courts || courts.length === 0) {
        return res.status(400).json({ 
            message: 'Razorpay ID, Place ID, Price/Hour, and Court details are mandatory for listing.' 
        });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // A. CONVERT THE USER MODEL & SAVE ADMIN FIELDS
        // We assume the user hit this route because their role is still 'user' but their intent was 'admin'.
        const convertedAdmin = await Admin.findOneAndUpdate(
            { _id: userId, role: 'user' }, 
            {
                $set: { 
                    role: 'admin', // 🚨 Change the discriminator key
                    razorpayAccountId: razorpayAccountId,
                    isVerified: true, // Auto-approve verification flag
                    adminApprovalStatus: 'manually_approved', // Auto-approve status (as proxy)
                },
                $unset: { nickname: "", location: "" } // Clean up unnecessary player fields
            },
            { new: true, runValidators: true, session, overwriteDiscriminatorKey: true } 
        );

        if (!convertedAdmin) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'User not found or already an admin. Conversion aborted.' });
        }

        // B. FETCH GOOGLE DATA
        const placeDetails = await fetchPlaceDetailsFromGoogle(googlePlaceId);
        if (!placeDetails) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Could not fetch essential details for this Place ID.' });
        }

        // C. CREATE THE BOX DOCUMENT (Merging API data with Admin input)
        const newBox = new Box({
            admin: convertedAdmin._id,
            googlePlaceId: googlePlaceId,
            
            // Editable fields provided by user (can override API data)
            name: name || placeDetails.name,
            description: description,
            pricePerHour: pricePerHour,
            courts: courts,
            amenities: amenities || [],
            operatingHours: operatingHours,
            
            // Data fetched from Google (used as fallback/initial data)
            location: {
                type: 'Point',
                coordinates: [placeDetails.longitude, placeDetails.latitude] 
            },
            address: { 
                street: customAddress?.street,
                city: customAddress?.city || placeDetails.city,
                state: customAddress?.state || placeDetails.state,
                pincode: customAddress?.pincode || placeDetails.pincode,
                fullAddress: customAddress?.fullAddress || placeDetails.fullAddress
            },
            
            // Rating (fetched data)
            averageRating: placeDetails.averageRating,
            totalReviews: placeDetails.totalReviews
        });

        const savedBox = await newBox.save({ session });

        // D. LINK BOX TO ADMIN
        convertedAdmin.boxSchemas.push(savedBox._id);
        await convertedAdmin.save({ session });

        // E. Commit and Finish
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ 
            success: true,
            message: 'Box Owner profile and first Box listing completed successfully. Ready for bookings!',
            admin: convertedAdmin,
            box: savedBox
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        if (error.code === 11000) { 
             return res.status(400).json({ message: 'A profile or location with this ID is already registered.' });
        }
        console.error('Box completion error:', error);
        res.status(500).json({ message: `Failed to complete profile: ${error.message}` });
    }
};