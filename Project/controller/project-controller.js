const HttpError = require('../../common/model/http-error');
const { insertLog } = require('../../log/controller/logController');
const { Project,projectValidate,updateProjectValidate,projectIdValidate } = require('../model/project-schema');
const { User } = require('../../User/model/user-schema');
const { Credential, validateId } = require('../../Credential/model/credential-schema');

const addProject = async(req,res,next) =>{
    const { error } = projectValidate(req.body);
    if(error){
        const invalid = new HttpError(error.details[0].message,400);
        return next(invalid);
    }
    const { name,description }  = req.body;

    const adminId = req.userData.userId;
    const role = req.userData.role;

    if(!adminId)
    {
        return next(new HttpError('Your token does not contain Id',401));
    }
    if(role !== 'admin')
    {
        const error = new HttpError('You are not admin you cant do this',404);
        return next(error);
    }

    let admin;
    try{
        admin = await User.findOne({ _id : adminId, role : role, isActive : { $eq : true }, isDeleted : { $eq : false} });
    }catch(err)
    {
        const error = new HttpError('Creating Project failed',500);
        return next(error);
    }
    
    if(!admin)
    {
        const error = new HttpError('Could not find admin for your id',404);
        return next(error);
    }
    let existingProject;
    try{
        existingProject = await Project.findOne({name : name});
    }
    catch(err)
    {
        const error = new HttpError(err.message+' Creating project failed',500);
        return next(error);
    }
    if(existingProject)
    {
        const error = new HttpError('Project already exists',422);
        return next(error);
    }
    const createProject = new Project({
        name,
        description,
        isActive : true,
        isDeleted :false,
        createdDate : new Date(),
        updatedDate : new Date(),
    });
    try{
        await createProject.save();
        try{
            const description = `New Project with project id : ${createProject.id} is created. and this project is added under admin`
            const log = await insertLog(admin.id,description);
            await log.save();
            try{
                admin.pIds.push(createProject.id);
                await User.updateOne({_id:admin.id},admin);
            }
            catch(err)
            {
                const error = new HttpError(err+'User is not updated.',500);
                await log.remove();
                await createProject.remove();
                return next(error);
            }
        }
        catch(err)
        {
            const error = new HttpError(err+'Log is not created.',500);
            await createProject.remove();
            return next(error);
        }
    }
    catch(err)
    {
        const error = new HttpError(err+' Something went wrong.',500);
        return next(error);
    }

    res.status(201).json({ message : 'Project created successfully' });
};

const deleteProjectAdmin = async(req,res,next)=>{
    const { error } = projectIdValidate(req.body);
    if(error){
        const invalid = new HttpError(error.details[0].message,400);
        return next(invalid);
    }
    const { pId }  = req.body;

    const userId = req.userData.userId;
    const role = req.userData.role;

    if(!userId)
    {
        return next(new HttpError('Your token does not contain Id',401));
    }
    if(role !== 'admin')
    {
        const error = new HttpError('You are not user you cant do this',404);
        return next(error);
    }

    let user;
    try{
        user = await User.findOne({ _id : userId, role : role, isActive : { $eq : true }, isDeleted : { $eq : false}, pIds : pId });
    }catch(err)
    {
        const error = new HttpError('Deleting project failed',500);
        return next(error);
    }
    
    if(!user)
    {
        const error = new HttpError('Could not find admin for your id',404);
        return next(error);
    }
    let existingProject;
    try{
        existingProject = await Project.findById(pId);
    }
    catch(err)
    {
        const error = new HttpError(err.message+' Deleting project failed',500);
        return next(error);
    }
    if(!existingProject)
    {
        const error = new HttpError('Project not exist for provided Id',422);
        return next(error);
    }
    existingProject.updatedDate = new Date();
    let description;
    existingProject.isDeleted = true;
   
    let log;
   
    description = `User with user id : ${userId} has deleted project with project id : ${pId} for all.` 
    try{
        await Project.updateOne({_id:pId},existingProject);
        try{
            
            log = await insertLog(userId,description);
            await log.save();
            await Credential.updateMany({pId : pId},{ $set : {isDeleted : true , updatedDate : new Date()}});
            await User.updateMany({pIds : pId},{$pull : { pIds : pId }, $set : {updatedDate : new Date()}});
        }
        catch(err)
        {
            const error = new HttpError(err+'Log is not created.',500);
            return next(error);
        }
    }
    catch(err)
    {
        const error = new HttpError(err+' Something went wrong',500);
        return next(error);
    }

    res.status(201).json({ message : 'Project is Deleted successfully'});

};

const deleteProjectUser = async(req,res,next)=>{
    const { error } = projectIdValidate(req.body);
    if(error){
        const invalid = new HttpError(error.details[0].message,400);
        return next(invalid);
    }
    const { pId }  = req.body;

    const userId = req.userData.userId;
    const role = req.userData.role;

    if(!userId)
    {
        return next(new HttpError('Your token does not contain Id',401));
    }
    if(role !== 'user')
    {
        const error = new HttpError('You are not user you cant do this',404);
        return next(error);
    }

    let user;
    try{
        user = await User.findOne({ _id : userId, role : role, isActive : { $eq : true }, isDeleted : { $eq : false}, pIds : pId });
    }catch(err)
    {
        const error = new HttpError('Deleting project failed',500);
        return next(error);
    }
    
    if(!user)
    {
        const error = new HttpError('Could not find user for your id',404);
        return next(error);
    }
    let existingProject;
    try{
        existingProject = await Project.findById(pId);
    }
    catch(err)
    {
        const error = new HttpError(err.message+' Deleting project failed',500);
        return next(error);
    }
    if(!existingProject)
    {
        const error = new HttpError('Project not exist for provided Id',422);
        return next(error);
    }
    let description;
    let log;
    description = `User with user id : ${userId} has deleted project with project id :${pId} from own account.` 
    try{
        await User.updateOne({_id:userId},{$pull : {pIds : pId}, $set : {updatedDate : new Date()}});
        try{
            
            log = await insertLog(userId,description);
            await log.save();
            await Credential.updateMany({pId : pId,uIds : userId},{ $pull : {uIds : userId} , $set : { updatedDate : new Date() }});
        }
        catch(err)
        {
            const error = new HttpError(err+'Log is not created.',500);
            return next(error);
        }
    }
    catch(err)
    {
        const error = new HttpError(err+' Something went wrong',500);
        return next(error);
    }

    res.json({ message : 'Project is Deleted successfully'});

};

const updateProject = async(req,res,next)=>{
    const { error } = updateProjectValidate(req.body);
    if(error){
        const invalid = new HttpError(error.details[0].message,400);
        return next(invalid);
    }
    const { pId,name,description }  = req.body;

    const userId = req.userData.userId;
    const role = req.userData.role;

    if(!userId)
    {
        return next(new HttpError('Your token does not contain Id',401));
    }
    if(role !== 'admin')
    {
        const error = new HttpError('You are not user you cant do this',404);
        return next(error);
    }

    let user;
    try{
        user = await User.findOne({ _id : userId, role : role, isActive : { $eq : true }, isDeleted : { $eq : false},pIds : pId });
    }catch(err)
    {
        const error = new HttpError('Updating project failed',500);
        return next(error);
    }
    
    if(!user)
    {
        const error = new HttpError('Could not find user for your id',404);
        return next(error);
    }
    let project;
    try{
        project = await Project.findOne({_id :pId,isDeleted : false});
    }catch(err)
    {
        const error = new HttpError('Updating project failed',500);
        return next(error);
    }
    
    if(!project)
    {
        const error = new HttpError('Could not find project for provided id',404);
        return next(error);
    }
    project.name = (!name) ? project.name : name;
    project.description = (!description) ? project.description : description;
    project.updatedDate = new Date();
    try{
        await Project.updateOne({_id:pId},project);
        try{
            const description = ` Project with project id : ${pId} is updated`
            const log = await insertLog(userId,description);
            await log.save();
            
        }
        catch(err)
        {
            const error = new HttpError(err+'Log is not created.',500);
            return next(error);
        }
    }
    catch(err)
    {
        const error = new HttpError(err+' Something went wrong.',500);
        return next(error);
    }

    res.json({ message : 'Project Updated successfully' });
};

const updateProjectStatus = async(req,res,next) =>{
    const { error } = projectIdValidate(req.body);
    if(error){
        const invalid = new HttpError(error.details[0].message,400);
        return next(invalid);
    }
    const { pId }  = req.body;

    const userId = req.userData.userId;
    const role = req.userData.role;

    if(!userId)
    {
        return next(new HttpError('Your token does not contain Id',401));
    }
    if(role !== 'admin')
    {
        const error = new HttpError('You are not user you cant do this',404);
        return next(error);
    }

    let user;
    try{
        user = await User.findOne({ _id : userId, role : role, isActive : { $eq : true }, isDeleted : { $eq : false},pIds : pId });
    }catch(err)
    {
        const error = new HttpError('Updating project status failed',500);
        return next(error);
    }
    
    if(!user)
    {
        const error = new HttpError('Could not find user for your id',404);
        return next(error);
    }
    let existingProject;
    try{
        existingProject = await Project.findOne({_id :pId,isDeleted : false});
    }
    catch(err)
    {
        const error = new HttpError(err.message+' Updating project status failed',500);
        return next(error);
    }
    if(!existingProject)
    {
        const error = new HttpError('Project not exist for provided Id',422);
        return next(error);
    }
    if(existingProject.isActive)
    {
        existingProject.isActive = false;
    }
    else{
        existingProject.isActive = true;
    }
    try{
        await Project.updateOne({_id:pId},existingProject);
        try{
            const description = `Project with project id : ${pId}'s status is updated.`
            const log = await insertLog(userId,description);
            await log.save();
        }
        catch(err)
        {
            const error = new HttpError(err+'Log is not created.',500);
            return next(error);
        }
    }
    catch(err)
    {
        const error = new HttpError(err+' Something went wrong',500);
        return next(error);
    }

    res.json({ message : 'Project status updated successfully'});
};

const getProjectById = async(req,res,next)=>{
    const { error } = projectIdValidate(req.body);
    if(error){
        const invalid = new HttpError(error.details[0].message,400);
        return next(invalid);
    }
    const { pId }  = req.body;

    const userId = req.userData.userId;
    const role = req.userData.role;

    if(!userId)
    {
        return next(new HttpError('Your token does not contain Id',401));
    }
    if(role !== 'admin' && role !== 'user')
    {
        const error = new HttpError('You are not user you cant do this',404);
        return next(error);
    }

    let user;
    try{
        user = await User.findOne({ _id : userId, role : role, isActive : { $eq : true }, isDeleted : { $eq : false},pIds : pId });
    }catch(err)
    {
        const error = new HttpError('Deleting project failed',500);
        return next(error);
    }
    
    if(!user)
    {
        const error = new HttpError('Could not find admin for your id',404);
        return next(error);
    }
    let existingProject;
    try{
        existingProject = await Project.findOne({_id :pId,isDeleted : false});
    }
    catch(err)
    {
        const error = new HttpError(err.message+' Deleting project failed',500);
        return next(error);
    }
    if(!existingProject)
    {
        const error = new HttpError('Project not exist for provided Id',422);
        return next(error);
    }
    res.json({ data : existingProject});
};

exports.addProject = addProject;
exports.deleteProjectAdmin = deleteProjectAdmin;
exports.deleteProjectUser = deleteProjectUser;
exports.updateProject = updateProject;
exports.updateProjectStatus = updateProjectStatus;
exports.getProjectById = getProjectById;