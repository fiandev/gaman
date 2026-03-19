import type { ContextHTTP, RequestHandler } from '../context/index.types';
import type { AppTransportation } from '../index.types';

export type ControllerFactory<
	T = AppTransportation,
	Args extends any[] = any[],
> = (...args: Args) => Record<string, RequestHandler<T>>;
