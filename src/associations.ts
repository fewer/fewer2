import { Model } from './model';
import { ASSOCIATION_META } from './types';

export enum AssociationType {
	BELONGS_TO = 'BELONGS_TO',
	HAS_MANY = 'HAS_MANY',
	HAS_ONE = 'HAS_ONE',
}

export interface Association<T> {
	[ASSOCIATION_META]: {
		type: AssociationType;
		model: typeof Model;
	};
	get(): T;
}

export function belongsTo<T extends typeof Model>(model: T): Association<T> {
	return {
		[ASSOCIATION_META]: {
			type: AssociationType.BELONGS_TO,
			model,
		},
		get() {
			return {} as any;
		},
	};
}

export function hasMany<T extends typeof Model>(model: T): Association<T[]> {
	return {
		[ASSOCIATION_META]: {
			type: AssociationType.HAS_MANY,
			model,
		},
		get() {
			return {} as any;
		},
	};
}
