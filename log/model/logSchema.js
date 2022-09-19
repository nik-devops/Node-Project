const mongoose = require('mongoose');
const joi = require('joi');

const schema = mongoose.Schema;

const logSchema = new schema({
    uId : { type:mongoose.Types.ObjectId, required:true, ref: 'user' },
    description : { type:String, required:true },
    isActive : { type:Boolean, required:true },
    isDeleted : { type:Boolean, required:true },
    createdDate : { type: Date },
    updatedDate : { type: Date },
});

const Log = mongoose.model('log',logSchema);

exports.Log = Log;
