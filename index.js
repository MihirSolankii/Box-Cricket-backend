import express from "express";
import fetch from "node-fetch"; // if using Node 18+, native fetch works too
import dotenv from "dotenv";

dotenv.config();
const app = express();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // keep your key safe in .env

// 🔹 Route: Get nearby box cricket places
app.get("/api/boxes", async (req, res) => {
  try {
    const { lat = "22.28224", lng = "70.7887104", radius = "5000" } = req.query;

    const keyword = "box cricket";
    const GOOGLE_API_KEY="-tZu3V2hiQIrQ8aIdmiqw4";

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(
      keyword
    )}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.results) {
      return res.status(404).json({ message: "No box cricket places found" });
    }

    // ✅ Optional: Filter for specific names if needed
    const filtered = data.results.filter((place) =>
      ["infinity sports club - isc", "big shot box cricket"].some((name) =>
        place.name.toLowerCase().includes(name)
      )
    );

    // ✅ Format the output (simplified)
    const formattedResults = data.results.map((place) => ({
      name: place.name,
      rating: place.rating || "N/A",
      address: place.vicinity,
      location: place.geometry?.location,
      international_phone_number:place.international_phone_number || "N/A",
      html_attributions:place.html_attributions || [],
      vicinity:place.vicinity || "N/A",
      place_id: place.place_id,
      photo_reference: place.photos?.[0]?.photo_reference || null,
    }));

    return res.json({
      total: data.results.length,
      filtered: filtered.length,
      all_boxes: formattedResults,
      matched_boxes: filtered,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
app.get("/",searchBoxCricketByName("infinity sports club - isc", "big shot box cricket", latitude = "22.28224", longitude = "70.7887104"));

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
app.listen(3000, () => console.log(" Server running on port 3000"));
