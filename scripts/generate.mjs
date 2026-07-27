#!/usr/bin/env node
// Generate static HTML pages from data/entities.json into the repo root.
// Metro is 2-level: / (city picker) and /<city>/ (buyer-app list).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "entities.json");
const ANALYTICS_PATH = path.join(ROOT, "data", "analytics.json");
const TEMPLATES_DIR = path.join(__dirname, "templates");

const RESERVED_ROOT_DIRS = new Set(["public", "data", "scripts", ".github"]);

function die(message) {
  console.error("generate: " + message);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    die("failed to read " + filePath + ": " + err.message);
  }
}

function readTemplate(name) {
  const filePath = path.join(TEMPLATES_DIR, name);
  if (!fs.existsSync(filePath)) die("missing template " + filePath);
  return fs.readFileSync(filePath, "utf8");
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );
}

function fill(template, vars, rawVars) {
  let out = template.replace(/\{\{\{([A-Z0-9_]+)\}\}\}/g, (_, key) => {
    if (!rawVars || !(key in rawVars)) {
      die("template missing raw value for {{{" + key + "}}}");
    }
    return rawVars[key];
  });
  return out.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
    if (!(key in vars)) die("template missing value for {{" + key + "}}");
    return escapeHtml(vars[key]);
  });
}

function isValidHttpsUrl(url) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function localAssetPath(ref) {
  if (!ref || /^https?:\/\//i.test(ref)) return null;
  const decoded = decodeURIComponent(ref);
  return path.join(ROOT, decoded.replace(/^\//, ""));
}

function validate(data, analytics) {
  const errors = [];

  if (!data || typeof data !== "object") die("entities.json must be an object");
  if (!analytics || typeof analytics !== "object") {
    die("analytics.json must be an object");
  }

  const site = data.site || {};
  if (!site.productName) errors.push("site.productName is required");
  if (!site.orgName) errors.push("site.orgName is required");

  if (!Array.isArray(data.groups) || data.groups.length === 0) {
    errors.push("groups must be a non-empty array");
  }

  const groupSlugs = new Set();
  for (const group of data.groups || []) {
    if (!group.slug) errors.push("group missing slug");
    else if (groupSlugs.has(group.slug))
      errors.push("duplicate group slug: " + group.slug);
    else if (RESERVED_ROOT_DIRS.has(group.slug)) {
      errors.push(
        "group slug conflicts with a reserved project folder: " + group.slug
      );
    } else groupSlugs.add(group.slug);

    if (!group.name)
      errors.push("group " + (group.slug || "?") + " missing name");
    if (!group.title)
      errors.push("group " + (group.slug || "?") + " missing title");

    if (group.slug && analytics[group.slug]) {
      const cityAnalytics = analytics[group.slug];
      if (typeof cityAnalytics !== "object" || !cityAnalytics.measurementId) {
        errors.push(
          "analytics.json entry for " +
            group.slug +
            " must include measurementId"
        );
      }
    }

    const logoPath = localAssetPath(group.logo);
    if (logoPath && !fs.existsSync(logoPath)) {
      errors.push(
        "group " + (group.slug || "?") + " logo missing: " + group.logo
      );
    }

    if (!Array.isArray(group.buyers)) {
      errors.push("group " + (group.slug || "?") + " buyers must be an array");
      continue;
    }

    const label = group.slug || "?";
    for (const buyer of group.buyers) {
      if (!buyer.label) errors.push("buyer missing label under " + label);
      if (!buyer.url) {
        errors.push("buyer '" + buyer.label + "' under " + label + " needs url");
      } else if (!isValidHttpsUrl(buyer.url)) {
        errors.push(
          "buyer '" + buyer.label + "' under " + label + " needs an https url"
        );
      }
      if (buyer.androidUrl && !isValidHttpsUrl(buyer.androidUrl)) {
        errors.push(
          "buyer '" +
            buyer.label +
            "' under " +
            label +
            " androidUrl must be https"
        );
      }
      if (buyer.iosUrl && !isValidHttpsUrl(buyer.iosUrl)) {
        errors.push(
          "buyer '" + buyer.label + "' under " + label + " iosUrl must be https"
        );
      }
      const buyerLogoPath = localAssetPath(buyer.logo);
      if (buyerLogoPath && !fs.existsSync(buyerLogoPath)) {
        errors.push("buyer logo missing under " + label + ": " + buyer.logo);
      }
    }
  }

  if (errors.length) {
    console.error("generate: validation failed:\n- " + errors.join("\n- "));
    process.exit(1);
  }
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
}

function removeStale(data) {
  const expectedGroups = new Set(data.groups.map((g) => g.slug));

  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;
    if (RESERVED_ROOT_DIRS.has(entry.name)) continue;

    const groupDir = path.join(ROOT, entry.name);
    if (!expectedGroups.has(entry.name)) {
      fs.rmSync(groupDir, { recursive: true, force: true });
      console.log("removed stale group folder: " + entry.name + "/");
      continue;
    }

    // Metro is 2-level — remove any nested entity folders left from older layouts.
    for (const child of fs.readdirSync(groupDir, { withFileTypes: true })) {
      if (!child.isDirectory()) continue;
      fs.rmSync(path.join(groupDir, child.name), {
        recursive: true,
        force: true,
      });
      console.log(
        "removed nested folder: " + entry.name + "/" + child.name + "/"
      );
    }
  }
}

function cityGaId(analytics, groupSlug) {
  const entry = analytics[groupSlug];
  return entry && entry.measurementId ? entry.measurementId : "";
}

function gaTags(gaId) {
  if (!gaId) return "";
  return (
    "\n    <!-- Google tag (gtag.js) -->\n" +
    '    <script\n' +
    '      async\n' +
    '      src="https://www.googletagmanager.com/gtag/js?id=' +
    escapeHtml(gaId) +
    '"\n' +
    "    ></script>"
  );
}

function bodyAttrs(groupSlug, gaId) {
  const parts = ['data-group="' + escapeHtml(groupSlug) + '"'];
  if (gaId) parts.push('data-ga-id="' + escapeHtml(gaId) + '"');
  return parts.join(" ");
}

function generate(data, analytics) {
  const site = data.site;
  const rootTpl = readTemplate("root.html");
  const groupTpl = readTemplate("group.html");

  writeFile(
    path.join(ROOT, "index.html"),
    fill(rootTpl, {
      ORG_NAME: site.orgName,
      PRODUCT_NAME: site.productName,
    })
  );
  console.log("wrote index.html");

  for (const group of data.groups) {
    const gaId = cityGaId(analytics, group.slug);
    writeFile(
      path.join(ROOT, group.slug, "index.html"),
      fill(
        groupTpl,
        {
          ORG_NAME: site.orgName,
          PRODUCT_NAME: group.productName || site.productName,
          GROUP_NAME: group.name,
          GROUP_SLUG: group.slug,
          GROUP_TITLE: group.title,
          GROUP_SUBTITLE:
            group.subtitle || "Choose an authorised seller to buy your ticket",
        },
        {
          GA_TAGS: gaTags(gaId),
          BODY_ATTRS: bodyAttrs(group.slug, gaId),
        }
      )
    );
    console.log("wrote " + group.slug + "/index.html");
  }
}

const data = readJson(DATA_PATH);
const analytics = readJson(ANALYTICS_PATH);
validate(data, analytics);
removeStale(data);
generate(data, analytics);
console.log("generate: done");
