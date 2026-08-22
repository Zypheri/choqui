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
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-surface p-8">
        <h1 className="mb-2 text-2xl font-semibold text-text-primary">
          Choqui
        </h1>
        <p className="mb-6 text-sm text-text-muted">
          Ingresá con tu cuenta de operador
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
