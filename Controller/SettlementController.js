// controllers/settlementController.js
import Settlement from "../models/Settlement.js";
import Group from "../models/Group.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Match from "../models/Match.js";

// Create a settlement for a group booking
// export const createSettlement = async (req, res) => {
//   try {
//     console.log("📨 Request received");
//     console.log("Body:", req.body);
//     console.log("User:", req.user);

//     // 2. Destructure and validate
//     const { groupId, splitType, customSplits } = req.body;
//     const userId = req.user?.id;

//     // 3. Validate required fields
//     if (!groupId) {
//       return res.status(400).json({ 
//         message: "GroupId is required",
//         received: req.body 
//       });
//     }
   
//     // Find the group
//     const group = await Group.findById(groupId).populate('bookingId');
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }

//     // Check if user is admin
//     if (group.admin.toString() !== userId) {
//       return res.status(403).json({ message: "Only group admin can create settlement" });
//     }

//     // Check if settlement already exists
//     const existingSettlement = await Settlement.findOne({ groupId });
//     if (existingSettlement) {
//       return res.status(400).json({ message: "Settlement already exists for this group" });
//     }

//     const booking = group.bookingId;
//     const totalAmount = booking.totalAmount || booking.price;

//     // Get accepted invites
//     const acceptedInvites = group.invites.filter(inv => inv.status === "accepted");
//     const totalParticipants = acceptedInvites.length + 1; // +1 for admin

//     let participants = [];

//     if (splitType === "equal") {
//       // Equal split among all participants
//       const amountPerPerson = totalAmount / totalParticipants;

//       // Add admin
//       participants.push({
//         user: group.admin,
//         nickname: "Admin",
//         amountOwed: amountPerPerson,
//         amountPaid: 0,
//         paymentStatus: "pending"
//       });

//       // Add invited members
//       acceptedInvites.forEach(invite => {
//         participants.push({
//           user: invite.invitedBy,
//           nickname: invite.nickname,
//           amountOwed: amountPerPerson,
//           amountPaid: 0,
//           paymentStatus: "pending"
//         });
//       });
//     } else if (splitType === "custom" && customSplits) {
//       // Custom split amounts
//       participants = customSplits.map(split => ({
//         user: split.userId,
//         nickname: split.nickname,
//         amountOwed: split.amount,
//         amountPaid: 0,
//         paymentStatus: "pending"
//       }));

//       // Validate total matches
//       const customTotal = participants.reduce((sum, p) => sum + p.amountOwed, 0);
//       if (Math.abs(customTotal - totalAmount) > 0.01) {
//         return res.status(400).json({ 
//           message: "Custom split amounts don't match total amount",
//           expected: totalAmount,
//           received: customTotal
//         });
//       }
//     }

//     // Create settlement
//     const settlement = new Settlement({
//       groupId,
//       bookingId: booking._id,
//       totalAmount,
//       splitType,
//       participants,
//       paidBy: userId,
//       settlementStatus: "pending"
//     });

//     await settlement.save();

//     res.status(201).json({
//       message: "Settlement created successfully",
//       settlement
//     });
//   } catch (error) {
//     console.error("Create settlement error:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };
import { round2 } from "../helpers/money.js";
export const createSettlement = async (req, res) => {
  try {
    const { groupId, totalAmount } = req.body;
    const adminId = req.user.id;

    if (!groupId || !totalAmount) {
      return res.status(400).json({ message: "groupId & totalAmount required" });
    }

    // 1. Fetch Group - populate the correct fields
    const group = await Group.findById(groupId)
      .populate("invites.inviteeId") // or whatever the correct field is
      .populate("admin");

    if (!group) return res.status(404).json({ message: "Group not found" });

    // 2. Security Check
    if (group.admin._id.toString() !== adminId.toString()) {
      return res.status(403).json({ message: "Only admin can create settlement" });
    }

    // 3. Check for existing settlement
    const existing = await Settlement.findOne({ groupId });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Settlement already created",
        data: existing
      });
    }

    // 4. Filter Accepted Invites
    const acceptedInvites = group.invites.filter(i => i.status === "accepted");
    
    const participantsCount = acceptedInvites.length + 1;
    const share = round2(totalAmount / participantsCount);
    
    let distributed = share; 
    const participants = [];

    // ✅ ADD ADMIN (HOST) - PAID STATUS
    participants.push({
      user: group.admin._id,
      nickname: group.admin.nickname || "Admin", 
      amountOwed: 0, 
      amountPaid: round2(totalAmount),
      paymentStatus: "paid",
      transactions: []
    });

    // ✅ ADD MEMBERS (FRIENDS) - PENDING STATUS
    for (let i = 0; i < acceptedInvites.length; i++) {
      const invite = acceptedInvites[i];
      
      // 🔍 CORRECTED: Get the actual user ID from the invite
      // Try different possible fields in your invite schema
      let targetUserId = null;
      let targetNickname = invite.nickname;

      // Option 1: If inviteeId is populated
      if (invite.inviteeId && invite.inviteeId._id) {
        targetUserId = invite.inviteeId._id;
      } 
      // Option 2: If inviteeId is just an ObjectId (not populated)
      else if (invite.inviteeId) {
        targetUserId = invite.inviteeId;
      }
      // Option 3: Check for 'user' field
      else if (invite.user) {
        targetUserId = invite.user._id || invite.user;
      }
      // Option 4: Fallback - lookup by nickname
      else {
        console.log(`⚠️ No user reference found for ${invite.nickname}, looking up...`);
        const foundUser = await User.findOne({ nickname: invite.nickname });
        if (foundUser) {
          targetUserId = foundUser._id;
        } else {
          console.error(`❌ User not found for nickname: ${invite.nickname}`);
          // DON'T skip - return error instead
          return res.status(400).json({ 
            message: `Cannot create settlement: User not found for ${invite.nickname}` 
          });
        }
      }

      // Calculate share
      let memberShare = share;
      if (i === acceptedInvites.length - 1) {
        memberShare = round2(totalAmount - distributed);
      }

      distributed += memberShare;

      participants.push({
        user: targetUserId,
        nickname: targetNickname,
        amountOwed: memberShare, 
        amountPaid: 0,
        paymentStatus: "pending",
        transactions: []
      });
    }

    // 5. Save to DB
    const settlement = await Settlement.create({
      groupId,
      bookingId: group.bookingId,
      totalAmount: round2(totalAmount),
      participants,
      paidBy: group.admin._id,
      settlementStatus: "pending"
    });

    res.status(201).json({
      success: true,
      message: "Settlement created successfully",
      data: settlement
    });

  } catch (err) {
    console.error("Settlement Error:", err);
    res.status(500).json({ message: err.message });
  }
};


// Get settlement details
export const getSettlement = async (req, res) => {
  try {
    const { groupId } = req.params;

    const settlement = await Settlement.findOne({ groupId })
      .populate('groupId')
      .populate('bookingId')
      .populate('paidBy', 'name email')
      .populate('participants.user', 'name email');

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    res.status(200).json({ settlement });
  } catch (error) {
    console.error("Get settlement error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }[]
};

// Record a payment
export const recordPayment = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const { amount, paymentMethod } = req.body;
    const userId = req.user.id;

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) return res.status(404).json({ message: "Settlement not found" });

    const user= await User.findById(userId);
    
    const participant = settlement.participants.find(
      p => p.nickname === user.nickname
    );

    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }

    const remaining = round2(participant.amountOwed - participant.amountPaid);
    if (amount <= 0 || amount > remaining) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    participant.transactions.push({
      amount,
      paymentMethod,
      status: "success",
      paidAt: new Date()
    });

    participant.amountPaid = round2(participant.amountPaid + amount);

    participant.paymentStatus =
      participant.amountPaid >= participant.amountOwed
        ? "paid"
        : "partial";

    // 🔁 Recalculate settlement status
    const paidCount = settlement.participants.filter(
      p => p.paymentStatus === "paid"
    ).length;

    if (paidCount === settlement.participants.length) {
      settlement.settlementStatus = "completed";
      settlement.completedAt = new Date();
    } else if (paidCount > 0) {
      settlement.settlementStatus = "partial";
    } else {
      settlement.settlementStatus = "pending";
    }

    await settlement.save();

    res.status(200).json({
      success: true,
      settlementStatus: settlement.settlementStatus
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// Get user's payment status
// export const getMyPaymentStatus = async (req, res) => {
//   try {
//     const { settlementId } = req.params;
//     const userId = req.user.id;

//     const settlement = await Settlement.findById(settlementId);
//     if (!settlement) {
//       return res.status(404).json({ message: "Settlement not found" });
//     }

//     const myStatus = settlement.participants.find(
//       p => p.user.toString() === userId
//     );

//     if (!myStatus) {
//       return res.status(404).json({ message: "You are not part of this settlement" });
//     }

//     res.status(200).json({
//       amountOwed: myStatus.amountOwed,
//       amountPaid: myStatus.amountPaid,
//       remaining: myStatus.amountOwed - myStatus.amountPaid,
//       paymentStatus: myStatus.paymentStatus,
//       transactions: myStatus.transactions
//     });
//   } catch (error) {
//     console.error("Get payment status error:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };
// export const getMyPaymentStatus = async (req, res) => {
//   try {
//     const { settlementId } = req.params;
//     const userId = req.user.id;


//     const settlement = await Settlement.findById(settlementId);
//     if (!settlement) return res.status(404).json({ message: "Settlement not found" });
//     const user= await User.findById(userId);
//     console.log("-------------------------+++++++++++++++++++++++++++",user);
    
//     console.log("user is",user.nickname);
    

//     const me = settlement.participants.find(
//       p => p.nickname === user.nickname
//     );

//     console.log("this is me",me);
    


//     if (!me) {
//       return res.status(404).json({ message: "User not part of settlement" });
//     }

//     res.status(200).json({
//       amountOwed: me.amountOwed,
//       amountPaid: me.amountPaid,
//       remaining: round2(me.amountOwed - me.amountPaid),
//       paymentStatus: me.paymentStatus,
//       transactions: me.transactions
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };



export const getMyPaymentStatus = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const userId = req.user.id; 

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) return res.status(404).json({ message: "Settlement not found" });

    // 1. Fetch User details to get Nickname (needed for fallback)
    const currentUser = await User.findById(userId);

    // 2. Find Participant (Hybrid Strategy)
    const me = settlement.participants.find(p => {
      // Priority A: Match by User ID (Best)
      if (p.user && p.user.toString() === userId) return true;
      
      // Priority B: Match by Nickname (Fallback for legacy/broken data)
      // Only checks if p.user is missing to avoid false positives
      if (!p.user && p.nickname === currentUser?.nickname) return true;

      return false;
    });

    if (!me) {
      return res.status(404).json({ message: "You are not part of this settlement" });
    }

    res.status(200).json({
      amountOwed: me.amountOwed,
      amountPaid: me.amountPaid,
      remaining: round2(me.amountOwed - me.amountPaid),
      paymentStatus: me.paymentStatus,
      transactions: me.transactions
    });

  } catch (err) {
    console.error("Payment Status Error:", err);
    res.status(500).json({ message: err.message });
  }
};


// Get all settlements (admin view)
export const getAllSettlements = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find settlements where user is either paidBy or a participant
    const settlements = await Settlement.find({
      $or: [
        { paidBy: userId },
        { 'participants.user': userId }
      ]
    })
      .populate('groupId', 'name')
      .populate('bookingId', 'date time venue')
      .populate('paidBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ settlements });
  } catch (error) {
    console.error("Get all settlements error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send payment reminder
export const sendPaymentReminder = async (req, res) => {
  try {
    const { settlementId, userId } = req.body;
    const adminId = req.user.id;

    const settlement = await Settlement.findById(settlementId)
      .populate('groupId');

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    // Check if requester is admin
    if (settlement.groupId.admin.toString() !== adminId) {
      return res.status(403).json({ message: "Only admin can send reminders" });
    }

    const participant = settlement.participants.find(
      p => p.user.toString() === userId
    );

    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }

    if (participant.paymentStatus === "paid") {
      return res.status(400).json({ message: "User has already paid" });
    }

    // Here you would implement actual notification logic
    // For now, just return success
    res.status(200).json({
      message: "Payment reminder sent successfully",
      reminderSentTo: userId,
      amountDue: participant.amountOwed - participant.amountPaid
    });
  } catch (error) {
    console.error("Send reminder error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update settlement (for refunds or adjustments)
export const updateSettlement = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const { userId, adjustmentAmount, reason } = req.body;
    const adminId = req.user.id;

    const settlement = await Settlement.findById(settlementId)
      .populate('groupId');

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    // Check if requester is admin
    if (settlement.groupId.admin.toString() !== adminId) {
      return res.status(403).json({ message: "Only admin can update settlement" });
    }

    const participant = settlement.participants.find(
      p => p.user.toString() === userId
    );

    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }

    // Apply adjustment
    participant.amountOwed += adjustmentAmount;
    
    // Recalculate status
    if (participant.amountPaid >= participant.amountOwed) {
      participant.paymentStatus = "paid";
    } else if (participant.amountPaid > 0) {
      participant.paymentStatus = "partial";
    } else {
      participant.paymentStatus = "pending";
    }

    await settlement.save();

    res.status(200).json({
      message: "Settlement updated successfully",
      reason,
      settlement
    });
  } catch (error) {
    console.error("Update settlement error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const userIsAdminofSettlement = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const userId = req.user.id;

    const settlement = await Settlement.findById(settlementId)
     

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    const isAdmin = settlement.paidBy.toString() === userId;
    return res.status(200).json({ isAdmin });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const startMatch = async (req, res) => {
  try {
    const { settlementId } = req.body;
    const userId = req.user.id;

    // 1. Validate Settlement
    // Populate 'groupId' and specifically the 'admin' field within the group
    const settlement = await Settlement.findById(settlementId)
      .populate({
        path: 'groupId',
        populate: { path: 'admin', select: 'nickname name' } // Get admin details
      });

    if (!settlement) return res.status(404).json({ message: "Settlement not found" });

    const groupAdmin = settlement.groupId.admin;

    // 2. Security Check
    if (groupAdmin._id.toString() !== userId) {
      return res.status(403).json({ message: "Only admin can start the match" });
    }

    // 3. Check if match already exists
    if (settlement.matchId) {
      return res.status(200).json({ 
        success: true, 
        matchId: settlement.matchStringId, 
        message: "Match already active" 
      });
    }

    
    const matchStringId = `MATCH_${settlement.groupId._id}_${Date.now()}`;
    
    
    const adminName = groupAdmin.nickname || groupAdmin.name || "Admin";

    const newMatch = new Match({
        matchId: matchStringId,
        groupId: settlement.groupId._id,
        teamA: { 
            name: "Team A", 
            players: [adminName] 
        }, 
        teamB: { 
            name: "Team B", 
            players: [] 
        },
        
        batsmen: {},
        bowlers: {}
    });

    

newMatch.batsmen[adminName] = { team: "A", runs: 0, balls: 0, isOut: false };
newMatch.bowlers[adminName] = { team: "A", overs: 0, balls:0, wickets: 0, runs: 0 ,economy:"0"};
    await newMatch.save();

    // 5. Link Match to Settlement
    settlement.matchId = newMatch._id; 
    settlement.matchStringId = matchStringId; 
    await settlement.save();

    res.status(201).json({
        success: true,
        matchId: matchStringId, 
        mongoId: newMatch._id,
        message: "Match started. Admin added to Team A. Add other players manually."
    });

  } catch (error) {
    console.error("Start Match Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getMatchId= async (req, res) => {
  try {
    const { settlementId } = req.params;
    const settlement = await Settlement.findById(settlementId);

    if (!settlement || !settlement.matchStringId) {
      return res.status(404).json({ message: "Match not found for this settlement" });
    }
    res.status(200).json({ matchId: settlement.matchStringId });
  } catch (error) {
    console.error("Get Match ID Error:", error);
    res.status(500).json({ message: error.message });
  }
};
