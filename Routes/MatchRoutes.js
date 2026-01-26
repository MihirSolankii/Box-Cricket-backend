import express from 'express';
import {getmyMatches,CreateLiveServer} from "../Controller/MatchController.js"
import {auth} from '../middleware/auth.js'

const MatchRoutes=express.Router();


MatchRoutes.get("/my-matches",auth,getmyMatches);
MatchRoutes.post("/create-live-stream",auth,CreateLiveServer)

export default MatchRoutes;