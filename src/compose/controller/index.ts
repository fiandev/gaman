import { IS_CONTROLLER } from '../../contants';
import type { RequestHandler } from '../../types';

export type ControllerFactory = (...args: any[]) => Record<string, RequestHandler>;

export function composeController<T extends ControllerFactory>(
	factory: T,
): T {
	Object.defineProperty(factory, IS_CONTROLLER, {
		value: true,
		writable: false,
		enumerable: false,
	});
	return factory;
}