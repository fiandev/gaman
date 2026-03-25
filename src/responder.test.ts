import { describe, expect, it } from 'bun:test';
import { buildResponse } from './responder';

describe('Responder', () => {
	it('should create 200 OK response', async () => {
		const res = buildResponse({ id: 1 }).ok();
		expect(res.status).toBe(200);
		
		expect(res.headers.get('content-type')).toBe('application/json;charset=utf-8');
		const body = await res.json();
		expect(body).toEqual({ id: 1 });
	});

	it('should create 201 Created response', async () => {
		const res = buildResponse('success').created();
		expect(res.status).toBe(201);
		expect(res.headers.get('content-type')).toBe('text/plain');
		const body = await res.text();
		expect(body).toBe('success');
	});

	it('should create 204 No Content response', async () => {
		const res = buildResponse().noContent();
		expect(res.status).toBe(204);
		const body = await res.text();
		expect(body).toBe('');
	});

	it('should create HTML response if data is HTML string', async () => {
		const res = buildResponse('<h1>Hello</h1>').ok();
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toBe('text/html');
		const body = await res.text();
		expect(body).toBe('<h1>Hello</h1>');
	});

	it('should create 404 Not Found response', async () => {
		const res = buildResponse().notFound('Item missing');
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toEqual({ message: 'Item missing' });
	});

	it('should create 400 Bad Request with data and message', async () => {
		const res = buildResponse({ field: 'error' }).badRequest('Invalid input');
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toEqual({ message: 'Invalid input', data: { field: 'error' } });
	});

	it('should create 500 Internal Server Error response', async () => {
		const res = buildResponse().error();
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body).toEqual({ message: 'Internal Server Error' });
	});
});
