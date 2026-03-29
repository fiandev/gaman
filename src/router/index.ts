import {
	composeException,
	type ControllerFactory,
	type ExceptionHandler,
	type MiddlewareHandler,
} from '../compose';
import type {
	RequestHandler,
	Route,
	RouteDefinition,
	RouterBuilder,
} from '../types';
import { isExceptionHandler } from '../utils/is';
import { normalizePath } from '../utils/utils';

export function Router(
	prefix: string = '',
	currentServices: Record<string, any> = {},
	parentMiddlewares: MiddlewareHandler[] = [],
	parentException: ExceptionHandler | null = null,
): RouterBuilder {
	const routes: Route[] = [];

	const globalMiddlewares: MiddlewareHandler[] = [...parentMiddlewares];
	let globalExceptionHandler: ExceptionHandler | null = parentException;

	const addRoute = <T extends ControllerFactory>(
		method: string | string[],
		path: string,
		handler: RequestHandler | [fn: T, name: keyof ReturnType<T>],
	): RouteDefinition => {
		let finalHandler: RequestHandler | null = null;
		if (Array.isArray(handler)) {
			const [fn, name] = handler;
			const instance = fn(currentServices);
			// @ts-ignore
			finalHandler = instance[name] as RequestHandler;
		} else {
			finalHandler = handler;
		}

		const fullPath = normalizePath(`/${prefix}/${path}`);
		const methods = Array.isArray(method)
			? method.map((m) => m.toUpperCase())
			: [method.toUpperCase()];

		const routeData: Route = {
			path: fullPath,
			methods,
			exceptionHandler: globalExceptionHandler,
			handler: finalHandler,
			middlewares: [...globalMiddlewares],
			pipes: [],
		};
		routes.push(routeData);

		const definition: RouteDefinition = {
			middleware(fn) {
				routeData.middlewares.push(fn);
				return definition;
			},
			exception(eh) {
				if (isExceptionHandler(eh)) {
					routeData.exceptionHandler = eh;
				} else {
					routeData.exceptionHandler = composeException(eh);
				}
				return definition;
			},
			name(s) {
				routeData.name = s;
				return definition;
			},
		};

		return definition;
	};

	return {
		getRoutes: () => routes,

		mountRouter(pathPrefix, router) {
			const subRoutes = router(
				normalizePath(`${prefix}/${pathPrefix}`),
				currentServices,
			);
			routes.push(...subRoutes);
			return this;
		},

		mountService(newServices) {
			currentServices = { ...currentServices, ...newServices };
			return this;
		},

		mountException(exceptionHandler) {
			if (isExceptionHandler(exceptionHandler)) {
				globalExceptionHandler = exceptionHandler;
			} else {
				globalExceptionHandler = composeException(exceptionHandler);
			}
			return this;
		},

		mountMiddleware(...middlewares) {
			globalMiddlewares.push(...middlewares);
			return this;
		},

		get: (path, handler) => addRoute('GET', path, handler),
		post: (path, handler) => addRoute('POST', path, handler),
		put: (path, handler) => addRoute('PUT', path, handler),
		delete: (path, handler) => addRoute('DELETE', path, handler),
		patch: (path, handler) => addRoute('PATCH', path, handler),
		all: (path, handler) =>
			addRoute(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], path, handler),
		head: (path, handler) => addRoute('HEAD', path, handler),
		options: (path, handler) => addRoute('OPTIONS', path, handler),
		match: (methods, path, handler) => addRoute(methods, path, handler),

		group: (groupPrefix, callback) => {
			// Rekursi Router dengan prefix baru
			const subBuilder = Router(
				normalizePath(`/${prefix}/${groupPrefix}`),
				currentServices,
				globalMiddlewares,
				globalExceptionHandler,
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
					childRoutes.forEach((r) => {
						if (isExceptionHandler(eh)) {
							r.exceptionHandler = eh;
						} else {
							r.exceptionHandler = composeException(eh);
						}
					});
					return groupDef;
				},

				name(s) {
					childRoutes.forEach((r) => (r.name = s));
					return groupDef;
				},
			};
			return groupDef;
		},
	} as RouterBuilder;
}
