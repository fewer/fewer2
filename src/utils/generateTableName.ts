import plur from "plur";
import { snakeCase } from "snake-case";

export default function generateTableName(modelName: string) {
  return snakeCase(plur(modelName, 2));
}
