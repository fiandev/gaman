import type { MigrationBuilder } from '../migration';

export function composeMigration(handlers: {
	up: (m: MigrationBuilder) => Promise<void> | void;
	down: (m: MigrationBuilder) => Promise<void> | void;
}) {
	return handlers;
}