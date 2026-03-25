import { IS_ROUTES } from '../../contants';
import type { MiddlewareHandler } from '../middleware';
import { Router } from '../../router';
import type { RequestHandler, RouterBuilder, Routes } from '../../types';

export function composeRouter(callback: (r: RouterBuilder) => void): Routes {
	const builder = Router();
	callback(builder);

	const routes = builder.getRoutes();

	const useable_routes = routes.map((r) => {
		const pipes: Array<MiddlewareHandler | RequestHandler> = [
			...r.middlewares,
		];

		if (r.handler) {
			pipes.push(r.handler);
		}

		return { ...r, pipes };
	});

	// Tandai sebagai routes valid
	Object.defineProperty(useable_routes, IS_ROUTES, {
		value: true,
		writable: false,
		enumerable: false,
	});

	return useable_routes as Routes;
}
