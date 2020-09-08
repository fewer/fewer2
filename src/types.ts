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

// TODO: This is wrong, and requires so many hacks to get working, but I outlined the basic idea in this playground:
// https://www.typescriptlang.org/play?#code/C4TwDgpgBAwg9gGwK4FsB2AhATgQzQEwB4AVAGigFUA+KAXigG8AoKKAfTdEg4C4piA3C3ZsUEYDl5QAsuJwB1XGEhZC1IQF8mTLtFkTFOZRFXU6jYWIl8KTLUwgAPMHCzAou2IlRoS5CuZ4IDS0wsRQwgA+UAAU4QBkXsjo2HhEZJRUAJRCTACWaMAmAGY4AMbQAGJwcBasaDhifPDJvgDOwFgFAObk+gpKKoQMUA1NUADkAFau+HgTUBpUVEKsAPRro40Qzd7ohB1daN0rwm1wVgAWPQCiCG07UIc9mtobHuDQGDgPxJ8kIX4UCcRQIbSSPgB2icLjcH0gMjkAGkICA2gDzMwAJAAbSRUAKUAA1qi4MV+ABdPjEPEU4GOUH4cE3RxlZD4CCEfqGYyqIJUcile4QGgAfig+L4aAgADcTJocSSQGTKblPMQIB1McI8QS0MTSeTqnAqVBjbT6YzwS1IQViiZ+OQ7Q7qEwse7xQFEkKHm73VLZfK7NpPABxUPmfootEkTXAKjaDlsnBYaBlOBoLXkvjGgRAA

export type ColumnTypes<
	T extends typeof Model,
	TInstance = InstanceType<T>
> = Subset<TInstance, Columns<T>>;

export type NonColumnTypes<
	T extends typeof Model,
	TInstance = InstanceType<T>
> = Pick<TInstance, Exclude<keyof TInstance, Columns<T>>>;
