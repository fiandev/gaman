import type { ExceptionHandler, MiddlewareHandler, Router } from '../compose';
import {
	IS_EXCEPTION_HANDLER,
	IS_GAMAN_RESPONSE_BUILDER,
	IS_MIDDLEWARE_HANDLER,
	IS_COMPOSE_ROUTER,
	IS_ROUTES,
	IS_GAMAN_RESPONSE_VIEW,
} from '../contants';
import type { GamanResponseBuilder, GamanResponseView, Routes } from '../types';

export function isMiddlewareHandler(v: any): v is MiddlewareHandler {
	return v[IS_MIDDLEWARE_HANDLER] as boolean;
}

export function isExceptionHandler(v: any): v is ExceptionHandler {
	return v[IS_EXCEPTION_HANDLER] as boolean;
}

export function isComposeRouter(v: any): v is Router {
	return v[IS_COMPOSE_ROUTER] as boolean;
}

export function isRoutes(v: any): v is Routes {
	return v[IS_ROUTES] as boolean;
}

export function isGamanResponseBuilder(v: any): v is GamanResponseBuilder {
	return v[IS_GAMAN_RESPONSE_BUILDER] as boolean;
}

export function isResponseView(v: any): v is GamanResponseView {
	return v[IS_GAMAN_RESPONSE_VIEW] as boolean;
}
