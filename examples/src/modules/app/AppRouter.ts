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
import { Res } from '../../../../src/responder';
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
		return Res.text('pong');
	});

	// ===== Inline Handler: Query Params =====
	r.get('/search', (ctx) => {
		return Res.json({
			q: ctx.query.q,
			page: ctx.query.page || '1',
		});
	});

	// ===== Inline Handler: JSON Body =====
	r.post('/echo', async (ctx) => {
		const body = await ctx.json();
		return Res.json({ echo: body });
	});

	// ===== Inline Handler: FormData =====
	r.post('/form', async (ctx) => {
		const name = await ctx.input('name');
		const age = await ctx.input('age');
		return Res.json({ name, age });
	});

	// ===== Inline Handler: File Upload =====
	r.post('/upload', async (ctx) => {
		const file = await ctx.file('document');
		return Res.json({
			fileInfo: file
				? { filename: file.filename, size: file.size, type: file.mimeType }
				: null,
		});
	});

	// ===== Deliberate Error for Global Exception =====
	r.get('/error', () => {
		throw new Error('Boom! Global error test');
	});

	// ===== Route with per-route Middleware =====
	r.get('/guarded', (ctx) => {
		return Res.json({ secret: 'Top Secret Data', user: ctx.get('user') });
	}).middleware(
		composeMiddleware((ctx, next) => {
			const token = ctx.header('authorization');
			if (token === 'Bearer valid-token') {
				ctx.set('user', 'admin');
				return next();
			}
			return Res.unauthorized({ message: 'Unauthorized' });
		}),
	);

	// ===== Route with per-route Exception Handler =====
	r.get('/risky', () => {
		throw new Error('Risky route failed');
	}).exception(
		composeException((err, ctx) => {
			return Res.badRequest({ caught: true, msg: err.message });
		}),
	);

	// ===== Route Group with group-level Middleware & Exception =====
	r.group('v1', (v1) => {
		v1.get('/hello', (ctx) => Res.json({ msg: 'Hello from v1' }));
		v1.get('/me', (ctx) => {
			if (!ctx.has('auth')) throw new Error('Not authenticated');
			return Res.json({ user: ctx.get('auth') });
		});
		v1.post('/data', async (ctx) => {
			const body = await ctx.json();
			return Res.json({ v1: true, data: body });
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
				return Res.forbidden({ v1Error: true, msg: err.message });
			}),
		);
});
