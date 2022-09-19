const mongoose = require('mongoose');
const Joi = require('joi');

const schema = mongoose.Schema;

const projectSchema = new schema({
    name : { type:String, required:true },
    description : { type:String, required:true },
    isActive : { type:Boolean, required:true },
    isDeleted : { type:Boolean, required:true },
    createdDate : { type: Date },
    updatedDate : { type: Date },
});

const Project = mongoose.model('project',projectSchema);

function projectValidate(project)
{
    const schema =Joi.object({
        name : Joi.string().required(),
        description : Joi.string().required()
    });

    return schema.validate(project);
}

function projectIdValidate(project)
{
    const schema =Joi.object({
        pId : Joi.string().required()
    });

    return schema.validate(project);
}


function updateProjectValidate(project)
{
    const schema =Joi.object({
        pId : Joi.string().required(),
        name : Joi.string().allow(null).allow('').optional(),
        description : Joi.string().allow(null).allow('').optional()
    });

    return schema.validate(project);
}

exports.Project = Project;
exports.projectValidate = projectValidate;
exports.updateProjectValidate = updateProjectValidate;
exports.projectIdValidate = projectIdValidate;