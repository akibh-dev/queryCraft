import { useEffect, useRef } from "react";
import {
  actionClassName,
  BrandMark,
  InfoIcon,
  MapIcon,
  Panel,
  PlayIcon,
  SettingsIcon,
} from "../ui";
import { resolveRoute, tutorial, tutorialPath } from "./routes";
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
          <h2>{tutorial.title}</h2>
          <p>A support agent needs to find one account by email.</p>
          <a className={actionClassName()} href={tutorialPath}>
            Open level
          </a>
        </Panel>
      );
    case "challenge":
      return (
        <>
          <p>
            A support agent needs to find one account by email. The simulation
            workbench is in development.
          </p>
          {toMap}
        </>
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
        <>
          <p>Complete {tutorial.title} to see your result here.</p>
          <div className={styles.actions}>
            <a href={tutorialPath}>Open level</a>
            {toMap}
          </div>
        </>
      );
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

export function App({ pathname }: { pathname: string }) {
  const route = resolveRoute(pathname);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${route.title} | QueryCraft`;
    if (!window.location.hash) heading.current?.focus({ preventScroll: true });
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
        <PageBody route={route} />
      </main>
    </>
  );
}
