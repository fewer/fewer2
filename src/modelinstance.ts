import { Model } from './model';
import { ColumnTypes, ALL_FIELDS, Subset, NonColumnTypes } from './types';

export type ModelInstance<
	T extends typeof Model,
	Plucked = typeof ALL_FIELDS
> = Subset<ColumnTypes<T>, Plucked> & NonColumnTypes<T>;
