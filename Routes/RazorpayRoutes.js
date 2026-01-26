import express from "express";
import { razorpayWebhook } from "../Controller/RazorpayWebhookController.js";

const RazorpayRoutes = express.Router();

RazorpayRoutes.post(
  "/webhook",
 express.raw({ type: "*/*" }),
  razorpayWebhook
);

export default RazorpayRoutes;
