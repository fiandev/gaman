import { IS_GAMAN_RESPONSE_BUILDER, IS_GAMAN_RESPONSE_VIEW } from './contants';
import type { GamanResponseBuilder } from './types';
import { isResponseView } from './utils/is';

export const buildResponse = (data?: any): GamanResponseBuilder<any> => {
	const createRes = (status: number, body: any = data) => {
		if (isResponseView(body)) {
			return Object.defineProperty(
				{
					...body,
					status,
				},
				IS_GAMAN_RESPONSE_VIEW,
				{
					value: true,
					writable: false,
					enumerable: false,
				},
			);
		}

		let contentType;

		if (
			typeof body === 'object' &&
			body !== null &&
			!Buffer.isBuffer(body) &&
			!(body instanceof Blob)
		) {
			return Response.json(body, { status });
		} else if (typeof body === 'string') {
			const trimmed = body.trim();
			if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
				return new Response(new TextEncoder().encode(trimmed), {
					status,
					headers: { 'Content-Type': 'text/html' },
				});
			} else {
				return new Response(new TextEncoder().encode(trimmed), {
					status,
					headers: { 'Content-Type': 'text/plain' },
				});
			}
		}

		return new Response(body, {
			status,
			headers: {
				'Content-Type': contentType,
			},
		});
	};

	const res: GamanResponseBuilder<any> = {
		ok: () => createRes(200),
		created: () => createRes(201),
		accepted: () => createRes(202),
		noContent: () => new Response(null, { status: 204 }),
		badRequest: (msg) => createRes(400, msg ? { message: msg, data } : data),
		unauthorized: (msg) => createRes(401, { message: msg || 'Unauthorized' }),
		forbidden: (msg) => createRes(403, { message: msg || 'Forbidden' }),
		notFound: (msg) => createRes(404, { message: msg || 'Not Found' }),
		conflict: (msg) => createRes(409, msg ? { message: msg, data } : data),
		unprocessable: (errs, msg) =>
			createRes(422, {
				message: msg || 'Validation Failed',
				errors: errs || data,
			}),
		tooManyRequests: (msg) =>
			createRes(429, { message: msg || 'Too Many Requests' }),
		error: (msg) => createRes(500, { message: msg || 'Internal Server Error' }),
		notModified: () => createRes(304),
		build: (c) => createRes(c),
	};

	Object.defineProperty(res, IS_GAMAN_RESPONSE_BUILDER, {
		value: true,
		writable: false,
		enumerable: false,
	});
	return res;
};
