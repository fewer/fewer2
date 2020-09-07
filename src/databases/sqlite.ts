import { createColumnType } from '../columns';

export const incrementing = createColumnType<number>({
	columnType: 'increments',
});
export const integer = createColumnType<number>({
	columnType: 'integer',
});
export const real = createColumnType<number>({
	columnType: 'double',
});
export const text = createColumnType<string>({
	columnType: 'text',
});

export const int = integer;
export const tinyint = integer;
export const smallint = integer;
export const mediumint = integer;
export const bigint = integer;
export const int2 = integer;
export const int8 = integer;

export const character = text;
export const varchar = text;
export const clob = text;

export const double = real;
export const float = real;
