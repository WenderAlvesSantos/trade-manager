"use client";

import { LogoutOutlined, ReloadOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Typography } from "antd";
import { logoutAction } from "@/actions/auth";

type Props = { email: string; message: string; renew: boolean; purchaseUrl: string };

export function LicenseBlocked({ email, message, renew, purchaseUrl }: Props) {
  return (
    <Card className="w-full max-w-md">
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        {renew ? "Sua licença venceu" : "Acesso indisponível"}
      </Typography.Title>
      <Typography.Text type="secondary">
        O Trade Manager é exclusivo para clientes da Megan com licença ativa.
      </Typography.Text>

      <div className="mt-6 flex flex-col gap-4">
        <Alert type="warning" title={message} showIcon />
        {email && <Typography.Text type="secondary">Conta: {email}</Typography.Text>}
        <Button
          type="primary"
          size="large"
          icon={<ShoppingCartOutlined />}
          href={purchaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          block
        >
          {renew ? "Renovar licença" : "Comprar a Megan"}
        </Button>
        {/* Recarga completa: a página consulta a licença de novo (ex.: logo após o pagamento). */}
        <Button size="large" icon={<ReloadOutlined />} href="/licenca" block>
          Já comprei, verificar novamente
        </Button>
        <form action={logoutAction}>
          <Button size="large" icon={<LogoutOutlined />} htmlType="submit" type="text" block>
            Sair
          </Button>
        </form>
      </div>
    </Card>
  );
}
