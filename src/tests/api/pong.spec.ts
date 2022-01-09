import 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import app from '../../app';

describe(`GET /api/ping`, () => {
	it('Returns "pong"', async () => {
		const res = await request(app).get('/v1/ping');

		expect(res.status).to.equal(200);
		expect(res.text).to.equal('pong');
	});
});
