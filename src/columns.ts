import { ColumnBuilder, TableBuilder } from 'knex';
import { COLUMN_META } from './types';

export type SchemaConfig = {
	fk?: boolean;
	serialize?: (raw: any) => any;
	deserialize?: (serialized: any) => any;
	columnType?: keyof TableBuilder;
	columnBuilder?: (
		name: string,
		config: ColumnConfig<boolean>,
		tableBuilder: TableBuilder,
	) => ColumnBuilder;
};

export type ColumnConfig<Nullable extends boolean> = (Nullable extends true
	? {
			nullable: true;
	  }
	: {
			nullable?: false;
	  }) & {
	primaryKey?: boolean;
	unique?: boolean;
};

export type ColumnMeta = {
	config: ColumnConfig<boolean>;
	schemaConfig: SchemaConfig;
};

export type ColumnResult = {
	[COLUMN_META]: ColumnMeta;
};

const ColumnType: unique symbol = Symbol('fewer/type');
export type Column<T> =
	| T
	| (T & {
			__type__: T;
	  });

export function column<Type, Nullable extends boolean = false>(
	schemaConfig?: SchemaConfig,
	config?: ColumnConfig<Nullable>,
): Column<Nullable extends true ? Type : Type | undefined> {
	// @ts-ignore: We intentionally violate the return type definition here because we depend on the proxy to extract the true value.
	return {
		[COLUMN_META]: {
			config,
			schemaConfig,
		},
	};
}

export function createColumnType<T>(schemaConfig: SchemaConfig) {
	return function <U extends boolean>(config: ColumnConfig<U> = {}) {
		return column<T, U>(schemaConfig, config);
	};
}
