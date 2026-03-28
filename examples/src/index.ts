/**
 * ==========================================================================
 * Gaman Bootstrap File
 * ==========================================================================
 *
 * Welcome to your GamanJS application! ❤️
 *
 * This file is responsible for bootstrapping your application and
 * starting the HTTP server. By default, it runs on port 3431.
 *
 * Server URL:
 *    http://localhost:3431
 *
 * For the full documentation and more awesome features, visit:
 *    https://gaman.7togk.id/docs/
 *
 * ==========================================================================
 */

import { defineBootstrap } from '../../src';
import { composeMiddleware, composeException } from '../../src/compose';
import AppRouter from './modules/app/AppRouter';

defineBootstrap(async (app) => {
	// ===== Global Middleware =====
	app.mount(
		composeMiddleware((ctx, next) => {
			ctx.set('startTime', Date.now());
			return next();
		}),
	);

	// ===== Global Exception Handler =====
	app.mount(
		composeException((err, ctx) => {
			return ctx
				.send({
					error: true,
					message: err instanceof Error ? err.message : 'Unknown Error',
				})
				.build(500);
		}),
	);

	app.mount(AppRouter); // ? register app router

	app.mountServer({ http: 3431 });
});
