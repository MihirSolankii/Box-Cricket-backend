import Settlement from "../models/Settlement.js";
import Group from "../models/Group.js";
import { round2 } from "../helpers/money.js";

// export const createSettlement = async (req, res) => {
//   try {
//     const { groupId, totalAmount, splitType = "equal" } = req.body;
//     const userId = req.user._id;

//     const group = await Group.findById(groupId);
//     if (!group) return res.status(404).json({ message: "Group not found" });

//     if (group.admin.toString() !== userId.toString()) {
//       return res.status(403).json({ message: "Only admin can create settlement" });
//     }

//     const existing = await Settlement.findOne({ groupId });
//     if (existing) {
//       return res.status(400).json({ message: "Settlement already exists" });
//     }

//     const acceptedInvites = group.invites.filter(i => i.status === "accepted");
//     if (acceptedInvites.length === 0) {
//       return res.status(400).json({ message: "No participants to split with" });
//     }

//     const totalParticipants = acceptedInvites.length + 1; // + admin
//     const baseShare = round2(totalAmount / totalParticipants);

//     let remaining = totalAmount;
//     const participants = [];

//     // ADMIN (already paid)
//     participants.push({
//       user: group.admin,
//       nickname: "Admin",
//       amountOwed: 0,
//       amountPaid: round2(totalAmount),
//       paymentMethod: "Other",
//       paymentStatus: "paid",
//       transactions: []
//     });

//     // MEMBERS
//     acceptedInvites.forEach((invite, index) => {
//       let share = baseShare;

//       // Round-off fix (last member)
//       if (index === acceptedInvites.length - 1) {
//         share = round2(remaining - baseShare);
//       }

//       remaining = round2(remaining - share);

//       participants.push({
//         user: invite.invitedUser,
//         nickname: invite.nickname,
//         amountOwed: share,
//         amountPaid: 0,
//         paymentMethod: "UPI",
//         paymentStatus: "pending",
//         transactions: []
//       });
//     });

//     const settlement = await Settlement.create({
//       groupId,
//       bookingId: group.bookingId,
//       totalAmount: round2(totalAmount),
//       splitType,
//       participants,
//       paidBy: group.admin,
//       settlementStatus: "pending"
//     });

//     res.status(201).json({ success: true, data: settlement });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };







export const recordPayment = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const { amount, paymentMethod, transactionId } = req.body;
    const userId = req.user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) return res.status(404).json({ message: "Settlement not found" });

    if (settlement.settlementStatus === "completed") {
      return res.status(400).json({ message: "Settlement already completed" });
    }

    if (settlement.paidBy.toString() === userId.toString()) {
      return res.status(400).json({ message: "Admin has already paid" });
    }

    const participant = settlement.participants.find(
      p => p.user && p.user.toString() === userId.toString()
    );

    if (!participant) {
      return res.status(403).json({ message: "Not part of this settlement" });
    }

    const remaining = round2(participant.amountOwed - participant.amountPaid);
    if (amount > remaining) {
      return res.status(400).json({ message: "Payment exceeds amount owed" });
    }

    participant.amountPaid = round2(participant.amountPaid + amount);
    participant.transactions.push({
      amount: round2(amount),
      paymentMethod,
      transactionId
    });

    if (participant.amountPaid === participant.amountOwed) {
      participant.paymentStatus = "paid";
    } else {
      participant.paymentStatus = "partial";
    }

    // Update settlement status
    const allPaid = settlement.participants
      .filter(p => p.amountOwed > 0)
      .every(p => p.paymentStatus === "paid");

    settlement.settlementStatus = allPaid ? "completed" : "partial";
    if (allPaid) settlement.completedAt = new Date();

    await settlement.save();
    res.json({ success: true, data: settlement });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const getSettlement = async (req, res) => {
  const settlement = await Settlement.findOne({ groupId: req.params.groupId })
    .populate("participants.user", "name email");

  if (!settlement) {
    return res.status(404).json({ message: "No settlement found" });
  }

  res.json({ success: true, data: settlement });
};
export const getMyPaymentStatus = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const userId = req.user.id;

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    const myStatus = settlement.participants.find(
      p => p.user.toString() === userId
    );

    if (!myStatus) {
      return res.status(404).json({ message: "You are not part of this settlement" });
    }

    res.status(200).json({
      amountOwed: myStatus.amountOwed,
      amountPaid: myStatus.amountPaid,
      remaining: myStatus.amountOwed - myStatus.amountPaid,
      paymentStatus: myStatus.paymentStatus,
      transactions: myStatus.transactions
    });
  } catch (error) {
    console.error("Get payment status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
