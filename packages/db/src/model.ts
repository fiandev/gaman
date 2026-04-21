import { Kysely, MysqlDialect, PostgresDialect } from 'kysely';
import { BunSqliteDialect } from 'kysely-bun-sqlite';
import { Database } from 'bun:sqlite';
import type { composeSchema } from './schema';
import type { ComparisonOperatorExpression } from 'kysely';

export class Model<T extends ReturnType<typeof composeSchema>> {
	public db: Kysely<any>;

	constructor(public schema: T) {
		const connection = process.env.DB_CONNECTION || 'sqlite';

		this.db = new Kysely<any>({
			dialect: this.getDialect(connection),
		});
	}

		//! init table
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
				if (config.defaultValue !== null)
					res = res.defaultTo(config.defaultValue);
				return res;
			});
		}

		return await tableBuilder.execute();
	}

	private getDialect(connection: string) {
		const config = {
			host: process.env.DB_HOST || '127.0.0.1',
			port: parseInt(process.env.DB_PORT || '0'),
			database: process.env.DB_DATABASE || 'database.sqlite',
			user: process.env.DB_USERNAME || 'root',
			password: process.env.DB_PASSWORD || '',
		};

		switch (connection.toLowerCase()) {
			case 'postgres':
			case 'pg':
				return new PostgresDialect({
					pool: async () => {
						const { Pool } = await import('pg');
						return new Pool({
							host: config.host,
							port: config.port || 5432,
							database: config.database,
							user: config.user,
							password: config.password,
						});
					},
				});

			case 'mysql':
			case 'mysql2':
				return new MysqlDialect({
					pool: async () => {
						const { createPool } = await import('mysql2');
						return createPool({
							host: config.host,
							port: config.port || 3306,
							database: config.database,
							user: config.user,
							password: config.password,
						});
					},
				});

			case 'sqlite':
			default:
				return new BunSqliteDialect({
					database: new Database(config.database),
				});
		}
	}

	async find(id: number | string) {
		return await this.db
			.selectFrom(this.schema.name)
			.selectAll()
			.where('id', '=', id as any)
			.executeTakeFirst();
	}

	async where(
		column: keyof T['infer'],
		op: ComparisonOperatorExpression,
		value: any,
	) {
		return this.db.selectFrom(this.schema.name).where(column as any, op, value);
	}

	async create(data: Partial<T['infer']>) {
		return await this.db
			.insertInto(this.schema.name)
			.values(data as any)
			.executeTakeFirstOrThrow();
	}

	/**
	 * @ID Mengambil semua data dari tabel.
	 * @EN Fetches all records from the table.
	 */
	async all(): Promise<Array<T['infer']>> {
		return await this.db.selectFrom(this.schema.name).selectAll().execute();
	}

	/**
	 * @ID Mencari satu rekaman berdasarkan nama kolom dan nilai tertentu.
	 * @EN Finds a single record by a specific column and value.
	 */
	async findBy(column: keyof T['infer'], value: any): Promise<T['infer']> {
		return await this.db
			.selectFrom(this.schema.name)
			.selectAll()
			.where(column as any, '=', value)
			.executeTakeFirst() as any;
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
		const result = await this.db
			.selectFrom(this.schema.name)
			.select((eb: any) => eb.fn.countAll().as('total'))
			.executeTakeFirst();

		return Number((result as any)?.total || 0);
	}

	/**
	 * @ID Mengambil rekaman terbaru berdasarkan urutan kolom tertentu.
	 * @EN Retrieves the latest record ordered by a specific column.
	 */
	async latest(column: keyof T['infer'] = 'created_at' as any) {
		return await this.db
			.selectFrom(this.schema.name)
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
			this.db
				.selectFrom(this.schema.name)
				.selectAll()
				.limit(limit)
				.offset(offset)
				.execute(),
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
	 * @ID Mengembalikan instance query builder Kysely untuk kueri kustom.
	 * @EN Returns the Kysely query builder instance for custom queries.
	 */
	query() {
		return this.db.selectFrom(this.schema.name);
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
