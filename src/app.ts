import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { database_connect } from './database/live';
import 'reflect-metadata';
import cors from 'cors';

if (process.env.NODE_ENV === 'development') {
	dotenv.config();
}

// Connect to database
database_connect();

// Initialize app
const app = express();

// Load Middleware
const options: cors.CorsOptions = {
	origin: ['http://localhost:3000'],
};
app.use(cors(options));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Define routes
app.use('/v1/ping', require('./routes/ping'));
app.use('/v1/conversions/', require('./routes/conversions'));
app.use('/v1/units', require('./routes/units'));
app.use('/v1/next', require('./routes/next'));
app.use('/v1/test', require('./routes/testing'));

// Export the app
export default app;
