import { IS_MIDDLEWARE, IS_MIDDLEWARE_HANDLER } from '../contants';
import { Priority } from '../enums/priority.enum';
import type {
	DefaultMiddlewareOptions,
	Middleware,
	MiddlewareHandler,
	MiddlewareOptions,
} from './index.types';

export function composeMiddleware<Config = any>(
	mh: MiddlewareHandler,
	defaultConfig?: Config & DefaultMiddlewareOptions,
): (customConfig?: Config & DefaultMiddlewareOptions) => Middleware {
	const factory = (
		customConfig?: Config & DefaultMiddlewareOptions,
	): Middleware => {
		const handler: MiddlewareHandler = async (ctx, next) => {
			return await mh(ctx, next);
		};
		const config = {
			...defaultConfig,
			...customConfig,
		};
		const useable_config: MiddlewareOptions = {
			priority:
				config.priority === undefined ? Priority.NORMAL : config.priority,
			includes: [],
			excludes: [],
		};

		// ? add match includes
		for (const path of config.includes || []) {
			if (typeof path === 'string') {
				useable_config.includes.push({
					path,
					methods: [],
					match: new URLPattern({ pathname: path }),
				});
			} else {
				useable_config.includes.push({
					path: path.path,
					methods: path.method
						? Array.isArray(path.method)
							? path.method.filter((m) => m.toUpperCase())
							: [path.method.toUpperCase()]
						: [],
					match: new URLPattern({ pathname: path.path }),
				});
			}
		}

		// ? add match exclues
		for (const path of config.excludes || []) {
			if (typeof path === 'string') {
				useable_config.excludes.push({
					path,
					methods: [],
					match: new URLPattern({ pathname: path }),
				});
			} else {
				useable_config.excludes.push({
					path: path.path,
					methods: path.method
						? Array.isArray(path.method)
							? path.method.filter((m) => m.toUpperCase())
							: [path.method.toUpperCase()]
						: [],
					match: new URLPattern({ pathname: path.path }),
				});
			}
		}

		Object.defineProperty(handler, IS_MIDDLEWARE_HANDLER, {
			value: true,
			writable: false,
			enumerable: false,
		});

		const middleware = {
			handler,
			config: useable_config,
		};
		Object.defineProperty(middleware, IS_MIDDLEWARE, {
			value: true,
			writable: false,
			enumerable: false,
		});
		return middleware;
	};
	return factory;
}
