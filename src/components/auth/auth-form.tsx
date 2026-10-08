"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction, registerAction } from "@/actions/auth";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

type Field = { name: string; label: string; type: string; autoComplete: string };

const FIELDS: Record<keyof typeof MODES, Field[]> = {
  login: [
    { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
    { name: "password", label: "Senha", type: "password", autoComplete: "current-password" },
  ],
  register: [
    { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
    { name: "password", label: "Senha", type: "password", autoComplete: "new-password" },
    { name: "confirmPassword", label: "Confirmar senha", type: "password", autoComplete: "new-password" },
  ],
};

export function AuthForm({ mode }: { mode: keyof typeof MODES }) {
  const config = MODES[mode];
  const [state, formAction, isPending] = useActionState(config.action, undefined);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {FIELDS[mode].map((field) => (
            <div key={field.name} className="flex flex-col gap-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input id={field.name} required {...field} />
            </div>
          ))}
          <FormMessage state={state} />
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="animate-spin" />}
            {config.submit}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center gap-1 text-muted-foreground">
        {config.footer.text}
        <Link href={config.footer.href} className="text-primary underline-offset-4 hover:underline">
          {config.footer.link}
        </Link>
      </CardFooter>
    </Card>
  );
}
