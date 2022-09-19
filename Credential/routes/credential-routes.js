const express = require('express');

const credentialController = require('../controller/credential-controller');
const checkAuth = require('../../common/middelware/checkAuth');

const router = express.Router();

router.use(checkAuth);
router.post('/addcredential',credentialController.addCredential);
router.post('/assignmentcredential',credentialController.assignCredentials);
router.delete('/deletecredential',credentialController.deleteCredential);
router.post('/revokecredentials',credentialController.revokeCredentials);
router.patch('/updatecredential',credentialController.updateCredential);
router.patch('/changepasswordcredential',credentialController.changePasswordCredential);
router.patch('/updatecredentialisactivestatus',credentialController.updateCredentialStatus);
router.post('/getcredentialbyid',credentialController.getCredentialById);

module.exports = router;