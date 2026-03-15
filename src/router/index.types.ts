import type { RouterBuilder } from '.';
import type { RequestHandler } from '../context/index.types';
import type { ExceptionHandler } from '../exception/index.types';
import type { Middleware, MiddlewareHandler } from '../middleware/index.types';

export type RouteFactory = (route: RouterBuilder) => void;

export interface Route {
	path: string;
	methods: string[];
	handler: RequestHandler | null;
	middlewares: Middleware[];
	exceptions: ExceptionHandler[];
	match: URLPattern;
	pipes: Array<MiddlewareHandler | RequestHandler>;
	name?: string;
}

export type Routes = Array<Route>;

export interface RouteDefinition {
	middleware(fn: Middleware | Array<Middleware>): RouteDefinition;
	exception(eh: ExceptionHandler | Array<ExceptionHandler>): RouteDefinition;
	name(s: string): RouteDefinition;
}
