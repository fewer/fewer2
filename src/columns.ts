import { ColumnBuilder, TableBuilder } from 'knex';
import { AssociationMeta } from './associations';
import { Model } from './model';
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
	association?: AssociationMeta;
};

export type ColumnResult = {
	[COLUMN_META]: ColumnMeta;
};

const ColumnType: unique symbol = Symbol('fewer/column_type');

type ColumnBrand<T> = {
	[ColumnType]: T;
};

export type Column<T, U = ColumnBrand<T>> = T | (T & U);

type ColumnBrands<T> = {
	[K in keyof T]: T[K] extends Column<infer T, infer U> ? U & false : never;
};

export type Columns<
	T extends typeof Model,
	TInstance = ColumnBrands<InstanceType<T>>
> = Exclude<
	{
		[K in keyof TInstance]: TInstance[K] extends Exclude<
			ColumnBrand<any>,
			false
		>
			? K
			: never;
	}[keyof TInstance],
	undefined
>;

export function foreignKey(associationMeta: AssociationMeta): ColumnMeta {
	return {
		schemaConfig: { fk: true },
		config: {},
		association: associationMeta,
	};
}

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
