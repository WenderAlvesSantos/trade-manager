import { describe, expect, it } from "vitest";
import { classifyDay, classifyDayDeviation, countDeviations, deviationsByMonth, ruleResolver } from "./day-deviation";

const config = { asset: "WIN" as const, dailyGainTarget: 250, dailyStopLimit: 250, deviationTolerance: 50 };
const win = (gained: number, lost: number) => ({ WIN: { gained, lost } });

describe("classifyDayDeviation", () => {
  it("dentro da tolerância da meta ou do stop não gera alerta", () => {
    expect(classifyDayDeviation(config, win(280, 0))).toBeNull();
    expect(classifyDayDeviation(config, win(0, 300))).toBeNull();
    expect(classifyDayDeviation(config, win(200, 0))).toBeNull();
  });

  it("alerta perda além do stop global + tolerância", () => {
    expect(classifyDayDeviation(config, win(0, 301))?.kind).toBe("stop-excedido");
  });

  it("alerta ganho além da meta global + tolerância", () => {
    expect(classifyDayDeviation(config, win(400, 50))?.kind).toBe("meta-excedida");
  });

  it("alerta dia encerrado longe dos dois limites", () => {
    const deviation = classifyDayDeviation(config, win(100, 50));
    expect(deviation?.kind).toBe("longe-dos-limites");
    expect(deviation?.points).toBe(50);
  });

  it("ignora dias sem operações no ativo da configuração", () => {
    expect(classifyDayDeviation(config, { WDO: { gained: 10, lost: 0 } })).toBeNull();
  });
});

describe("countDeviations", () => {
  it("conta por tipo e no total", () => {
    const counts = countDeviations([{ kind: "stop-excedido" }, { kind: "longe-dos-limites" }, { kind: "stop-excedido" }]);
    expect(counts).toEqual({ "stop-excedido": 2, "meta-excedida": 0, "longe-dos-limites": 1, total: 3 });
  });
});

describe("ruleResolver", () => {
  const history = [
    { ...config, effectiveFrom: "2000-01-01", dailyStopLimit: 200 },
    { ...config, effectiveFrom: "2026-10-05", dailyStopLimit: 300 },
  ];

  it("usa a última versão vigente no dia", () => {
    const ruleFor = ruleResolver(config, history);
    expect(ruleFor("2026-09-30").dailyStopLimit).toBe(200);
    expect(ruleFor("2026-10-05").dailyStopLimit).toBe(300);
    expect(ruleFor("2026-10-20").dailyStopLimit).toBe(300);
  });

  it("sem histórico usa a regra atual", () => {
    expect(ruleResolver(config, [])("2026-10-01")).toBe(config);
  });

  it("o mesmo resultado muda de classificação conforme a regra da época", () => {
    const ruleFor = ruleResolver(config, history);
    // −280 pts: passa do stop de 200 (+50) em setembro, mas fica dentro do stop de 300 em outubro.
    expect(classifyDayDeviation(ruleFor("2026-09-30"), win(0, 280))?.kind).toBe("stop-excedido");
    expect(classifyDayDeviation(ruleFor("2026-10-06"), win(0, 280))).toBeNull();
  });
});

describe("deviationsByMonth", () => {
  it("agrupa por mês, do mais recente ao mais antigo, incluindo meses sem desvio", () => {
    const months = deviationsByMonth([() => config], [
      { day: "2026-10-07", pointsByAsset: win(0, 400) },
      { day: "2026-10-06", pointsByAsset: win(250, 0) },
      { day: "2026-09-30", pointsByAsset: win(260, 0) },
      { day: "2026-10-01", pointsByAsset: win(100, 50) },
    ]);
    expect(months.map((m) => m.month)).toEqual(["2026-10", "2026-09"]);
    expect(months[0]).toMatchObject({ operatedDays: 3, counts: { total: 2, "stop-excedido": 1, "longe-dos-limites": 1 } });
    expect(months[1]).toMatchObject({ operatedDays: 1, counts: { total: 0 } });
  });
});

describe("classifyDay", () => {
  it("avalia cada ativo operado com a própria regra", () => {
    const wdo = { asset: "WDO" as const, dailyGainTarget: 10, dailyStopLimit: 10, deviationTolerance: 3 };
    const deviations = classifyDay([() => config, () => wdo], "2026-10-08", {
      WIN: { gained: 0, lost: 400 },
      WDO: { gained: 20, lost: 0 },
    });
    expect(deviations.map((item) => `${item.asset}:${item.kind}`)).toEqual(["WIN:stop-excedido", "WDO:meta-excedida"]);
  });
});
