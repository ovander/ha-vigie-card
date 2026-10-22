/**
 * Card strings in English and French (SPEC HA-SAIL-SPEC-001 §9.7; TEST U-CARD-07).
 *
 * Every key exists in every language; the language follows Home Assistant's locale.
 * Ship-type names are Vigie's own translations (Vigie `strings.json`, OD-17).
 */

export const STRINGS = {
  en: {
    targets: "{count} AIS targets",
    no_targets_entity: "Entity {entity} not found: is Vigie set up?",
    no_own_position: "Own position unknown: distances, vectors and rings hidden",
    recenter: "Follow own boat",
    threat_label: "{name}: CPA {cpa} NM in {tcpa} min",
    mmsi: "MMSI",
    class: "Class",
    ship_type: "Ship type",
    length: "Length",
    sog: "SOG",
    cog: "COG",
    heading: "Heading",
    distance: "Distance",
    cpa: "CPA",
    tcpa: "TCPA",
    age: "Last report",
    threat: "Collision risk",
    anchor: "Anchor, radius {radius} m",
    anchor_alarm: "Anchor alarm",
    own_boat: "Own boat",
    position: "Position",
    position_dd: "Position (dd)",
    position_current: "Position current",
    position_lost: "Position lost",
    position_lost_since: "Position lost since {time}",
    unit_kn: "kn",
    unit_nm: "NM",
    unit_min: "min",
    unit_s: "s ago",
    unit_m: "m",
    "anchor_card.off": "Anchor watch off",
    "anchor_card.watching": "Watching",
    "anchor_card.waiting": "Waiting for position",
    "anchor_card.dragging": "Dragging",
    "anchor_card.position_lost": "Position lost",
    "anchor_card.since": "since {time}",
    "anchor_card.radius": "Radius",
    "anchor_card.bearing": "Bearing to anchor",
    "anchor_card.max": "Largest distance",
    "anchor_card.time": "At anchor for",
    "anchor_card.drop": "Drop anchor here",
    "anchor_card.raise": "Raise anchor",
    "anchor_card.raise_confirm": "Stop the anchor watch of {boat}?",
    "anchor_card.confirm": "Stop the watch",
    "anchor_card.cancel": "Cancel",
    "anchor_card.radius_down": "Smaller radius",
    "anchor_card.radius_up": "Larger radius",
    "anchor_card.no_position": "No GPS position: the anchor is dropped at the boat's position",
    "anchor_card.missing": "Entity {entity} not found: is Vigie set up?",
    "anchor_card.refused": "Refused: {message}",
    "editor.entity": "AIS targets sensor",
    "editor.own": "Own boat tracker",
    "editor.collision_risk": "Collision risk (optional)",
    "editor.anchor": "Anchor distance (optional)",
    "editor.title": "Title",
    "editor.vector_minutes": "Course vectors",
    "editor.label_zoom": "Names from zoom",
    "editor.rings_nm": "Range rings (NM)",
    "editor.rings_nm_help": "Comma-separated, e.g. 0.5, 1, 2; empty for none",
    "editor.height": "Map height",
    "editor.tiles": "Map tiles URL",
    "editor.tiles_help": "With {z}, {x} and {y}; OpenStreetMap by default",
    "editor.overlay": "Overlay tiles URL (optional)",
    "editor.overlay_help": "E.g. OpenSeaMap sea marks: https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
    "ship.wing_in_ground": "Wing in ground",
    "ship.fishing": "Fishing",
    "ship.towing": "Towing",
    "ship.dredging": "Dredging or underwater operations",
    "ship.diving": "Diving operations",
    "ship.military": "Military operations",
    "ship.sailing": "Sailing",
    "ship.pleasure_craft": "Pleasure craft",
    "ship.high_speed": "High-speed craft",
    "ship.pilot": "Pilot vessel",
    "ship.search_and_rescue": "Search and rescue",
    "ship.tug": "Tug",
    "ship.port_tender": "Port tender",
    "ship.law_enforcement": "Law enforcement",
    "ship.medical": "Medical transport",
    "ship.passenger": "Passenger",
    "ship.cargo": "Cargo",
    "ship.tanker": "Tanker",
    "ship.other": "Other",
  },
  fr: {
    targets: "{count} cibles AIS",
    no_targets_entity: "Entité {entity} introuvable : Vigie est-il configuré ?",
    no_own_position: "Position du bateau inconnue : distances, vecteurs et cercles masqués",
    recenter: "Suivre le bateau",
    threat_label: "{name} : CPA {cpa} NM dans {tcpa} min",
    mmsi: "MMSI",
    class: "Classe",
    ship_type: "Type de navire",
    length: "Longueur",
    sog: "Vitesse fond",
    cog: "Route fond",
    heading: "Cap",
    distance: "Distance",
    cpa: "CPA",
    tcpa: "TCPA",
    age: "Dernier message",
    threat: "Risque de collision",
    anchor: "Ancre, rayon {radius} m",
    anchor_alarm: "Alarme de mouillage",
    own_boat: "Notre bateau",
    position: "Position",
    position_dd: "Position (dd)",
    position_current: "Position à jour",
    position_lost: "Position perdue",
    position_lost_since: "Position perdue depuis {time}",
    unit_kn: "nd",
    unit_nm: "NM",
    unit_min: "min",
    unit_s: "s",
    unit_m: "m",
    "anchor_card.off": "Veille au mouillage arrêtée",
    "anchor_card.watching": "Veille",
    "anchor_card.waiting": "En attente de position",
    "anchor_card.dragging": "Dérapage",
    "anchor_card.position_lost": "Position perdue",
    "anchor_card.since": "depuis {time}",
    "anchor_card.radius": "Rayon",
    "anchor_card.bearing": "Relèvement de l'ancre",
    "anchor_card.max": "Distance maximale",
    "anchor_card.time": "Au mouillage depuis",
    "anchor_card.drop": "Mouiller ici",
    "anchor_card.raise": "Lever l'ancre",
    "anchor_card.raise_confirm": "Arrêter la veille au mouillage de {boat} ?",
    "anchor_card.confirm": "Arrêter la veille",
    "anchor_card.cancel": "Annuler",
    "anchor_card.radius_down": "Réduire le rayon",
    "anchor_card.radius_up": "Agrandir le rayon",
    "anchor_card.no_position": "Pas de position GPS : l'ancre est mouillée à la position du bateau",
    "anchor_card.missing": "Entité {entity} introuvable : Vigie est-il configuré ?",
    "anchor_card.refused": "Refusé : {message}",
    "editor.entity": "Capteur des cibles AIS",
    "editor.own": "Suivi du bateau",
    "editor.collision_risk": "Risque de collision (facultatif)",
    "editor.anchor": "Distance à l'ancre (facultatif)",
    "editor.title": "Titre",
    "editor.vector_minutes": "Vecteurs de route",
    "editor.label_zoom": "Noms dès le zoom",
    "editor.rings_nm": "Cercles de distance (NM)",
    "editor.rings_nm_help": "Séparés par des virgules, par ex. 0.5, 1, 2 ; vide pour aucun",
    "editor.height": "Hauteur de la carte",
    "editor.tiles": "URL des tuiles de carte",
    "editor.tiles_help": "Avec {z}, {x} et {y} ; OpenStreetMap par défaut",
    "editor.overlay": "URL des tuiles superposées (facultatif)",
    "editor.overlay_help": "Par ex. balisage OpenSeaMap : https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
    "ship.wing_in_ground": "Navire à effet de sol",
    "ship.fishing": "Pêche",
    "ship.towing": "Remorquage",
    "ship.dredging": "Dragage ou travaux sous-marins",
    "ship.diving": "Plongée",
    "ship.military": "Opérations militaires",
    "ship.sailing": "Voilier",
    "ship.pleasure_craft": "Plaisance",
    "ship.high_speed": "Navire à grande vitesse",
    "ship.pilot": "Pilote",
    "ship.search_and_rescue": "Recherche et sauvetage",
    "ship.tug": "Remorqueur",
    "ship.port_tender": "Servitude portuaire",
    "ship.law_enforcement": "Forces de l'ordre",
    "ship.medical": "Transport sanitaire",
    "ship.passenger": "Passagers",
    "ship.cargo": "Cargo",
    "ship.tanker": "Navire-citerne",
    "ship.other": "Autre",
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
  // An unknown key shows as itself rather than breaking the card
  const text: string = STRINGS[languageOf(tag)][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** Translated ship-type category (Vigie's keys); the key itself when unknown. */
export function shipType(tag: string | undefined, category: string): string {
  const key = `ship.${category}`;
  return key in STRINGS.en ? localize(tag, key as StringKey) : category;
}

/** A number with fixed decimals in the user's locale ("0,45" in French), as Home Assistant shows it. */
export function formatNumber(tag: string | undefined, value: number, digits: number): string {
  let locale = tag ?? "en";
  try {
    new Intl.NumberFormat(locale);
  } catch {
    locale = "en";
  }
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
  }).format(value);
}
