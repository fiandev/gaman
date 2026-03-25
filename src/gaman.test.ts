import { describe, expect, it } from 'bun:test';
import { Gaman } from './gaman';
import { composeMiddleware, composeRouter, composeException } from './compose';

describe('Gaman App Instance', () => {
	it('should successfully mount a global middleware', () => {
		const app = new Gaman();
		const middleware = composeMiddleware((ctx, next) => next());
		
		app.mount(middleware);
		
		// @ts-ignore: testing internal state
		expect(app.globalMiddlewares.length).toBe(1);
		// @ts-ignore
		expect(app.globalMiddlewares[0]).toBe(middleware);
	});

	it('should successfully mount a global exception handler', () => {
		const app = new Gaman();
		const exceptionData = composeException((err, ctx) => new Response('Error'));
		
		app.mount(exceptionData);
		
		// @ts-ignore: testing internal state
		expect(app.globalExceptionHandler).toBe(exceptionData);
	});

	it('should successfully mount routes to michi router', () => {
		const app = new Gaman();
		const routes = composeRouter((r) => {
			r.get('/test', () => 'hello');
		});

		app.mount(routes);

		// @ts-ignore: michi internal find
		const match = app.michi.find('GET', '/test');
		expect(match).not.toBeNull();
		expect(match?.data.id).toBe('GET:/test');
	});

	it('should gracefully handle multiple mounts', () => {
		const app = new Gaman();
		const middleware = composeMiddleware((ctx, next) => next());
		const routes = composeRouter((r) => r.post('/submit', () => 'ok'));

		app.mount(middleware);
		app.mount(routes);

		// @ts-ignore
		expect(app.globalMiddlewares.length).toBe(1);
		// @ts-ignore
		expect(app.michi.find('POST', '/submit')).not.toBeNull();
	});
});
