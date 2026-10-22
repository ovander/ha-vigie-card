// U-CARD-07: translations (TEST HA-SAIL-TEST-001 §3.8)
import { describe, expect, it } from "vitest";

import { languageOf, localize, STRINGS } from "../src/i18n";

describe("U-CARD-07 translations", () => {
  it("has the same keys in every language, none empty", () => {
    const keys = Object.keys(STRINGS.en).sort();
    for (const [lang, strings] of Object.entries(STRINGS)) {
      expect(Object.keys(strings).sort(), lang).toEqual(keys);
      for (const value of Object.values(strings)) expect(value.trim(), lang).not.toBe("");
    }
  });

  it("keeps the same placeholders in every language", () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(STRINGS.en) as (keyof typeof STRINGS.en)[]) {
      expect(placeholders(STRINGS.fr[key]), key).toEqual(placeholders(STRINGS.en[key]));
    }
  });

  it("follows Home Assistant's language, English otherwise", () => {
    expect(languageOf("fr")).toBe("fr");
    expect(languageOf("fr-BE")).toBe("fr");
    expect(languageOf("de")).toBe("en");
    expect(languageOf(undefined)).toBe("en");
    expect(localize("fr", "targets", { count: 4 })).toBe("4 cibles AIS");
    expect(localize("en", "targets", { count: 4 })).toBe("4 AIS targets");
  });
});
