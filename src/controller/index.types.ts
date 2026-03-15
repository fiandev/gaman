import type { ContextHTTP, RequestHandler } from '../context/index.types';

export type ControllerFactory<
	CTX extends Gaman.Context = ContextHTTP,
	Args extends any[] = any[],
> = (...args: Args) => Record<string, RequestHandler<CTX>>;
