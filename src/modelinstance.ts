import { Model } from './model';
import { ColumnTypes, ALL_FIELDS } from './types';

// export type ModelInstance<
// 	T extends typeof Model,
// 	Plucked = INTERNAL_TYPES['ALL_FIELDS']
// > = Subset<ColumnTypes<T>, Plucked> & NonColumnTypes<T>;

export type ModelInstance<
	T extends typeof Model,
	Plucked = typeof ALL_FIELDS
> = ColumnTypes<T>;
