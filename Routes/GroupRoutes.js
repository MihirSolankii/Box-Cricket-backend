import express from 'express';
import {CreateGroup,inviteUserToGroup,getMyGroups,AcceptUserInvite,getAllNicknames, getMyInvitations} from "../Controller/GroupController.js";
import {getGroupById} from "../Controller/groupbyIdcontroller.js"
import {auth} from '../middleware/auth.js'
const GroupRoutes=express.Router();


GroupRoutes.post("/create-group",auth,CreateGroup);
GroupRoutes.post("/invite-group",auth,inviteUserToGroup);
GroupRoutes.get("/my-invitations",auth,getMyInvitations)
GroupRoutes.post("/accept-userInvite",auth,AcceptUserInvite)
GroupRoutes.get("/my-groups",auth,getMyGroups);
GroupRoutes.post("/get-group-detail",auth,getGroupById)
GroupRoutes.get("/nicknames", auth, getAllNicknames);

export default GroupRoutes;