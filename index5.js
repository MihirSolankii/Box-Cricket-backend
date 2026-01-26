import express from "express";
import fetch from "node-fetch"; // For Node < 18. Node 18+ has global fetch.
import dotenv from "dotenv";

dotenv.config();
const app = express();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const getPhotoUrl = (photoReference, maxWidth = 4000) => {
    if (!photoReference || !GOOGLE_API_KEY) return null;
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${GOOGLE_API_KEY}`;
};

// ✅ Function: Search Box Cricket by Name (Text Search)
const searchBoxCricketByName = async (query, lat , lng ) => {
  if (!query || !GOOGLE_API_KEY) {
    throw new Error("Search query or Google API Key is missing.");
  }

  // Ensure 'box cricket' included
  const keyword = query.toLowerCase().includes("box") ? query : `${query} box cricket`;

//   let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
//     searchQuery
//   )}&key=${GOOGLE_API_KEY}`;

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&keyword=${encodeURIComponent(
      keyword
    )}&key=${GOOGLE_API_KEY}`;

  // If location provided, bias results towards it
//   if (latitude && longitude) {
//     url += `&location=${latitude},${longitude}&radius=10000`;
//   }

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(data);
    

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Text Search Error:", data.status, data.error_message);
      return [];
    }
     

    // return data.results.map((place) => ({
    //    name: place.name,
    //   rating: place.rating || "N/A",
    //   address: place.vicinity,
    //   location: place.geometry?.location,
    //    international_phone_number:place.international_phone_number || "N/A",
    //     html_attributions:place.html_attributions || [],
    //     vicinity:place.vicinity || "N/A",
    //     formatted_address:place.formatted_address || "N/A",
    //     formatted_phone_number:place.formatted_phone_number || "N/A",
    //   place_id: place.place_id,
    //   photo_reference: place.photos?.[0]?.photo_reference || null,
    // }));
    // const formattedResults = data.results.map((place) => ({
     
    //   name: place.name,
    //   rating: place.rating || "N/A",
    //   address: place.vicinity,
    //   location: place.geometry?.location,
    //    international_phone_number:place.international_phone_number || "N/A",
    //     html_attributions:place.html_attributions || [],
    //     vicinity:place.vicinity || "N/A",
    //     formatted_address:place.formatted_address || "N/A",
    //     formatted_phone_number:place.formatted_phone_number || "N/A",

    //   place_id: place.place_id,
    //   photo_reference: place.photos?.[0]?.photo_reference || null,
    //   photo_url: getPhotoUrl(place.photos?.[0]?.photo_reference || null, 400),
      
    // }));
const formattedResults = data.results.map((place) => {
  const photos = place.photos || [];

  return {
    name: place.name,
    rating: place.rating || "N/A",
    address: place.vicinity,
    location: place.geometry?.location,
    international_phone_number: place.international_phone_number || "N/A",
    html_attributions: place.html_attributions || [],
    vicinity: place.vicinity || "N/A",
    formatted_address: place.formatted_address || "N/A",
    formatted_phone_number: place.formatted_phone_number || "N/A",
    place_id: place.place_id,

    // ✅ store photo references if needed
    photo_references: photos.map((p) => p.photo_reference),

    // ✅ all usable photo URLs
    photo_urls: photos.map((p) => getPhotoUrl(p.photo_reference, 400)),
  };
});


    return formattedResults;

  } catch (error) {
    console.error("Fetch error in Text Search:", error.message);
    return [];
  }
};

// ✅ Route 1: Get nearby box cricket places
app.get("/api/boxes", async (req, res) => {
  try {
    const { lat = "22.28224", lng = "70.7887104", radius = "5000" } = req.query;
    const keyword = "box cricket";

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(
      keyword
    )}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.results) {
      return res.status(404).json({ message: "No box cricket places found" });
    }

    // Optional filtering
    const filtered = data.results.filter((place) =>
      ["infinity sports club - isc", "big shot box cricket"].some((name) =>
        place.name.toLowerCase().includes(name)
      )
    );

    const formattedResults = data.results.map((place) => ({
      name: place.name,
      rating: place.rating || "N/A",
      address: place.vicinity,
      location: place.geometry?.location,
       international_phone_number:place.international_phone_number || "N/A",
        html_attributions:place.html_attributions || [],
        vicinity:place.vicinity || "N/A",
        formatted_address:place.formatted_address || "N/A",
        formatted_phone_number:place.formatted_phone_number || "N/A",

      place_id: place.place_id,
      photoReference: place.photos?.[0]?.photo_reference || null,
      photo_url: getPhotoUrl(place.photos?.[0]?.photo_reference || null, 400)
      
    }));

    res.json({
  total: data.results.length,
  // photo_url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${GOOGLE_API_KEY}`,
  filtered: filtered.length,
  all_boxes: formattedResults,
  matched_boxes: filtered,

});

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ Route 2: Search by name (Text Search API)
app.get("/", async (req, res) => {
  try {
    const results = await Promise.all([
      searchBoxCricketByName("Infinity Sports Club - ISC", "22.28224", "70.7887104"),
      searchBoxCricketByName("Big Shot Box Cricket", "22.28224", "70.7887104"),
    ]);

    res.json({
      message: "Box Cricket search results",
      results: results.flat(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error searching box cricket places", error: err.message });
  }
});
app.get("/photo",async(req,res)=>{
    const { photo_reference } = req.query;
    const photoUrl = getPhotoUrl(photo_reference, 400);
    res.json({ photoUrl });
  });

app.listen(3000, () => console.log("✅ Server running on port 3000"));
