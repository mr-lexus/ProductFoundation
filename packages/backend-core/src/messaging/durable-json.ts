export type DurableJsonPrimitive = boolean | number | string | null;
export type DurableJsonValue =
  | DurableJsonPrimitive
  | readonly DurableJsonValue[]
  | { readonly [key: string]: DurableJsonValue };

export function assertDurableJsonValue(
  value: unknown,
  label = "Durable JSON value"
): asserts value is DurableJsonValue {
  const seen = new Set<object>();

  function visit(candidate: unknown): void {
    if (candidate === null || typeof candidate === "boolean" || typeof candidate === "string") {
      return;
    }
    if (typeof candidate === "number") {
      if (!Number.isFinite(candidate)) {
        throw new TypeError(`${label} contains a non-finite number.`);
      }
      return;
    }
    if (typeof candidate !== "object") {
      throw new TypeError(`${label} is not JSON-compatible.`);
    }
    if (seen.has(candidate)) {
      throw new TypeError(`${label} contains a circular reference.`);
    }

    const prototype = Object.getPrototypeOf(candidate);
    if (!Array.isArray(candidate) && prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${label} contains a non-plain object.`);
    }

    seen.add(candidate);
    if (Array.isArray(candidate)) {
      const keys = Reflect.ownKeys(candidate);
      const elementKeys = keys.filter((key) => key !== "length");
      if (elementKeys.length !== candidate.length) {
        throw new TypeError(`${label} contains a sparse array or extra array property.`);
      }
      for (const key of elementKeys) {
        if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/.test(key)) {
          throw new TypeError(`${label} contains an invalid array property.`);
        }
        const index = Number(key);
        if (!Number.isSafeInteger(index) || index < 0 || index >= candidate.length) {
          throw new TypeError(`${label} contains an invalid array index.`);
        }
        const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
        if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
          throw new TypeError(`${label} contains a non-data array element.`);
        }
        visit(descriptor.value);
      }
    } else {
      for (const key of Reflect.ownKeys(candidate)) {
        if (typeof key !== "string") {
          throw new TypeError(`${label} contains a symbol key.`);
        }
        const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
        if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
          throw new TypeError(`${label} contains a non-data property.`);
        }
        visit(descriptor.value);
      }
    }
    seen.delete(candidate);
  }

  visit(value);
}
