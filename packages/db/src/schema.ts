import { type ColumnBuilder } from './blueprint';

export type SchemaDefinition = Record<string, ColumnBuilder>;

export function composeSchema<T extends SchemaDefinition>(
	name: string,
	fields: T,
) {
	return {
		name,
		fields,
		//! Magic: Mengambil tipe data asli dari tiap ColumnBuilder
		infer: {} as {
			[K in keyof T]: T[K]['_type'];
		},
	};
}
