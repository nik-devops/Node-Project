const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const Joi = require('joi');

const schema = mongoose.Schema;

const userSchema = new schema({
    name : { type:String, required:true },
    email : { type:String, required:true, unique:true },
    password : { type:String, required:true, minlength:6 },
    mobile : { type:Number, required:true, minlength:10, maxlength:10 },
    role : { type:String, required:true },
    pIds : [{ type:mongoose.Types.ObjectId, required:true, ref: 'project' }],
    isActive : { type:Boolean, required:true },
    isDeleted : { type:Boolean, required:true },
    createdDate : { type: Date },
    updatedDate : { type: Date },
});

userSchema.plugin(uniqueValidator);

const User = mongoose.model('user',userSchema);

function newUserValidate(user)
{
    const schema =Joi.object({
        name : Joi.string().required(),
        email : Joi.string().required().email(),
        password : Joi.string().min(6).required(),
        mobile : Joi.number().min(1000000000).required().max(9999999999)
    });

    return schema.validate(user);
}

function loginValidate(user)
{
    const schema =Joi.object({
        email : Joi.string().required().email(),
        password : Joi.required(),
        role : Joi.required()
    });

    return schema.validate(user);
}

function userIdValidate(user)
{
    const schema =Joi.object({
        uId : Joi.string().required()
    });

    return schema.validate(user);
}

function projectIdValidate(user)
{
    const schema =Joi.object({
        pId : Joi.string().required(),
        uId : Joi.string().allow(null).allow('').optional()
    });

    return schema.validate(user);
}

function changePasswordUserValidate(user)
{
    const schema =Joi.object({
        oldPassword : Joi.string().required(),
        newPassword : Joi.string().required(),
        confirmPassword : Joi.string().required()
    });

    return schema.validate(user);
}

function updateUserValidate(user)
{
    const schema =Joi.object({
        name : Joi.string().allow(null).allow('').optional(),
        email : Joi.string().allow(null).allow('').optional(),
        mobile : Joi.number().min(1000000000).max(9999999999).allow(null).allow('').optional()
    });

    return schema.validate(user);
}

function updateUserByAdminValidate(user)
{
    const schema =Joi.object({
        uId : Joi.string().required(),
        name : Joi.string().allow(null).allow('').optional(),
        email : Joi.string().email().allow(null).allow('').optional(),
        mobile : Joi.number().min(1000000000).max(9999999999).required().allow(null).allow('').optional(),
        newPassword : Joi.string().allow(null).allow('').optional(),
    });

    return schema.validate(user);
}

exports.User = User;
exports.newUserValidate = newUserValidate;
exports.updateUserValidate = updateUserValidate;
exports.loginValidate = loginValidate;
exports.userIdValidate = userIdValidate;
exports.projectIdValidate = projectIdValidate;
exports.changePasswordUserValidate = changePasswordUserValidate;
exports.updateUserByAdminValidate = updateUserByAdminValidate;