
import client from '../middleware/redis.js';
export const generalratelimiter=(limit,timer)=>async(req,res,next)=>{
    const clientIp=req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const key=`${clientIp}:request_count;`;

    const request_count=await client.incr(key);

   if(request_count===1){
    await client.expire(key,timer);
   }
   const timeRemaining=await client.ttl(key);

   if(request_count>limit){
    return res.status(429).json({
        success:false,
        message:`Rate limit exceeded. Try again in ${timeRemaining} seconds.`
    });
   }
    next();
    
}