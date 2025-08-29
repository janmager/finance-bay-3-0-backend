import ratelimit from '../config/upstash.js';

const rateLimiter = async (req, res, next) => {
    try{
        // TODO: userId, ip address
        const { success } = await ratelimit.limit("my-rate-limit");

        if(!success){
            return res.status(429).json({message: "Too many requests, please try again later."});
        }

        next();
    }
    catch(e){
        console.log('Rate limit error ', e);
        next(e);
    }
}

export default rateLimiter;