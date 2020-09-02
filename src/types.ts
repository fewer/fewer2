import { Column } from './columns';
import { Model } from './model';

const ALL_FIELDS: unique symbol = Symbol('fewer/all');
const ASSOCIATION_META: unique symbol = Symbol('fewer/association');
const COLUMN_META: unique symbol = Symbol('fewer/column');
const MODEL_CONSTRUCTOR: unique symbol = Symbol('fewer/model');

export const INTERNAL_TYPES = {
	ALL_FIELDS,
	ASSOCIATION_META,
	COLUMN_META,
	MODEL_CONSTRUCTOR,
} as const;

export type INTERNAL_TYPES = typeof INTERNAL_TYPES;

export type CreateSelectionSet<
	Original,
	Additional
> = Original extends INTERNAL_TYPES['ALL_FIELDS']
	? Additional
	: Original | Additional;

export type NeverProperties<T> = {
	[K in keyof T]: T[K] extends never ? K : never;
}[keyof T];

export type Subset<Root, Keys> = [Keys] extends [INTERNAL_TYPES['ALL_FIELDS']]
	? Root
	: { [P in keyof Root & Keys]: Root[P] };

export type NonColumnTypes<
	T extends typeof Model,
	TInstance = InstanceType<T>,
	Cols = {
		[K in keyof TInstance]: TInstance[K] extends Column<any>
			? never
			: TInstance[K];
	}
> = Omit<Cols, NeverProperties<Cols>>;

export type ColumnTypes<
	T extends typeof Model,
	TInstance = InstanceType<T>,
	Cols = {
		[K in keyof TInstance]: TInstance[K] extends Column<infer U>
			? U
			: never;
	}
> = Omit<Cols, NeverProperties<Cols>>;
