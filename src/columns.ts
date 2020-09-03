import { ColumnBuilder, TableBuilder } from 'knex';
import flags from './flags';
import { INTERNAL_TYPES } from './types';

// TODO: Should we isolate internal config (columnBuilder) from external config?
export type ColumnConfig<Nullable extends boolean> = (Nullable extends true
	? {
			nullable: true;
	  }
	: {
			nullable?: false;
	  }) & {
	columnBuilder?: (
		name: string,
		config: ColumnConfig<boolean>,
		tableBuilder: TableBuilder,
	) => ColumnBuilder;
	primaryKey?: boolean;
	unique?: boolean;
};

export type ColumnMeta = {
	[INTERNAL_TYPES.COLUMN_META]: {
		type: string;
		value: any;
		config?: ColumnConfig<boolean>;
	};
};

const ColumnType: unique symbol = Symbol('fewer/type');
export type Column<T> =
	| T
	| (T & {
			__type__: T;
	  });

export function column<Type, Nullable extends boolean = false>(
	type: string,
	config?: ColumnConfig<Nullable>,
): Column<Nullable extends true ? Type : Type | undefined> {
	if (!flags.constructPhase) {
		throw new Error('You attempted to define a column outside of a model.');
	}

	// @ts-ignore: We intentionally violate the return type definition here because we depend on the proxy to extract the true value.
	return {
		[INTERNAL_TYPES.COLUMN_META]: {
			type,
			config,
			// TODO: Default values and all of that goodness.
			value: undefined,
		},
	};
}

export function createColumnType<T>(
	typeName: string,
	baseConfig?: ColumnConfig<any>,
) {
	return function <U extends boolean>(config?: ColumnConfig<U>) {
		return column<T, U>(typeName, { ...baseConfig, ...config });
	};
}
