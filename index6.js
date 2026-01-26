
//     import express from "express";
// import axios from "axios";

// const app = express();
// const PORT = 5000;

// // 🔑 Replace with your real Google API key
// const GOOGLE_API_KEY = "AIzaSyAEYJ2S1w2sr-tZu3V2hiQIrQ8aIdmiqw4";

// // Helper function to fetch Place Details for one place_id
// async function getPlaceDetails(placeId) {
//   const fields = [
//     "name",
//     "rating",
//     "formatted_address",
//     "formatted_phone_number",
//     "opening_hours",
//     "website",
//     "url",
//     "reviews",
//     "types",
//     "price_level",
//     "photos",
//     "wheelchair_accessible_entrance",
//     "serves_beer",
//     "serves_wine",
//     "takeout",
//     "delivery",
//     "dine_in",
//     "reservable",
//     "serves_lunch",
//     "serves_dinner",
//     "serves_breakfast",
//   ].join(",");

//   const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;

//   try {
//     const { data } = await axios.get(detailsUrl);
//     const place = data.result;

//     // Convert photo_reference array → direct photo URLs
//     const photos = place.photos
//       ? place.photos.map(
//           (p) =>
//             `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=${p.photo_reference}&key=${GOOGLE_API_KEY}`
//         )
//       : [];

//     return {
//       name: place.name,
//       rating: place.rating,
//       address: place.formatted_address,
//       phone: place.formatted_phone_number,
//       website: place.website,
//       map_url: place.url,
//       opening_hours: place.opening_hours || null,
//       reviews: place.reviews || [],
//       types: place.types || [],
//       price_level: place.price_level || null,
//       photos,
//       amenities: {
//         dine_in: place.dine_in || false,
//         delivery: place.delivery || false,
//         takeout: place.takeout || false,
//         serves_beer: place.serves_beer || false,
//         serves_wine: place.serves_wine || false,
//         reservable: place.reservable || false,
//         serves_breakfast: place.serves_breakfast || false,
//         serves_lunch: place.serves_lunch || false,
//         serves_dinner: place.serves_dinner || false,
//         wheelchair_accessible_entrance:
//           place.wheelchair_accessible_entrance || false,
//       },
//     };
//   } catch (err) {
//     console.error("Error fetching details:", err.message);
//     return null;
//   }
// }

// // 📍 Main route: Nearby Search + Details
// app.get("/api/places", async (req, res) => {
//   const { keyword = "City Cricket Box", lat = 22.28224, lng = 70.7887104 } =
//     req.query;

//   const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&keyword=${encodeURIComponent(
//     keyword
//   )}&key=${GOOGLE_API_KEY}`;

//   try {
//     const { data } = await axios.get(nearbyUrl);

//     if (!data.results || data.results.length === 0) {
//       return res.status(404).json({ message: "No places found" });
//     }

//     // Fetch details for each place concurrently
//     const detailedPlaces = await Promise.all(
//       data.results.map((place) => getPlaceDetails(place.place_id))
//     );

//     // Filter out nulls (if any failed)
//     const filtered = detailedPlaces.filter(Boolean);

//     res.json({ count: filtered.length, results: filtered });
//   } catch (error) {
//     console.error("Error fetching nearby places:", error.message);
//     res.status(500).json({ error: "Failed to fetch places" });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`✅ Server running on http://localhost:${PORT}`);
// });

import express from "express";
import axios from "axios";

const app = express();
const PORT = 5000;

// 🔑 Replace with your real Google API key
// const GOOGLE_API_KEY = "AIzaSyAEYJ2S1w2sr-tZu3V2hiQIrQ8aIdmiqw4";

/**
 * Fetch detailed info for a single place_id
 */
async function getPlaceDetails(placeId) {
  const fields = [
    "name",
    "rating",
    "formatted_address",
    "formatted_phone_number",
    "opening_hours",
    "website",
    "url",
    "reviews",
    "types",
    "price_level",
    "photos",
    "wheelchair_accessible_entrance",
    "serves_beer",
    "serves_wine",
    "takeout",
    "delivery",
    "dine_in",
    "reservable",
    "serves_lunch",
    "serves_dinner",
    "serves_breakfast",
  ].join(",");

  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;

  const { data } = await axios.get(detailsUrl);
  const place = data.result;

  if (!place) return null;

  // Convert photo_reference → usable image URLs
  const photos = place.photos
    ? place.photos.map(
        (p) =>
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=${p.photo_reference}&key=${GOOGLE_API_KEY}`
      )
    : [];

  return {
    name: place.name,
    rating: place.rating,
    address: place.formatted_address,
    phone: place.formatted_phone_number,
    website: place.website,
    map_url: place.url,
    opening_hours: place.opening_hours || null,
    reviews: place.reviews || [],
    types: place.types || [],
    price_level: place.price_level || null,
    photos,
    amenities: {
      dine_in: place.dine_in || false,
      delivery: place.delivery || false,
      takeout: place.takeout || false,
      serves_beer: place.serves_beer || false,
      serves_wine: place.serves_wine || false,
      reservable: place.reservable || false,
      serves_breakfast: place.serves_breakfast || false,
      serves_lunch: place.serves_lunch || false,
      serves_dinner: place.serves_dinner || false,
      wheelchair_accessible_entrance:
        place.wheelchair_accessible_entrance || false,
    },
  };
}

/**
 * Route: Fetch details for a place by name automatically (TextSearch → Nearby fallback)
 * Example:
 *   /api/place?name=Infinity%20Sports%20Club%20-%20ISC
 */

async function getLocationFromAddress(address) {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`
    );
    
    if (response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      console.log(location);
      
      return { lat: location.lat, lng: location.lng };
    }
    return { lat: 22.28224, lng: 70.7887104 }; // fallback
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return { lat: 22.28224, lng: 70.7887104 };
  }
}
app.get("/api/place", async (req, res) => {
  const { name,location} = req.query;

const { lat, lng }=await getLocationFromAddress(location);

if (!lat || !lng) {
   console.error("Invalid location provided");
   return res.status(400).json({ error: "Invalid location provided" });
}

  if (!name) {
    return res.status(400).json({ error: "Please provide a place name" });
  }

  try {
    let placeId = null;

    // Step 1️⃣ Try Text Search first (best for specific names)
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      name
    )}&location=${lat},${lng}&radius=5000&key=${GOOGLE_API_KEY}`;
    const textSearchRes = await axios.get(textSearchUrl);

    if (textSearchRes.data.results.length > 0) {
      // Pick first strong match
      const match = textSearchRes.data.results.find(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      );
      placeId = match
        ? match.place_id
        : textSearchRes.data.results[0].place_id;
    } else {
      console.log("⚠️ No TextSearch match found, falling back to NearbySearch");
    }

    // Step 2️⃣ Fallback: Nearby Search if Text Search gave no results
    if (!placeId) {
      const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&keyword=${encodeURIComponent(
        name
      )}&key=${GOOGLE_API_KEY}`;
      const nearbyRes = await axios.get(nearbyUrl);

      if (nearbyRes.data.results.length > 0) {
        const match = nearbyRes.data.results.find(
          (p) => p.name.toLowerCase() === name.toLowerCase()
        );
        placeId = match
          ? match.place_id
          : nearbyRes.data.results[0].place_id;
      }
    }

    // Step 3️⃣ If still not found
    if (!placeId) {
      return res.status(404).json({
        message: `No place found for "${name}" near (${lat}, ${lng})`,
      });
    }

    // Step 4️⃣ Fetch full details
    const details = await getPlaceDetails(placeId);
    if (!details) {
      return res.status(404).json({
        message: "No details found for the given place",
      });
    }

    res.json(details);
  } catch (err) {
    console.error("❌ Error fetching place:", err.message);
    res.status(500).json({ error: "Failed to fetch place details" });
  }
});



app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
