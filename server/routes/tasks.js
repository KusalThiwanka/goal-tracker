const express = require('express');
const router = express.Router();
const { getTasks, createTask, updateTask, deleteTask, reorderTasks } = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

router.route('/')
    .get(protect, getTasks)
    .post(protect, createTask);

router.put('/reorder', protect, reorderTasks);

router.route('/:id')
    .put(protect, updateTask)
    .delete(protect, deleteTask);

module.exports = router;
