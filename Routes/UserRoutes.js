import express from 'express';
import {getAllboxes,getRegsiterdBoxes,getBoxDetails,getAllboxDetails,} from '../Controller/UserController.js';
import {auth,isUser,isAdmin} from '../middleware/auth.js';
const UserRouter=express.Router();


UserRouter.post("/box",getAllboxes);
// UserRouter.get("/box/:id",getBoxDetails)
UserRouter.get("/box/:id",getAllboxDetails);
// UserRouter.post("/box-by-city",cityBasedBoxes);
export default UserRouter;