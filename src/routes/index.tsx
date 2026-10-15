import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  LayoutGrid,
  Plus,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { useDrinks } from "@/lib/drinks/store";
import {
  listMyDrinks,
  removeDrink,
  replaceMyDrinks,
  upsertDrink,
} from "@/lib/drinks/server";
import { Collection } from "@/components/app/collection";
import { DrinkForm } from "@/components/app/drink-form";
import { Catalog } from "@/components/app/catalog";
import { StatsView } from "@/components/app/stats-view";
import { Board } from "@/components/app/board";
import { getRank, summarize } from "@/lib/drinks/stats";
import { mergeDrinks, parseDrinks } from "@/lib/drinks/data";
import { toast, Toaster } from "sonner";
import { THEMES, applyTheme, getStoredTheme, type ThemeId } from "@/lib/theme";

export const Route = createFileRoute("/")({ component: Home });

const NAV = [
  { id: "collection", label: "Коллекция", icon: LayoutGrid },
  { id: "add", label: "Добавить", icon: Plus },
  { id: "catalog", label: "Индекс", icon: BookOpen },
  { id: "stats", label: "Статистика", icon: BarChart3 },
  { id: "board", label: "Рейтинг", icon: Trophy },
  { id: "profile", label: "Профиль", icon: UserRound },
] as const;

function Home() {
  const { user, isPending } = useCurrentUserState();
  const drinks = useDrinks((s) => s.drinks);
  const tab = useDrinks((s) => s.tab);
  const setTab = useDrinks((s) => s.setTab);
  const hydrated = useDrinks((s) => s.hydrated);
  const cloudLoaded = useRef(false);

  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (user) {
      useDrinks.getState().setSignedIn(true);
      if (!cloudLoaded.current) {
        cloudLoaded.current = true;
        listMyDrinks()
          .then((cloud) => {
            const local = useDrinks.getState().drinks;
            const merged = mergeDrinks(local, cloud);
            if (local.length > 0 && cloud.length > 0) {
              useDrinks.getState().setCloud(merged);
              toast.success("Локальная и облачная коллекции объединены");
            } else if (local.length > 0) {
              void replaceMyDrinks({ data: { drinks: local } });
              useDrinks.getState().setCloud(local);
              toast.success("Локальная коллекция сохранена в облако");
            } else {
              useDrinks.getState().setCloud(cloud);
            }
          })
          .catch(() => {
            useDrinks.getState().hydrateLocal();
          });
      }
    } else {
      cloudLoaded.current = false;
      useDrinks.getState().setSignedIn(false);
      useDrinks.getState().hydrateLocal();
    }
  }, [user, isPending]);

  async function persistNew(drink: (typeof drinks)[number]) {
    useDrinks.getState().addDrink(drink);
    if (user) {
      try {
        await upsertDrink({ data: drink });
      } catch {
        toast.error("Не удалось сохранить в облако");
      }
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl">
      <Toaster theme="dark" position="top-center" />
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border px-3 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="grid size-8 place-items-center rounded-[var(--radius-sm)] bg-accent text-accent-fg">
            <Zap className="size-4" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">Energy Hunter</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "relative flex h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm",
                tab === item.id ? "bg-elevated text-fg" : "text-muted hover:bg-elevated/60 hover:text-fg",
              )}
            >
              {tab === item.id && (
                <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" />
              )}
              <item.icon className={cn("size-4", tab === item.id && "text-accent")} />
              {item.label}
            </button>
          ))}
        </nav>
        <AuthSlot pending={isPending} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between px-4 py-4 md:px-8">
          <div>
            <h1 className="font-display text-3xl font-bold leading-none tracking-tight md:text-5xl">
              {NAV.find((n) => n.id === tab)?.label}
            </h1>
            <p className="mt-1.5 text-xs text-muted md:text-sm">
              Отслеживай банки, оценки и кофеин
            </p>
          </div>
          <div className="md:hidden">
            <AuthSlot pending={isPending} compact />
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 md:px-8 md:pb-10">
          {!hydrated ? (
            <div className="h-40 animate-pulse rounded-[var(--radius-xl)] bg-surface" />
          ) : (
            <>
              {tab === "collection" && (
                <Collection
                  drinks={drinks}
                  onAdd={() => setTab("add")}
                  onSeed={() => {
                    useDrinks.getState().seedDemo();
                    const next = useDrinks.getState().drinks;
                    if (user) void replaceMyDrinks({ data: { drinks: next } });
                    toast.success("Добавлены примеры");
                  }}
                  onUpdate={(id, data) => {
                    useDrinks.getState().updateDrink(id, data);
                    if (user) void upsertDrink({ data });
                  }}
                  onDelete={(id) => {
                    useDrinks.getState().deleteDrink(id);
                    if (user) void removeDrink({ data: { id } });
                    toast("Запись удалена");
                  }}
                />
              )}
              {tab === "add" && (
                <div className="mx-auto max-w-lg rounded-[var(--radius-xl)] border border-border bg-surface p-5">
                  <DrinkForm
                    submitLabel="Добавить в коллекцию"
                    onSubmit={(data) => {
                      const drink = useDrinks.getState().addDrink(data);
                      if (user) void upsertDrink({ data: drink });
                      toast.success("Добавлено");
                      setTab("collection");
                    }}
                  />
                </div>
              )}
              {tab === "catalog" && (
                <Catalog
                  drinks={drinks}
                  onAdd={(d) => {
                    void persistNew(d);
                    toast.success(`${d.name} добавлен`);
                  }}
                />
              )}
              {tab === "stats" && <StatsView drinks={drinks} name={user?.displayName} />}
              {tab === "board" && <Board myName={user?.displayName} />}
              {tab === "profile" && <ProfilePanel />}
            </>
          )}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-bg/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "flex h-14 flex-1 flex-col items-center justify-center gap-1 border-t-2 text-[10px]",
              tab === item.id ? "border-accent text-fg" : "border-transparent text-subtle",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function AuthSlot({ pending, compact }: { pending: boolean; compact?: boolean }) {
  if (pending) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-elevated" />;
  }
  return (
    <>
      <SignedIn>
        <UserButton />
      </SignedIn>
      <SignedOut>
        <Link
          to="/login"
          className={cn(
            "inline-flex h-9 items-center rounded-[var(--radius-sm)] bg-accent px-3 text-sm font-medium text-accent-fg",
            compact && "px-2.5",
          )}
        >
          Войти
        </Link>
      </SignedOut>
    </>
  );
}

function ProfilePanel() {
  const user = useCurrentUser();
  const drinks = useDrinks((s) => s.drinks);
  const summary = summarize(drinks);
  const rank = getRank(summary.drank);
  const [theme, setTheme] = useState<ThemeId>("amber");
  useEffect(() => setTheme(getStoredTheme()), []);
  const shownName = user?.displayName ?? user?.primaryEmail ?? "";
  const since = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : null;

  function exportJson() {
    const blob = new Blob([JSON.stringify(drinks, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "energy-hunter.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importJson() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text()) as unknown;
        const imported = parseDrinks(parsed);
        useDrinks.getState().replaceAll(imported);
        const next = useDrinks.getState().drinks;
        const u = useDrinks.getState().signedIn;
        if (u) await replaceMyDrinks({ data: { drinks: next } });
        toast.success(`Импортировано ${imported.length} банок`);
      } catch {
        toast.error("Не удалось прочитать файл");
      }
    };
    input.click();
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5">
        {user ? (
          <>
            <div className="flex items-center gap-4">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="size-16 rounded-full object-cover"
                />
              ) : (
                <div className="grid size-16 place-items-center rounded-full bg-accent text-2xl font-semibold text-accent-fg">
                  {(shownName[0] ?? "?").toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted">Охотник</p>
                <p className="truncate font-display text-4xl font-bold leading-none tracking-tight">{shownName}</p>
                <p className="text-sm text-muted">
                  {rank.name}
                  {since ? ` · в гильдии с ${since}` : ""}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-lg font-medium">Гостевой режим</p>
            <p className="mt-2 text-sm text-muted">
              Коллекция хранится на этом устройстве. Войдите, чтобы синхронизировать её между устройствами и попасть в рейтинг.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-accent px-4 text-sm font-medium text-accent-fg"
            >
              Войти в облако
            </Link>
          </>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Mini n={summary.total} l="банок" />
        <Mini n={summary.caffeine} l="мг" />
        <Mini n={summary.sugar} l="г сахара" />
      </div>
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Тема</p>
        <div className="flex gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-label={t.label}
              title={t.label}
              onClick={() => {
                setTheme(t.id);
                applyTheme(t.id);
              }}
              className={cn(
                "size-9 rounded-full border-2",
                theme === t.id ? "border-fg" : "border-transparent",
              )}
              style={{ background: t.color }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="h-11 rounded-[var(--radius-sm)] border border-border text-sm hover:bg-elevated"
          onClick={exportJson}
        >
          Экспорт JSON
        </button>
        <button
          type="button"
          className="h-11 rounded-[var(--radius-sm)] border border-border text-sm hover:bg-elevated"
          onClick={importJson}
        >
          Импорт JSON
        </button>
      </div>
    </div>
  );
}

function Mini({ n, l }: { n: number; l: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-3 text-center">
      <p className="font-display text-3xl font-bold tabular-nums leading-none">{n}</p>
      <p className="mt-1 text-xs text-muted">{l}</p>
    </div>
  );
}
