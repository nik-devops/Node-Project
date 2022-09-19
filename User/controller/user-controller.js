const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose')

const jwtSecretKey = require('../../common/config/config').jwtSecretKey;
const HttpError = require('../../common/model/http-error');
const { User, newUserValidate, updateUserValidate, loginValidate, userIdValidate, projectIdValidate, changePasswordUserValidate, updateUserByAdminValidate } = require('../model/user-schema');
const { insertLog } = require('../../log/controller/logController');
const { Project } = require('../../Project/model/project-schema');
const { Credential, validateId } = require('../../Credential/model/credential-schema');
const { decrypt } = require('../../common/middelware/encryption-decryption');

const signUpAdmin = async (req, res, next) => {
    const { error } = newUserValidate(req.body);
    if (error) {
        const invalid = new HttpError(error.details[0].message, 400);
        return next(invalid);
    }

    const { name, email, password, mobile } = req.body;

    let existingUser;
    try {
        existingUser = await User.findOne({ email: email });
    }
    catch (err) {
        const error = new HttpError(err.message + 'Signing up failed,try again later', 500);
        return next(error);
    }
    if (existingUser) {
        const error = new HttpError('User already exists, log in instead', 422);
        return next(error);
    }
    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    }
    catch (err) {
        const error = new HttpError('Could not create User', 500);
        return next(error);
    }
    const createAdmin = new User({
        name,
        email,
        password: hashedPassword,
        mobile,
        role: 'admin',
        pIds: [],
        isActive: true,
        isDeleted: false,
        createdDate: new Date(),
        updatedDate: new Date()
    });
    try {
        await createAdmin.save();
        try {
            const description = 'New Admin is created.'
            const log = await insertLog(createAdmin.id, description);
            await log.save();
        }
        catch (err) {
            const error = new HttpError(err + 'Something went wrong in creation of log,try again.', 500);
            await createAdmin.remove();
            return next(error);
        }
    }
    catch (err) {
        const error = new HttpError(err + 'Signing up failed, please try again.', 500);
        return next(error);
    }
    let token;
    try {
        token = jwt.sign({ userId: createAdmin.id, email: createAdmin.email, role: createAdmin.role }, jwtSecretKey, { expiresIn: '10h' });
    }
    catch (err) {
        const error = new HttpError(err + 'Signing up failed, please try again.', 500);
        return next(error);
    }

    res.status(201).json({ user: createAdmin.id, email: createAdmin.email, token: token });
};

const signUp = async (req, res, next) => {
    const { error } = newUserValidate(req.body);
    if (error) {
        const invalid = new HttpError(error.details[0].message, 400);
        return next(invalid);
    }
    const { name, email, password, mobile } = req.body;

    const adminId = req.userData.userId;
    const role = req.userData.role;

    if (!adminId) {
        return next(new HttpError('Your token does not contain user id', 401));
    }
    if (role !== 'admin') {
        const error = new HttpError('You are not admin you are not allowed.', 404);
        return next(error);
    }

    let admin;
    try {
        admin = await User.findOne({ _id: adminId, role: { $eq: 'admin' }, isActive: { $eq: true }, isDeleted: { $eq: false } });
    } catch (err) {
        const error = new HttpError('Creating user failed', 500);
        return next(error);
    }

    if (!admin) {
        const error = new HttpError('Could not find admin for your id', 404);
        return next(error);
    }
    let existingUser;
    try {
        existingUser = await User.findOne({ email: email });
    }
    catch (err) {
        const error = new HttpError(err.message + ' Signing up failed,try again later', 500);
        return next(error);
    }
    if (existingUser) {
        const error = new HttpError('User already exists, log in instead', 422);
        return next(error);
    }
    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    }
    catch (err) {
        const error = new HttpError('Could not create User', 500);
        return next(error);
    }
    const createUser = new User({
        name,
        email,
        password: hashedPassword,
        mobile,
        role: 'user',
        pIds: [],
        isActive: true,
        isDeleted: false,
        createdDate: new Date(),
        updatedDate: new Date(),
    });
    try {
        await createUser.save();
        try {
            const description = `New User with user id : ${createUser.id} is created.`
            const log = await insertLog(admin.id, description);
            await log.save();
        }
        catch (err) {
            const error = new HttpError(err + 'Something went wrong in creation of log,try again.', 500);
            await createAdmin.remove();
            return next(error);
        }
    }
    catch (err) {
        const error = new HttpError(err + ' Signing up failed, please try again.', 500);
        return next(error);
    }

    res.status(201).json({ message: 'User created successfully', password: password });
};

const logIn = async (req, res, next) => {
    const { error } = loginValidate(req.body);
    if (error) {
        const invalid = new HttpError(error.details[0].message, 400);
        return next(invalid);
    }
    const { email, password, role } = req.body;


    
    let existingUser;
    try {
        existingUser = await User.findOne({ email: email, role: role, isActive: { $eq: true }, isDeleted: { $eq: false } });
    }
    catch (err) {
        const error = new HttpError(err.message + 'Log in failed,try again later', 500);
        return next(error);
    }
    if (!existingUser) {
        const error = new HttpError('User not exists,Sign up or you are choosing wrong role', 401);
        return next(error);
    }
    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, existingUser.password);
    }
    catch (err) {
        const error = new HttpError('Could not logged you in, try later', 500);
        return next(error);
    }
    if (!isValidPassword) {
        const error = new HttpError('Invalid credentials', 403);
        return next(error);
    }
    let token;
    try {
        token = jwt.sign({ userId: existingUser.id, email: existingUser.email, role: existingUser.role }, jwtSecretKey, { expiresIn: '10h' });
        try {
            const description = `User with user id : ${existingUser.id} is looged in.`
            const log = await insertLog(existingUser.id, description);
            await log.save();
        }
        catch (err) {
            const error = new HttpError(err + 'Something went wrong in creation of log,try again.', 500);
            return next(error);
        }
    }
    catch (err) {
        const error = new HttpError(err + 'Login failed, please try again.', 500);
        return next(error);
    }
    let result = {
        message: "Successfully loged in.",
        data: {
            customToken: token,
            role: role
        }
    }
    res.json(result);
};

const updateUserStatus = async (req, res, next) => {
    const { error } = userIdValidate(req.body);
    if (error) {
        const invalid = new HttpError(error.details[0].message, 400);
        return next(invalid);
    }
    const { uId } = req.body;

    const adminId = req.userData.userId;
    const role = req.userData.role;

    if (!adminId) {
        return next(new HttpError('Your token does not contain uid', 401));
    }
    if (role !== 'admin') {
        const error = new HttpError('You are not admin you cant do this', 404);
        return next(error);
    }

    let admin;
    try {
        admin = await User.findOne({ _id: adminId, role: { $eq: 'admin' }, isActive: { $eq: true }, isDeleted: { $eq: false } });
    } catch (err) {
        const error = new HttpError('Updating user status failed', 500);
        return next(error);
    }

    if (!admin) {
        const error = new HttpError('Could not find admin for your id', 404);
        return next(error);
    }
    let existingUser;
    try {
        existingUser = await User.findOne({ _id: uId, isDeleted: { $eq: false } });
    }
    catch (err) {
        const error = new HttpError(err.message + ' Updating user status failed', 500);
        return next(error);
    }
    if (!existingUser) {
        const error = new HttpError('User not exist for provided Id', 422);
        return next(error);
    }
    let status;
    if (existingUser.isActive) {
        status = false;
    }
    else {
        status = true;
    }
    try {
        await User.updateOne({ _id: uId }, { $set: { isActive: status, updatedDate: new Date() } });
        try {
            const description = `User with user id : ${existingUser.id} is updated with active status.`
            const log = await insertLog(admin.id, description);
            await log.save();
        }
        catch (err) {
            const error = new HttpError(err + 'Log is not created.', 500);
            return next(error);
        }
    }
    catch (err) {
        const error = new HttpError(err + ' Something went wrong', 500);
        return next(error);
    }

    res.status(201).json({ message: 'User status updated successfully' });
};

const deleteUser = async (req, res, next) => {
    const { error } = userIdValidate(req.body);
    if (error) {
        const invalid = new HttpError(error.details[0].message, 400);
        return next(invalid);
    }
    const { uId } = req.body;

    const adminId = req.userData.userId;
    const role = req.userData.role;

    if (!adminId) {
        return next(new HttpError('Your token does not contain uid', 401));
    }
    if (role !== 'admin') {
        const error = new HttpError('You are not admin you cant do this', 404);
        return next(error);
    }

    let admin;
    try {
        admin = await User.findOne({ _id: adminId, role: { $eq: 'admin' }, isActive: { $eq: true }, isDeleted: { $eq: false } });
    } catch (err) {
        const error = new HttpError('Deleting user failed', 500);
        return next(error);
    }

    if (!admin) {
        const error = new HttpError('Could not find admin for your id', 404);
        return next(error);
    }
    let existingUser;
    try {
        //existingUser = await User.findOne({_id:uId});
        existingUser = await User.findOne({ _id: uId, isDeleted: { $eq: false } });
    }
    catch (err) {
        const error = new HttpError(err.message + ' Something went wrong', 500);
        return next(error);
    }
    if (!existingUser) {
        const error = new HttpError('User not exist for provided Id', 422);
        return next(error);
    }
    let description;
    let log;
    let index;
    try {
        await User.updateOne({ _id: uId }, { $set: { isDeleted: true, updatedDate: new Date() } });
        try {
            description = `User with user id : ${existingUser.id} is deleted.`
            log = await insertLog(admin.id, description);
            await log.save();
            await Credential.updateMany({ uIds: uId }, { $pull: { uIds: uId }, $set: { updatedDate: new Date() } });
        }
        catch (err) {
            const error = new HttpError(err + 'Log is not created.', 500);
            return next(error);
        }
    }
    catch (err) {
        const error = new HttpError(err + ' Something went wrong', 500);
        return next(error);
    }

    res.json({ message: 'User Deleted successfully' });
};

const getProjects = async (req, res, next) => {

    const { uId } = req.body;

    let userId = req.userData.userId;
    const role = req.userData.role;

    if (!userId) {
        return next(new HttpError('Your token does not contain uid', 401));
    }
    if (role !== 'admin' && role !== 'user') {
        const error = new HttpError('You are not user you cant do this', 404);
        return next(error);
    }

    if (uId) {
        if (role !== 'admin') {
            const error = new HttpError('You are not admin', 404);
            return next(error);
        }
    }

    userId = (uId) ? uId : userId;

    let user;
    try {
        user = await User.findOne({ _id: userId, isActive: { $eq: true }, isDeleted: { $eq: false } });
    } catch (err) {
        const error = new HttpError('Getting projects failed', 500);
        return next(error);
    }
    if (!user) {
        const error = new HttpError('Could not find your id', 404);
        return next(error);
    }
    if (!uId) {
        if (user.role !== role) {
            const error = new HttpError('Could not find your id', 404);
            return next(error);
        }
    }
    let project;
    if (user.role === 'admin') {
        project = await Project.find({ _id: { $in: user.pIds }, isDeleted: { $eq: false } });
    }
    else {
        project = await Project.find({ _id: { $in: user.pIds }, isActive: { $eq: true }, isDeleted: { $eq: false } });
    }
    res.json({ data: project });
};

const projectCredentials = async (req, res, next) => {
    const { error } = projectIdValidate(req.body);
    if (error) {
        const invalid = new HttpError(error.details[0].message, 400);
        return next(invalid);
    }
    const { pId, uId } = req.body;

    let userId = req.userData.userId;
    const role = req.userData.role;

    if (!userId) {
        return next(new HttpError('Your token does not contain uid', 401));
    }
    if (role !== 'admin' && role !== 'user') {
        const error = new HttpError('You are not user you cant do this', 404);
        return next(error);
    }

    if (uId) {
        if (role !== 'admin') {
            const error = new HttpError('You are not admin', 404);
            return next(error);
        }
    }

    userId = (uId) ? uId : userId;


    let user;
    try {
        user = await User.findOne({ _id: userId, isActive: { $eq: true }, isDeleted: { $eq: false }, pIds: pId });
    } catch (err) {
        const error = new HttpError('Getting credentials failed', 500);
        return next(error);
    }

    if (!user) {
        const error = new HttpError('Could not find user for your id', 404);
        return next(error);
    }
    if (!uId) {
        if (user.role !== role) {
            const error = new HttpError('Could not find user for your id', 404);
            return next(error);
        }
    }
    let project;
    try {
        project = await Project.findOne({ _id: pId, isDeleted: { $eq: false } });
    } catch (err) {
        const error = new HttpError('Getting credentials failed', 500);
        return next(error);
    }
    if (!project) {
        const error = new HttpError('Could not find project for provided id', 404);
        return next(error);
    }
    if (project.isActive === false) {
        if (user.role !== 'admin') {
            const error = new HttpError('Project is deactivated from the system', 404);
            return next(error);
        }
    }
    let credentials;
    let result = [];
    try {
        credentials = await Credential.find({ pId: pId, uIds: userId, isDeleted: { $eq: false } });
        for (let i = 0; i < credentials.length; i++) {
            if (credentials[i].uIds.includes(userId)) {
                if (!credentials[i]) {
                    const error = new HttpError('Could not find credential for provided id', 404);
                    console.log(error + `for credential id : ${credentials[i].id}`);
                    console.log('1');
                    continue;
                }
                if (credentials[i].isActive === false) {
                    if (user.role !== 'admin') {
                        const error = new HttpError('credential is deactivated from the system', 404);
                        console.log(error + `for credential id : ${credentials[i].id}`);
                        continue;

                    }
                }
                if (credentials[i].isDeleted === true) {
                    const error = new HttpError('credential is no longer part of system', 404);
                    console.log(error + `for credential id : ${credentials[i].id}`);
                    continue;
                }
                credentials[i].password = decrypt({ content: credentials[i].password, iv: credentials[i].iv });
                result.push(credentials[i]);
            }
        }
    } catch (err) {
        const error = new HttpError(err + 'Getting credentials failed', 500);
        return next(error);
    }
    res.json({ data: result });
};

const changePasswordUser = async (req, res, next) => {
    const { error } = changePasswordUserValidate(req.body);
    if (error) {
        const invalid = new HttpError(error.details[0].message, 400);
        return next(invalid);
    }
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.userData.userId;
    const role = req.userData.role;

    if (!userId) {
        return next(new HttpError('Your token does not contain uid', 401));
    }
    if (role !== 'admin' && role !== 'user') {
        const error = new HttpError('You are not user you cant do this', 404);
        return next(error);
    }

    let user;
    try {
        user = await User.findOne({ _id: userId, role: role, isActive: { $eq: true }, isDeleted: { $eq: false } });
    } catch (err) {
        const error = new HttpError('Changing password of user failed', 500);
        return next(error);
    }

    if (!user) {
        const error = new HttpError('Could not find user for your id', 404);
        return next(error);
    }
    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(oldPassword, user.password);
    }
    catch (err) {
        const error = new HttpError('Changing password of user failed', 500);
        return next(error);
    }
    if (!isValidPassword) {
        const error = new HttpError('Invalid old password', 403);
        return next(error);
    }
    if (newPassword !== confirmPassword) {
        const error = new HttpError('New Password and confirm password does not match.', 404);
        return next(error);
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(newPassword, 12);
    }
    catch (err) {
        const error = new HttpError('Changing password of user failed', 500);
        return next(error);
    }
    try {
        await User.updateOne({ _id: userId }, { $set: { password: hashedPassword, updatedDate: new Date() } });
        try {
            const description = ` User with user id : ${userId} is updated : password is changed`
            const log = await insertLog(userId, description);
            await log.save();

        }
        catch (err) {
            const error = new HttpError(err + 'Log is not created.', 500);
            return next(error);
        }
    }
    catch (err) {
        const error = new HttpError(err + ' Something went wrong.', 500);
        return next(error);
    }

    res.json({ message: 'Changing password of user done successfully' });
};

const updateUser = async (req, res, next) => {
    const { error } = updateUserValidate(req.body);
    if (error) {
        const invalid = new HttpError(error.details[0].message, 400);
        return next(invalid);
    }
    const { name, email, mobile } = req.body;

    const userId = req.userData.userId;
    const role = req.userData.role;

    if (!userId) {
        return next(new HttpError('Your token does not contain uid', 401));
    }
    if (role !== 'admin' && role !== 'user') {
        const error = new HttpError('You are not user you cant do this', 404);
        return next(error);
    }

    let user;
    try {
        user = await User.findOne({ _id: userId, role: role, isActive: { $eq: true }, isDeleted: { $eq: false } });
    } catch (err) {
        const error = new HttpError('Updating user failed', 500);
        return next(error);
    }

    if (!user) {
        const error = new HttpError('Could not find user for your id', 404);
        return next(error);
    }
    let existingUser;
    try {
        existingUser = await User.findOne({ email: email });
    }
    catch (err) {
        const error = new HttpError(err.message + 'Updating user failed', 500);
        return next(error);
    }
    if (existingUser) {
        if (existingUser.id.toString() !== user.id.toString()) {
            const error = new HttpError('User already exists', 422);
            return next(error);
        }
    }

    user.name = (!name) ? user.name : name;
    user.email = (!email) ? user.email : email;
    user.mobile = (!mobile) ? user.mobile : mobile
    user.updatedDate = new Date();
    try {
        await User.updateOne({ _id: userId }, user);
        try {
            const description = ` User with user id : ${userId} is updated`
            const log = await insertLog(userId, description);
            await log.save();

        }
        catch (err) {
            const error = new HttpError(err + 'Log is not created.', 500);
            return next(error);
        }
    }
    catch (err) {
        const error = new HttpError(err + ' Something went wrong.', 500);
        return next(error);
    }

    res.json({ message: 'Updating user done successfully' });
}

const getAllUsers = async (req, res, next) => {

    const adminId = req.userData.userId;
    const role = req.userData.role;

    if (!adminId) {
        return next(new HttpError('Your token does not contain user id', 401));
    }
    if (role !== 'admin') {
        const error = new HttpError('You are not admin you are not allowed.', 404);
        return next(error);
    }

    let admin;
    try {
        admin = await User.findOne({ _id: adminId, role: role, isActive: { $eq: true }, isDeleted: { $eq: false } });
    } catch (err) {
        const error = new HttpError('Creating user failed', 500);
        return next(error);
    }

    if (!admin) {
        const error = new HttpError('Could not find admin for your id', 404);
        return next(error);
    }
    let users;
    try {
        users = await User.find({ _id: { $nin: [adminId] }, isDeleted: false });
    }
    catch (err) {
        const error = new HttpError(err + ' Signing up failed, please try again.', 500);
        return next(error);
    }

    res.json({ result: users });
};

const getUserById = async (req, res, next) => {
    const { error } = userIdValidate(req.body);
    if (error) {
        const invalid = new HttpError(error.details[0].message, 400);
        return next(invalid);
    }
    const { uId } = req.body;

    const userId = req.userData.userId;
    const role = req.userData.role;

    if (!userId) {
        return next(new HttpError('Your token does not contain uid', 401));
    }
    if (role !== 'admin' && role !== 'user') {
        const error = new HttpError('You are not admin you cant do this', 404);
        return next(error);
    }

    let user;
    try {
        user = await User.findOne({ _id: userId, role: role, isActive: { $eq: true }, isDeleted: { $eq: false } });
    } catch (err) {
        const error = new HttpError('Updating user status failed', 500);
        return next(error);
    }

    if (!user) {
        const error = new HttpError('1Could not find admin for your id', 404);
        return next(error);
    }
    if (uId.toString() !== userId.toString()) {
        if (role !== 'admin') {
            const error = new HttpError('Can not access it', 404);
            return next(error);
        }
    }

    let existingUser;
    try {
        existingUser = await User.findOne({ _id: uId, isDeleted: { $eq: false } });
    }
    catch (err) {
        const error = new HttpError(err.message + ' Updating user status failed', 500);
        return next(error);
    }
    if (!existingUser) {
        const error = new HttpError('User not exist for provided Id', 422);
        return next(error);
    }
    res.json({ data: existingUser });
};

const updateUserByAdmin = async (req, res, next) => {
    const { error } = updateUserByAdminValidate(req.body);
    if (error) {
        const invalid = new HttpError(error.details[0].message, 400);
        return next(invalid);
    }
    const { uId, name, email, mobile, newPassword } = req.body;

    const userId = req.userData.userId;
    const role = req.userData.role;

    if (!userId) {
        return next(new HttpError('Your token does not contain uid', 401));
    }
    if (role !== 'admin') {
        const error = new HttpError('You are not user you cant do this', 404);
        return next(error);
    }

    let user;
    try {
        user = await User.findOne({ _id: userId, role: role, isActive: { $eq: true }, isDeleted: { $eq: false } });
    } catch (err) {
        const error = new HttpError('Updating user failed', 500);
        return next(error);
    }

    if (!user) {
        const error = new HttpError('Could not find user for your id', 404);
        return next(error);
    }
    let existingUser;
    try {
        existingUser = await User.findOne({ _id: uId, isDeleted: { $eq: false } });
    }
    catch (err) {
        const error = new HttpError(err.message + 'Updating user failed', 500);
        return next(error);
    }
    if (!existingUser) {
        const error = new HttpError('1User not found', 404);
        return next(error);
    }
    existingUser.name = (!name) ? existingUser.name : name;
    existingUser.email = (!existingUser) ? existingUser.email : email;
    existingUser.mobile = (!mobile) ? existingUser.mobile : mobile;
    if (newPassword) {
        let hashedPassword;
        try {
            hashedPassword = await bcrypt.hash(password, 12);
        }
        catch (err) {
            const error = new HttpError('Could not create User', 500);
            return next(error);
        }
        existingUser.password = (!newPassword) ? existingUser.password : hashedPassword;
    }
    existingUser.updatedDate = new Date();
    try {
        await User.updateOne({ _id: uId }, existingUser);
        try {
            const description = ` User with user id : ${uId} is updated`
            const log = await insertLog(userId, description);
            await log.save();

        }
        catch (err) {
            const error = new HttpError(err + 'Log is not created.', 500);
            return next(error);
        }
    }
    catch (err) {
        const error = new HttpError(err + ' Something went wrong.', 500);
        return next(error);
    }

    res.status(201).json({ message: 'Updating user done successfully' });
};

const getUserByToken = async (req, res, next) => {

    const userId = req.userData.userId;
    const role = req.userData.role;

    if (!userId) {
        return next(new HttpError('Your token does not contain uid', 401));
    }
    if (role !== 'admin' && role !== 'user') {
        const error = new HttpError('You are not admin you cant do this', 404);
        return next(error);
    }

    let user;
    try {
        user = await User.findOne({ _id: userId, role: role, isActive: { $eq: true }, isDeleted: { $eq: false } });
    } catch (err) {
        const error = new HttpError('Updating user status failed', 500);
        return next(error);
    }

    if (!user) {
        const error = new HttpError('1Could not find admin for your id', 404);
        return next(error);
    }
    res.json({ data: user });
};

const getCredentialsByUserId = async (req, res, next) => {
    const { error } = userIdValidate(req.body);
    if (error) {
        const invalid = new HttpError(error.details[0].message, 400);
        return next(invalid);
    }
    const { uId } = req.body;

    const adminId = req.userData.userId;
    const role = req.userData.role;

    if (!adminId) {
        return next(new HttpError('Your token does not contain uid', 401));
    }
    if (role !== 'admin') {
        const error = new HttpError('You are not admin you cant do this', 404);
        return next(error);
    }

    let admin;
    try {
        admin = await User.findOne({ _id: adminId, role: { $eq: 'admin' }, isActive: { $eq: true }, isDeleted: { $eq: false } });
    } catch (err) {
        const error = new HttpError('Updating user status failed', 500);
        return next(error);
    }

    if (!admin) {
        const error = new HttpError('Could not find admin for your id', 404);
        return next(error);
    }
    let existingUser;
    try {
        existingUser = await User.findOne({ _id: uId, isDeleted: { $eq: false } });
    }
    catch (err) {
        const error = new HttpError(err.message + ' Updating user status failed', 500);
        return next(error);
    }
    if (!existingUser) {
        const error = new HttpError('User not exist for provided Id', 422);
        return next(error);
    }
    let result = [];
    let projectList;
    let project;
    let cred
    try {

        projectList = await User.findOne({ _id: uId }, { pIds: 1, _id: 0 });
        console.log(projectList);
        for (let i = 0; i < projectList.pIds.length; i++) {
            project = await Project.findOne({ _id: projectList.pIds[i], isActive: true, isDeleted: false });
            cred = await Credential.find({ pId: projectList.pIds[i], uIds: uId, isActive: true, isDeleted: false });
            result.push({
                projectId: project.id,
                projectName: project.name,
                credentials: cred
            });
        }
    }
    catch (err) {
        const error = new HttpError(err.message + ' Getting info failed', 500);
        return next(error);
    }
    res.json({ data: result });
}

exports.signUpAdmin = signUpAdmin;
exports.signUp = signUp;
exports.updateUserStatus = updateUserStatus;
exports.logIn = logIn;
exports.deleteUser = deleteUser;
exports.getProjects = getProjects;
exports.projectCredentials = projectCredentials;
exports.changePasswordUser = changePasswordUser;
exports.updateUser = updateUser;
exports.getAllUsers = getAllUsers;
exports.getUserById = getUserById;
exports.updateUserByAdmin = updateUserByAdmin;
exports.getUserByToken = getUserByToken;
exports.getCredentialsByUserId = getCredentialsByUserId;