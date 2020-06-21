export type Validator<V> = (value: string | null) => V | null;

type ValidatorFn<V> = (name: string, optional: boolean) => Validator<V>;

export function Int(name: string, optional: boolean): Validator<number> {
  return (value: string | null): number | null => {
    if (value === null && optional) return null;
    if (!value || value.includes("."))
      throw new Error(`Expected parameter ${name} to be an integer.`);
    else return Number.parseInt(value, 10);
  };
}

export function Float(name: string, optional: boolean): Validator<number> {
  return (value: string | null): number | null => {
    if (value === null && optional) return null;
    if (!value) throw new Error(`Expected parameter ${name} to be a number.`);
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed))
      throw new Error(`Expected parameter ${name} to be a number.`);
    return parsed;
  };
}

export function Bool(name: string, optional: boolean): Validator<boolean> {
  return (value: string | null): boolean | null => {
    if (value === null && optional) return null;
    if (value === "true") return true;
    if (value === "false") return false;
    throw new Error(`Expected parameter ${name} to be a boolean.`);
  };
}

export function Any(value: string | null): string | null {
  return value;
}

export function AnyValue(): Validator<string> {
  return Any;
}

export function StringLiteral(
  name: string,
  optional: boolean,
  values: string[]
): Validator<string> {
  if (process.env.NODE_ENV === "development") {
    if (values.length === 0)
      throw new Error(
        `Expected string literal values to check parameter ${name} against. If any string would be valid then use: {${name}:string}`
      );
  }
  return (value: string | null): string | null => {
    if (value === null && optional) return null;
    for (const possible of values) if (value === possible) return value;
    throw new Error(
      `Expected parameter ${name} to be one of: ${values.join(" | ")}`
    );
  };
}

export function NumberLiteral(
  name: string,
  optional: boolean,
  values: number[]
): Validator<number> {
  return (value: string | null): number | null => {
    if (value === null && optional) return null;
    if (value)
      for (const possible of values) if (+value === possible) return +value;
    throw new Error(
      `Expected parameter ${name} to be one of: ${values.join(" | ")}`
    );
  };
}

export function Regex(
  name: string,
  optional: boolean,
  regex: RegExp
): Validator<string> {
  return (value: string | null): string | null => {
    if (value === null && optional) return null;
    regex.lastIndex = 0;
    if (value && regex.test(value)) return value;
    throw new Error(`Expected parameter ${name} to match ${regex.toString()}`);
  };
}

export function Custom(
  name: string,
  type: string,
  optional: boolean
): Validator<unknown> {
  if (type.startsWith("/")) {
    const [, pattern, flags] = type.split("/");
    return Regex(name, optional, new RegExp(pattern, flags));
  }
  const literals = type.split("|");
  // are these all numeric literals
  if (!literals.filter(v => !Number.isNaN(Number.parseFloat(v))).length)
    return NumberLiteral(
      name,
      optional,
      literals.map(v => +v)
    );
  // else treat them as string literals
  return StringLiteral(name, optional, literals);
}

export const basicValidators: Record<string, ValidatorFn<unknown>> = {
  int: Int,
  number: Float,
  bool: Bool,
  string: AnyValue,
  any: AnyValue
};
