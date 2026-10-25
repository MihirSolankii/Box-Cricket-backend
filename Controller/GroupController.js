
import Booking from "../models/Booking.js";
import Group from "../models/Group.js";
import User from "../models/User.js"
import BaseUser from "../models/BaseUser.js";
import mongoose from "mongoose"
import Settlement from "../models/Settlement.js";
import { round2 } from "../helpers/money.js";

const getUserModel = () => {
  return mongoose.model("user") || BaseUser;
};

export const CreateGroup=async(req,res)=>{
    try {
     const{name,bookingId}=req.body;

    const userId=req.user.id;

if(!bookingId,!name){
     return res.status(400).json({ message: "Booking ID and group name are required" });
}

const booking = await Booking.findById(bookingId);
 if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
   
   if (!booking.user) {
  return res.status(400).json({ message: "Invalid booking data" });
}



if (booking.user.toString() !== userId) {
  return res.status(403).json({
    message: "Only booking owner can create group"
  });
}

 if(booking.paymentStatus!=="success"){
    return res.status(400).json({ message: "Booking payment not completed"})
 }

 const exisingGroup =await Group.findOne({bookingId});
 if(exisingGroup){
    return res.status(200).json(exisingGroup);
 }      
   booking.groupAdmin = userId;
    booking.groupMembers = [
      {
        memberId: userId,
        status: "accepted",
        unpaidWarnings: 0
      }
    ];
    await booking.save();
   
    
 const group = await Group.create({
      name,
      bookingId,
      admin: userId
    });
 res.status(201).json(
    group,
);
        
    } catch (error) {
         console.error("Create group error:", error);
         res.status(500).json({ message: error.message });
    }
}


export const inviteUserToGroup = async (req, res) => {
  try {
    const { groupId, nickname } = req.body;
    const adminId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: "Only admin can invite" });
    }

    const user = await User.findOne({ nickname });
    if (!user) return res.status(404).json({ message: "User not found" });
    
  

    const alreadyInvited = group.invites.some(
      i => i.nickname === nickname 
    );
    if (alreadyInvited) {
      return res.status(400).json({ message: "Already invited" });
    }

    group.invites.push({
      nickname,
      invitedBy: adminId,
      inviteeId: user._id
    });

    await group.save();
    res.status(200).json({ message: "Invite sent" });
  } catch (error) {
    console.error("Invite user error:", error);
    res.status(500).json({ message: error.message });
  }
};

// export const AcceptUserInvite=async(req,res)=>{
//     try {
//         const {groupId}=req.body;
//     const userId=req.user.id;
//      const group = await Group.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }
//   //there will be error in these 
//     //  const member = group.invites.find(
//     //   m => m.memberId.toString() === userId && m.status === "pending"
//     // );

//     if (!member) {
//       return res.status(400).json({ message: "No pending invite found" });
//     }
//     member.status="accepted";
//     await Group.save();
//     return res.status(200).json({
//         message:"Accepted "
//     })
        
//     } catch (error) {
//          res.status(500).json({ message: error.message });
//          console.log(error);
         
//     }
    

// }

// export const leaveGroup = async (req, res) => {
//   try {
//     const { groupId } = req.body;
//     const userId = req.user.id;

//     const group = await Group.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }

//     if (group.admin.toString() === userId) {
//       return res.status(400).json({ message: "Admin cannot leave group" });
//     }

//     group.groupMembers = group.groupMembers.filter(
//       m => m.memberId.toString() !== userId
//     );

//     await group.save();
//     res.status(200).json({ message: "Left group successfully" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export const blockMember = async (req, res) => {
//   try {
//     const { groupId, memberId } = req.body;
//     const adminId = req.user.id;

//     const group = await Group.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }

//     if (group.admin.toString() !== adminId) {
//       return res.status(403).json({ message: "Only admin can block members" });
//     }

//     const member = group.groupMembers.find(
//       m => m.memberId.toString() === memberId
//     );

//     if (!member) {
//       return res.status(404).json({ message: "Member not found" });
//     }

//     member.status = "blocked";
//     await group.save();

//     res.status(200).json({ message: "Member blocked successfully" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
// export const getMyGroups = async (req, res) => {
//   try {
//      const userId= req.user.id;
//     // Step 1: find bookings where user is a member
//     const bookings = await Booking.find({
//       $or: [
//         { bookedBy: userId },
//         { "groupMembers.memberId": userId }
//       ]
//     }).select("_id");

//     const bookingIds = bookings.map(b => b._id);
//     console.log("bookingId:",bookingIds);
    

//     // Step 2: find groups linked to those bookings
//     //there will be an error in these code try to fix these code 
//     const groups = await Group.find({
//       $or: [
//         { admin: userId },
//         { bookingId: { $in: bookingIds } }
//       ]
//     })
//       .populate("bookingId")
//       .populate("admin", "nickname");

//     res.status(200).json(groups);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//     console.log("error at line ",error );
    
//   }
// };

// export const getGroupById = async (req, res) => {
//   try {
//     const { groupId } = req.params;
//     const userId = req.user.id;

//     const group = await Group.findById(groupId)
//       .populate("bookingId")
//       .populate("admin", "nickname");

//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }

//     // Load booking members
//     const booking = await Booking.findById(group.bookingId._id);

//     const isAdmin = group.admin._id.toString() === userId;

//     const isMember = booking.groupMembers.some(
//       m => m.memberId.toString() === userId
//     );

//     if (!isAdmin && !isMember) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     res.status(200).json({
//       group,
//       members: booking.groupMembers
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };




export const AcceptUserInvite = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user.id;

    // 1. Find group
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // 2. Find user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 3. Find pending invite
    const invite = group.invites.find(
      inv => inv.nickname === user.nickname && inv.status === "pending"
    );

    if (!invite) return res.status(400).json({ message: "No pending invite found" });

    // 4. Accept invite (Update Status)
    invite.status = "accepted";
    // Important: Save the User ID in the invite if it wasn't there
    invite.inviteeId = user._id; 

    // 5. Update booking groupMembers
    const booking = await Booking.findById(group.bookingId);
    if (booking) {
      const existingMember = booking.groupMembers.find(
        m => m.memberId.toString() === userId
      );

      if (existingMember) {
        existingMember.status = "accepted";
      } else {
        booking.groupMembers.push({
          memberId: userId,
          status: "accepted",
          unpaidWarnings: 0
        });
      }
      await booking.save();
    }

    // 6. Save group
    await group.save();

   
    const settlement = await Settlement.findOne({ groupId });
    
    if (settlement) {
      // A. Check if user is already in participants (avoid duplicates)
      const alreadyInSettlement = settlement.participants.some(
        p => p.user && p.user.toString() === userId
      );

      if (!alreadyInSettlement) {
        
        settlement.participants.push({
          user: userId,
          nickname: user.nickname,
          amountOwed: 0, 
          amountPaid: 0,
          paymentStatus: "pending",
          transactions: []
        });

        
        const totalPeople = settlement.participants.length;
        const newShare = round2(settlement.totalAmount / totalPeople);

        let distributed = 0;

        settlement.participants.forEach((p, index) => {
        
          let myShare = newShare;

          
          if (index === settlement.participants.length - 1) {
            myShare = round2(settlement.totalAmount - distributed);
          }
          distributed += myShare;

          
          p.amountOwed = myShare;

          // Update Status: If they already paid enough, mark as paid
          if (p.amountPaid >= p.amountOwed) {
            p.paymentStatus = "paid";
          } else {
            p.paymentStatus = "pending";
          }
        });

        await settlement.save();
      }
    }
    // ---------------------------------------------------------

    // 7. Add admin & user as friends (Your existing logic)
    const adminId = group.admin.toString();
    if (adminId !== userId) {
      const admin = await User.findById(adminId);
      if (admin) {
        if (!user.friends.includes(adminId)) user.friends.push(adminId);
        if (!admin.friends.includes(userId)) admin.friends.push(userId);
        await Promise.all([user.save(), admin.save()]);
      }
    }

    return res.status(200).json({
      message: "Invite accepted & Settlement updated successfully!",
      group
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};


export const getMyInvitations = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get the current user's nickname
    // We need this because your system invites by nickname, not ID
    const user = await User.findById(userId).select("nickname");
    
    if (!user || !user.nickname) {
      return res.status(200).json({ success: true, invites: [] });
    }

    // 2. Find groups where this nickname has a 'pending' invite
    const groups = await Group.find({
      invites: { 
        $elemMatch: { 
          nickname: user.nickname, 
          status: "pending" 
        } 
      }
    })
    .select("name _id admin invites") // Select fields we need
    .populate("admin", "name nickname"); // Get Admin details for "Invited By"

    // 3. Format data for Frontend
    const formattedInvites = groups.map(group => {
      return {
        _id: group._id, // This is the groupId needed for the Accept button
        groupName: group.name,
        invitedBy: group.admin?.name || "Admin", // Display name of admin
        invitedByNickname: group.admin?.nickname,
       // You can calculate share amount here if your logic allows
        status: "pending"
      };
    });

    res.status(200).json({ success: true, invites: formattedInvites });

  } catch (error) {
    console.error("Error fetching invites:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is admin
    if (group.admin.toString() === userId) {
      return res.status(400).json({ message: "Admin cannot leave group" });
    }

    // Remove from booking's groupMembers
    const booking = await Booking.findById(group.bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.groupMembers = booking.groupMembers.filter(
      m => m.memberId.toString() !== userId
    );
    await booking.save();

    // Remove invite from group if exists
    const user = await User.findById(userId);
    if (user && user.nickname) {
      group.invites = group.invites.filter(
        inv => inv.nickname !== user.nickname
      );
      await group.save();
    }

    res.status(200).json({ message: "Left group successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const blockMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.body;
    const adminId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if requester is admin
    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: "Only admin can block members" });
    }

    // Update status in booking's groupMembers
    const booking = await Booking.findById(group.bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const member = booking.groupMembers.find(
      m => m.memberId.toString() === memberId
    );

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    member.status = "blocked";
    await booking.save();

    // Update invite status in group if exists
    const user = await User.findById(memberId);
    if (user && user.nickname) {
      const invite = group.invites.find(inv => inv.nickname === user.nickname);
      if (invite) {
        invite.status = "rejected";
        await group.save();
      }
    }

    res.status(200).json({ message: "Member blocked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find bookings where user is involved
    const bookings = await Booking.find({
      $or: [
        { user: userObjectId },
        { bookedBy: userObjectId },
        { "groupMembers.memberId": userObjectId },
        { groupAdmin: userObjectId }
      ]
    });

    const bookingIds = bookings.map(b => b._id);

    // Find groups where user is admin OR linked to their bookings
    const groups = await Group.find({
      $or: [
        { admin: userObjectId },
        { bookingId: { $in: bookingIds } }
      ]
    })
      .populate("bookingId")
      .populate("admin", "nickname");

    res.status(200).json(groups);
  } catch (error) {
    console.error("error at getMyGroups:", error);
    res.status(500).json({ message: error.message });
  }
};
// export const getGroupById = async (req, res) => {
//   try {
//     const { groupId } = req.body;
//     const userId = req.user.id;

//     const group = await Group.findById(groupId)
//       .populate("bookingId")
//       .populate("admin", "nickname");

//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }

//     // Load booking members
//     const booking = await Booking.findById(group.bookingId._id)
//       .populate("groupMembers.memberId", "nickname");

//     if (!booking) {
//       return res.status(404).json({ message: "Booking not found" });
//     }
//     console.log("booking",booking);
    
//     const isAdmin = group.admin._id.toString() === userId;
//     const isMember = booking.groupMembers.some(
//       m => m.memberId._id.toString() === userId
//     );
//     console.log(isAdmin);
//     console.log(isMember);
    
    

//     if (!isAdmin && !isMember) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     res.status(200).json({ 
//       group, 
//       members: booking.groupMembers 
//     });
//   } catch (error) {
//     console.log(error );
    
//     res.status(500).json({ message: error.message });
//   }
// };



export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user.id;

    // 1. Find Group & Populate Admin
    // We populate "name" (from BaseUser) and "nickname" (from User)
    const group = await Group.findById(groupId)
      .populate("bookingId")
      .populate("admin", "name nickname"); 

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // 2. Load Booking & Populate Members
    // Again, we fetch both name and nickname for the members list
    const booking = await Booking.findById(group.bookingId._id)
      .populate("groupMembers.memberId", "name nickname avatar");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // 3. Security Check (Admin or Member only)
    const isAdmin = group.admin._id.toString() === userId;
    
    // Safety check: ensure memberId exists before converting to string
    const isMember = booking.groupMembers.some(
      m => m.memberId && m.memberId._id.toString() === userId
    );

    if (!isAdmin && !isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json({ 
      success: true,
      group, 
      members: booking.groupMembers 
    });

  } catch (error) {
    console.error("Get Group Detail Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Add friend directly to group (no invite needed for friends)
export const addFriendToGroup = async (req, res) => {
  try {
    const { groupId, friendNickname } = req.body;
    const adminId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if requester is admin
    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    // Find friend by nickname
    const friend = await User.findOne({ nickname: friendNickname });
    if (!friend) {
      return res.status(404).json({ message: "User not found" });
    }

    const friendId = friend._id.toString();

    // Check if they are friends
    const admin = await User.findById(adminId);
    if (!admin.friends.includes(friendId)) {
      return res.status(400).json({ 
        message: "You can only add friends to the group directly. Send an invite for non-friends." 
      });
    }

    // Check if already in group
    const booking = await Booking.findById(group.bookingId);
    const alreadyMember = booking.groupMembers.some(
      m => m.memberId.toString() === friendId
    );

    if (alreadyMember) {
      return res.status(400).json({ message: "Friend is already in the group" });
    }

    // Add to booking groupMembers with "accepted" status (skip invite for friends)
    booking.groupMembers.push({
      memberId: friendId,
      status: "accepted",
      unpaidWarnings: 0
    });
    await booking.save();

    // Add to group invites with "accepted" status
    group.invites.push({
      nickname: friendNickname,
      invitedBy: adminId,
      status: "accepted"
    });
    await group.save();

    res.status(200).json({ 
      message: "Friend added to group successfully",
      group 
    });
  } catch (error) {
    console.error("Add friend error:", error);
    res.status(500).json({ message: error.message });
  }
};






export const getAllNicknames = async (req, res) => {
  try {
    const users = await User.find(
      { nickname: { $exists: true, $ne: null } }, 
      { nickname: 1 } 
    ).sort({ nickname: 1 });

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get nicknames error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch nicknames",
    });
  }
};


