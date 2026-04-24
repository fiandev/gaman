export class ColumnBuilder<T = any> {
  public config = {
    type: '' as string,
    nullable: false,
    unsigned: false,
    isPrimary: false,
    isAutoIncrement: false,
    isUnique: false,
    isIndex: false,
    defaultValue: null as any,
  };

  //? Properti bayangan untuk inferensi tipe data TypeScript
  public _type!: T;

  int() { this.config.type = 'integer'; return this as ColumnBuilder<number>; }
  string(len = 255) { this.config.type = `varchar(${len})`; return this as ColumnBuilder<string>; }
  text() { this.config.type = 'text'; return this as ColumnBuilder<string>; }
  timestamp() { this.config.type = 'datetime'; return this as ColumnBuilder<Date | string>; }

  primary() { this.config.isPrimary = true; return this; }
  autoIncrement() { this.config.isAutoIncrement = true; return this; }
  nullable() { this.config.nullable = true; return this as ColumnBuilder<T | null>; }
  unique() { this.config.isUnique = true; return this; }
  default(val: T) { this.config.defaultValue = val; return this; }
}

export const col = {
  id: () => new ColumnBuilder<number>().int().primary().autoIncrement(),
  string: (len?: number) => new ColumnBuilder<string>().string(len),
  int: () => new ColumnBuilder<number>().int(),
  text: () => new ColumnBuilder<string>().text(),
  timestamp: () => new ColumnBuilder<Date>().timestamp(),
};