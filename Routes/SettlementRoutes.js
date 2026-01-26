// routes/settlementRoutes.js
import express from "express";
import {
  createSettlement,
  getSettlement,
  recordPayment,
  getMyPaymentStatus,
  getAllSettlements,
  sendPaymentReminder,
  updateSettlement,
  startMatch
  , userIsAdminofSettlement,getMatchId
} from "../Controller/SettlementController.js";
import Settlement from "../models/Settlement.js";
import {auth} from '../middleware/auth.js'
import { set } from "mongoose";

const SettlementRoutes = express.Router();

// All routes require authentication



SettlementRoutes.post("/create",auth, createSettlement);


SettlementRoutes.get("/",auth, getAllSettlements);


SettlementRoutes.get("/group/:groupId",auth, getSettlement);

SettlementRoutes.get("/:settlementId/my-status",auth, getMyPaymentStatus);


SettlementRoutes.post("/:settlementId/payment",auth, recordPayment);

// Send payment reminder (admin only)
SettlementRoutes.post("/reminder",auth, sendPaymentReminder);

// Update settlement (admin only - for adjustments/refunds)
SettlementRoutes.patch("/:settlementId",auth, updateSettlement);

SettlementRoutes.get("/isAdminofSettlement/:settlementId",auth, userIsAdminofSettlement);

SettlementRoutes.post("/create-match",auth,startMatch);

SettlementRoutes.get("/get-matchid/:settlementId",getMatchId);
SettlementRoutes.get("/get-member/:settlementId",auth,async (req, res) => {
try {
  const settlementId = req.params.settlementId;

  const settlement = await Settlement.findById(settlementId);

  if (!settlement) {
    return res.status(404).json({ message: "Settlement not found" });
  }

  const participants = settlement.participants.map(participant => ({
    userId: participant.user,
    nickname: participant.nickname,
    amountOwed: participant.amountOwed,
    amountPaid: participant.amountPaid,
    paymentStatus: participant.paymentStatus
  }));

  res.status(200).json(participants);
} catch (error) {
  res.status(500).json({ message: error.message });
}
});


export default SettlementRoutes;
