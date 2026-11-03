#!/usr/bin/env node

import { Blob } from "node:buffer";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const distDirectory = path.join(projectDirectory, "site");
const dataPath = path.join(distDirectory, "data", "houses.json");
const outputDirectory = path.join(distDirectory, "data", "reducto");
const argumentsList = process.argv.slice(2);
const primaryOnly = argumentsList.includes("--primary");
const previewArgument = argumentsList.find((argument) => argument.startsWith("--preview-pages="));
const previewPages = previewArgument ? Number(previewArgument.split("=")[1]) : null;
const requestedHouseIds = new Set(argumentsList.filter((argument) => !argument.startsWith("--")));

async function resolveApiKey() {
  if (process.env.REDUCTO_API_KEY) return process.env.REDUCTO_API_KEY;

  try {
    const savedConfig = await readFile(path.join(homedir(), ".reducto", "config.yaml"), "utf8");
    const match = savedConfig.match(/^api_key:\s*["']?([^"'\s]+)["']?\s*$/m);
    if (match) return match[1];
  } catch {
    // Fall through to the actionable error below.
  }

  return null;
}

const apiKey = await resolveApiKey();

if (!apiKey) {
  console.error(
    [
      "REDUCTO_API_KEY is not set.",
      "Add it to your environment or authenticate the Reducto CLI, then run:",
      "  node scripts/parse-archives.mjs",
      "Options: --primary, --preview-pages=24, or one or more house IDs.",
    ].join("\n"),
  );
  process.exit(1);
}

const headers = { Authorization: `Bearer ${apiKey}` };

async function requestJSON(url, options) {
  const response = await fetch(url, options);
  const body = await response.text();
  let payload;

  try {
    payload = JSON.parse(body);
  } catch {
    payload = { raw: body };
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${body.slice(0, 500)}`);
  }

  return payload;
}

async function uploadLocalFile(relativeInput) {
  const localPath = path.resolve(distDirectory, relativeInput);
  const bytes = await readFile(localPath);
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "application/pdf" }), path.basename(localPath));

  const upload = await requestJSON("https://platform.reducto.ai/upload", {
    method: "POST",
    headers,
    body: form,
  });

  if (!upload.file_id) throw new Error("Reducto upload completed without a file_id.");
  return upload.file_id;
}

async function parseSource(source) {
  const input = /^https?:\/\//.test(source.input)
    ? source.input
    : await uploadLocalFile(source.input);

  const settings = {
    extraction_mode: "hybrid",
  };
  if (previewPages && Number.isFinite(previewPages) && previewPages > 0) {
    settings.page_range = { start: 1, end: previewPages };
  }

  return requestJSON("https://platform.reducto.ai/parse", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      input,
      settings,
      formatting: {
        add_page_markers: true,
        table_output_format: "dynamic",
      },
    }),
  });
}

const houses = JSON.parse(await readFile(dataPath, "utf8"));
const selectedHouses = requestedHouseIds.size
  ? houses.filter((house) => requestedHouseIds.has(house.id))
  : houses;

if (requestedHouseIds.size && selectedHouses.length !== requestedHouseIds.size) {
  const known = new Set(houses.map((house) => house.id));
  const missing = [...requestedHouseIds].filter((id) => !known.has(id));
  console.error(`Unknown house ID: ${missing.join(", ")}`);
  process.exit(1);
}

await mkdir(outputDirectory, { recursive: true });

let existingSources = {};
try {
  const existingIndex = JSON.parse(await readFile(path.join(outputDirectory, "index.json"), "utf8"));
  existingSources = existingIndex.sources || {};
} catch {
  // Start a new index on the first run.
}

const activeSourceKeys = new Set(
  houses.flatMap((house) =>
    house.sources
      .filter((source) => source.parse_ready)
      .map((source) => `${house.id}/${source.id}`),
  ),
);
existingSources = Object.fromEntries(
  Object.entries(existingSources).filter(([key]) => activeSourceKeys.has(key)),
);

const index = {
  generated_at: new Date().toISOString(),
  provider: "Reducto",
  sources: existingSources,
};

for (const house of selectedHouses) {
  const parseReadySources = house.sources.filter((source) => source.parse_ready);
  const sources = primaryOnly ? parseReadySources.slice(0, 1) : parseReadySources;
  await mkdir(path.join(outputDirectory, house.id), { recursive: true });

  for (const source of sources) {
    const key = `${house.id}/${source.id}`;
    process.stdout.write(`Parsing ${house.name} — ${source.title}… `);

    try {
      const result = await parseSource(source);
      const resultPath = path.join(outputDirectory, house.id, `${source.id}.json`);
      await writeFile(resultPath, JSON.stringify(result, null, 2));
      index.sources[key] = {
        status: "complete",
        job_id: result.job_id || null,
        studio_link: result.studio_link || (result.job_id ? `https://studio.reducto.ai/job/${result.job_id}` : null),
        pages: result.usage?.num_pages ?? null,
        credits: result.usage?.credits ?? null,
        page_range: previewPages ? { start: 1, end: previewPages } : null,
        result: `./data/reducto/${house.id}/${source.id}.json`,
      };
      console.log("done");
    } catch (error) {
      index.sources[key] = {
        status: "error",
        error: error.message,
      };
      console.log("failed");
      console.error(`  ${error.message}`);
    }

    await writeFile(path.join(outputDirectory, "index.json"), JSON.stringify(index, null, 2));
  }
}

console.log(`\nWrote ${Object.keys(index.sources).length} source records to dist/data/reducto/index.json`);
