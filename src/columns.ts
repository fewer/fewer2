import { ColumnBuilder, TableBuilder } from 'knex';
import flags from './flags';
import { INTERNAL_TYPES } from './types';

export type SchemaConfig = {
	fk?: boolean;
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
	value: any;
	config: ColumnConfig<boolean>;
	schemaConfig: SchemaConfig;
};

export type ColumnResult = {
	[INTERNAL_TYPES.COLUMN_META]: ColumnMeta;
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
	if (!flags.constructPhase) {
		throw new Error('You attempted to define a column outside of a model.');
	}

	// @ts-ignore: We intentionally violate the return type definition here because we depend on the proxy to extract the true value.
	return {
		[INTERNAL_TYPES.COLUMN_META]: {
			config,
			schemaConfig,
			// TODO: Default values and all of that goodness.
			value: undefined,
		},
	};
}

export function createColumnType<T>(schemaConfig: SchemaConfig) {
	return function <U extends boolean>(config: ColumnConfig<U> = {}) {
		return column<T, U>(schemaConfig, config);
	};
}
