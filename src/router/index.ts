import { normalize } from 'node:path';
import type { Route, RouteDefinition, Routes } from './index.types';
import type {
	Context,
	ContextHTTP,
	ContextIPC,
	ContextType,
	RequestHandler,
	UniversalContext,
} from '../context/index.types';
import type { ControllerFactory } from '../controller/index.types';
import type { Middleware, MiddlewareHandler } from '../middleware/index.types';
import { sortArrayByPriority } from '../utils/priority';
import { IS_ROUTES } from '../contants';
import type { AppTransportation, HTTP, IPC } from '../index.types';

/* -------------------------------------------------------------------------- */
/* HTTP Routing Methods                            */
/* -------------------------------------------------------------------------- */

export type HttpRouterMethods = {
	/**
	 * Registers a route for the HTTP GET method.
	 */
	get: (
		path: string,
		handler: RequestHandler<HTTP> | [fn: ControllerFactory<HTTP>, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route for the HTTP POST method.
	 */
	post: (
		path: string,
		handler: RequestHandler<HTTP> | [fn: ControllerFactory<HTTP>, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route for the HTTP PUT method.
	 */
	put: (
		path: string,
		handler: RequestHandler<HTTP> | [fn: ControllerFactory<HTTP>, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route for the HTTP DELETE method.
	 */
	delete: (
		path: string,
		handler: RequestHandler<HTTP> | [fn: ControllerFactory<HTTP>, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route for the HTTP PATCH method.
	 */
	patch: (
		path: string,
		handler: RequestHandler<HTTP> | [fn: ControllerFactory<HTTP>, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route that responds to all standard HTTP methods.
	 */
	all: (
		path: string,
		handler: RequestHandler<HTTP> | [fn: ControllerFactory<HTTP>, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route for the HTTP HEAD method.
	 */
	head: (
		path: string,
		handler: RequestHandler<HTTP> | [fn: ControllerFactory<HTTP>, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route for the HTTP OPTIONS method.
	 */
	options: (
		path: string,
		handler: RequestHandler<HTTP> | [fn: ControllerFactory<HTTP>, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route for a specific set of HTTP methods.
	 */
	match: (
		methods: string[],
		path: string,
		handler: RequestHandler<HTTP> | [fn: ControllerFactory<HTTP>, name: string],
	) => RouteDefinition;

	/* -------------------------------------------------------------------------- */
	/* Route Grouping                                  */
	/* -------------------------------------------------------------------------- */

	/**
	 * Groups multiple routes under a common path prefix.
	 */
	group: (
		groupPrefix: string,
		callback: (r: RouterBuilder<HTTP>) => void,
	) => RouteDefinition<HTTP>;
};

export type IPCRouterMethods = {
	/* -------------------------------------------------------------------------- */
	/* IPC Routing Methods                            */
	/* -------------------------------------------------------------------------- */

	/**
	 * Registers an IPC (Inter-Process Communication) route over Unix Domain Sockets.
	 * This method uses ContextIPC for low-latency communication between local processes.
	 */
	ipc: (
		unix: string,
		handler: RequestHandler<IPC> | [fn: ControllerFactory<IPC>, name: string],
	) => RouteDefinition<IPC>;
};

/* -------------------------------------------------------------------------- */
/* Helper to Filter Methods Based on Transportation                           */
/* -------------------------------------------------------------------------- */

// Jika T mengandung HTTP, ambil HttpRouterMethods, jika tidak kosong
type MapHttpMethods<T = AppTransportation> = [HTTP] extends [T]
	? HttpRouterMethods
	: {};

// Jika T mengandung IPC, ambil IPCRouterMethods, jika tidak kosong
type MapIpcMethods<T = AppTransportation> = [IPC] extends [T]
	? IPCRouterMethods
	: {};

export type RouterBuilder<T = AppTransportation> = MapHttpMethods<T> &
	MapIpcMethods<T> & {
		/**
		 * Returns all registered routes within this builder instance.
		 */
		getRoutes: <TT extends AppTransportation>() => Route<TT>[];
	};

export function Router<T = AppTransportation>(
	prefix: string = '',
): RouterBuilder<T> {
	const routes: Route<any>[] = [];

	const addRoute = <T = AppTransportation>(
		method: string | string[],
		path: string,
		handler: RequestHandler<T> | [fn: ControllerFactory<T>, name: string],
		contextType: ContextType = 'HTTP',
	): RouteDefinition<any> => {
		const fullPath =
			contextType == 'IPC'
				? path
				: normalize(`/${prefix}/${path}`).replace(/\\/g, '/');

		let finalHandler: RequestHandler<T> | null = null;
		if (Array.isArray(handler)) {
			const [fn, name] = handler;
			const instance = fn();
			finalHandler = instance[name] as RequestHandler<T>;
		} else {
			finalHandler = handler;
		}

		const route: Route<any> = {
			path: fullPath,
			methods: Array.isArray(method)
				? method.map((m) => m.toUpperCase())
				: [method.toUpperCase()],
			handler: finalHandler,
			contextType,
			middlewares: [],
			exceptions: [],
			pipes: [],
			match: new URLPattern({ pathname: fullPath }),
			options: {},
		};

		routes.push(route);

		const definition: RouteDefinition<any> = {
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
			options(ops) {
				route.options = ops;
				return definition;
			},
		};

		return definition;
	};

	return {
		getRoutes: () => routes,
		get: (
			path: string,
			handler:
				| RequestHandler<HTTP>
				| [fn: ControllerFactory<HTTP>, name: string],
		) => addRoute('GET', path, handler),
		post: (
			path: string,
			handler:
				| RequestHandler<HTTP>
				| [fn: ControllerFactory<HTTP>, name: string],
		) => addRoute('POST', path, handler),
		put: (
			path: string,
			handler:
				| RequestHandler<HTTP>
				| [fn: ControllerFactory<HTTP>, name: string],
		) => addRoute('PUT', path, handler),
		delete: (
			path: string,
			handler:
				| RequestHandler<HTTP>
				| [fn: ControllerFactory<HTTP>, name: string],
		) => addRoute('DELETE', path, handler),
		patch: (
			path: string,
			handler:
				| RequestHandler<HTTP>
				| [fn: ControllerFactory<HTTP>, name: string],
		) => addRoute('PATCH', path, handler),

		all(
			path: string,
			handler:
				| RequestHandler<HTTP>
				| [fn: ControllerFactory<HTTP>, name: string],
		) {
			return addRoute('ALL', path, handler);
		},
		head(
			path: string,
			handler:
				| RequestHandler<HTTP>
				| [fn: ControllerFactory<HTTP>, name: string],
		) {
			return addRoute('HEAD', path, handler);
		},
		options(
			path: string,
			handler:
				| RequestHandler<HTTP>
				| [fn: ControllerFactory<HTTP>, name: string],
		) {
			return addRoute('OPTIONS', path, handler);
		},
		match(
			methods: string[],
			path: string,
			handler:
				| RequestHandler<HTTP>
				| [fn: ControllerFactory<HTTP>, name: string],
		) {
			return addRoute(methods, path, handler);
		},

		ipc(
			unix: string,
			handler: RequestHandler<IPC> | [fn: ControllerFactory<IPC>, name: string],
		) {
			return addRoute([], unix, handler, 'IPC');
		},

		group: (
			groupPrefix: string,
			callback: (r: RouterBuilder<HTTP>) => void,
		): RouteDefinition<HTTP> => {
			const subBuilder = Router<HTTP>(normalize(`/${prefix}/${groupPrefix}`));
			callback(subBuilder);
			const childRoutes = subBuilder.getRoutes();
			routes.push(...childRoutes);
			
			
			const groupDef: RouteDefinition<HTTP> = {
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
				name: (s: string) => groupDef
			};
			return groupDef;
		},
	} as any;
}

export function composeRoutes<T extends AppTransportation>(
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
