const HttpError = require('../../common/model/http-error');
const { insertLog } = require('../../log/controller/logController');
const { Credential,credentialValidate,validateAssignment,validateId,updateCredentialValidate,changePasswordCredentialValidate } = require('../model/credential-schema');
const { User } = require('../../User/model/user-schema');
const { Project } = require('../../Project/model/project-schema');
const { encrypt,decrypt } = require('../../common/middelware/encryption-decryption');

const addCredential = async(req,res,next) =>{
    const { error } = credentialValidate(req.body);
    if(error){
        const invalid = new HttpError(error.details[0].message,400);
        return next(invalid);
    }
    const { credentialName,userName,email,phone,password,url,comment,pId }  = req.body;

    const userId = req.userData.userId;
    const role = req.userData.role;

    if(!userId)
    {
        return next(new HttpError('Your token does not contain Id',401));
    }
    if(role !== 'admin' && role !== 'user')
    {
        const error = new HttpError('You are not user you can not do this',404);
        return next(error);
    }
    let project;
    try{
        project = await Project.findOne({_id :pId,isDeleted : false});
    }catch(err)
    {
        const error = new HttpError(err+' Creating credential failed',500);
        return next(error);
    }
    if(!project)
    {
        const error = new HttpError('Could not find project for your provided id',404);
        return next(error);
    } 
    if(project.isActive === false)
    {
        if(role !== 'admin')
        {
            const error = new HttpError('Project is deactivated from the system',404);
            return next(error);
        }
    }
    let user;
    try{
        user = await User.findOne({ _id : userId, role : role, isActive : { $eq : true }, isDeleted : { $eq : false},pIds : pId });
    }catch(err)
    {
        const error = new HttpError('Creating credential failed',500);
        return next(error);
    } 
    if(!user)
    {
        const error = new HttpError('Could not find user for your id',404);
        return next(error);
    }
    let existingCredential;
    try{
        existingCredential = await Credential.findOne({credentialName : credentialName});
    }
    catch(err)
    {
        const error = new HttpError(err.message+' Creating credential failed',500);
        return next(error);
    }
    if(existingCredential)
    {
        const error = new HttpError('Credential already exists.',422);
        return next(error);
    }
    let admin;
    try{
        admin = await User.findOne({role:'admin'});
    }catch(err)
    {
        const error = new HttpError('Creating credential failed',500);
        return next(error);
    } 
    if(!admin)
    {
        const error = new HttpError('Could not find admin in the system',404);
        return next(error);
    }
    
    let encryptedPassword = encrypt(password);
    let createCredential;
    if(role == 'admin')
    {
        createCredential = new Credential({
            credentialName,
            userName,
            email,
            phone,
            password : encryptedPassword.content,
            iv : encryptedPassword.iv,
            url,
            comment,
            pId,
            uIds : [userId],
            isActive : true,
            isDeleted :false,
            createdDate : new Date(),
            updatedDate : new Date(),
        });
    }
    else{
        createCredential = new Credential({
            credentialName,
            userName,
            email,
            phone,
            password : encryptedPassword.content,
            iv : encryptedPassword.iv,
            url,
            comment,
            pId,
            uIds : [userId,admin.id],
            isActive : true,
            isDeleted :false,
            createdDate : new Date(),
            updatedDate : new Date(),
        });
    }
    
    try{
        await createCredential.save();
        try{
            const description = `New Credential with credential id : ${createCredential.id} is created under project id : ${project.id}.`
            const log = await insertLog(user.id,description);
            await log.save();
        }
        catch(err)
        {
            const error = new HttpError(err+'Log is not created.',500);
            await createCredentialS.remove();
            return next(error);
        }
    }
    catch(err)
    {
        const error = new HttpError(err+' Something went wrong.',500);
        return next(error);
    }

    res.status(201).json({ message : 'Credential created successfully' });
};

const assignCredentials = async(req,res,next) =>{
    const { error } = validateAssignment(req.body);
    if(error){
        const invalid = new HttpError(error.details[0].message,400);
        return next(invalid);
    }
    const { projectId,userId,credentialId } = req.body;
    
    const adminId = req.userData.userId;
    const role = req.userData.role;

    if(!adminId)
    {
        return next(new HttpError('Your token does not contain Id',401));
    }
    if(role !== 'admin')
    {
        const error = new HttpError('You are not user, you can not do this',404);
        return next(error);
    }

    let project;
    try{
        project = await Project.findOne({_id :projectId,isDeleted : false});
    }catch(err)
    {
        const error = new HttpError(err+' Assigning credential failed',500);
        return next(error);
    }
    if(!project)
    {
        const error = new HttpError('Could not find project for your provided id',404);
        return next(error);
    }
    let admin;
    try{
        admin = await User.findOne({ _id : adminId, role : role, isActive : { $eq : true }, isDeleted : { $eq : false},pIds : projectId });
    }catch(err)
    {
        const error = new HttpError('Assigning credential failed',500);
        return next(error);
    } 
    if(!admin)
    {
        const error = new HttpError('Could not find admin for your id',404);
        return next(error);
    }
    let user;
    try{
        user = await User.findOne({_id : userId,isDeleted:false });
    }catch(err)
    {
        const error = new HttpError(err+' Assigning credential failed',500);
        return next(error);
    }
    if(!user)
    {
        const error = new HttpError('Could not find user for your provided id',404);
        return next(error);
    } 
    try{
        await Credential.updateMany({uIds  : userId, pId : projectId},{$pull : {uIds : userId}, $set : {updatedDate:new Date()}});
        if(credentialId)
        {
            if(!(user.pIds.includes(projectId)))
            {
                user.pIds.push(projectId);
                user.updatedDate = new Date();
                await User.updateOne({_id:user.id},user);
            }
        }
        else{
            if(user.pIds.includes(projectId))
            {
                let index = user.pIds.indexOf(projectId);
                user.pIds.splice(index,1);
                user.updatedDate = new Date();
                await User.updateOne({_id:user.id},user);
            }
        }
        let credential;
        try{
            for(let i=0;i<credentialId.length;i++)
            {
                try{
                    credential = await Credential.findOne({_id : credentialId[i],isDeleted:false,pId:projectId,uIds : { $nin : [userId] }});
                }catch(err)
                {
                    const error = new HttpError(err+' finding credential failed',500);
                    console.log(error+`for credential id : ${credentialId[i]}`);
                    continue;
                }
                if(!credential)
                {
                    const error = new HttpError('Could not find credential for your provided id',404);
                    console.log(error+`for credential id : ${credentialId[i]}`);
                    continue;
                } 
                credential.uIds.push(userId);
                credential.updatedDate = new Date();
                await Credential.updateOne({_id:credential.id},credential);
            }
            try{
                const description = `Credential access of ${credentialId} are assigned to user with user id : ${user.id} is created under project id : ${project.id}.`
                const log = await insertLog(adminId,description);
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
    }
    catch(err)
    {
        const error = new HttpError(err+' Something went wrong.',500);
        return next(error);
    }
    res.json({ message : 'Credential Assigned successfully' });
};

const  deleteCredential = async(req,res,next)=>{
    const { error } = validateId(req.body);
    if(error){
        const invalid = new HttpError(error.details[0].message,400);
        return next(invalid);
    }
    const { cId }  = req.body;

    const userId = req.userData.userId;
    const role = req.userData.role;

    if(!userId)
    {
        return next(new HttpError('Your token does not contain Id',401));
    }
    if(role !== 'user' && role !== 'admin')
    {
        const error = new HttpError('You are not User you can not do this',404);
        return next(error);
    }

    let existingCredential;
    try{
        existingCredential = await Credential.findOne({_id:cId,uIds : userId});
    }
    catch(err)
    {
        const error = new HttpError(err.message+' Something went wrong',500);
        return next(error);
    }
    if(!existingCredential)
    {
        const error = new HttpError('Credential not exist for provided Id',422);
        return next(error);
    }

    let user;
    try{
        user = await User.findOne({ _id : userId, role : role, isActive : { $eq : true }, isDeleted : { $eq : false} ,pIds : existingCredential.pId});
    }catch(err)
    {
        const error = new HttpError('deleting credential failed',500);
        return next(error);
    }
    
    if(!user)
    {
        const error = new HttpError('Could not find user for your id',404);
        return next(error);
    }
    existingCredential.updatedDate = new Date();
    let description;
    let index;
    if(role === 'admin')
    {
        existingCredential.isDeleted = true;
        existingCredential.updatedDate = new Date();
        description = `User with user id : ${userId} has deleted credential with credential id :${cId} for all.`
    }
    else{
        index = existingCredential.uIds.indexOf(userId);
        existingCredential.uIds.splice(index,1);
        existingCredential.updatedDate = new Date();
        description = `User with user id : ${userId} is deleted from credential with credential id :${cId}.`
    }
    
    try{
        await Credential.updateOne({_id:cId},existingCredential);
        try{
            
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

    res.status(201).json({ message : 'Credential is Deleted successfully'});
};

const revokeCredentials = async(req,res,next) =>{
    const { error } = validateAssignment(req.body);
    if(error){
        const invalid = new HttpError(error.details[0].message,400);
        return next(invalid);
    }
    const { projectId,userId,credentialId } = req.body;
    
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

    let project;
    try{
        project = await Project.findOne({_id :projectId,isDeleted : false});
    }catch(err)
    {
        const error = new HttpError(err+' revoking credential failed',500);
        return next(error);
    }
    if(!project)
    {
        const error = new HttpError('Could not find project for your provided id',404);
        return next(error);
    } 
    let admin;
    try{
        admin = await User.findOne({ _id : adminId, role : role, isActive : { $eq : true }, isDeleted : { $eq : false},pIds : projectId });
    }catch(err)
    {
        const error = new HttpError('Revoking credential failed',500);
        return next(error);
    } 
    if(!admin)
    {
        const error = new HttpError('Could not find admin for your id',404);
        return next(error);
    }
    let user;
    try{
        user = await User.findOne({_id : userId,isDeleted:false,pIds : projectId });
    }catch(err)
    {
        const error = new HttpError(err+' Revoking credential failed',500);
        return next(error);
    }
    if(!user)
    {
        const error = new HttpError('Could not find user for your provided id',404);
        return next(error);
    } 
    try{
        let credential;
        let index;
        try{
            for(let i=0;i<credentialId.length;i++)
            {
                try{
                    credential = await Credential.findOne({_id : credentialId[i],pId:projectId,uIds :userId});
                }catch(err)
                {
                    const error = new HttpError(err+' finding credential failed',500);
                    console.log(error+`for credential id : ${credentialId[i]}`);
                    continue;
                }
                if(!credential)
                {
                    const error = new HttpError('Could not find credential for your provided id',404);
                    console.log(error+`for credential id : ${credentialId[i]}`);
                    continue;
                } 
                index = credential.uIds.indexOf(userId);
                credential.uIds.splice(index,1);
                credential.updatedDate = new Date();
                await Credential.updateOne({_id:credential.id},credential);
            }
            try{
                const description = `Credential access of ${credentialId} are revoked from user with user id : ${user.id} is created under project id : ${project.id}.`
                const log = await insertLog(adminId,description);
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
    }
    catch(err)
    {
        const error = new HttpError(err+' Something went wrong.',500);
        return next(error);
    }
    res.json({ message : 'Credential Assigned successfully' });
};

const updateCredential = async(req,res,next)=>{
    const { error } = updateCredentialValidate(req.body);
    if(error){
        const invalid = new HttpError(error.details[0].message,400);
        return next(invalid);
    }
    const { cId,credentialName,userName,email,phone,newPassword,url,comment }  = req.body;

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
        user = await User.findOne({ _id : userId, role : role, isActive : { $eq : true }, isDeleted : { $eq : false} });
    }catch(err)
    {
        const error = new HttpError('Updating credential failed',500);
        return next(error);
    }
    
    if(!user)
    {
        const error = new HttpError('Could not find user for your id',404);
        return next(error);
    }
    let credential;
    try{
        credential = await Credential.findOne({_id : cId,isDeleted : false,uIds : userId});
    }catch(err)
    {
        const error = new HttpError('Updating credential failed',500);
        return next(error);
    }
    
    if(!credential)
    {
        const error = new HttpError('Could not find credential for provided id',404);
        return next(error);
    }
    if(newPassword)
    {
        let encryptedPassword = encrypt(newPassword);
        credential.password = encryptedPassword.content;
        credential.iv = encryptedPassword.iv;
    }
    else{
        credential.password = credential.password;
        credential.iv = credential.iv;
    }

    credential.credentialName = (!credentialName) ? credential.credentialName : credentialName;
    credential.userName = (!userName) ? credential.userName : userName;
    credential.email = (!email) ? credential.email : email;
    credential.phone = (!phone) ? credential.phone : phone;
    credential.url = (!url) ? credential.url : url;
    credential.comment = (!comment) ? credential.comment : comment;
    credential.updatedDate = new Date();
    try{
        await Credential.updateOne({_id:cId},credential);
        try{
            const description = ` Credentia; with credentisl id : ${cId} is updated`
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

    res.json({ message : 'Credential Updated successfully' , projectId : credential.pId });
}

const changePasswordCredential = async(req,res,next)=>{
    const { error } = changePasswordCredentialValidate(req.body);
    if(error){
        const invalid = new HttpError(error.details[0].message,400);
        return next(invalid);
    }
    const { cId,oldPassword,newPassword,confirmPassword }  = req.body;

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
        user = await User.findOne({ _id : userId, role : role, isActive : { $eq : true }, isDeleted : { $eq : false}});
    }catch(err)
    {
        const error = new HttpError('Changing credential password failed',500);
        return next(error);
    }
    
    if(!user)
    {
        const error = new HttpError('Could not find user for your id',404);
        return next(error);
    }
    let credential;
    try{
        credential = await Credential.findOne({_id : cId,isDeleted : false,uIds : userId});
    }catch(err)
    {
        const error = new HttpError('Changing credential password failed',500);
        return next(error);
    }
    
    if(!credential)
    {
        const error = new HttpError('Could not find credential for provided id',404);
        return next(error);
    }
    if(oldPassword !== decrypt({content : credential.password,iv:credential.iv}))
    {
        const error = new HttpError('Old Password is wrong',404);
        return next(error);
    }

    if(newPassword !== confirmPassword)
    {
        const error = new HttpError('New Password and confirm password does not match.',404);
        return next(error);
    }

    let encryptedPassword = encrypt(newPassword);
    credential.password = encryptedPassword.content;
    credential.iv = encryptedPassword.iv;
    credential.updatedDate = new Date();
    try{
        await Credential.updateOne({_id:cId},credential);
        try{
            const description = ` Credentia; with credentisl id : ${cId} is updated : password is changed`
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

    res.status(201).json({ message : 'Credential password Updated successfully' });
}

const updateCredentialStatus = async(req,res,next) =>{
    const { error } = validateId(req.body);
    if(error){
        const invalid = new HttpError(error.details[0].message,400);
        return next(invalid);
    }
    const { cId }  = req.body;

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
        user = await User.findOne({ _id : userId, role : role, isActive : { $eq : true }, isDeleted : { $eq : false}});

    }catch(err)
    {
        const error = new HttpError('Updating Credential info failed',500);
        return next(error);
    }
    
    if(!user)
    {
        const error = new HttpError('Could not find user for your id',404);
        return next(error);
    }
    let existingCredential;
    try{
        existingCredential = await Credential.findOne({_id : cId,isDeleted : false,uIds : userId});
    }
    catch(err)
    {
        const error = new HttpError(err.message+' Updating Credential info',500);
        return next(error);
    }
    if(!existingCredential)
    {
        const error = new HttpError('Credential not exist for provided Id',422);
        return next(error);
    }
    if(existingCredential.isActive)
    {
        existingCredential.isActive = false;
    }
    else{
        existingCredential.isActive = true;
    }
    existingCredential.updatedDate = new Date();
    try{
        await Credential.updateOne({_id:cId},existingCredential);
        try{
            const description = `Credential with Credential id : ${cId} 's status is updated.`
            const log = await insertLog(user.id,description);
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

    res.status(201).json({ message : 'Credential status updated successfully'});
};

const getCredentialById = async(req,res,next)=>{
    const { error } = validateId(req.body);
    if(error){
        const invalid = new HttpError(error.details[0].message,400);
        return next(invalid);
    }
    const { cId }  = req.body;

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
        user = await User.findOne({ _id : userId, role : role, isActive : { $eq : true }, isDeleted : { $eq : false} });
    }catch(err)
    {
        const error = new HttpError('Updating Credential info failed',500);
        return next(error);
    }
    
    if(!user)
    {
        const error = new HttpError('Could not find user for your id',404);
        return next(error);
    }
    let existingCredential;
    try{
        existingCredential = await Credential.findOne({_id : cId,isDeleted : false,uIds : userId});
    }
    catch(err)
    {
        const error = new HttpError(err.message+' Updating Credential info',500);
        return next(error);
    }
    if(!existingCredential)
    {
        const error = new HttpError('Credential not exist for provided Id',422);
        return next(error);
    }
    if(existingCredential.isActive === false)
    {
        if(role !== 'admin')
        {
            const error = new HttpError('Credential is no longer part of System',404);
            return next(error);
        }
    }
    let decryptedPassword = decrypt({content : existingCredential.password,iv:existingCredential.iv});
    existingCredential.password = decryptedPassword;
    res.json({ result : existingCredential});
};

exports.addCredential =addCredential;
exports.assignCredentials =assignCredentials;
exports.deleteCredential = deleteCredential;
exports.revokeCredentials =revokeCredentials;
exports.updateCredential =updateCredential;
exports.changePasswordCredential=changePasswordCredential;
exports.updateCredentialStatus=updateCredentialStatus;
exports.getCredentialById=getCredentialById;