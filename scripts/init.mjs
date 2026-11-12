#!/usr/bin/env node
/**
 * Renames the app. Rewrites app.identity.json, which app.config.ts and the runtime config read.
 *
 *   pnpm run init --name "My App" [--slug my-app] [--scheme myapp] [--package com.me.myapp]
 *
 * Defaults: slug = kebab-case name, scheme = slug without dashes, package = com.example.<scheme>.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    name: { type: "string" },
    slug: { type: "string" },
    scheme: { type: "string" },
    package: { type: "string" },
  },
});

if (!values.name) {
  console.error(
    'Usage: pnpm run init --name "My App" [--slug my-app] [--scheme myapp] [--package com.me.myapp]'
  );
  process.exit(1);
}

const slug =
  values.slug ??
  values.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const scheme = values.scheme ?? slug.replace(/-/g, "");
const androidPackage = values.package ?? `com.example.${scheme}`;

if (!/^[a-z][a-z0-9-]*$/.test(slug))
  fail(`Invalid slug "${slug}". Use lowercase letters, digits and dashes.`);
if (!/^[a-z][a-z0-9+.-]*$/.test(scheme))
  fail(`Invalid scheme "${scheme}". Use lowercase letters and digits.`);
if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(androidPackage)) {
  fail(`Invalid package "${androidPackage}". Use a reverse-domain name like com.me.myapp.`);
}

const path = new URL("../app.identity.json", import.meta.url);
const identity = JSON.parse(readFileSync(path, "utf8"));
const next = {
  ...identity,
  name: values.name,
  slug,
  scheme,
  androidPackage,
  iosBundleIdentifier: androidPackage,
  // A renamed app is a different EAS project; link it with `pnpm dlx eas-cli init`.
  easProjectId: "",
};
writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);

console.info(`Updated app.identity.json:
  name:    ${next.name}
  slug:    ${next.slug}
  scheme:  ${next.scheme}
  package: ${next.androidPackage}

Next steps:
  1. If sign-in is on, add "${next.scheme}://" to TRUSTED_ORIGINS on your API.
  2. If the app has a backend, set EXPO_PUBLIC_API_URL in .env.local and in eas.json.
  3. Run \`pnpm dlx eas-cli init\` to create and link an EAS project.
  4. Replace the icons in assets/images.`);

function fail(message) {
  console.error(message);
  process.exit(1);
}
