import { column, ColumnBuilder } from '../column-builder';
import { RelationBuilder } from '../relation-builder';

export type SchemaDefinition = Record<string, ColumnBuilder>;

export function composeSchema<T extends SchemaDefinition>(
	name: string,
	fields: (c: typeof column) => T,
	relations?: (r: RelationBuilder<T['infer']>) => any,
) {
	return {
		name,
		fields: fields(column),
		relations: relations?.(new RelationBuilder<T['infer']>(name)),
		//! Magic: Mengambil tipe data asli dari tiap ColumnBuilder
		infer: {} as {
			[K in keyof T]: T[K]['_type'];
		},
	};
}