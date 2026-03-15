import type { RouterBuilder } from '.';
import type { ContextType, RequestHandler, UniversalContext } from '../context/index.types';
import type { ExceptionHandler } from '../exception/index.types';
import type { Middleware, MiddlewareHandler } from '../middleware/index.types';

export type RouteFactory = (route: RouterBuilder) => void;

export interface Route<UCTX extends Gaman.Context = UniversalContext> {
	path: string;
	methods: string[];
	contextType: ContextType;
	handler: RequestHandler<UCTX> | null;
	middlewares: Middleware[];
	exceptions: ExceptionHandler[];
	match: URLPattern;
	pipes: Array<MiddlewareHandler | RequestHandler<UCTX>>;
	name?: string;
}

export type Routes<UCTX extends Gaman.Context = UniversalContext> = Array<Route<UCTX>>;

export interface RouteDefinition {
	middleware(fn: Middleware | Array<Middleware>): RouteDefinition;
	exception(eh: ExceptionHandler | Array<ExceptionHandler>): RouteDefinition;
	name(s: string): RouteDefinition;
}
