import { fieldsFor } from "../../apps/web/lib/operations/domains.ts";
export function localValues(kind, overrides = {}) {
  return Object.fromEntries(
    fieldsFor(kind).map((f) => [
      f.key,
      Object.hasOwn(overrides, f.key)
        ? overrides[f.key]
        : f.type === "refs"
          ? []
          : f.type === "boolean"
            ? false
            : f.type === "select"
              ? f.options[0]
              : f.key === "source"
                ? "local test fixture"
                : f.required
                  ? f.type === "number"
                    ? 0
                    : f.type === "date"
                      ? "2026-11-01"
                      : f.type === "datetime"
                        ? "2026-11-01T14:00:00+09:00"
                        : "local test"
                  : null,
    ]),
  );
}
