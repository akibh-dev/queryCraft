import { useEffect, useRef, useSyncExternalStore } from "react";
import { catalog } from "../content";
import { createProgressStore, progressKey } from "../storage";
import {
  actionClassName,
  BrandMark,
  InfoIcon,
  MapIcon,
  Panel,
  PlayIcon,
  SettingsIcon,
} from "../ui";
import { usePathname } from "./navigation";
import { Play, submitted } from "./Play";
import { resolveRoute, tutorialPath } from "./routes";

const store = createProgressStore(catalog.map((entry) => entry.level));
store.loadProgress();

import styles from "./shell.module.css";

type Route = ReturnType<typeof resolveRoute>;

function PageBody({ route }: { route: Route }) {
  const toMap = <a href="/levels">Back to level map</a>;
  switch (route.kind) {
    case "home":
      return (
        <>
          <p>
            Choose indexes for a slow SQL query and explore what faster reads
            cost in storage and writes.
          </p>
          <div className={styles.actions}>
            <a className={actionClassName()} href={tutorialPath}>
              <PlayIcon />
              Play
            </a>
            <a className={actionClassName("secondary")} href="/levels">
              View levels
            </a>
          </div>
        </>
      );
    case "map":
      return (
        <Panel className={styles.puzzle}>
          <h2>{catalog[0].level.title}</h2>
          <p>{catalog[0].level.description}</p>
          <a className={actionClassName()} href={tutorialPath}>
            Open level
          </a>
        </Panel>
      );
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
    case "debrief": {
      const { level } = route.entry;
      const path = `/levels/${level.id}`;
      const record = route.record && (submitted.get(level.id) ?? route.record);
      const next = catalog[route.index + 1];
      return record ? (
        <>
          <p>{record.stars} of 3 stars</p>
          <p>{level.lesson}</p>
          <div className={styles.actions}>
            {next && <a href={`/levels/${next.level.id}`}>Next level</a>}
            <a href={path}>Replay</a>
            {toMap}
          </div>
        </>
      ) : (
        <>
          <p>Complete {level.title} to see your result here.</p>
          <div className={styles.actions}>
            <a href={path}>Open level</a>
            {toMap}
          </div>
        </>
      );
    }
    case "model":
      return (
        <p>
          QueryCraft estimates the cost of reading virtual tables and
          maintaining B-tree indexes. The model assumes a cold cache for each
          query.
        </p>
      );
    case "settings":
      return (
        <p>Theme, motion, and saved progress controls are in development.</p>
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
      if (e.key === null || e.key === progressKey) store.loadProgress();
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
      <main id="content" tabIndex={-1} className={styles.content}>
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
        <PageBody route={route} />
      </main>
    </>
  );
}
