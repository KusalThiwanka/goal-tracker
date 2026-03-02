const Task = require('../models/Task');
const Week = require('../models/Week');

// @desc    Get all tasks for current user
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ user: req.user._id, isActive: true }).sort({ order: 1, createdAt: 1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
    try {
        const { name, marks, category } = req.body;

        const task = new Task({
            name,
            marks,
            category: category || 'no_category',
            user: req.user._id
        });

        const createdTask = await task.save();

        // Update ONLY the current user's active week to include this new task, 
        // initialized with [false, false, false, false, false, false, false]
        const currentWeek = await Week.findOne({ userId: req.user._id }).sort({ weekStart: -1 });
        if (currentWeek) {
            currentWeek.tasks.set(createdTask._id.toString(), [false, false, false, false, false, false, false]);
            await currentWeek.save();
        }

        res.status(201).json(createdTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
    try {
        const { name, marks, category } = req.body;

        const task = await Task.findOne({ _id: req.params.id, user: req.user._id });

        if (task) {
            task.name = name !== undefined ? name : task.name;
            task.marks = marks !== undefined ? marks : task.marks;
            if (category !== undefined) task.category = category;

            const updatedTask = await task.save();
            res.json(updatedTask);
        } else {
            res.status(404).json({ message: 'Task not found or unauthorized' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a task (Soft Delete)
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, user: req.user._id });

        if (task) {
            // Soft delete to preserve historical data
            task.isActive = false;
            await task.save();

            // Clean up the task ONLY from the CURRENT active week
            // so it immediately disappears from their dashboard without affecting history
            const currentWeek = await Week.findOne({ userId: req.user._id }).sort({ weekStart: -1 });
            if (currentWeek && currentWeek.tasks.has(req.params.id)) {
                currentWeek.tasks.delete(req.params.id);
                // The progress recalculation will occur naturally if needed when they fetch the dashboard
                await currentWeek.save();
            }

            res.json({ message: 'Task removed logically' });
        } else {
            res.status(404).json({ message: 'Task not found or unauthorized' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reorder tasks and categories
// @route   PUT /api/tasks/reorder
// @access  Private
const reorderTasks = async (req, res) => {
    try {
        const { tasks, categoryOrder } = req.body; // tasks: [{ id, order }]

        // Bulk write task order updates
        if (tasks && tasks.length > 0) {
            const bulkOps = tasks.map(t => ({
                updateOne: {
                    filter: { _id: t.id, user: req.user._id },
                    update: { $set: { order: t.order } }
                }
            }));
            await Task.bulkWrite(bulkOps);
        }

        // Update User's category preference
        if (categoryOrder && Array.isArray(categoryOrder)) {
            const User = require('../models/User');
            await User.findByIdAndUpdate(req.user._id, { categoryOrder });
        }

        res.json({ message: 'Order updated successfully' });
    } catch (error) {
        console.error('Reorder error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks
};
