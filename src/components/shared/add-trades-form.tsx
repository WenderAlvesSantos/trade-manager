"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Form } from "antd";
import dayjs from "dayjs";
import type { AccountType } from "@/generated/prisma/enums";
import { TRADE_ROW_GRID, TradeRowFields, type TradeRowValues } from "./trade-row-fields";

export const ADD_TRADES_FORM_ID = "add-trades-form";

const HEADERS = ["Data", "Conta", "Ativo", "Contratos", "Pontos", "Prévia", ""];

type AddTradesFormProps = {
  today: string;
  defaultAccount: AccountType;
  error?: string;
  onFinish: (trades: TradeRowValues[]) => void;
};

// Montado só com o modal aberto: cada abertura cria um formulário novo, já com a primeira linha.
export function AddTradesForm({ today, defaultAccount, error, onFinish }: AddTradesFormProps) {
  const [form] = Form.useForm<{ trades: TradeRowValues[] }>();

  // Nova linha herda data, conta e ativo da anterior: agiliza lançar vários trades do mesmo dia.
  const nextRow = (): TradeRowValues => {
    const last = (form.getFieldValue("trades") as TradeRowValues[]).at(-1);
    return last
      ? { date: last.date, accountType: last.accountType, asset: last.asset }
      : { date: dayjs(today), accountType: defaultAccount, asset: "WIN" };
  };

  return (
    <Form
      id={ADD_TRADES_FORM_ID}
      form={form}
      initialValues={{ trades: [{ date: dayjs(today), accountType: defaultAccount, asset: "WIN" }] }}
      onFinish={({ trades }) => onFinish(trades)}
      className="flex flex-col gap-2"
    >
      <div className={`${TRADE_ROW_GRID} hidden text-xs font-medium text-white/45 sm:grid`}>
        {HEADERS.map((header) => (
          <span key={header}>{header}</span>
        ))}
      </div>
      <Form.List name="trades">
        {(fields, { add, remove }) => (
          <>
            {fields.map((field, index) => (
              <TradeRowFields
                key={field.key}
                name={field.name}
                index={index}
                canRemove={fields.length > 1}
                onRemove={() => remove(field.name)}
                onEnter={() => add(nextRow())}
              />
            ))}
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => add(nextRow())} className="self-start">
              Nova linha
            </Button>
          </>
        )}
      </Form.List>
      {error && <Alert type="error" title={error} showIcon />}
    </Form>
  );
}
