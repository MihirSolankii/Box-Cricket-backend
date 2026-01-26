// /utils/googleApi.js

import fetch from "node-fetch"; 
import dotenv from "dotenv";
dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; 


export const searchBoxCricketNearby = async (latitude, longitude, radius = 5000) => {
    if (!latitude || !longitude || !GOOGLE_API_KEY) {
        throw new Error("Location coordinates or Google API Key is missing.");
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
                `location=${latitude},${longitude}&radius=${radius}&keyword=box cricket&key=${GOOGLE_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            console.error("Google Nearby Search Error:", data.status, data.error_message);
            return [];
        }

        return data.results.map(place => ({
            placeId: place.place_id,
            name: place.name,
            address: place.vicinity,
            rating: place.rating || 0,
            totalReviews: place.user_ratings_total || 0,
            location: place.geometry?.location
        }));
    } catch (error) {
        console.error("Fetch error in Nearby Search:", error.message);
        return [];
    }
};

// searchBoxCricketByName

export const searchBoxCricketByName = async (query, latitude = null, longitude = null) => {
    if (!query || !GOOGLE_API_KEY) {
        throw new Error("Search query or Google API Key is missing.");
    }

    // Add "box cricket" to query if not already included
    const searchQuery = query.toLowerCase().includes('box') ? query : `${query} box cricket`;
    
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?` +
              `query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}`;
    
    // If location provided, bias results towards that location
    if (latitude && longitude) {
        url += `&location=${latitude},${longitude}&radius=10000`;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            console.error("Google Text Search Error:", data.status, data.error_message);
            return [];
        }

        return data.results.map(place => ({
            placeId: place.place_id,
            name: place.name,
            address: place.formatted_address,
            rating: place.rating || 0,
            totalReviews: place.user_ratings_total || 0,
            location: place.geometry?.location
        }));
    } catch (error) {
        console.error("Fetch error in Text Search:", error.message);
        return [];
    }
};


export const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                reject(new Error(`Geolocation error: ${error.message}`));
            }
        );
    });
};

export const fetchPlaceDetailsFromGoogle = async (placeId) => {
    if (!placeId || !GOOGLE_API_KEY) {
        throw new Error("Place ID or Google API Key is missing.");
    }
    
    const fields = [
        'name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total', 
        'international_phone_number', 'place_id', 'opening_hours', 'photos', 'website'
    ];
    
    const url = `https://maps.googleapis.com/maps/api/place/details/json?` +
                `place_id=${placeId}&key=${GOOGLE_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK' || !data.result) {
            console.error("Google API Error:", data.status, data.error_message);
            return null;
        }

        const result = data.result;

        return {
            name: result.name,
            googlePlaceId: result.place_id,
            fullAddress: result.formatted_address,
            latitude: result.geometry?.location?.lat,
            longitude: result.geometry?.location?.lng,
            averageRating: result.rating || 0,
            totalReviews: result.user_ratings_total || 0,
            phoneNumber: result.international_phone_number || result.formatted_phone_number || 'N/A',
            website: result.website || 'N/A',
            openingHours: result.opening_hours?.weekday_text || [],
            photos: result.photos?.map(photo => ({
                reference: photo.photo_reference,
                width: photo.width,
                height: photo.height
            })) || []
        };
    } catch (error) {
        console.error("Fetch error in Google API call:", error.message);
        return null;
    }
};


export const getPhotoUrl = (photoReference, maxWidth = 400) => {
    if (!photoReference || !GOOGLE_API_KEY) return null;
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${GOOGLE_API_KEY}`;
};