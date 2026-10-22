// U-CARD-07: translations (TEST HA-SAIL-TEST-001 §3.8)
import { describe, expect, it } from "vitest";

import { languageOf, localeTag, localize, STRINGS } from "../../src/i18n";
import { formatTime } from "../../src/own";

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

describe("Home Assistant's time format (E-09 pre-run)", () => {
  it("follows the user's 12/24 h setting, else the language", () => {
    const at = new Date(2026, 9, 22, 17, 1);
    expect(formatTime(localeTag({ language: "en", time_format: "24" }), at)).toBe("17:01");
    expect(formatTime(localeTag({ language: "fr", time_format: "12" }), at)).toMatch(/^05:01\s?PM$/i);
    expect(formatTime(localeTag({ language: "fr", time_format: "language" }), at)).toBe("17:01");
    expect(localeTag({ language: "en" })).toBe("en");
    expect(localeTag(undefined, "de")).toBe("de");
    expect(languageOf(localeTag({ language: "fr", time_format: "24" }))).toBe("fr");
  });
});

describe("ship types", () => {
  it("translates Vigie's 19 categories, and keeps an unknown key", async () => {
    const { shipType } = await import("../../src/i18n");
    const categories = Object.keys(STRINGS.en).filter((k) => k.startsWith("ship."));
    expect(categories).toHaveLength(19);
    expect(shipType("fr", "sailing")).toBe("Voilier");
    expect(shipType("en", "cargo")).toBe("Cargo");
    expect(shipType("fr", "submarine")).toBe("submarine");
  });
});
