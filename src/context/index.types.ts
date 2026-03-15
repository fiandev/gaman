import type { CookieMap } from 'bun';
import type { FormData } from './formdata';
import type { GamanHeader } from './headers';
import type { FormDataFile } from './formdata/file';

/* -------------------------------------------------------------------------- */
/*                                   Handler                                  */
/* -------------------------------------------------------------------------- */
export type RequestHandler<CTX extends Gaman.Context = UniversalContext> = (
	c: CTX,
) => any | Promise<any>;

/* -------------------------------------------------------------------------- */
/*                                   Router                                   */
/* -------------------------------------------------------------------------- */

export type QueryValue = any | any[];
export type Query = ((name: string) => QueryValue) & Record<string, QueryValue>;

/**
 * Represents an HTTP request in the GamanJS framework.
 */
export interface Requester {
	/**
	 * Request Id fot debugging
	 */
	id: string;
	/**
	 * HTTP method (e.g., GET, POST, PUT, DELETE).
	 */
	method: string;

	/**
	 * Full request URL including query string and host (e.g., "http://localhost/home?search=test").
	 */
	url: string;

	/**
	 * Pathname portion of the URL (e.g., "/home/user"), excludes query string and host.
	 */
	pathname: string;

	/**
	 * An instance of GamanHeader for easier and normalized access to request headers.
	 */
	headers: GamanHeader;

	/**
	 * Get the value of a specific header (case-insensitive).
	 *
	 * @param key - The header name (e.g., "Content-Type")
	 *
	 * @returns The value of the specified header or null if not present.
	 */
	header: (key: string) => string | null;

	/**
	 * Get a single route parameter by name.
	 *
	 * For example, in route "/user/:id", `param("id")` would return the dynamic value.
	 *
	 * @param name - The name of the route parameter.
	 */
	param: (name: string) => any;

	/**
	 * All route parameters extracted from the dynamic route.
	 *
	 * For example, "/post/:postId/comment/:commentId" => { postId: "123", commentId: "456" }
	 */
	params: Record<string, any>;

	/**
	 * Query parameters parsed from the URL.
	 *
	 * For example, "/search?q=test&page=2" => { q: "test", page: "2" }
	 */
	query: Query;

	/**
	 * Returns the raw request body as a Buffer.
	 *
	 * Useful for binary uploads or low-level processing.
	 */
	body: () => Promise<Buffer<ArrayBufferLike>>;

	/**
	 * Reads the request body as plain text.
	 *
	 * Suitable for `Content-Type: text/plain`.
	 */
	text: () => Promise<string>;

	/**
	 * Parses the request body as JSON.
	 *
	 * Suitable for
	 * - `Content-Type: application/json`
	 * - `Content-Type: application/x-www-form-urlencoded`.
	 *
	 * @returns A typed JSON object.
	 */
	json: <T = any>() => Promise<T>;

	/**
	 * Parses the request body as FormData.
	 *
	 * Supports `multipart/form-data` and `application/x-www-form-urlencoded`.
	 */
	formData: () => Promise<FormData>;

	/**
	 * Gets a single string value from form data by name.
	 *
	 * Equivalent to `formData().get(name).asString()`.
	 * @param name - The form field name.
	 */
	input: (name: string) => Promise<string | null>;

	/**
	 * Gets a many string values from form data by name.
	 *
	 * Equivalent to `formData().getAll(name).map(asString)`
	 * @param name - The form field name
	 */
	inputs: (name: string) => Promise<Array<string>>;

	/**
	 * Gets a single file value from form data by name
	 *
	 * Equivalent to `formData().get(name).asFile()`
	 * @param name - The form field name
	 */
	file: (name: string) => Promise<FormDataFile | null>;

	/**
	 * Gets a many file values from form data by name
	 *
	 * Equivalent to `Array<formData().get(name).asFile()>`
	 * @param name - The form field name
	 */
	files: (name: string) => Promise<Array<FormDataFile>>;
}

export type ContextType = 'HTTP' | 'IPC';
export type UniversalContext = ContextHTTP | ContextIPC;

/* -------------------------------------------------------------------------- */
/* Context HTTP                                */
/* -------------------------------------------------------------------------- */
export interface ContextHTTP
	extends
		Pick<
			Requester,
			| 'header'
			| 'headers'
			| 'param'
			| 'params'
			| 'query'
			| 'text'
			| 'json'
			| 'formData'
			| 'input'
			| 'inputs'
			| 'file'
			| 'files'
		>,
		Gaman.Context {
	locals: Gaman.Locals;
	url: URL;
	cookies: CookieMap;
	request: Requester;
	set(k: string, v: any): void;
	get<T = any>(k: string): T;
	has(k: string): boolean;
	delete(k: string): void;
}

/* -------------------------------------------------------------------------- */
/* Context IPC                                 */
/* -------------------------------------------------------------------------- */
export interface ContextIPC extends Gaman.Context {
	/**
	 * Unique request identifier for tracing and debugging purposes.
	 */
	id: string;

	/**
	 * The underlying Bun Socket instance.
	 * Provides low-level access to the connection (e.g., manual termination or metadata).
	 */
	socket: Bun.Socket;

	/**
	 * The resolved route path (e.g., "profile/:id").
	 */
	path: string;

	/**
	 * Dynamic route parameters extracted from the path.
	 * Example: "/user/:id" with path "/user/7" results in { id: "7" }.
	 */
	params: Record<string, any>;

	/**
	 * The raw incoming payload delivered by the client.
	 */
	data: any;

	/**
	 * Utility to retrieve the request payload as a type-safe JSON object.
	 */
	json: <T = any>() => T;

	/**
	 * Transmits data back to the client while keeping the connection alive.
	 * Ideal for streaming responses or partial updates.
	 */
	send: (data: any) => void;

	/**
	 * Sends the final response to the client and closes the connection immediately.
	 */
	reply: (data: any) => void;

	/**
	 * Forcibly terminates the socket connection without sending further data.
	 */
	close: () => void;

	/**
	 * Custom metadata storage for sharing data between middlewares and handlers.
	 * Similar to 'locals' in Express.js.
	 */
	locals: Record<string, any>;
}
