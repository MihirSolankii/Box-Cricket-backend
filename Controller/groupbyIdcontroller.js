import Group from "../models/Group.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";

export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user.id;


    let group = await Group.findById(groupId).lean();

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

   
    const admin = await User.findById(group.admin).select("name nickname avatar").lean();
    group.admin = admin; // Attach admin to the group object manually

    let booking = await Booking.findById(group.bookingId).lean();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    group.bookingId = booking; 

   
    const memberIds = booking.groupMembers.map(m => m.memberId);
    
    // Fetch all those users in one query
    const users = await User.find({ _id: { $in: memberIds } })
      .select("name nickname avatar")
      .lean();

    // Map the user details back to the groupMembers array
    booking.groupMembers = booking.groupMembers.map(member => {
      const userDetails = users.find(u => u._id.toString() === member.memberId.toString());
      return {
        ...member,
        memberId: userDetails 
      };
    });

    // 5. Security Check (Admin or Member only)
    const isAdmin = group.admin._id.toString() === userId;
    
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