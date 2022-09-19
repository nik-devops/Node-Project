const jwt = require('jsonwebtoken');

const HttpError = require('../model/http-error');
const jwtSecretKey = require('../config/config').jwtSecretKey;

module.exports = (req,res,next)=>{
    if(req.method === 'OPTIONS')
    {
        return next();
    }
    try{
        const token = req.headers.authorization.split(' ')[1];
        if(!token)
        {
            const error = new HttpError('Authentication failed',401);
            return next(error);
        }
        const decodedToken = jwt.verify(token,jwtSecretKey);
        req.userData = { userId:decodedToken.userId, role:decodedToken.role };
        
        next();
    }
    catch(err)
    {
        const error = new HttpError(err.message+' Authentication Failed',403);
        return next(error);
    }
};