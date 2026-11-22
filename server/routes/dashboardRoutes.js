const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');

router.get('/dashboard/stats', DashboardController.getStats);
router.get('/dashboard/charts', DashboardController.getCharts);
router.get('/activity/recent', DashboardController.getRecentActivity);
router.get('/student/dashboard/:id', DashboardController.getStudentDashboard);

module.exports = router;
