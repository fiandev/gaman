import type { ExceptionHandler, MiddlewareHandler, } from '../compose';
import { IS_EXCEPTION_HANDLER, IS_MIDDLEWARE_HANDLER, IS_ROUTES } from '../contants';
import type { Routes } from '../types';

export function isMiddlewareHandler(v: any): v is MiddlewareHandler {
	return v[IS_MIDDLEWARE_HANDLER] as boolean;
}

export function isExceptionHandler(v: any): v is ExceptionHandler {
	return v[IS_EXCEPTION_HANDLER] as boolean;
}

export function isRoutes(v: any): v is Routes {
	return v[IS_ROUTES] as boolean;
}
