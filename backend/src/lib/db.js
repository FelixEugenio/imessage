import mongoose from 'mongoose';

async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        'MONGO_URI is not defined in the environment variables'
      );
    }

    const connection = await mongoose.connect(mongoUri);

    console.log(
      'Connected to MongoDB:',
      connection.connection.host
    );
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

export default connectDB;