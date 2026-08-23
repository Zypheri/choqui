import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-bg-surface p-8 shadow-sm">
        <div className="mb-4 flex justify-center">
          <Image
            src="/choqui-logo.png"
            alt="Choqui"
            width={140}
            height={56}
            className="h-12 w-auto"
            priority
          />
        </div>
        <p className="mb-6 text-center text-sm text-text-muted">
          Ingresá con tu cuenta de operador
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
