"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ClearOutlined } from "@ant-design/icons";
import { Button, Card, DatePicker, Segmented, Spin } from "antd";
import dayjs from "dayjs";
import type { AccountType } from "@/generated/prisma/enums";
import { ACCOUNT_OPTIONS, filtersToQueryString, type TradeFilters } from "@/lib/trade-filters";

const ALL_ACCOUNTS = "AMBOS";
const DATE_FORMAT = "YYYY-MM-DD";

const SEGMENT_OPTIONS = [
  ...ACCOUNT_OPTIONS.map(({ value, label }) => ({ value: value as string, label })),
  { value: ALL_ACCOUNTS, label: "Ambos" },
];

export function FilterBar({ initialFilters }: { initialFilters: TradeFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<TradeFilters>(initialFilters);

  function applyFilters(next: TradeFilters) {
    setFilters(next);
    startTransition(() => router.replace(`${pathname}${filtersToQueryString(next)}`, { scroll: false }));
  }

  const hasFilters = Boolean(filters.account || filters.from || filters.to);

  return (
    <Card size="small">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          options={SEGMENT_OPTIONS}
          value={filters.account ?? ALL_ACCOUNTS}
          onChange={(value) => {
            const account = value === ALL_ACCOUNTS ? undefined : (value as AccountType);
            applyFilters({ ...filters, account });
          }}
        />
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          allowEmpty={[true, true]}
          placeholder={["Data início", "Data fim"]}
          value={[
            filters.from ? dayjs(filters.from) : null,
            filters.to ? dayjs(filters.to) : null,
          ]}
          onChange={(range) =>
            applyFilters({
              ...filters,
              from: range?.[0]?.format(DATE_FORMAT),
              to: range?.[1]?.format(DATE_FORMAT),
            })
          }
        />
        {hasFilters && (
          <Button type="text" icon={<ClearOutlined />} onClick={() => applyFilters({})}>
            Limpar filtros
          </Button>
        )}
        <Spin size="small" spinning={isPending} />
      </div>
    </Card>
  );
}
