import { type ColumnBuilder } from '../column-builder';
import { RelationBuilder } from '../relation-builder';

export type SchemaDefinition = Record<string, ColumnBuilder>;

export function composeSchema<T extends SchemaDefinition>(
	name: string,
	fields: T,
	relations?: (r: RelationBuilder<T>) => any,
) {
	return {
		name,
		fields,
		relations: relations?.(new RelationBuilder(name)),
		//! Magic: Mengambil tipe data asli dari tiap ColumnBuilder
		infer: {} as {
			[K in keyof T]: T[K]['_type'];
		},
	};
}
