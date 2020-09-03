import { Model } from './model';
import { ColumnTypes, INTERNAL_TYPES, NonColumnTypes, Subset } from './types';

// export type ModelInstance<
// 	T extends typeof Model,
// 	Plucked = INTERNAL_TYPES['ALL_FIELDS']
// > = Subset<ColumnTypes<T>, Plucked> & NonColumnTypes<T>;
export type ModelInstance<
	T extends typeof Model,
	Plucked = INTERNAL_TYPES['ALL_FIELDS']
> = ColumnTypes<T>;
