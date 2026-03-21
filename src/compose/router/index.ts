import { IS_ROUTES } from '../../contants';
import { Middleware, MiddlewareHandler } from '../middleware';
import { Router } from '../../router';
import { AppTransportation, RequestHandler, RouterBuilder, Routes } from '../../types';
import { sortArrayByPriority } from '../../utils/priority';

export function composeRouter<T extends AppTransportation>(
	callback: (r: RouterBuilder<T>) => void,
): Routes<T> {
	const builder = Router<T>();
	callback(builder);

	const routes = builder.getRoutes();

	const useable_routes = routes.map((r) => {
		// Sort middleware berdasarkan priority
		const sortedMiddlewares = sortArrayByPriority<Middleware>(
			r.middlewares,
			(mw) => mw.config.priority,
		);

		const pipes: Array<MiddlewareHandler | RequestHandler<T>> = [
			...sortedMiddlewares.map((i) => i.handler),
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

	return useable_routes as Routes<T>;
}
