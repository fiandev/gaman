import './global';

import { isExceptionHandler, isMiddlewareHandler, isRoutes } from './utils/is';
import { createContext } from './context';
import { Responder, ViewResponse } from './responder';
import { Logger } from './utils/logger';
import { Michi } from '@gaman/michi';
import type {
	Context,
	GamanServerConfig,
	HttpServerConfig,
	RequestHandler,
	RouteMetadata,
	Routes,
} from './types';
import type { ExceptionHandler, MiddlewareHandler } from './compose/index.ts';

export class Gaman {
	private michi = new Michi<RouteMetadata>();
	private globalMiddlewares: MiddlewareHandler[] = [];
	private globalExceptionHandler: ExceptionHandler | null = null;


	/**
	 * @ID
	 * Menangani class Response sebelum dikirim ke client
	 * GamanJS akan memakai class Responder sendiri untuk membuat response itu menjadi sederhada, seperti: Res.json Res.text dll
	 *
	 * @param result
	 * @param ctx
	 * @returns
	 */
	private async handleResponse(
		result: any,
		ctx: Context,
		exceptionHandler?: ExceptionHandler

	): Promise<Response> {
		let finalResponse: Response | undefined;
		try {
			if (result instanceof Response) {
				finalResponse = result;
			} else if (result instanceof ViewResponse) {
				// Resolve view if registered, otherwise 500
				finalResponse = new Response(`View rendering not implemented natively yet. View: ${result.getName()}`, { status: 500 });
			} else if (typeof result === 'object' && result !== null && !Buffer.isBuffer(result)) {
				finalResponse = Responder.send(result);
			} else if (result === undefined) {
				finalResponse = new Response(undefined, { status: 404 });
			} else {
				finalResponse = Responder.text(String(result));
			}

			if (ctx && typeof (ctx.headers as any).getSetHeaders === 'function') {
				for (const [key, value] of (ctx.headers as any).getSetHeaders()) {
					if (value) {
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

			// Logger.setStatus(finalResponse.status);
		} catch (err: any) {
			const handler =
				exceptionHandler || this.globalExceptionHandler;

			if (handler) {
				try {
					const exceptionRes = await handler(err, ctx);
					finalResponse = await this.handleResponse(exceptionRes, ctx);
					return finalResponse;
				} catch (fatal) {
					finalResponse = new Response('Fatal Server Error', { status: 500 });
					return finalResponse;
				}
			}

			console.error(err);
			finalResponse = await this.handleResponse(
				new Response('Internal Server Error', { status: 500 }),
				ctx,
			);
		} finally {
			// if (Logger.shouldLog('info')) {
			// 	if (!IGNORED_LOG_FOR_PATH_REGEX.test(ctx?.path || '/') && startTime) {
			// 		const endTime = performance.now();
			// 		const statusColor = Logger.getStatusColor(finalResponse ? finalResponse.status : 500);
			// 		const statusText = Logger.getStatusText(finalResponse ? finalResponse.status : 500);
			// 		const statusStr = finalResponse ? finalResponse.status : 500;
			// 		Logger.info(
			// 			`§8[§6${ctx?.request.id}§8] §8[§d${ctx?.request.method}§8] §f${ctx?.path || '/'} §8[${statusColor}${statusStr} ${statusText}§8] §rRequest processed in §a(${(endTime - startTime).toFixed(1)}ms)§r`,
			// 		);
			// 	}
			// }
		}
		return finalResponse;
	}

	private async dispatch(ctx: Context, pipeline: any[]): Promise<Response> {
		let idx = 0;
		let handlers: Array<MiddlewareHandler> | Array<RequestHandler> = pipeline;;
		let hasFindedRouter = false;
		const next = async () => {
			let fn = handlers[idx++];

			/**
			 * ? jika next nya kosong dan `hasFindedRouter` juga false maka saatnya nyari route
			 * ? Karna sebelumnya kan jalanin `Global Hook Middlewares`
			 */
			if (!fn && !hasFindedRouter) {
				hasFindedRouter = true;
				const match = this.michi.find(ctx.request.method, ctx.path);
				if (!match) return new Response(undefined, { status: 404 });

				// ? change handlers to route pipeline
				ctx.params = match.params;
				handlers = match.data.pipeline;
				idx = 0;
				fn = handlers[idx++];
			}

			if (!fn) return new Response(undefined, { status: 404 });
			return await fn(ctx, next);
		};
		return await next();
	}

	/**
	 * Internal logic to start the Bun HTTP server
	 * Handles both shorthand (number) and full configuration objects.
	 */
	private listenHttp(http: number | HttpServerConfig) {
		const isNumber = typeof http === 'number';
		const port = isNumber ? http : http.port;
		const hostname = isNumber ? 'localhost' : http.host || 'localhost';
		const maxRequestBodySize = isNumber ? undefined : http.maxRequestBodySize;
		const development = isNumber ? undefined : http.development;
		const reusePort = isNumber ? undefined : http.reusePort;

		const fetch = async (req: Request) => {
			// const startTime = performance.now();

			/** mini parse pathname */
			const urlStr = req.url;
			const pathStart = urlStr.indexOf('/', 8);
			const pathEnd = urlStr.indexOf('?', pathStart);
			const pathname = urlStr.substring(
				pathStart,
				pathEnd === -1 ? undefined : pathEnd,
			);
			const ctx = createContext(req, pathname);

			const res = await this.dispatch(ctx, this.globalMiddlewares);

			return await this.handleResponse(res, ctx, this.globalExceptionHandler ?? undefined);
		}
		Bun.serve({
			port,
			hostname,
			maxRequestBodySize,
			development,
			reusePort,
			fetch,
		});
	}


	public mount(s: ExceptionHandler | MiddlewareHandler | Routes) {
		if (isExceptionHandler(s)) this.globalExceptionHandler = s;
		if (isMiddlewareHandler(s)) {
			this.globalMiddlewares.push(s);
		}
		if (isRoutes(s)) {
			// * register ke michi
			for (const rot of s) {
				for (const method of rot.methods) {
					if (rot.handler !== null) {
						this.michi.add(method, rot.path, {
							id: `${method}:${rot.path}`,
							exceptionHandler: rot.exceptionHandler,
							pipeline: rot.pipes,
						});
					}
				}
			}
		}
	}

	public mountServer(config?: GamanServerConfig) {
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
}
