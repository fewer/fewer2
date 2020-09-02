import flags from "./flags";
import { INTERNAL_TYPES } from "./types";

export type ColumnConfig<Nullable extends boolean> = (Nullable extends true
  ? {
      nullable: true;
    }
  : {
      nullable?: false;
    }) & {
  primaryKey?: boolean;
};

export interface Column<T> {
  [INTERNAL_TYPES.COLUMN_META]: {
    type: string;
    config?: ColumnConfig<boolean>;
  };
  get(): T;
  set(newValue: T): boolean;
}

export function column<Type, Nullable extends boolean = false>(
  type: string,
  config?: ColumnConfig<Nullable>
): Column<Nullable extends true ? Type : Type | undefined> {
  if (!flags.constructPhase) {
    throw new Error("You attempted to define a column outside of a model.");
  }

  let value: Type;

  return {
    [INTERNAL_TYPES.COLUMN_META]: {
      type,
      config,
    },
    get() {
      return value;
    },
    set(newValue: Type) {
      return value = newValue;
    },
  };
}

export function createColumnType<T>(typeName: string) {
  return function <U extends boolean>(config?: ColumnConfig<U>) {
    return column<T, U>(typeName, config);
  };
}
