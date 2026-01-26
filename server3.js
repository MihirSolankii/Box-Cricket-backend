import express from "express";
import admin from "firebase-admin";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json"));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Verify token route (works for both Google + Phone)
app.post("/verify-token", async (req, res) => {
  const { idToken } = req.body;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    // You can save user info to DB here (uid, email, phone, etc.)
    res.json({
      success: true,
      uid: decoded.uid,
      email: decoded.email || null,
      phone: decoded.phone_number || null,
      name: decoded.name || null,
    });
  } catch (error) {
    console.error(error);
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
});

app.listen(3000, () =>
  console.log(`✅ Server running on http://localhost:3000`)
);
