import crypto from "crypto";
import Booking from "../models/Booking.js";
// import Owner from "../models/Owner.js";
import Razorpay from "razorpay";
import { response } from "express";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

export const confirmBooking = async (req, res) => {
  try {
    const { bookingId, paymentId, orderId, signature } = req.body;

    
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.paymentStatus === "success") {
      return res.json({
        success: true,
        message: "Booking already confirmed",
      });
    }

    
    booking.paymentStatus = "success";
    booking.bookingStatus = "completed";
    booking.payoutStatus="pending"
    booking.expiresAt = null;

    booking.razorpay = {
      paymentId,
      orderId,
      signature,
    };

    await booking.save();

    //  PAYOUT TO OWNER (optional immediate)
    // const owner = await Owner.findById(booking.ownerId);

    // let payoutStatus = "pending";

    // if (owner?.razorpayFundAccountId) {
    //   const payoutAmount = Math.floor(booking.amount * 0.95 * 100); 
    //   // 5% platform fee, amount in paise

    //   await razorpay.payouts.create({
    //     account_number: process.env.RAZORPAYX_ACCOUNT,
    //     fund_account_id: owner.razorpayFundAccountId,
    //     amount: payoutAmount,
    //     currency: "INR",
    //     mode: "IMPS",
    //     purpose: "payout",
    //     queue_if_low_balance: true,
    //     reference_id: booking._id.toString(),
    //   });

    //   payoutStatus = "initiated";
    // }

    // 5️⃣ RESPONSE
    return res.json({
      success: true,
      message: "Booking confirmed",
     booking,
    });

  } catch (error) {
    console.error("Confirm booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


