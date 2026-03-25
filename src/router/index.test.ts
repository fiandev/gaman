import { describe, expect, it } from 'bun:test';
import { Router } from './index';

describe('Router Builder', () => {
	it('should add simple routes with correct methods', () => {
		const router = Router();
		
		router.get('/health', () => 'ok');
		router.post('/data', () => 'saved');

		const routes = router.getRoutes();
		
		expect(routes.length).toBe(2);
		expect(routes[0]?.methods).toEqual(['GET']);
		expect(routes[0]?.path).toBe('/health');
		
		expect(routes[1]?.methods).toEqual(['POST']);
		expect(routes[1]?.path).toBe('/data');
	});

	it('should support match with multiple methods', () => {
		const router = Router();
		
		router.match(['GET', 'POST'], '/mixed', () => 'mixed');
		const routes = router.getRoutes();

		expect(routes[0]?.methods).toEqual(['GET', 'POST']);
		expect(routes[0]?.path).toBe('/mixed');
	});

	it('should support grouping with prefixes', () => {
		const router = Router('api/v1');
		
		router.group('users', (r) => {
			r.get('/profile', () => 'profile');
			r.post('/create', () => 'create');
		});

		const routes = router.getRoutes();
		
		expect(routes.length).toBe(2);
		expect(routes[0]?.path).toBe('/api/v1/users/profile');
		expect(routes[1]?.path).toBe('/api/v1/users/create');
	});

	it('should chain middlewares', () => {
		const router = Router();
		
		const mw = () => 'middleware';
		
		router.get('/test', () => 'test').middleware(mw as any);
		
		const routes = router.getRoutes();
		expect(routes[0]?.middlewares.length).toBe(1);
		expect(routes[0]?.middlewares[0]).toBe(mw);
	});

	it('should chain middlewares to groups', () => {
		const router = Router();
		const mw = () => 'group_mw';
		
		router.group('v1', (r) => {
			r.get('/a', () => 'a');
			r.get('/b', () => 'b');
		}).middleware(mw as any);

		const routes = router.getRoutes();
		expect(routes[0]?.middlewares.length).toBe(1);
		expect(routes[0]?.middlewares[0]).toBe(mw);
		expect(routes[1]?.middlewares.length).toBe(1);
		expect(routes[1]?.middlewares[0]).toBe(mw);
	});
});
