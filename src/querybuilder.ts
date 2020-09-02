import { Model } from ".";
import { ColumnTypes, CreateSelectionSet, INTERNAL_TYPES, ModelInstance } from "./types";

export class QueryBuilder<
  ModelType extends typeof Model,
  Plucked = INTERNAL_TYPES["ALL_FIELDS"]
> {
  where(conditions: Partial<ColumnTypes<ModelType>>): QueryBuilder<ModelType, Plucked> {}

  pluck<NewKeys extends keyof ColumnTypes<ModelType>>(
    ...keys: NewKeys[]
  ): QueryBuilder<T, CreateSelectionSet<Plucked, NewKeys>> {}

  limit(amount: number) {
    return this;
  }

  offset(amount: number) {
    return this;
  }

  first(): void {}

  then(
    onFulfilled: (value: ModelInstance<ModelType, Plucked>) => void,
    onRejected?: (error: Error) => void
  ): Promise<void> {
	  return Promise.reject('Not implemented');
  }
}
