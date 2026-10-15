import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0],
        });
        if (err) throw new Error(err.message);
      }
      const { error: err } = await authClient.signIn.email({ email, password });
      if (err) throw new Error(err.message);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center gap-2 text-sm text-muted hover:text-fg">
          ← Назад к коллекции
        </Link>
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-[var(--radius-md)] bg-elevated">
            <Zap className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Energy Hunter</h1>
            <p className="text-sm text-muted">Войдите, чтобы сохранять коллекцию в облаке</p>
          </div>
        </div>

        {authEnabled ? (
          <div className="space-y-3">
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                variant="outline"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                Продолжить с {p.label}
              </Button>
            ))}
            <div className="relative py-2 text-center text-xs text-subtle">
              <span className="relative z-10 bg-bg px-2">или почта</span>
              <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
            </div>
            <form onSubmit={onEmail} className="space-y-3">
              {mode === "up" && (
                <div>
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Охотник"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="email">Почта</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "…" : mode === "up" ? "Создать аккаунт" : "Войти"}
              </Button>
            </form>
            <button
              type="button"
              className="w-full text-center text-sm text-muted hover:text-fg"
              onClick={() => setMode(mode === "up" ? "in" : "up")}
            >
              {mode === "up" ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Регистрация"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted">Вход отключён.</p>
        )}
      </div>
    </main>
  );
}
