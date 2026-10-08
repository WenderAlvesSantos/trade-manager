"use client";

import { useState, useTransition } from "react";
import { SaveOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, DatePicker, Form, InputNumber, Switch } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { saveRiskSettingsAction } from "@/actions/risk-settings";
import type { AccountType } from "@/generated/prisma/enums";
import { formatDate } from "@/lib/format";
import type { RiskConfig } from "@/lib/risk-projection";
import type { AccountRiskConfig } from "@/lib/risk-settings";
import type { EquityPoint } from "@/lib/trade-aggregations";
import type { RiskSettingsInput } from "@/lib/validations";
import { FIELD_GROUPS, type FieldDef } from "./risk-settings-fields";
import { RiskSettingsPreview } from "./risk-settings-preview";

type RiskSettingsFormProps = {
  account: AccountType;
  config: AccountRiskConfig;
  bankrollCurve: EquityPoint[];
  businessDays: number;
};

function NumberField({ field }: { field: FieldDef }) {
  return (
    <Form.Item name={field.name} label={field.label} tooltip={field.tooltip} rules={[{ required: true, message: "Obrigatório" }]}>
      <InputNumber min={field.min ?? 1} step={field.step} className="w-full" prefix={field.prefix} suffix={field.suffix} />
    </Form.Item>
  );
}

// DatePicker trabalha com Dayjs; o formulário guarda a chave de dia "YYYY-MM-DD".
function BankrollStartField() {
  return (
    <Form.Item
      name="bankrollStartDate"
      label="Início da banca"
      tooltip="A banca atual soma o líquido real dos trades do ativo a partir desta data"
      rules={[{ required: true, message: "Obrigatório" }]}
      getValueProps={(value?: string) => ({ value: value ? dayjs(value) : undefined })}
      normalize={(value?: Dayjs | null) => value?.format("YYYY-MM-DD")}
    >
      <DatePicker format="DD/MM/YYYY" allowClear={false} className="w-full" />
    </Form.Item>
  );
}

export function RiskSettingsForm({ account, config, bankrollCurve, businessDays }: RiskSettingsFormProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<RiskSettingsInput>();
  const values = Form.useWatch([], form);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleFinish(input: RiskSettingsInput) {
    startTransition(async () => {
      const result = await saveRiskSettingsAction(account, config.asset, input);
      if (result?.error) return setError(result.error);
      setError(undefined);
      message.success(result?.success);
    });
  }

  const preview: RiskConfig = { ...config, ...values };

  return (
    <Form form={form} layout="vertical" initialValues={config} onFinish={handleFinish} requiredMark={false}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          {!config.saved && (
            <Alert type="info" showIcon title={`${config.asset} ainda usa os valores padrão nesta conta. Ajuste e salve para personalizar.`} />
          )}
          <Card size="small">
            <Form.Item name="active" label={`Opero ${config.asset} nesta conta`} valuePropName="checked" className="mb-0!">
              <Switch />
            </Form.Item>
          </Card>
          {FIELD_GROUPS.map((group) => (
            <Card key={group.key} title={group.title} size="small">
              <p className="mb-3 text-xs text-white/45">{group.description}</p>
              <div className="grid gap-x-4 sm:grid-cols-2">
                {group.fields.map((field) => (
                  <NumberField key={field.name} field={field} />
                ))}
                {group.key === "banca" && <BankrollStartField />}
              </div>
              {group.key === "projecao" && (
                <p className="text-xs text-white/45">Nível de contratos atual iniciado em {formatDate(config.levelStartDate)}.</p>
              )}
            </Card>
          ))}
          {error && <Alert type="error" showIcon title={error} />}
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={isPending} className="self-start">
            Salvar {config.asset}
          </Button>
        </div>
        <RiskSettingsPreview config={preview} bankrollCurve={bankrollCurve} businessDays={businessDays} />
      </div>
    </Form>
  );
}
