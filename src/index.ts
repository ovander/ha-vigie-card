// The single file HACS installs (SPEC HA-SAIL-SPEC-001 §9.7–§9.9; OD-29, OD-34, OD-40): both
// cards and the ready-made dashboard
import { VERSION } from "./vigie-traffic-card";
import "./vigie-anchor-card";
import "./strategy";

// Once per page: which release is loaded, for a support question. It also keeps the version
// the release workflow stamps in the built file (an unused constant would be dropped)
console.info(`VIGIE-CARD ${VERSION}`);
