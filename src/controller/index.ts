import { IS_CONTROLLER } from '../contants';
import type { AppTransportation } from '../index.types';
import type { ControllerFactory } from './index.types';

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
