import getLocationFromAddress from  './utils/Geocoding.js';
import axios from "axios";

let lat=0;
let lng=0;
import {searchBoxCricketNearby} from '../backend/utils/googleApi.js';
getLocationFromAddress("Mumbai Maharashtra India")
  .then((location) => {
    console.log("Final Output:", location);
     let lat=location.lat;
    let lng=location.lng;
    console.log("Latitude:", lat);
    console.log("Longitude:", lng);
    
  })
  .catch((err) => {
    console.error("Error:", err);
  });
  searchBoxCricketNearby(18.9581934, 72.8320729)
  .then((data) => {
    console.log("Nearby Cricket:", data.length);
  })
  .catch((err) => {
    console.log("Error:", err);
  });





