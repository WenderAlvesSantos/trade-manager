"use client";

import { useTransition } from "react";
import { DeleteOutlined } from "@ant-design/icons";
import { App, Button, Popconfirm } from "antd";
import { deleteTradeAction } from "@/actions/trades";

export function DeleteTradeButton({ tradeId }: { tradeId: string }) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteTradeAction(tradeId);
      message.success("Trade excluído.");
    });
  }

  return (
    <Popconfirm
      title="Excluir este trade?"
      okText="Excluir"
      cancelText="Cancelar"
      okButtonProps={{ danger: true }}
      onConfirm={handleDelete}
    >
      <Button type="text" danger size="small" icon={<DeleteOutlined />} loading={isPending} aria-label="Excluir trade" />
    </Popconfirm>
  );
}
