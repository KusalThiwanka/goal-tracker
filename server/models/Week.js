const mongoose = require('mongoose');

const weekSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    weekStart: {
        type: Date,
        required: true
    },
    // Map where key is taskId (as string) and value is array of 7 booleans [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
    tasks: {
        type: Map,
        of: [Boolean],
        default: new Map()
    },
    progress: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Week', weekSchema);
