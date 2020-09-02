import { INTERNAL_TYPES } from "./types";

export enum AssociationType {
  BELONGS_TO = "BELONGS_TO",
  HAS_MANY = "HAS_MANY",
  HAS_ONE = "HAS_ONE",
}

export interface Association<T> {
  [INTERNAL_TYPES.ASSOCIATION_META]: {
    type: AssociationType;
  };
  get(): T;
}

export function belongsTo<T>(associationType: T): Association<T> {
  return {
    [INTERNAL_TYPES.ASSOCIATION_META]: {
      type: AssociationType.BELONGS_TO,
    },
    get() {
      return {} as any;
    },
  };
}

export function hasMany<T>(associationType: T): Association<T[]> {
  return {
    [INTERNAL_TYPES.ASSOCIATION_META]: {
      type: AssociationType.HAS_MANY,
    },
    get() {
      return {} as any;
    },
  };
}
