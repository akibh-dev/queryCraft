import { useEffect, useState } from "react";

export function navigate(path: string) {
  if (path === location.pathname + location.search + location.hash) return;
  history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function usePathname() {
  const [pathname, setPathname] = useState(() => location.pathname);
  useEffect(() => {
    function update() {
      setPathname(location.pathname);
    }
    function click(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.origin !== location.origin ||
        link.hash ||
        link.target ||
        link.hasAttribute("download") ||
        !["http:", "https:"].includes(link.protocol)
      )
        return;
      event.preventDefault();
      navigate(link.pathname + link.search);
    }
    window.addEventListener("popstate", update);
    document.addEventListener("click", click);
    return () => {
      window.removeEventListener("popstate", update);
      document.removeEventListener("click", click);
    };
  }, []);
  return pathname;
}
