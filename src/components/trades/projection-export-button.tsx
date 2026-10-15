"use client";

import { useState } from "react";
import { DownloadOutlined } from "@ant-design/icons";
import { App, Button } from "antd";
import type { ProjectedDay } from "@/lib/daily-projection";
import { sheetDayFromProjected } from "@/lib/projection-export";
import { buildProjectionWorkbook } from "@/lib/projection-xlsx";
import type { ProjectionInput } from "@/lib/trades-overlay";
import type { ProjectionSettings } from "./projection-controls";

type ExportButtonProps = {
  input: ProjectionInput;
  projected: ProjectedDay[];
  settings: ProjectionSettings;
  accountLabel: string;
  fileLabel: string;
};

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function download(content: BlobPart, fileName: string) {
  const url = URL.createObjectURL(new Blob([content], { type: XLSX_TYPE }));
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
  link.click();
  URL.revokeObjectURL(url);
}

// Dias realizados do filtro + pregões projetados no formato da planilha, com a aba "Config".
export function ProjectionExportButton({ input, projected, settings, accountLabel, fileLabel }: ExportButtonProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  async function exportXlsx() {
    setLoading(true);
    try {
      const buffer = await buildProjectionWorkbook({
        assets: input.configs.map((config) => config.asset),
        header: {
          initial: input.configs.reduce((total, config) => total + config.initialBankroll, 0),
          current: input.bankroll,
          forecast: projected.at(-1)?.bankroll ?? input.bankroll,
        },
        days: [...input.history, ...projected.map(sheetDayFromProjected)],
        configs: input.configs,
        settings: { ...settings, account: accountLabel, generatedOn: input.today },
      });
      download(buffer, `gerenciamento-${fileLabel}-${input.today}.xlsx`);
    } catch {
      message.error("Não foi possível gerar a planilha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="small" icon={<DownloadOutlined />} loading={loading} onClick={exportXlsx}>
      Exportar Excel
    </Button>
  );
}
