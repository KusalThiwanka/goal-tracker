import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Trophy, Activity, Target, History, Plus, Edit2, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/ConfirmModal';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const Dashboard = () => {
    const { user, logout, updateUser } = useContext(AuthContext);
    const [weekDoc, setWeekDoc] = useState(null);
    const [prevWeekDoc, setPrevWeekDoc] = useState(null);
    const [globalTasks, setGlobalTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state for retro updates
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedHistoryDateIndex, setSelectedHistoryDateIndex] = useState(0);

    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [taskName, setTaskName] = useState('');
    const [taskMarks, setTaskMarks] = useState('');
    const [taskCategory, setTaskCategory] = useState('');

    // Confirm Modal state
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        isAlert: false,
        onConfirm: null
    });

    const todayDay = new Date().getDay();
    const currentDayIndex = todayDay === 0 ? 6 : todayDay - 1;

    useEffect(() => {
        fetchData();
        setSelectedHistoryDateIndex(currentDayIndex);
    }, []);

    const fetchData = async () => {
        try {
            const [weekRes, tasksRes] = await Promise.all([
                api.get('/weeks/current'),
                api.get('/tasks')
            ]);
            setWeekDoc(weekRes.data);
            setGlobalTasks(tasksRes.data);

            // Fetch previous week safely
            try {
                const prevWeekRes = await api.get('/weeks/previous');
                if (prevWeekRes.data) {
                    setPrevWeekDoc(prevWeekRes.data);
                }
            } catch (err) {
                console.log("No previous week data found or error fetching.");
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setLoading(false);
        }
    };

    const openTaskModal = (task = null) => {
        if (task) {
            setEditingTask(task);
            setTaskName(task.name);
            setTaskMarks(task.marks);
            setTaskCategory(task.category || '');
        } else {
            setEditingTask(null);
            setTaskName('');
            setTaskMarks('');
            setTaskCategory('');
        }
        setIsTaskModalOpen(true);
    };

    const closeTaskModal = () => {
        setIsTaskModalOpen(false);
        setEditingTask(null);
        setTaskName('');
        setTaskMarks('');
        setTaskCategory('');
    };

    const handleTaskSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: taskName,
                marks: Number(taskMarks),
                category: taskCategory || 'no_category' // Default if empty
            };

            if (editingTask) {
                await api.put(`/tasks/${editingTask._id}`, payload);
            } else {
                await api.post('/tasks', payload);
            }
            fetchData();
            closeTaskModal();
        } catch (error) {
            console.error('Operation failed', error);
            setConfirmDialog({
                isOpen: true,
                title: 'Operation Failed',
                message: error.response?.data?.message || 'Operation failed. Please try again.',
                isAlert: true
            });
        }
    };

    const handleTaskDelete = async (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Task',
            message: 'Are you sure you want to delete this task? This cannot be undone.',
            isAlert: false,
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    await api.delete(`/tasks/${id}`);
                    fetchData();
                } catch (error) {
                    console.error('Delete failed', error);
                }
            }
        });
    };

    const handleToggleTask = async (taskId, dayIndex, currentStatus) => {
        if (dayIndex > currentDayIndex) {
            return; // Cannot edit future
        }

        // optimistic update
        const updatedTasksMap = { ...weekDoc.tasks };
        updatedTasksMap[taskId][dayIndex] = !currentStatus;
        setWeekDoc({ ...weekDoc, tasks: updatedTasksMap });

        try {
            const res = await api.put('/weeks/current', {
                taskId,
                dayIndex,
                completed: !currentStatus
            });
            setWeekDoc(res.data);
        } catch (error) {
            console.error('Update failed:', error);
            // Revert on fail
            updatedTasksMap[taskId][dayIndex] = currentStatus;
            setWeekDoc({ ...weekDoc, tasks: updatedTasksMap });
            setConfirmDialog({
                isOpen: true,
                title: 'Update Failed',
                message: error.response?.data?.message || 'Failed to update task',
                isAlert: true
            });
        }
    };

    const moveCategory = async (category, direction) => {
        const currentOrder = user?.categoryOrder?.length > 0
            ? [...user.categoryOrder]
            : categories.filter(c => c !== 'no_category');

        if (!currentOrder.includes(category)) currentOrder.push(category);

        const idx = currentOrder.indexOf(category);
        if (direction === 'up' && idx > 0) {
            [currentOrder[idx - 1], currentOrder[idx]] = [currentOrder[idx], currentOrder[idx - 1]];
        } else if (direction === 'down' && idx < currentOrder.length - 1) {
            [currentOrder[idx + 1], currentOrder[idx]] = [currentOrder[idx], currentOrder[idx + 1]];
        } else {
            return;
        }

        updateUser({ categoryOrder: currentOrder });
        try {
            await api.put('/tasks/reorder', { categoryOrder: currentOrder });
        } catch (error) {
            console.error('Failed to reorder category', error);
        }
    };

    const handleDragEnd = async (result) => {
        const { source, destination } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Dropping into a different category is disabled for now, but could be supported
        if (source.droppableId !== destination.droppableId) return;

        // Get all active tasks for the current drag category 
        // globalTasks is sorted by global order.
        const categoryMatch = source.droppableId;
        const tasksInCategory = [...globalTasks].filter(t =>
            weekDoc?.tasks?.[t._id] && (t.category || 'no_category') === categoryMatch
        );

        // Reorder locally
        const [movedTask] = tasksInCategory.splice(source.index, 1);
        tasksInCategory.splice(destination.index, 0, movedTask);

        // Calculate absolute order for this subset
        const payload = tasksInCategory.map((t, idx) => ({ id: t._id, order: idx }));

        // Optimistic UI updates
        const updatedGlobal = [...globalTasks];
        tasksInCategory.forEach((t, idx) => {
            const gIdx = updatedGlobal.findIndex(gx => gx._id === t._id);
            if (gIdx !== -1) updatedGlobal[gIdx].order = idx;
        });

        // Ensure they sort by order instead of creation time locally
        updatedGlobal.sort((a, b) => (a.order || 0) - (b.order || 0));
        setGlobalTasks(updatedGlobal);

        try {
            await api.put('/tasks/reorder', { tasks: payload });
        } catch (err) {
            console.error('Failed to reorder tasks', err);
            fetchData(); // Rollback
        }
    };

    const getMotivationalMessage = (progress) => {
        if (progress >= 80) return { text: "Elite Discipline", color: "from-amber-400 to-orange-500", icon: <Trophy className="w-5 h-5" /> };
        if (progress >= 60) return { text: "Strong Progress", color: "from-emerald-400 to-teal-500", icon: <Activity className="w-5 h-5" /> };
        if (progress >= 40) return { text: "Stay Consistent", color: "from-blue-400 to-indigo-500", icon: <Target className="w-5 h-5" /> };
        return { text: "Lock In", color: "from-red-400 to-rose-500", icon: <Target className="w-5 h-5" /> };
    };

    const calculateDailyProgress = (dayIndex) => {
        if (!weekDoc || !globalTasks.length) return 0;
        let possible = 0;
        let earned = 0;
        globalTasks.forEach(task => {
            const isTracked = weekDoc.tasks[task._id];
            if (isTracked) {
                possible += task.marks;
                if (weekDoc.tasks[task._id][dayIndex]) {
                    earned += task.marks;
                }
            }
        });
        return possible === 0 ? 0 : Math.round((earned / possible) * 100);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950">
                <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    const progress = weekDoc?.progress || 0;
    const motivation = getMotivationalMessage(progress);

    // Dynamic row height logic
    const taskCount = globalTasks.filter(t => weekDoc?.tasks?.[t._id]).length;
    let rowPaddingClass = 'py-4 sm:py-5'; // Default for few tasks (<= 5)
    if (taskCount > 10) {
        rowPaddingClass = 'py-1.5 sm:py-2'; // Very compact for many tasks
    } else if (taskCount > 5) {
        rowPaddingClass = 'py-2.5 sm:py-3'; // Medium compact
    }

    // Group tasks by category
    const activeTasks = globalTasks.filter(t => weekDoc?.tasks?.[t._id]);
    const categories = [...new Set(activeTasks.map(t => t.category || 'no_category'))];
    // Sort categories
    categories.sort((a, b) => {
        if (a === 'no_category') return 1;
        if (b === 'no_category') return -1;

        const orderAttr = user?.categoryOrder || [];
        const aIndex = orderAttr.indexOf(a);
        const bIndex = orderAttr.indexOf(b);

        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;

        return a.localeCompare(b);
    });

    return (
        <div className="min-h-screen bg-gray-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] font-sans relative pb-20">
            <nav className="w-full border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Tracker</span>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800/50"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-2 relative overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl"
                    >
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${motivation.color}`} />
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                            <div>
                                <h2 className="text-slate-400 font-medium mb-1 flex items-center gap-2">
                                    Weekly Progress (Up to Today)
                                </h2>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-5xl font-black text-white tracking-tight">{progress}%</span>
                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-sm font-semibold bg-gradient-to-r ${motivation.color} bg-clip-text text-transparent`}>
                                        <span className="text-white fill-current">{motivation.icon}</span>
                                        {motivation.text}
                                    </div>
                                </div>
                            </div>

                            <div className="relative w-24 h-24 hidden sm:block shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle className="text-slate-800 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                                    <motion.circle
                                        className={`stroke-current`}
                                        style={{ stroke: 'url(#gradient)' }}
                                        strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent"
                                        initial={{ strokeDasharray: "251.2", strokeDashoffset: "251.2" }}
                                        animate={{ strokeDashoffset: 251.2 - (251.2 * progress) / 100 }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                    ></motion.circle>
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#6366f1" />
                                            <stop offset="100%" stopColor="#06b6d4" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                        </div>

                        <div className="mt-6 sm:hidden h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                className={`h-full bg-gradient-to-r ${motivation.color}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                            />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between"
                    >
                        <div>
                            <h3 className="text-slate-400 font-medium mb-4">Date Range</h3>
                            {weekDoc && (
                                <div className="text-2xl font-bold text-slate-200">
                                    Week of {new Date(weekDoc.weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                            )}
                            <p className="text-sm text-slate-500 mt-2">Reset automatically every Monday.</p>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedHistoryDateIndex(currentDayIndex);
                                setIsHistoryModalOpen(true);
                            }}
                            className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition-colors"
                        >
                            <History className="w-4 h-4" />
                            Update Tasks
                        </button>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl"
                >
                    <div className="p-4 sm:px-6 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="text-slate-300 font-semibold text-lg">Your Habits</h3>
                        <button
                            onClick={() => openTaskModal()}
                            className="bg-indigo-500 hover:bg-indigo-400 text-white p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Task</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900/50 border-b border-slate-800 text-sm font-semibold tracking-wide text-slate-400">
                                        <th className="p-4 sm:p-5 w-48 sticky left-0 bg-slate-900/95 backdrop-blur z-10">Habits/Tasks</th>
                                        <th className="p-4 sm:p-5 text-center px-2">Wt.</th>
                                        {DAYS.map((day, dayIndex) => {
                                            const isFuture = dayIndex > currentDayIndex;
                                            return <th key={day} className={`p-4 sm:p-5 text-center min-w-[60px] ${isFuture ? 'text-slate-600' : dayIndex === currentDayIndex ? 'text-white font-bold' : ''}`}>{day}</th>
                                        })}
                                        <th className="p-4 sm:p-5 text-center px-2 w-24">Progress</th>
                                    </tr>
                                </thead>
                                {categories.map(category => {
                                    const tasksInCategory = activeTasks.filter(t => (t.category || 'no_category') === category);
                                    if (tasksInCategory.length === 0) return null;

                                    return (
                                        <Droppable key={category} droppableId={category} type="TASK">
                                            {(provided) => (
                                                <tbody className="divide-y divide-slate-800/50" ref={provided.innerRef} {...provided.droppableProps}>
                                                    <tr className="bg-slate-800/30">
                                                        <td colSpan={10} className="px-4 py-2 font-semibold text-indigo-400 text-sm tracking-wider uppercase bg-slate-900 border-b border-slate-700/50 relative">
                                                            <div className="flex items-center justify-between">
                                                                <span>{category === 'no_category' ? '\u00A0' : category}</span>
                                                                <div className="flex items-center space-x-1 opacity-50 hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => moveCategory(category, 'up')} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Move Category Up">
                                                                        <ChevronUp className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => moveCategory(category, 'down')} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Move Category Down">
                                                                        <ChevronDown className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {tasksInCategory.map((task, index) => {
                                                        const checked = weekDoc.tasks[task._id];
                                                        const daysPassed = currentDayIndex + 1;
                                                        const completedDays = DAYS.slice(0, daysPassed).filter((_, i) => checked?.[i]).length;
                                                        const taskProgress = daysPassed === 0 ? 0 : Math.round((completedDays / daysPassed) * 100);

                                                        return (
                                                            <Draggable key={task._id} draggableId={task._id} index={index}>
                                                                {(dragProvided, snapshot) => (
                                                                    <tr
                                                                        ref={dragProvided.innerRef}
                                                                        {...dragProvided.draggableProps}
                                                                        className={`hover:bg-slate-800/20 transition-colors group ${snapshot.isDragging ? 'bg-slate-800/60 shadow-2xl relative z-20 table' : ''}`}
                                                                    >
                                                                        <td className={`px-4 sm:px-5 ${rowPaddingClass} font-medium text-slate-200 sticky left-0 bg-slate-900 group-hover:bg-slate-800/50 transition-colors z-10`}>
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <div className="flex items-center gap-3 w-full">
                                                                                    {/* Drag Handle */}
                                                                                    <div {...dragProvided.dragHandleProps} className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing p-1 -ml-2 rounded">
                                                                                        <GripVertical className="w-4 h-4" />
                                                                                    </div>
                                                                                    <span className="truncate flex-1">{task.name}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                                                    <button onClick={(e) => { e.stopPropagation(); openTaskModal(task); }} className="p-1 sm:p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors" title="Edit Task">
                                                                                        <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                                                    </button>
                                                                                    <button onClick={(e) => { e.stopPropagation(); handleTaskDelete(task._id); }} className="p-1 sm:p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors" title="Delete Task">
                                                                                        <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className={`px-4 sm:px-5 ${rowPaddingClass} text-center text-slate-500 font-mono text-sm`}>
                                                                            {task.marks}
                                                                        </td>
                                                                        {DAYS.map((_, dayIndex) => {
                                                                            const isFuture = dayIndex > currentDayIndex;
                                                                            const isCompleted = checked?.[dayIndex];
                                                                            return (
                                                                                <td key={dayIndex} className="px-2 sm:px-3 text-center align-middle">
                                                                                    <div className={`flex items-center justify-center ${rowPaddingClass}`}>
                                                                                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border-2 transition-all flex items-center justify-center ${isFuture ? 'border-slate-800 bg-slate-900/30' : isCompleted ? 'bg-indigo-500 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] opacity-90' : 'border-slate-700 bg-slate-800/50 opacity-50'}`}>
                                                                                            <AnimatePresence>
                                                                                                {!isFuture && isCompleted && (
                                                                                                    <motion.svg initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} className="w-4 h-4 sm:w-5 sm:h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                                                                    </motion.svg>
                                                                                                )}
                                                                                            </AnimatePresence>
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        })}
                                                                        <td className={`px-2 sm:px-3 text-center align-middle ${rowPaddingClass}`}>
                                                                            <div className="flex flex-col items-center justify-center gap-1">
                                                                                <span className={`text-xs font-bold ${taskProgress >= 80 ? 'text-indigo-400' : taskProgress >= 50 ? 'text-slate-300' : 'text-red-400'}`}>
                                                                                    {taskProgress}%
                                                                                </span>
                                                                                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                                                    <div className={`h-full ${taskProgress >= 80 ? 'bg-indigo-500' : taskProgress >= 50 ? 'bg-slate-500' : 'bg-red-500'}`} style={{ width: `${taskProgress}%` }} />
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </Draggable>
                                                        );
                                                    })}
                                                    {provided.placeholder}
                                                </tbody>
                                            )}
                                        </Droppable>
                                    );
                                })}
                                <tfoot className="bg-slate-900 border-t border-slate-800/80">
                                    <tr>
                                        <td className="p-4 sm:p-5 font-semibold text-slate-400 sticky left-0 bg-slate-900 z-10 text-right uppercase text-xs tracking-wider" colSpan="2">
                                            Daily Progress
                                        </td>
                                        {DAYS.map((_, dayIndex) => {
                                            if (dayIndex > currentDayIndex) return <td key={dayIndex} className="p-3 bg-slate-900/50" />;
                                            const dailyProg = calculateDailyProgress(dayIndex);
                                            return (
                                                <td key={dayIndex} className="p-3 text-center align-middle bg-slate-900/50">
                                                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold ${dailyProg >= 80 ? 'bg-indigo-500/20 text-indigo-400' :
                                                        dailyProg >= 50 ? 'bg-slate-700 text-slate-300' :
                                                            'bg-red-500/10 text-red-400'
                                                        }`}>
                                                        {dailyProg}%
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        <td className="bg-slate-900/50" />
                                    </tr>
                                </tfoot>
                            </table>
                        </DragDropContext>
                    </div>
                    {globalTasks.length === 0 && (
                        <div className="p-12 text-center text-slate-500">
                            No tasks configured yet. Please ask your administrator to create tasks.
                        </div>
                    )}
                </motion.div>

                {/* Previous Week Progress Chart */}
                {prevWeekDoc && globalTasks.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl p-6 sm:p-8"
                    >
                        <h3 className="text-slate-300 font-semibold text-lg mb-6 flex items-center gap-2">
                            <History className="w-5 h-5 text-indigo-400" />
                            Previous Week Insights
                        </h3>
                        <div className="space-y-4">
                            {globalTasks.map(task => {
                                const isTracked = prevWeekDoc?.tasks?.[task._id];
                                if (!isTracked) return null;

                                const checkedArray = prevWeekDoc.tasks[task._id] || [];
                                const totalTrackedDays = checkedArray.length;
                                const completedDays = checkedArray.filter(Boolean).length;
                                const hwProgress = totalTrackedDays === 0 ? 0 : Math.round((completedDays / totalTrackedDays) * 100);

                                return (
                                    <div key={task._id} className="relative pt-1">
                                        <div className="flex mb-2 items-center justify-between">
                                            <div>
                                                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-400 bg-indigo-500/10">
                                                    {task.name}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-semibold inline-block text-slate-400">
                                                    {hwProgress}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="overflow-hidden h-2.5 mb-2 text-xs flex rounded-full bg-slate-800">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${hwProgress}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${hwProgress >= 80 ? 'bg-indigo-500' : hwProgress >= 50 ? 'bg-slate-500' : 'bg-red-500'}`}
                                            ></motion.div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </main>

            {/* History Modal */}
            <AnimatePresence>
                {isHistoryModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            onClick={() => setIsHistoryModalOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <History className="w-5 h-5 text-indigo-400" />
                                    Update Tasks
                                </h2>
                                <button
                                    onClick={() => setIsHistoryModalOpen(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Select Date (Up to Today)</label>
                                <select
                                    value={selectedHistoryDateIndex}
                                    onChange={(e) => setSelectedHistoryDateIndex(Number(e.target.value))}
                                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-200"
                                >
                                    {DAYS.map((day, ix) => {
                                        const isFuture = ix > currentDayIndex;
                                        return (
                                            <option key={ix} value={ix} disabled={isFuture}>
                                                {day} {ix === currentDayIndex ? '(Today)' : isFuture ? '(Upcoming)' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div className="space-y-3 mt-4">
                                {globalTasks.map(task => {
                                    const isTracked = weekDoc?.tasks?.[task._id];
                                    if (!isTracked) return null;
                                    const isCompleted = weekDoc.tasks[task._id][selectedHistoryDateIndex];

                                    return (
                                        <div key={task._id} className="flex justify-between items-center p-3 sm:px-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                                            <span className="text-slate-200 font-medium">{task.name}</span>
                                            <button
                                                onClick={() => handleToggleTask(task._id, selectedHistoryDateIndex, isCompleted)}
                                                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${isCompleted
                                                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                    }`}
                                            >
                                                {isCompleted ? 'Completed' : 'Mark Done'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="mt-8 w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold tracking-wide transition-colors"
                            >
                                DONE
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Manage Tasks Modal */}
            <AnimatePresence>
                {isTaskModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            onClick={closeTaskModal}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl"
                        >
                            <h2 className="text-xl font-bold text-white mb-6">
                                {editingTask ? 'Edit Task' : 'Create New Task'}
                            </h2>

                            <form onSubmit={handleTaskSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Task Name</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={50}
                                        className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-200 placeholder-slate-500"
                                        placeholder="e.g. Read 10 Pages"
                                        value={taskName}
                                        onChange={(e) => setTaskName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Weight (Marks)</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="100"
                                        className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-200 placeholder-slate-500"
                                        placeholder="10"
                                        value={taskMarks}
                                        onChange={(e) => setTaskMarks(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Category (Optional)</label>
                                    <input
                                        type="text"
                                        maxLength={30}
                                        className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-200 placeholder-slate-500"
                                        placeholder="e.g. Health, Career"
                                        value={taskCategory}
                                        onChange={(e) => setTaskCategory(e.target.value)}
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={closeTaskModal}
                                        className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/25"
                                    >
                                        {editingTask ? 'Save' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                isAlert={confirmDialog.isAlert}
                confirmText={confirmDialog.confirmText}
            />
        </div >
    );
};

export default Dashboard;
