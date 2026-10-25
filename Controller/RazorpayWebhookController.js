import Razorpay from "razorpay";
import Booking from "../models/Booking.js";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils.js";

export const razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      return res.status(400).json({ message: "Missing signature" });
    }

    // 👇 RAW BODY as STRING
    const body = req.body.toString();

    const isValid = validateWebhookSignature(
      body,
      signature,
      webhookSecret
    );

    if (!isValid) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    // Parse AFTER verification
    const event = JSON.parse(body);

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;

      const booking = await Booking.findOne({ orderId });
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.paymentStatus === "success") {
        return res.status(200).json({ message: "Already processed" });
      }

      booking.paymentStatus = "success";
      booking.bookingStatus="completed";
      booking.paymentId = payment.id;
      booking.expiresAt = null;
      await booking.save();

      // payoutOwner(booking._id) // later

      return res.status(200).json({ success: true });
    }

    return res.status(200).json({ message: "Event ignored" });

  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ message: "Webhook error" });
  }
};


export const payoutOwner = async (bookingId) => {
  const booking = await Booking.findById(bookingId).populate("box");
  if (booking.payoutStatus === "paid") return;

  const ownerAmount = booking.totalAmount * 0.9;

  await razorpay.payouts.create({
    fund_account_id: booking.box.owner.razorpayFundAccountId,
    amount: ownerAmount * 100,
    currency: "INR"
  });

  booking.payoutStatus = "paid";
  await booking.save();
};


// import crypto from "crypto";

// export const razorpayWebhook = (req, res) => {
//   const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
//   const signature = req.headers['x-razorpay-signature'];
//   const body = JSON.stringify(req.body);

//   const expectedSignature = crypto
//     .createHmac('sha256', secret)
//     .update(body)
//     .digest('hex');

//   if (signature === expectedSignature) {
//     console.log("Webhook verified:", req.body);
//     // Update booking here if needed
//     return res.status(200).send("OK");
//   } else {
//     console.log("Webhook signature mismatch");
//     return res.status(400).send("Invalid signature");
//   }
// };
