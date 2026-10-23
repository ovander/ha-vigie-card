// The ready-made dashboard and view (SPEC HA-SAIL-SPEC-001 §9.9, OD-40; TEST F-DASH):
// Home Assistant looks up `custom:vigie` as these two elements and calls `generate`.
import { dashboardConfig, type DashboardHass, type StrategyConfig, viewConfig } from "./dashboard";

export const DASHBOARD_STRATEGY_TAG = "ll-strategy-dashboard-vigie";
export const VIEW_STRATEGY_TAG = "ll-strategy-view-vigie";

export class VigieDashboardStrategy extends HTMLElement {
  static async generate(config: StrategyConfig, hass: DashboardHass) {
    return dashboardConfig(config, hass);
  }
}

export class VigieViewStrategy extends HTMLElement {
  static async generate(config: StrategyConfig, hass: DashboardHass) {
    return viewConfig(config, hass);
  }
}

if (!customElements.get(DASHBOARD_STRATEGY_TAG)) {
  customElements.define(DASHBOARD_STRATEGY_TAG, VigieDashboardStrategy);
}
if (!customElements.get(VIEW_STRATEGY_TAG)) {
  customElements.define(VIEW_STRATEGY_TAG, VigieViewStrategy);
}
