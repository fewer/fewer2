import { createColumnType } from "./columns";

export const string = createColumnType<string>("varchar");
export const number = createColumnType<number>("float");

export { belongsTo, hasMany } from "./associations";
export { Model } from './model';
