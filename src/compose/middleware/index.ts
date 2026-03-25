import { IS_MIDDLEWARE_HANDLER } from '../../contants';
import type { Context } from '../../types';

export type MiddlewareHandler = (
	ctx: Context,
	next: () => any | Promise<any>,
) => any | Promise<any>;

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
