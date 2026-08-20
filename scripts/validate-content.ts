/**
 * Content validator CLI — `npm run validate:content`.
 *
 * Loads every JSON file under src/content/data/, validates each against its
 * Zod schema (plus referential integrity), and validates src/assets/manifest.json.
 * Exits nonzero with readable errors on any failure.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assetManifestSchema } from '../src/assets/manifestSchema';
import { validateContent, type ContentError } from '../src/content/validateContent';

const repoRoot = resolve(fileURLToPath(import.meta.url), '../..');
const dataDir = join(repoRoot, 'src', 'content', 'data');
const manifestPath = join(repoRoot, 'src', 'assets', 'manifest.json');

const errors: ContentError[] = [];

function readJson(filePath: string, label: string): unknown {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (cause) {
    errors.push({ file: label, message: `not valid JSON: ${(cause as Error).message}` });
    return undefined;
  }
}

// 1. Load all content data files.
const files: Record<string, unknown> = {};
const fileNames = readdirSync(dataDir).filter((name) => name.endsWith('.json'));
for (const name of fileNames) {
  const data = readJson(join(dataDir, name), name);
  if (data !== undefined) {
    files[name] = data;
  }
}

// 2. Validate the asset manifest.
let manifestVariantIds: Set<string> | undefined;
const manifestRaw = readJson(manifestPath, 'assets/manifest.json');
if (manifestRaw !== undefined) {
  const manifestResult = assetManifestSchema.safeParse(manifestRaw);
  if (manifestResult.success) {
    manifestVariantIds = new Set(Object.keys(manifestResult.data.variants));
  } else {
    errors.push(
      ...manifestResult.error.issues.map((issue) => ({
        file: 'assets/manifest.json',
        message: `${issue.path.join('.') || '(root)'}: ${issue.message}`,
      })),
    );
  }
}

// 3. Validate content against schemas + referential integrity.
errors.push(
  ...validateContent(files, manifestVariantIds !== undefined ? { manifestVariantIds } : {}),
);

if (errors.length > 0) {
  console.error(`Content validation FAILED with ${errors.length} error(s):\n`);
  for (const error of errors) {
    console.error(`  [${error.file}] ${error.message}`);
  }
  process.exit(1);
}

console.log(
  `Content validation passed: ${fileNames.length} content file(s) + asset manifest are valid.`,
);
for (const name of fileNames) {
  const count = Array.isArray(files[name]) ? (files[name] as unknown[]).length : 0;
  console.log(`  ${name}: ${count} entr${count === 1 ? 'y' : 'ies'}`);
}
