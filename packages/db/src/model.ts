import { Kysely } from 'kysely';
import type { composeSchema } from './compose/schema';
import type { ComparisonOperatorExpression } from 'kysely';
import { getDB } from './create-db';
import { Where } from './where';

export class Model<T extends ReturnType<typeof composeSchema>> {
	/**
	 * @ID Instance database (singleton).
	 * @EN Singleton database instance.
	 */
	public db: Kysely<any> = getDB();

	constructor(public schema: T) {}

	//! init table
	/**
	 * @ID Membuat tabel berdasarkan schema jika belum ada.
	 * @EN Creates table based on schema if it does not exist.
	 */
	async sync() {
		let tableBuilder = this.db.schema
			.createTable(this.schema.name)
			.ifNotExists();

		for (const [colName, colBuilder] of Object.entries(this.schema.fields)) {
			const { config } = colBuilder as any;

			tableBuilder = tableBuilder.addColumn(colName, config.type, (cb) => {
				let res = cb;

				if (config.isPrimary) res = res.primaryKey();
				if (config.isAutoIncrement) res = res.autoIncrement();
				if (config.isUnique) res = res.unique();
				if (!config.nullable) res = res.notNull();
				if (config.defaultValue !== null) {
					res = res.defaultTo(config.defaultValue);
				}

				return res;
			});
		}

		return await tableBuilder.execute();
	}

	/**
	 * @ID Base query builder untuk tabel ini.
	 * @EN Base query builder for this table.
	 */
	query() {
		return this.db.selectFrom(this.schema.name);
	}

	/**
	 * @ID Mengambil semua data dari tabel.
	 * @EN Fetches all records from the table.
	 */
	async all(): Promise<Array<T['infer']>> {
		return await this.query().selectAll().execute();
	}

	/**
	 * @ID Mencari banyak data berdasarkan ID (array).
	 * @EN Finds multiple records by ID (returns array).
	 */
	async find(id: number | string): Promise<Array<T['infer']>> {
		return await this.query()
			.selectAll()
			.where('id' as any, '=', id as any)
			.execute();
	}

	/**
	 * @ID Mencari satu rekaman berdasarkan nama kolom dan nilai tertentu.
	 * @EN Finds multiple record by a specific column and value.
	 */
	async findBy(
		column: keyof T['infer'],
		value: any,
	): Promise<Array<T['infer']>> {
		return await this.query()
			.selectAll()
			.where(column as any, '=', value)
			.execute();
	}

	/**
	 * @ID Mencari satu data berdasarkan ID.
	 * @EN Finds a single record by ID.
	 */
	async findOne(id: number | string): Promise<T['infer'] | undefined> {
		return await this.query()
			.selectAll()
			.where('id' as any, '=', id as any)
			.executeTakeFirst();
	}

	/**
	 * @ID Mencari satu data berdasarkan kolom.
	 * @EN Finds a single record by column.
	 */
	async findOneBy(
		column: keyof T['infer'],
		value: any,
	): Promise<T['infer'] | undefined> {
		return await this.query()
			.selectAll()
			.where(column as any, '=', value)
			.executeTakeFirst();
	}

	/**
	 * @ID Query filter berbasis kondisi (return query builder).
	 * @EN Conditional query filter (returns query builder).
	 */
	where(
		column: keyof T['infer'],
		op: ComparisonOperatorExpression,
		value: any,
	) {
		const qb = this.query().where(column as any, op, value);
		return new Where<T['infer']>(qb as any);
	}

	/**
	 * @ID Membuat data baru ke tabel.
	 * @EN Inserts new record into table.
	 */
	async create(data: Partial<T['infer']>) {
		return await this.db
			.insertInto(this.schema.name)
			.values(data as any)
			.executeTakeFirstOrThrow();
	}

	/**
	 * @ID Memperbarui data berdasarkan ID unik.
	 * @EN Updates a record based on its unique ID.
	 */
	async update(id: number | string, data: Partial<T['infer']>) {
		return await this.db
			.updateTable(this.schema.name)
			.set(data as any)
			.where('id' as any, '=', id as any)
			.execute();	
	}

	/**
	 * @ID Menghapus rekaman berdasarkan ID unik.
	 * @EN Deletes a record based on its unique ID.
	 */
	async delete(id: number | string) {
		return await this.db
			.deleteFrom(this.schema.name)
			.where('id' as any, '=', id as any)
			.execute();
	}

	/**
	 * @ID Menghitung total jumlah rekaman dalam tabel.
	 * @EN Counts the total number of records in the table.
	 */
	async count() {
		const result = await this.query()
			.select((eb: any) => eb.fn.countAll().as('total'))
			.executeTakeFirst();

		return Number((result as any)?.total || 0);
	}

	/**
	 * @ID Mengambil rekaman terbaru berdasarkan urutan kolom tertentu.
	 * @EN Retrieves the latest record ordered by a specific column.
	 */
	async latest(column: keyof T['infer'] = 'created_at' as any) {
		return await this.query()
			.selectAll()
			.orderBy(column as any, 'desc')
			.executeTakeFirst();
	}

	/**
	 * @ID Mengambil data dengan sistem paginasi.
	 * @EN Retrieves data using a pagination system.
	 */
	async paginate(page: number = 1, limit: number = 15) {
		const offset = (page - 1) * limit;

		const [data, total] = await Promise.all([
			this.query().selectAll().limit(limit).offset(offset).execute(),
			this.count(),
		]);

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

	/**
	 * @ID Mengembalikan instance Kysely utama untuk akses database tingkat rendah.
	 * @EN Returns the raw Kysely instance for low-level database access.
	 */
	getRaw() {
		return this.db;
	}

	/**
	 * @ID Menghapus semua data di dalam tabel (bersihkan tabel).
	 * @EN Deletes all data within the table (clears the table).
	 */
	async truncate() {
		return await this.db.deleteFrom(this.schema.name).execute();
	}
}
