import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export async function database_connect() {
	try {
		await mongoose.connect(process.env.MONGO_URI!, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			useCreateIndex: true,
			useFindAndModify: false,
		});

		var User = require('../models/User');
		var Unit = require('../models/Unit');
	} catch (err) {
		console.log(err);

		// Exit process - failure
		process.exit(1);
	}
}

export async function database_disconnect() {
	await mongoose.disconnect();
}
