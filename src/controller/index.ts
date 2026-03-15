import { IS_CONTROLLER } from '../contants';
import type { ControllerFactory } from './index.types';

export function composeController<Args extends any[]>(
	factory: ControllerFactory<Args>,
): ControllerFactory<Args> {
	Object.defineProperty(factory, IS_CONTROLLER, {
		value: true,
		writable: false,
		enumerable: false,
	});
	return factory;
}
