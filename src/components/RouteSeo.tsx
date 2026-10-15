import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const titles: Record<string, string> = {
  "/auth": "Sign in | Calendar365",
  "/reset-password": "Reset password | Calendar365",
  "/agent-access": "Manage agent access | Calendar365",
  "/long": "Long calendar view | Calendar365",
  "/privacy": "Privacy policy | Calendar365",
  "/imprint": "Imprint | Calendar365",
};

export function RouteSeo() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname === "/") return;
    const previousTitle = document.title;
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')!;
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')!;
    const previousDescription = description.content;
    const schemas = [...document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')];
    document.title = titles[pathname] ?? "Private calendar link | Calendar365";
    description.content = "Calendar365 account, calendar sharing and access management.";
    robots.content = "noindex, nofollow";
    canonical.remove();
    schemas.forEach((schema) => schema.remove());
    return () => {
      document.title = previousTitle;
      description.content = previousDescription;
      robots.content = "index, follow";
      document.head.append(canonical, ...schemas);
    };
  }, [pathname]);
  return null;
}
