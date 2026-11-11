import mongoose from 'mongoose';
import colore from 'colors'
import { getDatabaseUri } from './environmentSafety.js';
const connectDB = async () => {
    try {
       
        const conn = await mongoose.connect(getDatabaseUri());
        console.log(`Database connected successfully: ${conn.connection.host}`.green);
    } catch (error) {
        console.error(`Database Connection Error: ${error.message}`.red);
        process.exit(1); 
    }
};

export default connectDB;
