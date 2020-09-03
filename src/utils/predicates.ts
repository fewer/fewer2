import { Association } from "../associations";
import { Column, ColumnMeta } from "../columns";
import { INTERNAL_TYPES } from "../types";

export function isColumn(value: any): value is ColumnMeta {
	return value && value[INTERNAL_TYPES.COLUMN_META];
}

export function isAssociation(value: any): value is Association<any> {
	return value && value[INTERNAL_TYPES.ASSOCIATION_META];
}
