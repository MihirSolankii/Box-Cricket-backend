import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
// import bodyParser from "body-parser";
import connectDB from "./config/db.js";
import router from "./Routes/AuthRoutes.js";
import cookieParser from "cookie-parser";
import AdminRouter from "./Routes/AdminRoutes.js";
import UserRouter from "./Routes/UserRoutes.js";
import BookingRouter from "./Routes/BookingRoutes.js";
import grouproutes from "./Routes/GroupRoutes.js";
import SettlementRoutes from "./Routes/SettlementRoutes.js";
import setupCricketSocket from "./socket/cricketHandler.js";
import { Server } from "socket.io";

import {generalratelimiter} from "./middleware/ratelimiter.js";
import MatchRoutes from "./Routes/MatchRoutes.js";
dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  "http://localhost:5173",
  "http://192.168.0.226:5173",
  "https://nonsolidified-annika-criminally.ngrok-free.dev",
  "https://box-cricket-frotnend.vercel.app",
  "https://box-cricket-admin-hazel.vercel.app",
  "https://box-cricket-admin-ijek.vercel.app"// <--- Added your Vercel App here
];

// 2. Update Express CORS
app.use(cors({
  origin: allowedOrigins,
  credentials: true 
}));

const io = new Server(server, {
  cors: {
    origin:allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

setupCricketSocket(io);
app.use(express.json());

// app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", router);
app.use("/api/admin", AdminRouter);
app.use("/api/user", UserRouter);
app.use("/api/booking", BookingRouter);
app.use("/api/group",grouproutes);
app.use("/api/settlement",SettlementRoutes);
app.use("/api/matches",MatchRoutes);
app.get("/",generalratelimiter(5,60),(_req,res)=>{
  res.send("API is running....");
});

// app.listen(process.env.PORT, () =>
//   console.log(`Server running on port ${process.env.PORT}`)
// );
server.listen(process.env.PORT,"0.0.0.0", () =>
  console.log(`Server running on port ${process.env.PORT}`)
);