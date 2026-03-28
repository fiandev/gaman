/**
 * ==========================================================================
 * Gaman Routes
 * ==========================================================================
 *
 * Define your application routes here. Each route maps an HTTP request
 * to a specific controller action. Keep your routes clean, simple,
 * and organized for better maintainability.
 *
 * Example:
 *    r.get('/', [AppController, 'HelloWorld']);
 *
 * For advanced usage, see the documentation:
 * 		https://gaman.7togk.id/docs/overview/routing/
 *
 * ==========================================================================
 */

import {
	composeRouter,
	composeMiddleware,
	composeException,
} from '../../../../src/compose';
import AppController from './controllers/AppController';
import { AppService } from './services/AppService';

export default composeRouter((r) => {
  
  // ===== Inject Services to all Controllers =====
  r.mountService({
    appService: AppService(),
	});
  
  // ===== Controller + Service Based =====
	r.group('/', (r) => {
		r.get('/', [AppController, 'HelloWorld']);
		r.get('/users/:id', [AppController, 'GetUser']);
		r.post('/items', [AppController, 'CreateItem']);
	});

	// ===== Inline Handler: Simple Text =====
	r.get('/ping', (ctx) => {
		return ctx.send('pong').ok();
	});

	// ===== Inline Handler: Query Params =====
	r.get('/search', (ctx) => {
		return ctx
			.send({
				q: ctx.query.q,
				page: ctx.query.page || '1',
			})
			.ok();
	});

	// ===== Inline Handler: JSON Body =====
	r.post('/echo', async (ctx) => {
		const body = await ctx.json();
		return ctx.send({ echo: body }).ok();
	});

	// ===== Inline Handler: FormData =====
	r.post('/form', async (ctx) => {
		const name = await ctx.input('name');
		const age = await ctx.input('age');
		return ctx.send({ name, age }).ok();
	});

	// ===== Inline Handler: File Upload =====
	r.post('/upload', async (ctx) => {
		const file = await ctx.file('document');
		return ctx
			.send({
				fileInfo: file
					? { filename: file.filename, size: file.size, type: file.mimeType }
					: null,
			})
			.ok();
	});

	// ===== Deliberate Error for Global Exception =====
	r.get('/error', () => {
		throw new Error('Boom! Global error test');
	});

	// ===== Route with per-route Middleware =====
	r.get('/guarded', (ctx) => {
		return ctx.send({ secret: 'Top Secret Data', user: ctx.get('user') }).ok();
	}).middleware(
		composeMiddleware((ctx, next) => {
			const token = ctx.header('authorization');
			if (token === 'Bearer valid-token') {
				ctx.set('user', 'admin');
				return next();
			}
			return ctx.send({ message: 'Unauthorized' }).unauthorized();
		}),
	);

	// ===== Route with per-route Exception Handler =====
	r.get('/risky', () => {
		throw new Error('Risky route failed');
	}).exception(
		composeException((err, ctx) => {
			return ctx.send({ caught: true, msg: err.message }).build(422);
		}),
	);

	// ===== Route Group with group-level Middleware & Exception =====
	r.group('v1', (v1) => {
		v1.get('/hello', (ctx) => ctx.send({ msg: 'Hello from v1' }).ok());
		v1.get('/me', (ctx) => {
			if (!ctx.has('auth')) throw new Error('Not authenticated');
			return ctx.send({ user: ctx.get('auth') }).ok();
		});
		v1.post('/data', async (ctx) => {
			const body = await ctx.json();
			return ctx.send({ v1: true, data: body }).ok();
		});
	})
		.middleware(
			composeMiddleware((ctx, next) => {
				const token = ctx.header('x-api-key');
				if (token === 'secret-key') {
					ctx.set('auth', 'v1-user');
				}
				return next();
			}),
		)
		.exception(
			composeException((err, ctx) => {
				return ctx.send({ v1Error: true, msg: err.message }).build(403);
			}),
		);
});
