import axios from "axios";
// const GOOGLE_API_KEY = "AIzaSyAEYJ2S1w2sr-tZu3V2hiQIrQ8aIdmiqw4";

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
    // return { lat: 22.28224, lng: 70.7887104 }; // fallback
  } catch (error) {
    console.error('Geocoding error:', error.message);
    // return { lat: 22.28224, lng: 70.7887104 };
  }
}

getLocationFromAddress("MarwadiUniversityRajkotGujarat")