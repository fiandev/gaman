import type { RouterBuilder } from '.';
import type {
	ContextType,
	RequestHandler,
	UniversalContext,
} from '../context/index.types';
import type { ExceptionHandler } from '../exception/index.types';
import type { AppTransportation, IPC } from '../index.types';
import type { Middleware, MiddlewareHandler } from '../middleware/index.types';

export type RouteFactory<T = AppTransportation> = (
	route: RouterBuilder<T>,
) => void;

export interface Route<T = AppTransportation> {
	path: string;
	methods: string[];
	contextType: ContextType;
	handler: RequestHandler<T> | null;
	middlewares: Middleware[];
	exceptions: ExceptionHandler[];
	match: URLPattern;
	pipes: Array<MiddlewareHandler | RequestHandler<T>>;
	name?: string;
	options?: T extends IPC ? IPCOptions : never;
}

export type Routes<T = AppTransportation> = Array<Route<T>>;

export type RouteDefinition<T = AppTransportation> = T extends IPC
	? {
			options: (ops: IPCOptions) => RouteDefinition<T>;
		}
	: {} & {
			middleware(fn: Middleware | Array<Middleware>): RouteDefinition<T>;
			exception(
				eh: ExceptionHandler | Array<ExceptionHandler>,
			): RouteDefinition<T>;
			name(s: string): RouteDefinition<T>;
		};

export type IPCOptions = {
	/**
	 * If true, GamanJS will automatically remove the existing socket file
	 * before starting the server to prevent "Address already in use" errors.
	 * @default true
	 */
	unlink?: boolean;

	/**
	 * Set the file system permissions for the socket file.
	 * Use octal format, e.g., 0o777 to allow cross-user process communication.
	 * Only applicable on Unix-based systems.
	 */
	mode?: number;

	/**
	 * The maximum number of concurrent client connections allowed to the IPC server.
	 */
	maxConnections?: number;

	/**
	 * If true, the socket won't automatically close when the other side
	 * sends a FIN packet. The server can still write data.
	 * @default false
	 */
	allowHalfOpen?: boolean;
};
