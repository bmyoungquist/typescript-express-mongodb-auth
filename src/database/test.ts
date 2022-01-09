import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

export async function database_connect() {
	console.log('Spinning up Mongo Memory server');

	const mongod = new MongoMemoryServer();
	const mms_uri = await mongod.getUri();

	try {
		await mongoose.connect(mms_uri, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			useCreateIndex: true,
			useFindAndModify: false,
		});
	} catch (err) {
		console.log(err);

		// Exit process - failure
		process.exit(1);
	}
}

export async function database_disconnect() {
	await mongoose.disconnect();
}
