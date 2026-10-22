/**
 * Card strings in English and French (SPEC HA-SAIL-SPEC-001 §9.7; TEST U-CARD-07).
 *
 * Every key exists in every language; the language follows Home Assistant's locale.
 */

export const STRINGS = {
  en: {
    targets: "{count} AIS targets",
    no_targets_entity: "Entity {entity} not found: is Vigie set up?",
    no_own_position: "Own position unknown: distances, vectors and rings hidden",
    map_coming: "The traffic map is coming in the next version.",
  },
  fr: {
    targets: "{count} cibles AIS",
    no_targets_entity: "Entité {entity} introuvable : Vigie est-il configuré ?",
    no_own_position: "Position du bateau inconnue : distances, vecteurs et cercles masqués",
    map_coming: "La carte du trafic arrive dans la prochaine version.",
  },
} as const;

export type Language = keyof typeof STRINGS;
export type StringKey = keyof (typeof STRINGS)["en"];

/** The card's language for a Home Assistant language tag ("fr", "fr-BE"…); English otherwise. */
export function languageOf(tag: string | undefined): Language {
  const base = (tag ?? "en").toLowerCase().split("-")[0];
  return base in STRINGS ? (base as Language) : "en";
}

export function localize(
  tag: string | undefined,
  key: StringKey,
  values: Record<string, string | number> = {},
): string {
  return STRINGS[languageOf(tag)][key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}
