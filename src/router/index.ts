import { normalize } from 'node:path';
import type { Route, RouteDefinition, Routes } from './index.types';
import type {
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

export type RouterBuilder = {
	/**
	 * Returns all registered routes within this builder instance.
	 */
	getRoutes: () => Route[];

	/* -------------------------------------------------------------------------- */
	/* HTTP Routing Methods                            */
	/* -------------------------------------------------------------------------- */

	/**
	 * Registers a route for the HTTP GET method.
	 */
	get: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route for the HTTP POST method.
	 */
	post: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route for the HTTP PUT method.
	 */
	put: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route for the HTTP DELETE method.
	 */
	delete: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route for the HTTP PATCH method.
	 */
	patch: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route that responds to all standard HTTP methods.
	 */
	all: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route for the HTTP HEAD method.
	 */
	head: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route for the HTTP OPTIONS method.
	 */
	options: (
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;

	/**
	 * Registers a route for a specific set of HTTP methods.
	 */
	match: (
		methods: string[],
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	) => RouteDefinition;

	/* -------------------------------------------------------------------------- */
	/* IPC Routing Methods                            */
	/* -------------------------------------------------------------------------- */

	/**
	 * Registers an IPC (Inter-Process Communication) route over Unix Domain Sockets.
	 * This method uses ContextIPC for low-latency communication between local processes.
	 */
	ipc: (
		path: string,
		handler:
			| RequestHandler<ContextIPC>
			| [fn: ControllerFactory<ContextIPC>, name: string],
	) => RouteDefinition;

	/* -------------------------------------------------------------------------- */
	/* Route Grouping                                  */
	/* -------------------------------------------------------------------------- */

	/**
	 * Groups multiple routes under a common path prefix.
	 */
	group: (
		groupPrefix: string,
		callback: (r: RouterBuilder) => void,
	) => RouteDefinition;
};

export function Router(prefix: string = ''): RouterBuilder {
	const routes: Route<any>[] = [];

	const addRoute = <CTX extends Gaman.Context = ContextHTTP>(
		method: string | string[],
		path: string,
		handler: RequestHandler<CTX> | [fn: ControllerFactory<CTX>, name: string],
		contextType: ContextType = 'HTTP',
	): RouteDefinition => {
		const fullPath = normalize(`/${prefix}/${path}`).replace(/\\/g, '/');

		let finalHandler: RequestHandler<CTX> | null = null;
		if (Array.isArray(handler)) {
			const [fn, name] = handler;
			const instance = fn();
			finalHandler = instance[name] as RequestHandler<CTX>;
		} else {
			finalHandler = handler;
		}

		const route: Route<CTX> = {
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

		ipc(
			path: string,
			handler:
				| RequestHandler<ContextIPC>
				| [fn: ControllerFactory<ContextIPC>, name: string],
		) {
			return addRoute([], path, handler, 'IPC');
		},

		group: (
			groupPrefix: string,
			callback: (r: any) => void,
		): RouteDefinition => {
			const subBuilder = Router(normalize(`/${prefix}/${groupPrefix}`));
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

export function composeRoutes<UCTX extends Gaman.Context = UniversalContext>(callback: (r: RouterBuilder) => void): Routes<UCTX> {
	const builder = Router();
	callback(builder);

	const routes = builder.getRoutes();

	const useable_routes = routes.map((r) => {
		// Sort middleware berdasarkan priority
		const sortedMiddlewares = sortArrayByPriority<Middleware>(
			r.middlewares,
			(mw) => mw.config.priority,
		);

		const pipes: Array<MiddlewareHandler | RequestHandler<UCTX>> = [
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

	return useable_routes as Routes<UCTX>;
}
