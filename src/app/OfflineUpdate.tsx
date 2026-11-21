import { useEffect, useRef, useState } from "react";
import { Button } from "../ui";

export function OfflineUpdate() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [otherTabs, setOtherTabs] = useState(false);
  const requested = useRef(false);
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const workers = navigator.serviceWorker;
    const track = () => {
      const installing = registration?.installing;
      const show = () => {
        if (!disposed && registration?.waiting && workers.controller)
          setWaiting(registration.waiting);
      };
      show();
      installing?.addEventListener("statechange", show);
    };
    const ready = () =>
      workers.controller?.postMessage({
        type: "ready",
        version: document.querySelector<HTMLMetaElement>(
          'meta[name="querycraft-build"]',
        )?.content,
      });
    const changed = () => {
      if (requested.current) window.location.reload();
      else ready();
    };
    const message = (event: MessageEvent) => {
      if (event.data?.type === "other-tabs-open") {
        requested.current = false;
        setOtherTabs(true);
      }
    };
    workers.addEventListener("controllerchange", changed);
    workers.addEventListener("message", message);
    ready();
    workers
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        if (disposed) return;
        registration = reg;
        reg.addEventListener("updatefound", track);
        track();
      })
      .catch(() => {
        /* Online play still works when service workers are disabled. */
      });
    return () => {
      disposed = true;
      registration?.removeEventListener("updatefound", track);
      workers.removeEventListener("controllerchange", changed);
      workers.removeEventListener("message", message);
    };
  }, []);
  if (!waiting) return null;
  return (
    <aside aria-label="Game update">
      <p>
        {otherTabs
          ? "Close the other QueryCraft tabs, then reload to update."
          : "A new version is ready. Finish your attempt before reloading."}
      </p>
      <Button
        variant="secondary"
        onClick={() => {
          requested.current = true;
          waiting.postMessage({ type: "activate-update" });
        }}
      >
        Reload to update
      </Button>
    </aside>
  );
}
