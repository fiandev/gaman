import { IS_MIDDLEWARE_HANDLER } from '../../contants';
import type { Context, NextFunction, ResponseData } from '../../types';

export type MiddlewareHandler = (
	ctx: Context,
	next: NextFunction,
) => ResponseData | NextFunction | Promise<ResponseData | NextFunction>;

export function composeMiddleware(
	handler: MiddlewareHandler,
): MiddlewareHandler {
	Object.defineProperty(handler, IS_MIDDLEWARE_HANDLER, {
		value: true,
		writable: false,
		enumerable: false,
	});
	return handler;
}
