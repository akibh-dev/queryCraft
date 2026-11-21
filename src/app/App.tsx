import { useEffect, useRef, useSyncExternalStore } from "react";
import { version as gameVersion } from "../../package.json";
import { catalog } from "../content";
import type { Progress } from "../domain";
import { Debrief, Landing, LevelMap } from "../features/campaign";
import { Model } from "../features/preferences/Model";
import { Preferences } from "../features/preferences/Preferences";
import { createProgressStore, progressKey } from "../storage";
import { BrandMark, InfoIcon, MapIcon, SettingsIcon } from "../ui";
import { usePathname } from "./navigation";
import { OfflineUpdate } from "./OfflineUpdate";
import { PageBoundary } from "./PageBoundary";
import { clearSession, Play, submitted } from "./Play";
import { resolveRoute } from "./routes";

import styles from "./shell.module.css";

const store = createProgressStore(catalog.map((entry) => entry.level));
store.loadProgress();

type Route = ReturnType<typeof resolveRoute>;

function PageBody({ route, progress }: { route: Route; progress: Progress }) {
  const toMap = <a href="/levels">Back to level map</a>;
  switch (route.kind) {
    case "home":
      return <Landing catalog={catalog} completions={progress.completions} />;
    case "map":
      return <LevelMap catalog={catalog} completions={progress.completions} />;
    case "challenge":
      return (
        <Play
          key={route.entry.level.id}
          store={store}
          entry={route.entry}
          index={route.index}
          total={catalog.length}
        />
      );
    case "locked":
      return (
        <>
          <p>Locked. Complete {route.prerequisite} to unlock this level.</p>
          {toMap}
        </>
      );
    case "debrief":
      return (
        <Debrief
          entry={route.entry}
          record={
            route.record &&
            (submitted.get(route.entry.level.id) ?? route.record)
          }
          next={catalog[route.index + 1]}
        />
      );
    case "model":
      return (
        <Model
          version={catalog[0].level.modelVersion}
          gameVersion={gameVersion}
        />
      );
    case "settings":
      return (
        <Preferences
          store={store}
          settings={progress.settings}
          onReset={clearSession}
        />
      );
    case "missingLevel":
      return (
        <>
          <p>This level ID is outside the campaign.</p>
          {toMap}
        </>
      );
    case "missing":
      return (
        <>
          <p>Check the address or choose a level from the map.</p>
          {toMap}
        </>
      );
  }
}

export function App() {
  const pathname = usePathname();
  const { progress, status } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
  );
  const route = resolveRoute(pathname, progress.completions);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === null || e.key === progressKey) {
        if (e.newValue === null) clearSession();
        store.loadProgress();
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = progress.settings.theme;
    document.documentElement.dataset.reduceMotion = String(
      progress.settings.reduceMotion,
    );
  }, [progress.settings]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${route.title} | QueryCraft`;
    if (!window.location.hash) {
      heading.current?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }, [route.title]);
  return (
    <>
      <a className={styles.skip} href="#content">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.bar}>
          <a
            href="/"
            className={styles.brand}
            aria-current={route.kind === "home" ? "page" : undefined}
          >
            <BrandMark />
            QueryCraft
          </a>
          <nav className={styles.nav} aria-label="Main navigation">
            <a
              href="/levels"
              aria-current={route.kind === "map" ? "page" : undefined}
            >
              <MapIcon />
              Levels
            </a>
            <a
              href="/settings"
              aria-current={route.kind === "settings" ? "page" : undefined}
            >
              <SettingsIcon />
              Settings
            </a>
            <a
              href="/model"
              aria-current={route.kind === "model" ? "page" : undefined}
            >
              <InfoIcon />
              Model assumptions
            </a>
          </nav>
        </div>
      </header>
      <main
        data-route={route.kind}
        id="content"
        tabIndex={-1}
        className={styles.content}
      >
        <h1
          ref={heading}
          tabIndex={-1}
          className={route.kind === "home" ? styles.landingTitle : undefined}
        >
          {route.title}
        </h1>
        {status !== "saved" && (
          <p role="status">
            {status === "invalid"
              ? "Stored progress could not be read. Clear it in Settings to save again."
              : "Progress is available for this session. Export it in Settings to keep a copy."}
          </p>
        )}
        <OfflineUpdate />
        <PageBoundary key={pathname}>
          <PageBody route={route} progress={progress} />
        </PageBoundary>
      </main>
    </>
  );
}
