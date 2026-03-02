import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, isAlert = false, confirmText = 'Confirm', type = 'danger' }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl"
                >
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${type === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                            {type === 'danger' ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
                        <p className="text-slate-400 mb-6">{message}</p>
                    </div>

                    <div className="flex gap-3 mt-2">
                        {!isAlert && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                if (onConfirm) onConfirm();
                                onClose();
                            }}
                            className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-colors shadow-lg ${type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/25' : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/25'}`}
                        >
                            {isAlert ? 'OK' : confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ConfirmModal;
