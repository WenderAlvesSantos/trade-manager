"use client";

import { useState, useTransition } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { App, Button, Modal } from "antd";
import { createTradesAction, type TradeRowInput } from "@/actions/trades";
import type { AccountType } from "@/generated/prisma/enums";
import { ADD_TRADES_FORM_ID, AddTradesForm } from "./add-trades-form";
import type { TradeRowValues } from "./trade-row-fields";

const toPayload = (rows: TradeRowValues[]): TradeRowInput[] =>
  rows.map((row) => ({
    date: row.date.format("YYYY-MM-DD"),
    accountType: row.accountType,
    asset: row.asset,
    contracts: String(row.contracts ?? ""),
    points: String(row.points ?? ""),
  }));

export function AddTradesDialog({ today, defaultAccount }: { today: string; defaultAccount: AccountType }) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function openModal() {
    setError(undefined);
    setOpen(true);
  }

  function handleFinish(trades: TradeRowValues[]) {
    startTransition(async () => {
      const result = await createTradesAction(toPayload(trades));
      if (result?.error) return setError(result.error);
      message.success(result?.success);
      setOpen(false);
    });
  }

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
        Adicionar trades
      </Button>
      {/* destroyOnHidden: nada do modal é renderizado no servidor (evita erro de hidratação do portal). */}
      <Modal
        title="Adicionar trades"
        open={open}
        onCancel={() => setOpen(false)}
        width={980}
        okText="Salvar trades"
        cancelText="Cancelar"
        okButtonProps={{ htmlType: "submit", form: ADD_TRADES_FORM_ID }}
        confirmLoading={isPending}
        destroyOnHidden
      >
        <p className="mb-4 text-sm text-white/45">
          Uma linha por trade. Enter em Contratos/Pontos cria a próxima linha. Bruto e taxas B3 são
          calculados ao salvar; o IRRF é apurado por dia.
        </p>
        <AddTradesForm today={today} defaultAccount={defaultAccount} error={error} onFinish={handleFinish} />
      </Modal>
    </>
  );
}
