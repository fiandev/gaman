import { IS_EXCEPTION_HANDLER } from "../../contants";

export type ExceptionHandler = (error: Error) => any;

export function composeException(
	cb: ExceptionHandler,
): ExceptionHandler {
	Object.defineProperty(cb, IS_EXCEPTION_HANDLER, {
		value: true,
		writable: false,
		enumerable: false,
	});
	return cb;
}
