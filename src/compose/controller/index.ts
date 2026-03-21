import { IS_CONTROLLER } from '../../contants';
import type { AppTransportation, RequestHandler } from '../../types';

export type ControllerFactory<
	T = AppTransportation,
	Args extends any[] = any[],
> = (...args: Args) => Record<string, RequestHandler<T>>;

export function composeController<
	T extends AppTransportation,
	Args extends any[] = any[],
>(factory: ControllerFactory<T, Args>): ControllerFactory<T, Args> {
	Object.defineProperty(factory, IS_CONTROLLER, {
		value: true,
		writable: false,
		enumerable: false,
	});
	return factory;
}
