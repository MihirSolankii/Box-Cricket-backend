import Match from "../models/Match.js";
import Settlement from "../models/Settlement.js";


export const getmyMatches=async(req,res)=>{
    try {
        const userId=req.user.id;
        const matches=await Settlement.find({"participants.user":userId},{"participants.nickname": 1, "matchStringId": 1});
        const matchIds=matches.map(m=>m.matchStringId);
        const matcheDetails=await Match.find({matchId:{$in:matchIds}});
    
        res.status(200).json(matcheDetails);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }  }

    export const CreateLiveServer=async(req,res)=>{
        
    }


