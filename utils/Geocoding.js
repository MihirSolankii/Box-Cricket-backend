import axios from "axios";
const GOOGLE_API_KEY = "AIzaSyDG_h6XHM6HpvXkUsHT_PhmxacLuK57CAg";

async function getLocationFromAddress(address) {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`
    );

    if (response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      console.log("LOCATION:", location);

      return { lat: location.lat, lng: location.lng };
    }

    return { lat: 22.28224, lng: 70.7887104 }; // fallback
  } catch (error) {
    console.error("Geocoding error:", error.message);
    return { lat: 22.28224, lng: 70.7887104 };
  }
}

// export the function so other files can use it
export default getLocationFromAddress;

