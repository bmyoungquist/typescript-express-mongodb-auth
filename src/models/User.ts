import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
	email: string;
	password: string;
	first_name: string;
	last_name: string;
	create_date: Date;
	confirmed: boolean;
}

const UserSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true,
		unique: true,
	},
	password: {
		type: String,
		required: true,
	},
	first_name: {
		type: String,
		required: false,
	},
	last_name: {
		type: String,
		required: false,
	},
	address: {
		type: String,
		required: false,
	},
	city: {
		type: String,
		required: false,
	},
	state: {
		type: String,
		required: false,
	},
	zip: {
		type: String,
		required: false,
	},
	create_date: {
		type: Date,
		required: true,
		default: Date.now,
	},
	confirmed: {
		type: Boolean,
		required: true,
		default: false,
	},
});

export default mongoose.model<IUser>('user', UserSchema);
