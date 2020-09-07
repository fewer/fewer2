import { Column } from './columns';
import { Model } from './model';

const ALL_FIELDS: unique symbol = Symbol('fewer/all');
const ASSOCIATION_META: unique symbol = Symbol('fewer/association');
const COLUMN_META: unique symbol = Symbol('fewer/column');
const MODEL_CONSTRUCTOR: unique symbol = Symbol('fewer/construct');
export const MODEL_STATIC_META: unique symbol = Symbol('fewer/model_static');
export const MODEL_INSTANCE_META: unique symbol = Symbol(
	'fewer/model_instance',
);

export const INTERNAL_TYPES = {
	ALL_FIELDS,
	ASSOCIATION_META,
	COLUMN_META,
	MODEL_CONSTRUCTOR,
	MODEL_STATIC_META,
	MODEL_INSTANCE_META,
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

// TODO: This is wrong, and requires so many hacks to get working, but I outlined the basic idea in this playground:
// https://www.typescriptlang.org/play?#code/C4TwDgpgBAwg9gGwK4FsB2AhATgQzQEwB4AVAGigFUA+KAXigG8AoKKAfTdEg4C4piA3C3ZsUEYDl5QAsuJwB1XGEhZC1IQF8mTLtFkTFOZRFXU6jYWIl8KTLUwgAPMHCzAou2IlRoS5CuZ4IDS0wsRQwgA+UAAU4QBkXsjo2HhEZJRUAJRCTACWaMAmAGY4AMbQAGJwcBasaDhifPDJvgDOwFgFAObk+gpKKoQMUA1NUADkAFau+HgTUBpUVEKsAPRro40Qzd7ohB1daN0rwm1wVgAWPQCiCG07UIc9mtobHuDQGDgPxJ8kIX4UCcRQIbSSPgB2icLjcH0gMjkAGkICA2gDzMwAJAAbSRUAKUAA1qi4MV+ABdPjEPEU4GOUH4cE3RxlZD4CCEfqGYyqIJUcile4QGgAfig+L4aAgADcTJocSSQGTKblPMQIB1McI8QS0MTSeTqnAqVBjbT6YzwS1IQViiZ+OQ7Q7qEwse7xQFEkKHm73VLZfK7NpPABxUPmfootEkTXAKjaDlsnBYaBlOBoLXkvjGgRAA

export type ColumnTypes<
	T extends typeof Model,
	TInstance = InstanceType<T>,
	Cols = {
		[K in keyof TInstance]: TInstance[K] extends Column<infer U>
			? U
			: never;
	}
> = Omit<Cols, NeverProperties<Cols>>;
