import Match from "../models/Match.js";
import Settlement from "../models/Settlement.js";


export const getmyMatches=async(req,res)=>{
    try {
        const userId=req.user.id;
        console.log("user id is ",userId);
        
        const matche=await Settlement.find({"participants.user":userId});
        console.log(matche);
      
        const matches=await Settlement.find({"participants.user":userId},{"participants.nickname": 1, "matchStringId": 1});
        console.log(matches);

       
        const matchIds=matches.map(m=>m.matchStringId);
        console.log("match ids are ",matchIds);
        const matcheDetails=await Match.find({matchId:{$in:matchIds}});
        console.log("match details are ",matcheDetails);
    
        res.status(200).json(matcheDetails);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }  }

    export const CreateLiveServer=async(req,res)=>{
        
    }


