const { Log } = require('../model/logSchema');

const insertLog = async(uId,description)=>{
    return new Log({
        uId : uId,
        description : description,
        isActive : true,
        isDeleted :false,
        createdDate : new Date(),
        updatedDate : new Date()
    });
};

exports.insertLog = insertLog;