import express from 'express';
import { isAvailableBooking ,temporaryBooking,createBookingOrder,getBookingStatus,cancelTemporary, Mybooking,offlinebooking} from '../Controller/CreateBooking.js';
import {auth,isAdmin} from '../middleware/auth.js'
import {confirmBooking} from "../Controller/ConfirmBookingcontroller.js"

const BookingRouter = express.Router();

BookingRouter.post('/is-available/:boxId', isAvailableBooking);
BookingRouter.post("/create-temporary",auth,temporaryBooking)
BookingRouter.post("/create-order", auth,createBookingOrder );
BookingRouter.post("/confirm",auth,confirmBooking)
BookingRouter.get("/status/:bookingId",auth,getBookingStatus);
BookingRouter.get("/my-bookings",auth,Mybooking)
BookingRouter.delete("/cancel-temporary",auth,cancelTemporary);
BookingRouter.post("/create-offline-booking",auth,isAdmin,offlinebooking );
export default BookingRouter;