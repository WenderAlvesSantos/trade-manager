import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialDrawdown } from "@/lib/bankroll-drawdown";
import { bankrollStatus } from "@/lib/bankroll-sizing";
import { combinedConfig } from "@/lib/combined-sizing";
import type { RiskConfig } from "@/lib/risk-projection";
import { TEST_RISK_CONFIG } from "@/lib/risk-test-config";
import { previewBankroll } from "./preview-bankroll";
import { RiskSettingsPreview } from "./risk-settings-preview";

const win: RiskConfig = { ...TEST_RISK_CONFIG, initialBankroll: 3000 };
const wdo: RiskConfig = { ...TEST_RISK_CONFIG, asset: "WDO", dailyStopLimit: 10, projectedGainDay: 6, projectedLossDay: 10, initialBankroll: 2000 };
const source = { bankrollCurve: [], otherAssets: [wdo], combinedCurve: [] };

const render = (config: RiskConfig & { active?: boolean }) =>
  renderToStaticMarkup(
    <RiskSettingsPreview config={config} bankroll={previewBankroll(config, source)} businessDays={21} />,
  );

describe("prévia das Configurações", () => {
  it("com outro ativo operado mostra a banca da conta, igual ao Dashboard", () => {
    const html = render({ ...win, active: true });
    const unit = combinedConfig([win, wdo]);
    const expected = bankrollStatus(unit, unit.initialBankroll, initialDrawdown(unit.initialBankroll));

    expect(html).toContain("Banca da conta (WIN + WDO)");
    expect(html).toContain("Contratos pela banca");
    expect(html).toContain("Recomendado em cada ativo");
    expect(html).toContain(`${expected.recommended} contr.`);
    expect(html).not.toContain("Contratos pelo risco / pela margem");
  });

  it("ativo desligado ou sozinho usa só a própria banca", () => {
    const alone = { ...source, otherAssets: [] };
    const aloneHtml = renderToStaticMarkup(
      <RiskSettingsPreview config={win} bankroll={previewBankroll({ ...win, active: true }, alone)} businessDays={21} />,
    );
    for (const html of [render({ ...win, active: false }), aloneHtml]) {
      expect(html).not.toContain("Banca da conta");
      expect(html).toContain("Contratos pelo risco / pela margem");
      expect(html).not.toContain("em cada ativo");
    }
  });

  it("ordena os ativos e usa a curva da conta", () => {
    const curve = [{ day: "2026-10-02", net: 50, cumulative: 50 }];
    const result = previewBankroll({ ...wdo, active: true }, { ...source, otherAssets: [win], combinedCurve: curve });
    expect(result.configs.map((item) => item.asset)).toEqual(["WIN", "WDO"]);
    expect(result.curve).toBe(curve);
  });
});
