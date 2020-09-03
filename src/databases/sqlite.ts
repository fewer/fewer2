import { createColumnType } from '../columns';

// TODO: Add in configuration here which allows us to know we should make this the incrementing type
// I think we probably want this to define which knex columnbuilder gets used. All of these probably should define that.
export const incrementing = createColumnType<number>('INTEGER', {
	columnBuilder: (name, config, connection) => connection.increments(name),
});
export const integer = createColumnType<number>('INTEGER');
export const real = createColumnType<number>('REAL');
export const text = createColumnType<string>('TEXT');

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
