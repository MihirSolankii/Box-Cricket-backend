import BaseUser from '../models/BaseUser.js';
import User from '../models/User.js';

 const UserProfile = async (req, res) => {
    const userId= req.user.id;
    const { nickname, latitude, longitude } = req.body;

    if (!nickname || !nickname.trim()) {
        return res.status(400).json({ 
            success: false,
            message: 'Nickname is required to complete your player profile.' 
        });
    }
    try {
        const updateDoc = { nickname: nickname.trim() };

        if (latitude !== undefined && longitude !== undefined && latitude !== '' && longitude !== '') {
            const lat = parseFloat(latitude);
            const lng = parseFloat(longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                updateDoc.location = {
                    type: 'Point',
                    coordinates: [lng, lat]
                };
            }
        }
        
        // 2. Find and update the user document
        const updatedUser = await User.findOneAndUpdate(
            { _id: userId, role: 'user' }, 
            updateDoc,
            { new: true, runValidators: true } 
        ).select('-password -verificationToken'); 

        if (!updatedUser) {
        
            return res.status(403).json({ 
                success: false,
                message: 'Access denied or profile already complete. User role required.' 
            });
        }

        // 3. Success Response
        res.status(200).json({
            success: true,
            message: 'Player profile completed successfully. Welcome to the app!',
            user: {
                id: updatedUser._id,
                email: updatedUser.email,
                nickname: updatedUser.nickname,
                // Only return basic location data
                coordinates: updatedUser.location.coordinates 
            }
        });

    } catch (error) {
        // Handle duplicate nickname error (code 11000)
        if (error.code === 11000) { 
             return res.status(400).json({ 
                 success: false,
                 message: `The nickname '${req.body.nickname}' is already taken.` 
             });
        }
        console.error('Error completing user profile:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error while saving profile details.' 
        });
    }
}
export default UserProfile;