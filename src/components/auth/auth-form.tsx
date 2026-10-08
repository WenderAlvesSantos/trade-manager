"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Input, Typography } from "antd";
import { loginAction, registerAction } from "@/actions/auth";

const MODES = {
  login: {
    title: "Entrar",
    description: "Acesse seu diário de trades.",
    submit: "Entrar",
    action: loginAction,
    footer: { text: "Ainda não tem conta?", href: "/register", link: "Cadastre-se" },
  },
  register: {
    title: "Criar conta",
    description: "Comece a registrar seus trades na B3.",
    submit: "Cadastrar",
    action: registerAction,
    footer: { text: "Já tem conta?", href: "/login", link: "Entrar" },
  },
} as const;

type Field = { name: string; placeholder: string; type: "email" | "password"; autoComplete: string };

const FIELDS: Record<keyof typeof MODES, Field[]> = {
  login: [
    { name: "email", placeholder: "E-mail", type: "email", autoComplete: "email" },
    { name: "password", placeholder: "Senha", type: "password", autoComplete: "current-password" },
  ],
  register: [
    { name: "email", placeholder: "E-mail", type: "email", autoComplete: "email" },
    { name: "password", placeholder: "Senha", type: "password", autoComplete: "new-password" },
    { name: "confirmPassword", placeholder: "Confirmar senha", type: "password", autoComplete: "new-password" },
  ],
};

function AuthField({ field }: { field: Field }) {
  const common = {
    name: field.name,
    placeholder: field.placeholder,
    autoComplete: field.autoComplete,
    size: "large" as const,
    required: true,
  };
  return field.type === "password" ? (
    <Input.Password prefix={<LockOutlined />} {...common} />
  ) : (
    <Input type="email" prefix={<MailOutlined />} {...common} />
  );
}

export function AuthForm({ mode }: { mode: keyof typeof MODES }) {
  const config = MODES[mode];
  const [state, formAction, isPending] = useActionState(config.action, undefined);

  return (
    <Card className="w-full max-w-sm">
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        {config.title}
      </Typography.Title>
      <Typography.Text type="secondary">{config.description}</Typography.Text>

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        {FIELDS[mode].map((field) => (
          <AuthField key={field.name} field={field} />
        ))}
        {state?.error && <Alert type="error" title={state.error} showIcon />}
        <Button type="primary" htmlType="submit" size="large" loading={isPending} block>
          {config.submit}
        </Button>
      </form>

      <Typography.Paragraph type="secondary" className="mt-6 mb-0 text-center">
        {config.footer.text} <Link href={config.footer.href}>{config.footer.link}</Link>
      </Typography.Paragraph>
    </Card>
  );
}
