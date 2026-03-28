import { describe, expect, it } from 'bun:test';
import { composeRouter } from '..';
import { IS_COMPOSE_ROUTER } from '../../contants';

const r = composeRouter((r) => {
	r.get('/', () => {});
	r.post('/post', () => {});
});
const compose = r();

describe('composeRouter', () => {
	it('is Routes', () => {
		// @ts-ignore
		expect(r[IS_COMPOSE_ROUTER]).toBeTrue();
	});
	it('has handler in routes', () => {
		// @ts-ignore
		expect(compose.find((r) => r.path === '/')?.handler).toBeFunction();
	});

	it('path is same', () => {
		// @ts-ignore
		expect(compose.find((r) => r.path === '/')?.path).toBe('/');
	});

	it('size is same', () => {
		expect(compose.length).toBe(2);
	});
});
