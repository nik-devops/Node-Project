const express = require('express');

const projectController = require('../controller/project-controller');
const checkAuth = require('../../common/middelware/checkAuth');

const router = express.Router();

router.use(checkAuth);
router.post('/addproject',projectController.addProject);
router.delete('/deleteprojectadmin',projectController.deleteProjectAdmin);
router.delete('/deleteprojectuser',projectController.deleteProjectUser);
router.patch('/updateproject',projectController.updateProject);
router.patch('/updateprojectisactivestatus',projectController.updateProjectStatus);
router.post('/getprojectbyid',projectController.getProjectById);

module.exports = router;