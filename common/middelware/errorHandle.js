const fs = require('fs');

module.exports = (error,req,res,next) =>{
    if(req.file)
    {
        fs.unlink(req.file.path,err=>{
            console.log(error);
        });
    }
    if(req.headerSent)
    {
        return next(error);
    }
    res.status(error.errorCode || 500).json({message : error.message || 'Unknown error caught'});
};