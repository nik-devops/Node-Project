const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const Joi = require('joi');

const schema = mongoose.Schema;

const credentialSchema = new schema({
    credentialName : { type:String, required:true },
    userName : { type:String },
    email : { type:String, unique:true },
    phone : { type:String },
    password : { type:String, required:true, minlength:6 },
    iv : { type:String, required:true },
    url : { type:String, required:true },
    comment : { type:String, required:true },
    pId : { type:mongoose.Types.ObjectId, required:true },
    uIds : [{ type:mongoose.Types.ObjectId, required:true, ref: 'user' }],
    isActive : { type:Boolean, required:true },
    isDeleted : { type:Boolean, required:true },
    createdDate : { type: Date },
    updatedDate : { type: Date },
});    

credentialSchema.plugin(uniqueValidator);

const Credential = mongoose.model('credential',credentialSchema);

function credentialValidate(credential)
{
    const schema =Joi.object({
        credentialName : Joi.string().required(),
        userName : Joi.string().allow(null).allow('').optional(),
        email : Joi.string().email().allow(null).allow('').optional(),
        phone : Joi.string().allow(null).allow('').optional(),
        password : Joi.required(),
        url : Joi.string().required(),
        comment : Joi.string().required(),
        pId : Joi.string().required()
    });

    return schema.validate(credential);
}

function validateAssignment(credential)
{
    const schema =Joi.object({
        projectId : Joi.string().required(),
        userId : Joi.string().required(),
        credentialId : Joi.array().required()
    });

    return schema.validate(credential);
}

function validateId(credential)
{
    const schema =Joi.object({
        cId : Joi.string().required()
    });

    return schema.validate(credential);
}

function updateCredentialValidate(credential)
{
    const schema =Joi.object({
        cId : Joi.string().required(),
        credentialName : Joi.string().allow(null).allow('').optional(),
        userName : Joi.string().allow(null).allow('').optional(),
        email : Joi.string().email().allow(null).allow('').optional(),
        phone : Joi.string().allow(null).allow('').optional(),
        newPassword : Joi.string().allow(null).allow('').optional(),
        url : Joi.string().allow(null).allow('').optional(),
        comment : Joi.string().allow(null).allow('').optional()
    });

    return schema.validate(credential);
}

function changePasswordCredentialValidate(credential)
{
    const schema =Joi.object({
        cId : Joi.string().required(),
        oldPassword : Joi.string().required(),
        newPassword : Joi.string().required(),
        confirmPassword : Joi.string().required()
    });

    return schema.validate(credential);
}

exports.Credential = Credential;
exports.credentialValidate = credentialValidate;
exports.validateAssignment = validateAssignment;
exports.validateId = validateId;
exports.updateCredentialValidate = updateCredentialValidate;
exports.changePasswordCredentialValidate = changePasswordCredentialValidate;