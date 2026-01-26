const mongoose = require('mongoose');
const axios = require('axios');
const Box = require('./models/Box'); // POINT THIS TO YOUR BOX MODEL FILE

// CONFIGURATION
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY_HERE';
const MONGO_URI = 'YOUR_MONGODB_CONNECTION_STRING_HERE';
const SEARCH_QUERY = 'Box Cricket in Rajkot'; // This finds all of them automatically

// DEFAULT DATA (Google doesn't provide this, so we add defaults for you to edit later)
const defaultAmenities = [
  { name: "Parking", available: true },
  { name: "Washroom", available: true },
  { name: "Lighting", available: true },
  { name: "Drinking Water", available: true }
];

const defaultCourts = [
  {
    courtNumber: 1,
    courtName: "Main Turf",
    surfaceType: "Artificial Turf",
    isAvailable: true,
    maxPlayers: 10,
    images: [] // You can add a default turf image here if you want
  }
];

const defaultOperatingHours = {
  monday: { isClosed: false },
  tuesday: { isClosed: false },
  wednesday: { isClosed: false },
  thursday: { isClosed: false },
  friday: { isClosed: false },
  saturday: { isClosed: false },
  sunday: { isClosed: false }
};

// HELPER: Build Photo URL
const getPhotoUrl = (photoReference) => {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
};

const seedDatabase = async () => {
  try {
    // 1. Connect to DB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 2. Fetch Data from Google Places API
    // We request specific fields to match your schema
    console.log(`🔎 Searching Google for: "${SEARCH_QUERY}"...`);
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(SEARCH_QUERY)}&key=${GOOGLE_API_KEY}`
    );

    const places = response.data.results;
    console.log(`📦 Found ${places.length} boxes from Google.`);

    // 3. Loop and Save
    for (const place of places) {
      
      // Check if box already exists to avoid duplicates
      const exists = await Box.findOne({ googlePlaceId: place.place_id });
      if (exists) {
        console.log(`⚠️  Skipping ${place.name} (Already exists)`);
        continue;
      }

      // MAP GOOGLE DATA TO YOUR SCHEMA
      const newBox = new Box({
        name: place.name,
        description: `Best box cricket in ${place.formatted_address}`, // Auto-generate description
        googlePlaceId: place.place_id,
        mapurl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        
        // GEOJSON LOCATION (Critical for your "Nearby" feature)
        location: {
          type: 'Point',
          coordinates: [
            place.geometry.location.lng, // Longitude FIRST
            place.geometry.location.lat  // Latitude SECOND
          ]
        },

        address: {
          fullAddress: place.formatted_address
        },

        // Map Photos (Limit to top 3 to save space/bandwidth)
        images: place.photos ? place.photos.slice(0, 3).map(p => getPhotoUrl(p.photo_reference)) : [],

        rating: place.rating,
        totalRatings: place.user_ratings_total,

        // FILL DEFAULT DUMMY DATA (Admin must edit these later)
        pricePerHour: 1200, // Default price
        phoneno: "0000000000", // Default phone
        amenities: defaultAmenities,
        courts: defaultCourts,
        operatingHours: defaultOperatingHours,
        isActive: true
      });

      await newBox.save();
      console.log(`✅ Imported: ${place.name}`);
    }

    // CHECK FOR NEXT PAGE (Google sends 20 at a time)
    if (response.data.next_page_token) {
        console.log("⚠️ NOTE: There are more results on the next page. Run script again with logic for 'pagetoken' to get the rest.");
    }

    console.log('🎉 Import Completed!');
    process.exit();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedDatabase();