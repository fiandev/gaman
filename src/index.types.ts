import type { IPCOptions } from './router/index.types';

export type Metadata = {
	requestId?: string;
	timestamp?: string;
	[key: string]: any;
};

/**
 * App Transportation Mode
 * @example
 * ```ts
 * const gaman = Gaman<HTTP & IPC>();
 *
 * gaman.ipc(...)
 *
 * gaman.get(...)
 * gaman.post(...)
 */
export type HTTP = { _type: 'HTTP' };
export type IPC = { _type: 'IPC' };
export type AppTransportation = HTTP | IPC;

export type RunConfig<T = AppTransportation> = {
	/**
	 * HTTP server configuration.
	 * If a number is provided, it will be used as the port.
	 */
	http?: T extends HTTP ? number | HttpConfig : never;
};

export type HttpConfig = {
	/**
	 * The port number the HTTP swerver will listen on.
	 * @default 3431
	 */
	port: number;

	/**
	 * The hostname or IP address to bind the server to.
	 * Use '0.0.0.0' to accept connections from any network interface.
	 * @default 'localhost'
	 */
	host?: string;

	/**
	 * The maximum size of the request body in bytes.
	 * Useful for preventing large payload attacks.
	 */
	maxRequestBodySize?: number;

	/**
	 * If true, the server will attempt to use the reusePort socket option.
	 * Useful for high-performance load balancing.
	 * @default false
	 */
	reusePort?: boolean;

	/**
	 * Enable development mode.
	 * When true, GamanJS will provide detailed error stacks and verbose logging.
	 * @default false
	 */
	development?: boolean;
};
