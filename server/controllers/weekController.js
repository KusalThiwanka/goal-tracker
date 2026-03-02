const Week = require('../models/Week');
const Task = require('../models/Task');

// Helper to get Monday of the current week (ignoring time)
const getMonday = (d) => {
    d = new Date(d);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
};

// Calculate progress based on today's dayIndex
const calculateProgress = async (week, allGlobalTasks) => {
    const today = new Date();
    const monday = getMonday(today);

    // Check if the week is the current week. If past week, all 7 days matter.
    const isCurrentWeek = week.weekStart.getTime() === monday.getTime();

    let currentDayIndex = 6;
    if (isCurrentWeek) {
        const todayDay = today.getDay();
        currentDayIndex = todayDay === 0 ? 6 : todayDay - 1;
    }
    const daysToConsider = currentDayIndex + 1;

    let totalPossibleMarks = 0;
    let earnedMarks = 0;

    for (let [tId, daysArr] of week.tasks.entries()) {
        const globalTask = allGlobalTasks.find(t => t._id.toString() === tId);
        if (globalTask) {
            totalPossibleMarks += (globalTask.marks * daysToConsider);

            let checkedDays = 0;
            for (let i = 0; i <= currentDayIndex; i++) {
                if (daysArr[i]) checkedDays++;
            }
            earnedMarks += (globalTask.marks * checkedDays);
        }
    }
    return totalPossibleMarks === 0 ? 0 : Math.round((earnedMarks / totalPossibleMarks) * 100);
};

// @desc    Get user's current week or create if it doesn't exist
// @route   GET /api/weeks/current
// @access  Private
const getCurrentWeek = async (req, res) => {
    try {
        const monday = getMonday(new Date());
        let week = await Week.findOne({
            userId: req.user._id,
            weekStart: monday
        });

        const allUserTasks = await Task.find({ user: req.user._id, isActive: true });

        if (!week) {
            // Create new week
            const tasksMap = new Map();
            allUserTasks.forEach(task => {
                tasksMap.set(task._id.toString(), [false, false, false, false, false, false, false]);
            });

            week = new Week({
                userId: req.user._id,
                weekStart: monday,
                tasks: tasksMap,
                progress: 0
            });
        } else {
            // Sync: Add any newly created active tasks that might be missing from this week's tracker
            let modified = false;
            allUserTasks.forEach(task => {
                const tId = task._id.toString();
                if (!week.tasks.has(tId)) {
                    week.tasks.set(tId, [false, false, false, false, false, false, false]);
                    modified = true;
                }
            });
            if (modified) {
                // save happens below when progress is recalculated
            }
        }

        // Recalculate progress in case days have passed without updates
        week.progress = await calculateProgress(week, allUserTasks);
        await week.save();

        res.json(week);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update week tasks and calculate progress
// @route   PUT /api/weeks/current
// @access  Private
const updateCurrentWeek = async (req, res) => {
    try {
        const { taskId, dayIndex, completed } = req.body;

        const todayDay = new Date().getDay();
        const currentDayIndex = todayDay === 0 ? 6 : todayDay - 1;

        if (dayIndex > currentDayIndex) {
            return res.status(400).json({ message: 'You cannot update tasks for future days.' });
        }

        const monday = getMonday(new Date());
        let week = await Week.findOne({
            userId: req.user._id,
            weekStart: monday
        });

        if (!week) {
            return res.status(404).json({ message: 'Current week not found. Please refresh.' });
        }

        if (!week.tasks.has(taskId)) {
            return res.status(400).json({ message: 'Task not found in this week.' });
        }

        // Update the array
        const taskArray = week.tasks.get(taskId);
        taskArray[dayIndex] = completed;
        week.tasks.set(taskId, taskArray);

        // Recalculate progress
        const allUserTasks = await Task.find({ user: req.user._id, isActive: true });
        week.progress = await calculateProgress(week, allUserTasks);

        const updatedWeek = await week.save();
        res.json(updatedWeek);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCurrentWeek,
    updateCurrentWeek
};
