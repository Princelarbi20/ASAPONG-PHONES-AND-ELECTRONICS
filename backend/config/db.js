import mongoose from 'mongoose';
import colore from 'colors'
const connectDB = async () => {
    try {
       
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`Database connected successfully: ${conn.connection.host}`.green);
    } catch (error) {
        console.error(`Database Connection Error: ${error.message}`.red);
        process.exit(1); 
    }
};

export default connectDB;