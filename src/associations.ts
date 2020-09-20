import { Model } from './model';
import { ASSOCIATION_META } from './types';

export enum AssociationType {
	BELONGS_TO = 'BELONGS_TO',
	HAS_MANY = 'HAS_MANY',
	HAS_ONE = 'HAS_ONE',
}

export type AssociationMeta = {
	type: AssociationType;
	model: typeof Model;
};

export interface Association<T = any> {
	[ASSOCIATION_META]: {
		type: AssociationType;
		model: typeof Model;
	};
}

export function belongsTo<T extends typeof Model>(model: T): Association<T> {
	return {
		[ASSOCIATION_META]: {
			type: AssociationType.BELONGS_TO,
			model,
		},
	};
}

export function hasMany<T extends typeof Model>(model: T): Association<T[]> {
	return {
		[ASSOCIATION_META]: {
			type: AssociationType.HAS_MANY,
			model,
		},
	};
}
