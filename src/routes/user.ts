import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import {
	check,
	Result,
	ValidationError,
	validationResult,
} from 'express-validator';
import User, { IUser } from '../models/User';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';
import { ISignInResponse } from '../types/HTTP';
import passport from 'passport';

const router = express.Router();

export interface IAuthToken extends JsonWebKey {
	id: string;
}

// @route   GET api/users/register
// @desc    Register User
// @access  Public
router.put(
	'/register',
	[
		check('email', 'Please enter a valid email').isEmail(),
		check(
			'password',
			'Password must be at least 8 characters long'
		).isLength({ min: 8 }),
	],
	async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { email, first_name, last_name, password } = req.body;

		try {
			// Check for existing user
			let user = await User.findOne({ email });
			if (user) {
				return res.status(400).json({
					errors: [
						{ errors: 'A user with that email already exists' },
					],
				});
			}

			user = new User({
				email,
				password,
				first_name,
				last_name,
			});

			// Encrypt password
			const salt = await bcrypt.genSalt(10);
			user.password = await bcrypt.hash(password, salt);

			// Save new user
			await user.save();

			// Send confirmation email
			const transporter = nodemailer.createTransport({
				host: process.env.SMTP_HOST,
				port: 587,
				secure: false, // true for 465, false for other ports
				auth: {
					user: process.env.SMTP_USER, // generated ethereal user
					pass: process.env.SMTP_PASS, // generated ethereal password
				},
			});

			jwt.sign(
				{ user: { id: user.id! } },
				process.env.TOKEN_SECRET!,
				{ expiresIn: '1h' },
				(err, token) => {
					const url = `${process.env.UI_URL}/verify/${token}`;

					transporter.sendMail({
						from: process.env.NO_REPLY_ADDRESS,
						to: email,
						subject: `${process.env.APP_NAME} Confirmation Email`,
						html: `Please click this link to confirm your email: <a href='${url}'>${url}</a>`,
					});
				}
			);
		} catch (err) {
			return res
				.status(500)
				.json({ errors: 'Oops, the server ran into an error' });
		}
	}
);

// @route   POST api/users/verify
// @desc    Verify a user's email address
// @access  Public
router.post('/verify/:token', async (req: Request, res: Response) => {
	try {
		const { id } = <IAuthToken>(
			jwt.verify(req.params.token, process.env.TOKEN_SECRET!)
		);

		User.findByIdAndUpdate(new ObjectId(id), { confirmed: true })
			.then((result) => {
				res.send('success');
			})
			.catch((err) => {
				res.send('error');
			});
	} catch (err) {
		res.send('error');
	}
});

// @route   POST api/users/re-verify
// @desc    Verify a user's email address
// @access  Public
router.post('/re-verify', async (req: Request, res: Response) => {
	try {
		User.findOne({ email: req.body.email })
			.then((user: IUser | null) => {
				// Send confirmation email
				const transporter = nodemailer.createTransport({
					host: process.env.SMTP_HOST,
					port: 587,
					secure: false, // true for 465, false for other ports
					auth: {
						user: process.env.SMTP_USER, // generated ethereal user
						pass: process.env.SMTP_PASS, // generated ethereal password
					},
				});

				if (user && !user.confirmed) {
					jwt.sign(
						{ id: user.id! },
						process.env.TOKEN_SECRET!,
						{ expiresIn: '1h' },
						(err, token) => {
							const url = `${process.env.UI_URL}/verify/${token}`;

							transporter
								.sendMail({
									from: process.env.NO_REPLY_ADDRESS,
									to: user.email,
									subject: `${process.env.APP_NAME} Confirmation Email`,
									html: `Please click this link to confirm your email: <a href='${url}'>${url}</a>`,
								})
								.catch(() => {});
						}
					);
				} else if (user && user.confirmed) {
					transporter
						.sendMail({
							from: process.env.NO_REPLY_ADDRESS,
							to: user.email,
							subject: `${process.env.APP_NAME} Security Alert`,
							html: 'Somone tried to re-verify your account. Because your email address is already verified, we are notifying you. If you did not request a re-verification, you may want to change your password.',
						})
						.catch(() => {});
				}

				res.send('success');
			})
			.catch((err) => {
				res.send('error');
			});
	} catch (err) {
		res.send('error');
	}
});

// @route   POST api/users/check-auth
// @desc    check if a user is logged in (has a token)
// @access  Public
router.get('/check-auth', async (req: Request, res: Response) => {
	let isAuthenticated: boolean;

	try {
		let token = <IAuthToken>(
			jwt.verify(req.cookies.token, process.env.TOKEN_SECRET!)
		);

		let userExists = await User.findById(new ObjectId(token.id))
			.then((user) => {
				if (!user) {
					// console.log("user doesn't exist");
					// res.clearCookie('token');
					return false;
				}
				return true;
			})
			.catch((err) => {
				// res.clearCookie('token');
				// console.log(err);
				return false;
			});

		isAuthenticated = userExists;
	} catch (err) {
		// console.log(err);
		isAuthenticated = false;
	}

	// console.log(isAuthenticated);
	res.json({ auth: isAuthenticated, token: req.cookies.token });
});

// @route   POST api/users/login
// @desc    log a user in
// @access  Public
router.post(
	'/login',
	[check('email', 'Please enter a valid email').isEmail()],
	(req: Request, res: Response) => {
		const vErrors: Result<ValidationError> = validationResult(req.body);
		if (!vErrors.isEmpty()) {
			return res.status(200).json(vErrors);
		}

		const { email, password } = req.body;

		let response: ISignInResponse = { success: false };

		// FInd user by email
		User.findOne({ email: email }).then((user) => {
			// Check for user
			if (!user) {
				response.errors = { message: 'Email not found' };
				return res.status(200).json(response);
			}

			// Check password
			bcrypt.compare(password, user.password).then((isMatch) => {
				if (isMatch) {
					// User login success - Create payload
					const payload = {
						id: user.id,
					};

					// Sign token
					jwt.sign(
						payload,
						process.env.TOKEN_SECRET!,
						{ expiresIn: '1d' },
						(err, token) => {
							if (err) {
								response.errors = { message: err.message };
								return res.status(200).json(response);
							}

							res.cookie('token', token, {
								httpOnly: true,
								path: '/',
								secure: true,
							});

							res.status(200).json({
								success: true,
							});
						}
					);
				} else {
					response.errors = { message: 'Incorrect Password' };
					return res.status(200).json(response);
				}
			});
		});
	}
);

// @route   POST api/users/logout
// @desc    log a user in
// @access  Public
router.post('/logout', (req: Request, res: Response) => {
	try {
		res.clearCookie('token', { httpOnly: true, path: '/', secure: true });
		res.send({ token: req.cookies.token });
	} catch (err) {
		console.log(err);
	}
});

module.exports = router;
