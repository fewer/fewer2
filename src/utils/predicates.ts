import { Association } from "../associations";
import { ColumnResult } from "../columns";
import { ASSOCIATION_META, COLUMN_META } from "../types";

export function isColumn(value: any): value is ColumnResult {
	return value && value[COLUMN_META];
}

export function isAssociation(value: any): value is Association<any> {
	return value && value[ASSOCIATION_META];
}
