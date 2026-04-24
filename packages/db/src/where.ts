import type { SelectQueryBuilder } from 'kysely';

export class Where<T extends Record<string, any>> {
	constructor(private qb: SelectQueryBuilder<any, any, any>) {}

	/**
	 * @ID Tambah kondisi where.
	 * @EN Adds where condition.
	 */
	where(
		column: keyof T,
		op: any,
		value: any
	) {
		this.qb = this.qb.where(column as string, op, value);
		return this;
	}

	/**
	 * @ID Sorting data (type-safe column).
	 * @EN Orders query result (type-safe column).
	 */
	orderBy(
		column: keyof T,
		direction: 'asc' | 'desc' = 'asc'
	) {
		this.qb = this.qb.orderBy(column as string, direction);
		return this;
	}

	/**
	 * @ID Batasi jumlah data.
	 * @EN Limits query result.
	 */
	limit(n: number) {
		this.qb = this.qb.limit(n);
		return this;
	}

	/**
	 * @ID Offset data.
	 * @EN Sets query offset.
	 */
	offset(n: number) {
		this.qb = this.qb.offset(n);
		return this;
	}

	/**
	 * @ID Mengambil semua hasil query.
	 * @EN Executes query and returns all results.
	 */
	async get(): Promise<T[]> {
		return await this.qb.selectAll().execute();
	}

	/**
	 * @ID Mengambil satu data pertama.
	 * @EN Executes query and returns first result.
	 */
	async first(): Promise<T | undefined> {
		return await this.qb.selectAll().executeTakeFirst();
	}

	/**
	 * @ID Pagination query.
	 * @EN Paginate query results.
	 */
	async paginate(page: number = 1, limit: number = 15) {
		const offset = (page - 1) * limit;

		const [data, totalResult] = await Promise.all([
			this.qb.selectAll().limit(limit).offset(offset).execute(),
			this.qb
				.clearSelect()
				.select((eb: any) => eb.fn.countAll().as('total'))
				.executeTakeFirst(),
		]);

		const total = Number((totalResult as any)?.total || 0);

		return {
			data,
			meta: {
				total,
				page,
				limit,
				lastPage: Math.ceil(total / limit),
			},
		};
	}
}