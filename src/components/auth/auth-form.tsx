"use client";

import { useActionState } from "react";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Input, Typography } from "antd";
import { loginAction } from "@/actions/auth";

// As contas são criadas pela Megan (cadastro do teste ou compra); não há cadastro aberto.
export function AuthForm({ purchaseUrl }: { purchaseUrl: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, undefined);

  return (
    <Card className="w-full max-w-sm">
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        Entrar
      </Typography.Title>
      <Typography.Text type="secondary">Acesse seu diário de trades.</Typography.Text>

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <Input
          type="email"
          name="email"
          placeholder="E-mail"
          autoComplete="email"
          prefix={<MailOutlined />}
          size="large"
          required
        />
        <Input.Password
          name="password"
          placeholder="Senha"
          autoComplete="current-password"
          prefix={<LockOutlined />}
          size="large"
          required
        />
        {state?.error && <Alert type="error" title={state.error} showIcon />}
        <Button type="primary" htmlType="submit" size="large" loading={isPending} block>
          Entrar
        </Button>
      </form>

      <Typography.Paragraph type="secondary" className="mt-6 mb-0 text-center">
        Acesso exclusivo para clientes da Megan.{" "}
        <a href={purchaseUrl} target="_blank" rel="noopener noreferrer">
          Conheça a Megan
        </a>
      </Typography.Paragraph>
    </Card>
  );
}
