import { normalize } from 'node:path';
import type { Route, RouteDefinition, Routes } from './index.types';
import type { RequestHandler } from '../context/index.types';
import type { ControllerFactory } from '../controller/index.types';
import type { Middleware, MiddlewareHandler } from '../middleware/index.types';
import { sortArrayByPriority } from '../utils/priority';
import { IS_ROUTES } from '../contants';

export type RouterBuilder = {
	getRoutes: () => Route[];
	get: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;
	post: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;
	put: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;
	delete: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;
	patch: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;
	all: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;
	head: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;
	options: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;
	match: (
		methods: string[],
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;

	group: (
		groupPrefix: string,
		callback: (r: RouterBuilder) => void,
	) => RouteDefinition;
};

export function Router(prefix: string = ''): RouterBuilder {
	const routes: Route[] = [];

	const addRoute = (
		method: string | string[],
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	): RouteDefinition => {
		const fullPath = normalize(`/${prefix}/${path}`).replace(/\\/g, '/');

		let finalHandler: RequestHandler | null = null;
		if (Array.isArray(handler)) {
			const [fn, name] = handler;
			const instance = fn();
			finalHandler = instance[name] as RequestHandler;
		} else {
			finalHandler = handler;
		}

		const route: Route = {
			path: fullPath,
			methods: Array.isArray(method)
				? method.map((m) => m.toUpperCase())
				: [method.toUpperCase()],
			handler: finalHandler,
			middlewares: [],
			exceptions: [],
			pipes: [],
			match: new URLPattern({ pathname: fullPath }),
		};

		routes.push(route);

		const definition: RouteDefinition = {
			middleware(fn) {
				const fns = Array.isArray(fn) ? fn : [fn];
				route.middlewares.push(...fns);
				return definition;
			},
			exception(eh) {
				const ehs = Array.isArray(eh) ? eh : [eh];
				route.exceptions.push(...ehs);
				return definition;
			},
			name(s: string) {
				route.name = s;
				return definition;
			},
		};

		return definition;
	};

	return {
		getRoutes: () => routes,
		get: (
			path: string,
			handler: RequestHandler | [fn: ControllerFactory, name: string],
		) => addRoute('GET', path, handler),
		post: (
			path: string,
			handler: RequestHandler | [fn: ControllerFactory, name: string],
		) => addRoute('POST', path, handler),
		put: (
			path: string,
			handler: RequestHandler | [fn: ControllerFactory, name: string],
		) => addRoute('PUT', path, handler),
		delete: (
			path: string,
			handler: RequestHandler | [fn: ControllerFactory, name: string],
		) => addRoute('DELETE', path, handler),
		patch: (
			path: string,
			handler: RequestHandler | [fn: ControllerFactory, name: string],
		) => addRoute('PATCH', path, handler),

		all(
			path: string,
			handler: RequestHandler | [fn: ControllerFactory, name: string],
		) {
			return addRoute('ALL', path, handler);
		},
		head(
			path: string,
			handler: RequestHandler | [fn: ControllerFactory, name: string],
		) {
			return addRoute('HEAD', path, handler);
		},
		options(
			path: string,
			handler: RequestHandler | [fn: ControllerFactory, name: string],
		) {
			return addRoute('OPTIONS', path, handler);
		},
		match(
			methods: string[],
			path: string,
			handler: RequestHandler | [fn: ControllerFactory, name: string],
		) {
			return addRoute(methods, path, handler);
		},

		group: (
			groupPrefix: string,
			callback: (r: any) => void,
		): RouteDefinition => {
			const subBuilder = Router(
				normalize(`/${prefix}/${groupPrefix}`),
			);
			callback(subBuilder);
			const childRoutes = subBuilder.getRoutes();
			routes.push(...childRoutes);

			const groupDef: RouteDefinition = {
				middleware(fn) {
					const fns = Array.isArray(fn) ? fn : [fn];
					childRoutes.forEach((r) => r.middlewares.push(...fns));
					return groupDef;
				},
				exception(eh) {
					const ehs = Array.isArray(eh) ? eh : [eh];
					childRoutes.forEach((r) => r.exceptions.unshift(...ehs));
					return groupDef;
				},
				name: (s: string) => groupDef,
			};
			return groupDef;
		},
	};
}


export function composeRoutes(callback: (r: RouterBuilder) => void): Routes {
  const builder = Router();
  callback(builder);

  const routes = builder.getRoutes();

  const useable_routes = routes.map((r) => {
    // Sort middleware berdasarkan priority
    const sortedMiddlewares = sortArrayByPriority<Middleware>(
      r.middlewares,
      (mw) => mw.config.priority,
    );

    const pipes: Array<MiddlewareHandler | RequestHandler> = [
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

  return useable_routes as Routes;
}