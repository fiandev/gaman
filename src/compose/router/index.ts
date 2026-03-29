import { IS_COMPOSE_ROUTER, IS_ROUTES } from '../../contants';
import type { MiddlewareHandler } from '../middleware';
import { Router } from '../../router';
import type { RequestHandler, RouterBuilder, Routes } from '../../types';

export type RouterConfig = {
	services: Record<string, any>;
	middlewares: Array<MiddlewareHandler | RequestHandler>;
};

export type Router = (
	prefix?: string,
	services?: Record<string, any>,
) => Routes;

export function composeRouter(callback: (r: RouterBuilder) => void): Router {
	const result: Router = (prefix = '', services = {}) => {
		const builder = Router(prefix, services);
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

		Object.defineProperty(useable_routes, IS_ROUTES, {
			value: true,
			writable: false,
			enumerable: false,
		});
		return useable_routes;
	};

	Object.defineProperty(result, IS_COMPOSE_ROUTER, {
		value: true,
		writable: false,
		enumerable: false,
	});

	return result;
}
