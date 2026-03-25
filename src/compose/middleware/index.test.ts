import { describe, expect, it } from 'bun:test';
import { composeMiddleware } from '..';
import {
	IS_MIDDLEWARE_HANDLER,
} from '../../contants';
import { Responder } from '../../responder';

const middleware = composeMiddleware(
	(ctx, next) => {
		return next();
	},
);

describe('composeMiddleware', () => {

	it('is Middleware Handler', () => {
		// @ts-ignore
		expect(middleware[IS_MIDDLEWARE_HANDLER]).toBeTrue();
	});


	it('handler is function in middleware', () => {
		expect(middleware).toBeFunction();
	});

	it('result is next in middleware', async () => {
		const res = Responder.ok();
		expect(await middleware({} as any, () => res)).toEqual(res);
	});
});
