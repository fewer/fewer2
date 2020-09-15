import { Column, Columns } from './columns';
import { Model } from './model';

export const ALL_FIELDS: unique symbol = Symbol('fewer/all');
export const ASSOCIATION_META: unique symbol = Symbol('fewer/association');
export const COLUMN_META: unique symbol = Symbol('fewer/column');
export const MODEL_CONSTRUCTOR: unique symbol = Symbol('fewer/construct');
export const MODEL_STATIC_META: unique symbol = Symbol('fewer/model_static');
export const MODEL_INSTANCE_META: unique symbol = Symbol(
	'fewer/model_instance',
);

export type CreateSelectionSet<
	Original,
	Additional
> = Original extends typeof ALL_FIELDS ? Additional : Original | Additional;

export type NeverProperties<T> = {
	[K in keyof T]: T[K] extends never ? K : never;
}[keyof T];

export type Subset<Root, Keys> = [Keys] extends [typeof ALL_FIELDS]
	? Root
	: { [P in keyof Root & Keys]: Root[P] };

export type ColumnTypes<
	T extends typeof Model,
	TInstance = InstanceType<T>
> = Subset<TInstance, Columns<T>>;

export type NonColumnTypes<
	T extends typeof Model,
	TInstance = InstanceType<T>
> = Pick<TInstance, Exclude<keyof TInstance, Columns<T>>>;
