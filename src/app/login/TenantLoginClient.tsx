"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/app/actions/auth";
import { Intro } from "@/components/intro/Intro";
import type { PropsIngreso } from "@/components/intro/tipos";
import type { ConfigIntro } from "@/components/intro/config";

interface Props {
  tenantName: string;
  tenantArea: string;
  tenantBajada: string;
  tenantLogo?: string | null;
  tenantSlug?: string;
}

export default function TenantLoginClient({
  tenantName,
  tenantArea,
  tenantBajada,
  tenantLogo,
  tenantSlug,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const formData = new FormData();
    formData.append("username", username.trim());
    formData.append("password", password);
    if (tenantSlug) {
      formData.append("tenantSlug", tenantSlug);
    }

    startTransition(async () => {
      const res = await login(formData);
      if (res.success) {
        if (["VENDEDOR", "REPARTIDOR", "MIXTO"].includes(res.rol || "")) {
          router.push("/vendedor");
        } else {
          router.push("/");
        }
        router.refresh();
      } else {
        if (res.suspended) {
          router.push("/suspendido");
          return;
        }
        setErrorMsg(res.error || "Error desconocido al iniciar sesión.");
      }
    });
  };

  const ingreso: PropsIngreso = {
    ambiente: tenantSlug ? `@${tenantSlug}` : null,
    error: errorMsg || null,
    aviso: null,
    username,
    setUsername,
    password,
    setPassword,
    loading: isPending,
    onSubmit: handleSubmit,
  };

  const config: Partial<ConfigIntro> = {
    producto: tenantName,
    area: tenantArea,
    bajada: tenantBajada,
    logoUrl: tenantLogo,
    subtituloCard: "Sistema de Gestión Empresarial",
  };

  return <Intro estado="ingreso" ingreso={ingreso} config={config} />;
}
