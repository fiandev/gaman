import './global.ts';

import { isMiddleware } from './utils/is';
import { createContext } from './context';
import { Priority } from './enums';
import { insertAndSort } from './utils/priority';
import { Responder } from './responder';
import { IGNORED_LOG_FOR_PATH_REGEX } from './contants';
import { Logger } from './utils/logger';
import { Michi } from '@gaman/michi';
import type { Middleware, MiddlewareHandler } from './compose/middleware';
import { composeRouter } from './compose/router';
import type {
	Context,
	GamanServerConfig,
	HttpServerConfig,
	RequestHandler,
	Route,
	Routes,
} from './types';

export class Gaman {
	private michi = new Michi<String>();
	private routes: Map<String, Route> = new Map();

	private middlewares: Middleware[] = [];
	private monitorMiddlewares: Array<Middleware> = [];

	constructor() {}

	private findIpcRoutes() {
		const routers: Route[] = [];
		// for (const map of staticRoutes.values()) {
		// 	routers.push(...map.values().filter((r) => r.contextType === 'IPC'));
		// }
		return routers;
	}

	/**
	 * @ID
	 * Menangani class Response sebelum dikirim ke client
	 * GamanJS akan memakai class Responder sendiri untuk membuat response itu menjadi sederhada, seperti: Res.json Res.text dll
	 *
	 * @param responder
	 * @param ctx
	 * @returns
	 */
	private async handleResponse(
		responder: Responder | undefined,
		ctx?: Context,
	) {
		let finalResponse = responder
			? new Response(responder.getFinalBody(), {
					headers: responder.headers.toRecord(),
					status: responder.statusCode,
					statusText: responder.statusTextMessage,
				})
			: new Response('Not Found', { status: 404 });

		if (ctx) {
			for (const [key, [value, isSet]] of ctx.headers.entries()) {
				if (isSet && value) {
					finalResponse.headers.set(
						key,
						Array.isArray(value) ? value.join(', ') : value,
					);
				}
			}

			const cookieHeaders = ctx.cookies.toSetCookieHeaders();
			for (const cookieStr of cookieHeaders) {
				finalResponse.headers.append('Set-Cookie', cookieStr);
			}
		}

		finalResponse.headers.set('X-Powered-By', 'GamanJS');

		Logger.setStatus(finalResponse.status);
		return finalResponse;
	}

	/**
	 * Internal logic to start the Bun HTTP server
	 * Handles both shorthand (number) and full configuration objects.
	 */
	private listenHttp(http: number | HttpServerConfig) {
		// 1. Normalize configuration
		const isNumber = typeof http === 'number';
		const port = isNumber ? http : http.port;
		const hostname = isNumber ? 'localhost' : http.host || 'localhost';
		const maxRequestBodySize = isNumber ? undefined : http.maxRequestBodySize;
		const development = isNumber ? undefined : http.development;
		const reusePort = isNumber ? undefined : http.reusePort;

		Bun.serve({
			port,
			hostname,
			maxRequestBodySize,
			development,
			reusePort,
			fetch: async (req) => {
				const url = new URL(req.url);
				const method = req.method.toUpperCase();
				const startTime = performance.now();
				const ctx = await createContext(req);

				//! add request id to header
				ctx.headers.set('X-Request-ID', ctx.request.id);

				// ? Build Pipeline: monitor middlewares
				const pipeline: Array<MiddlewareHandler | RequestHandler> =
					this.monitorMiddlewares.map((mw) => mw.handler);
				Logger.setRequestId(ctx.request.id);
				Logger.setRoute(ctx.request.pathname || '/');
				Logger.setMethod(method);

				let route: Route | undefined;
				try {
					let index = -1;
					let done_find_route = false;
					const next = async (i: number): Promise<Responder> => {
						if (i <= index) {
							throw new Error('next() called multiple times');
						}
						index = i;

						let fn = pipeline[i];

						/**
						 * ? jika next nya kosong dan `done_find_route` juga false maka saatnya nyari route
						 * ? Karna sebelumnya kan jalanin `MONITOR_MIDDLEWARES`
						 */
						if (!fn && !done_find_route) {
							done_find_route = true;
							// ? mencari route yang cocok
							const result = this.michi.find(method, url.pathname);
							if (result === null) {
								return new Responder(undefined, { status: 404 });
							}
							const r = this.routes.get(result.data);

							if (!r?.handler) {
								return new Responder(undefined, { status: 404 });
							}

							route = r; // ! set route
							ctx.params = result.params; // ! set params

							// **** MIDDLEWARE ****
							// ? filter global middlewares dari options kek includes: [] dan excludes: []
							const activeMiddlewares = this.middlewares.map((m) => m.handler);

							pipeline.push(
								...activeMiddlewares, // ? middleware harus paling awal
								// ...interceptorData.getInterceptors().map((i) => i.handler),
								...r.pipes,
							);

							fn = pipeline[i]; // ! set ulang
						}

						if (!fn) return new Responder(undefined, { status: 404 });
						return await fn(ctx as any, () => next(i + 1));
					};

					const result = await next(0);
					return await this.handleResponse(result as Responder, ctx);
				} catch (error: any) {
					// ? init context on http exception
					// if (error instanceof HttpException) {
					// 	Object.defineProperty(error, 'context', {
					// 		value: ctx,
					// 		writable: true,
					// 		configurable: true,
					// 		enumerable: true,
					// 	});
					// }

					// for (const runExceptionHandler of [
					// 	...exceptionData.getExceptionHandlers(),
					// 	...(route?.exceptions || []),
					// ]) {
					// 	// ? run exception handler
					// 	const response = await runExceptionHandler(error);

					// 	if (response instanceof Response) {
					// 		// ? if exception handler have a response like: Res.json or else
					// 		// ? so handleResponse
					// 		return await this.handleResponse(response, res, ctx);
					// 	}
					// }

					/**
					 * ? Jika error adalah dari interceptor
					 * ? maka akan di kasih default response seperti berikut
					 * ? bisa di rewrite tinggal buat `composeExceptionHandler` aja
					 */
					// if (error instanceof InterceptorException) {
					// 	return await this.handleResponse(
					// 		Res.json(
					// 			{
					// 				statusCode: error.statusCode,
					// 				message: error.message,
					// 			},
					// 			error.statusCode,
					// 		),
					// 		res,
					// 		ctx,
					// 	);
					// }

					Logger.error(error.message);
					console.error(error.details);
					return await this.handleResponse(
						new Responder(undefined, { status: 500 }),
						ctx,
					);
				} finally {
					const endTime = performance.now();
					if (
						Logger.response.route &&
						Logger.response.status &&
						Logger.response.method &&
						!IGNORED_LOG_FOR_PATH_REGEX.test(Logger.response.route)
					) {
						Logger.log(
							`Request processed in §a(${(endTime - startTime).toFixed(1)}ms)§r`,
						);
					}
					Logger.setRoute('');
					Logger.setMethod('');
					Logger.setStatus(null);
				}
			},
		});
	}

	// private listenIPC() {
	// 	for (const route of this.findIpcRoutes()) {
	// 		// const ipc = route.options ?? {};
	// 		const ipc = { unlink: false, allowHalfOpen: false };

	// 		const unix = route.path;
	// 		const unlink = ipc.unlink ?? true;
	// 		const allowHalfOpen = ipc.allowHalfOpen;

	// 		// remove unix file if exists
	// 		if (unlink) {
	// 			const fs = require('node:fs');
	// 			if (fs.existsSync(unix)) fs.unlinkSync(unix);
	// 		}

	// 		// ? redirectable
	// 		const _path = require('node:path');
	// 		const absolutePath = _path.resolve(unix);

	// 		Logger.info(`§bIPC§r   : Socket active at §e${absolutePath}§r`);

	// 		const socketStorage = new Map();

	// 		Bun.listen({
	// 			unix,
	// 			allowHalfOpen,
	// 			socket: {
	// 				data: async (socket, rawData) => {
	// 					const ctx: ContextIPC = {
	// 						path: unix,
	// 						socket,
	// 						unix,
	// 						stage: 'DATA',
	// 						json: () => {
	// 							const messages = GamanPacker.parseIPCMessage(
	// 								socket,
	// 								rawData,
	// 								socketStorage,
	// 							);

	// 							for (const [type, payload] of messages) {
	// 								if (type === 0) return payload;
	// 								try {
	// 									return JSON.parse(payload);
	// 								} catch (error) {}
	// 							}
	// 							return undefined;
	// 						},
	// 						text: () => {
	// 							const messages = GamanPacker.parseIPCMessage(
	// 								socket,
	// 								rawData,
	// 								socketStorage,
	// 							);

	// 							for (const [type, payload] of messages) {
	// 								if (type === 1) return payload;
	// 							}
	// 							return rawData.toString('utf-8');
	// 						},
	// 						body: () => rawData,
	// 						send(data, byteLength, byteOffset) {
	// 							const response = GamanPacker.encode(data);
	// 							socket.write(response, byteOffset, byteLength);
	// 						},
	// 						close: () => socket.end(),
	// 					};

	// 					if (!route.handler) return;
	// 					const result = await route.handler(ctx as any);

	// 					if (result !== undefined) {
	// 						ctx.send(result);
	// 					}
	// 				},

	// 				open: async (socket) => {
	// 					const ctx: ContextIPC = {
	// 						path: unix,
	// 						socket,
	// 						unix,
	// 						stage: 'OPEN',
	// 						json: () => undefined,
	// 						text: () => '',
	// 						body: () => Buffer.from([]),
	// 						send(data, byteLength, byteOffset) {
	// 							const response = GamanPacker.encode(data);
	// 							socket.write(response, byteOffset, byteLength);
	// 						},
	// 						close: () => socket.end(),
	// 					};

	// 					if (!route.handler) return;
	// 					const result = await route.handler(ctx as any);

	// 					if (result !== undefined) {
	// 						ctx.send(result);
	// 					}
	// 				},

	// 				close: async (socket) => {
	// 					const ctx: ContextIPC = {
	// 						path: unix,
	// 						socket,
	// 						unix,
	// 						stage: 'CLOSE',
	// 						json: () => undefined,
	// 						text: () => '',
	// 						body: () => Buffer.from([]),
	// 						send(data, byteLength, byteOffset) {
	// 							const response = GamanPacker.encode(data);
	// 							socket.write(response, byteOffset, byteLength);
	// 						},
	// 						close: () => socket.end(),
	// 					};

	// 					if (!route.handler) return;
	// 					const result = await route.handler(ctx as any);

	// 					if (result !== undefined) {
	// 						ctx.send(result);
	// 					}
	// 					socketStorage.delete(socket);
	// 				},
	// 			},
	// 		});
	// 	}
	// }

	// ================= PUBLIC API =================

	public mountRouter(rts: Routes) {
		// * register ke michi
		for (const rot of rts) {
			for (const method of rot.methods) {
				if (rot.handler !== null) {
					this.michi.add(method, rot.path, `${method}:${rot.path}`);
					this.routes.set(`${method}:${rot.path}`, rot);
				}
			}
		}
	}

	public mountMiddleware(...mws: Middleware[]) {
		for (const mw of mws) {
			if (!isMiddleware(mw)) {
				throw new Error('Please use composeMiddleware');
			}
			if (mw.config.priority === Priority.MONITOR) {
				this.monitorMiddlewares.push(mw);
			} else {
				insertAndSort(this.middlewares, mw, (mw) => mw.config.priority);
			}
		}
	}

	public mountServer(config?: GamanServerConfig) {
		const useable_routes = composeRouter((r) => {
			this.getRoutes().forEach((route) => r.getRoutes().push(route));
		});
		this.mountRouter(useable_routes);

		Logger.log(`§l§dGamanJS Framework v2 §r`);
		Logger.info('§o§7The Universal Transport Layer for Your Logic.');
		Logger.log(`§8 —————————————————————————————————————— §r`);

		if (typeof config?.http !== 'undefined') {
			const h =
				typeof config.http === 'number'
					? { port: config.http }
					: (config.http as HttpServerConfig);

			const host = h.host || 'localhost';
			const port = h.port || 3431;

			Logger.info(`§6HTTP§r  : Listening at §ahttp://${host}:${port}§r`);
			this.listenHttp(config.http);
		}
		// this.listenIPC();

		Logger.log(`§8 —————————————————————————————————————— §r`);
		Logger.log(`§rOrchestration complete. Ready for requests.`);
	}

	public getRoutes(): Routes {
		return [];
	}
}
