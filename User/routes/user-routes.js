const express = require('express');

const userController = require('../controller/user-controller');
const checkAuth = require('../../common/middelware/checkAuth');

const router = express.Router();

router.post('/signupadmin',userController.signUpAdmin);
router.post('/login',userController.logIn);
router.use(checkAuth);
router.post('/signup',userController.signUp);
router.patch('/updateuserisactivestatus',userController.updateUserStatus);
router.delete('/delete',userController.deleteUser);
router.post('/projectlist',userController.getProjects);
router.post('/projectcredentials',userController.projectCredentials);
router.patch('/changepassworduser',userController.changePasswordUser);
router.patch('/updateuser',userController.updateUser);
router.get('/getallusers',userController.getAllUsers);
router.post('/getuserbyid',userController.getUserById);
router.patch('/updateuserbyadmin',userController.updateUserByAdmin);
router.get('/getuserbytoken',userController.getUserByToken);
router.post('/getcredentialsbyuserid',userController.getCredentialsByUserId);

module.exports = router;