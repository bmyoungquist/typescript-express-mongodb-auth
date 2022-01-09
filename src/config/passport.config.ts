import Passport from 'passport';
import PassportLocal from 'passport-local';
import PassportJwt, { ExtractJwt, VerifiedCallback } from 'passport-jwt';
import passport from 'passport';
import User from '../models/User';
import { ObjectId } from 'mongodb';
import { IAuthToken } from '../routes/user';

const LocalStrategy = PassportLocal.Strategy;
const JwtStrategy = PassportJwt.Strategy;

// JWT Strategy Options
const JwtStrategyOptions: PassportJwt.StrategyOptions = {
	jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
	secretOrKey: process.env.TOKEN_SECRET,
};

const JwtStrategyCallback: PassportJwt.VerifyCallback = (
	token: IAuthToken,
	done
) => {
	User.findById(new ObjectId(token.id))
		.then((user) => {
			if (user) {
				return done(undefined, user, token);
			}
			return done(undefined, false);
		})
		.catch((err) => {
			done(err, false);
		});
};

export default passport.use(
	new JwtStrategy(JwtStrategyOptions, JwtStrategyCallback)
);
