import { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Plus, Edit2, Trash2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/ConfirmModal';

const AdminDashboard = () => {
    const { logout } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('User');

    // Confirm Modal state
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        isAlert: false,
        onConfirm: null
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch users', error);
            setLoading(false);
        }
    };

    const openModal = (userObj = null) => {
        if (userObj) {
            setEditingUser(userObj);
            setUsername(userObj.username);
            setPassword('');
            setRole(userObj.role);
        } else {
            setEditingUser(null);
            setUsername('');
            setPassword('');
            setRole('User');
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setUsername('');
        setPassword('');
        setRole('User');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { username, role };
            if (password) payload.password = password; // Only send password if trying to update or create

            if (editingUser) {
                await api.put(`/users/${editingUser._id}`, payload);
            } else {
                if (!password) {
                    setConfirmDialog({
                        isOpen: true,
                        title: 'Missing Password',
                        message: 'Password is required for new users',
                        isAlert: true
                    });
                    return;
                }
                await api.post('/users', payload);
            }
            fetchUsers();
            closeModal();
        } catch (error) {
            console.error('Operation failed', error);
            setConfirmDialog({
                isOpen: true,
                title: 'Error',
                message: error.response?.data?.message || 'Operation failed. Check console.',
                isAlert: true
            });
        }
    };

    const handleDelete = async (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete User',
            message: 'Are you sure you want to delete this user completely?',
            isAlert: false,
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    await api.delete(`/users/${id}`);
                    fetchUsers();
                } catch (error) {
                    console.error('Delete failed', error);
                }
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-200">

            {/* Header */}
            <nav className="w-full border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Admin Control</span>
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

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">

                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Manage Users</h1>
                        <p className="text-slate-500 mt-1">Add, update, or remove users from the platform.</p>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/25 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Add User
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800/50 text-sm font-semibold tracking-wide text-slate-400 border-b border-slate-700/50">
                                    <th className="p-4 sm:px-6">Username</th>
                                    <th className="p-4 sm:px-6 text-center w-32">Role</th>
                                    <th className="p-4 sm:px-6 text-right w-40">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="p-8 text-center text-slate-500">
                                            No users found.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map(u => (
                                        <motion.tr
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            key={u._id}
                                            className="hover:bg-slate-800/20 transition-colors"
                                        >
                                            <td className="p-4 sm:px-6 font-medium text-slate-200">
                                                {u.username}
                                            </td>
                                            <td className="p-4 sm:px-6 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${u.role === 'Admin' ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="p-4 sm:px-6 text-right space-x-2">
                                                <button
                                                    onClick={() => openModal(u)}
                                                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors inline-block"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u._id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors inline-block"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

            </main>

            {/* Modal / Slide-over */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            onClick={closeModal}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl"
                        >
                            <h2 className="text-xl font-bold text-white mb-6">
                                {editingUser ? 'Edit User' : 'Create New User'}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-200 placeholder-slate-500"
                                        placeholder="e.g. john_doe"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.trim())}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                                    <input
                                        type={editingUser ? "text" : "password"}
                                        required={!editingUser}
                                        className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-200 placeholder-slate-500"
                                        placeholder={editingUser ? "Leave blank to keep same" : "••••••••"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-200"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                    >
                                        <option value="User">User</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/25"
                                    >
                                        {editingUser ? 'Save Changes' : 'Create User'}
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
        </div>
    );
};

export default AdminDashboard;
