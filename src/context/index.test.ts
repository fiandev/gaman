import { describe, expect, it } from 'bun:test';
import { createContext } from './index';

describe('Context', () => {
	it('should parse URL and query parameters', () => {
		const req = new Request('http://localhost:3000/hello?foo=bar&test=1');
		const ctx = createContext(req, '/hello');

		expect(ctx.path).toBe('/hello');
		expect(ctx.query.foo).toBe('bar');
		expect(ctx.query.test).toBe('1');
	});

	it('should allow getting and setting params', () => {
		const req = new Request('http://localhost:3000/users/123');
		const ctx = createContext(req, '/users/123');
		
		ctx.params = { id: '123' };
		expect(ctx.param('id')).toBe('123');
	});

	it('should handle request body JSON', async () => {
		const req = new Request('http://localhost:3000/', {
			method: 'POST',
			body: JSON.stringify({ ok: true }),
			headers: { 'Content-Type': 'application/json' }
		});
		const ctx = createContext(req, '/');

		const body = await ctx.json<{ ok: boolean }>();
		expect(body).toEqual({ ok: true });
	});

	it('should maintain custom state using get/set/has', () => {
		const req = new Request('http://localhost:3000/');
		const ctx = createContext(req, '/');

		ctx.set('auth', true);
		expect(ctx.has('auth')).toBeTrue();
		expect(ctx.get('auth')).toBe<boolean>(true);

		ctx.delete('auth');
		expect(ctx.has('auth')).toBeFalse();
	});

	it('should parse custom headers', () => {
		const req = new Request('http://localhost:3000/', {
			headers: { 'X-Custom-Header': 'Gaman' }
		});
		const ctx = createContext(req, '/');

		expect(ctx.header('x-custom-header')).toBe('Gaman');
	});
});
