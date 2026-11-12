import mongoose from 'mongoose';
import { performance } from 'node:perf_hooks';
import { getDatabaseUri } from './environmentSafety.js';

let connectionPromise;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        console.info('[performance] mongodb_ready', JSON.stringify({ reused: true, connectionMs: 0 }));
        return mongoose.connection;
    }

    if (connectionPromise) return connectionPromise;

    const startedAt = performance.now();
    connectionPromise = mongoose.connect(getDatabaseUri())
        .then((conn) => {
            console.info('[performance] mongodb_ready', JSON.stringify({
                reused: false,
                connectionMs: Number((performance.now() - startedAt).toFixed(1)),
            }));
            return conn;
        })
        .catch((error) => {
            connectionPromise = null;
            throw error;
        });

    return connectionPromise;
};

export default connectDB;
