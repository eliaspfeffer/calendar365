import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const config = JSON.parse(readFileSync("vercel.json", "utf8"));
const sitemap = readFileSync("dist/sitemap.xml", "utf8");
assert.equal([...html.matchAll(/<title>/g)].length, 1);
assert(html.includes('rel="canonical" href="https://www.calendar365.app/"'));
assert(html.includes("<noscript>"));
assert(!html.includes("lovable.dev/opengraph"));
assert(existsSync("dist/calendar-preview.png"));
const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]));
assert.equal(schemas.length, 1);
assert.equal(schemas[0]["@type"], "WebApplication");
const privateRule = config.routes.find((route) => route.headers?.["X-Robots-Tag"]);
const privateRoute = new RegExp(`^${privateRule.src}$`);
for (const path of ["/auth", "/reset-password", "/agent-access", "/long", "/invite/private-token", "/s/private-slug", "/privacy", "/imprint"]) {
  assert(privateRoute.test(path), `Missing HTTP noindex: ${path}`);
  assert(!sitemap.includes(`https://www.calendar365.app${path}<`));
}
assert(!privateRoute.test("/"));
assert(!privateRoute.test("/calendar-preview.png"));
console.log("Checked homepage metadata, schema, product image and 8 private route policies.");
