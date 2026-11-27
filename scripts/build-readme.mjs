#!/usr/bin/env node
/**
 * Generates the script list in README.md from the front matter of docs/*.md.
 * Run `node scripts/build-readme.mjs` to sync, or `--check` in CI to verify.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(root, 'docs');
const readmePath = path.join(root, 'README.md');
const beginMarker = '<!-- BEGIN SCRIPTS -->';
const endMarker = '<!-- END SCRIPTS -->';
const checkOnly = process.argv.includes('--check');

function parseFrontmatter(source, label) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match) throw new Error(`${label}: missing YAML front matter`);

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const field = /^([A-Za-z][\w-]*)\s*:\s*(.*?)\s*$/.exec(line);
    if (!field) throw new Error(`${label}: invalid front matter line: ${line}`);
    let value = field[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[field[1]] = value;
  }
  return data;
}

function headerValue(source, key) {
  const match = new RegExp(`^//\\s*@${key}\\s+(.+?)\\s*$`, 'm').exec(source);
  return match ? match[1] : null;
}

function repoSlug() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    const match = /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(url);
    if (match) return `${match[1]}/${match[2]}`;
  } catch {
    // No remote available; fall back to the canonical repository.
  }
  return 'DilshanHarshajith/Tampermonkey-Scripts';
}

function collectDocs() {
  if (!fs.existsSync(docsDir)) throw new Error(`Missing directory: ${docsDir}`);

  const files = fs.readdirSync(docsDir).filter((file) => file.toLowerCase().endsWith('.md'));
  if (!files.length) throw new Error(`No Markdown documentation found in ${docsDir}`);

  const seen = new Set();
  return files.sort().map((file) => {
    const label = `docs/${file}`;
    const meta = parseFrontmatter(fs.readFileSync(path.join(docsDir, file), 'utf8'), label);

    for (const field of ['title', 'file', 'description']) {
      if (!meta[field]) throw new Error(`${label}: missing required field "${field}"`);
    }
    if (seen.has(meta.file)) throw new Error(`Duplicate script file: ${meta.file}`);
    seen.add(meta.file);

    const scriptPath = path.join(root, meta.file);
    if (!fs.existsSync(scriptPath)) throw new Error(`${label}: script not found: ${meta.file}`);

    const header = fs.readFileSync(scriptPath, 'utf8');
    const scriptName = headerValue(header, 'name');
    const scriptVersion = headerValue(header, 'version');
    const scriptDescription = headerValue(header, 'description');

    if (scriptName && scriptName !== meta.title) {
      console.warn(`⚠ ${label}: title "${meta.title}" differs from @name "${scriptName}"`);
    }
    if (scriptDescription && scriptDescription !== meta.description) {
      console.warn(`⚠ ${label}: description differs from the script's @description`);
    }
    if (meta.version && scriptVersion && meta.version !== scriptVersion) {
      console.warn(`⚠ ${label}: version ${meta.version} differs from @version ${scriptVersion}`);
    }

    return {
      title: meta.title,
      description: meta.description,
      version: meta.version || scriptVersion,
      docLink: `docs/${file}`,
      installLink: `https://raw.githubusercontent.com/${repoSlug()}/main/${meta.file
        .split(path.sep)
        .join('/')}`,
    };
  });
}

function buildSection(docs) {
  const entries = docs.map((doc) => {
    const version = doc.version ? ` · \`${doc.version}\`` : '';
    return (
      `### [${doc.title}](${doc.docLink})\n\n` +
      `${doc.description}${version}\n\n` +
      `[Documentation](${doc.docLink}) · [Install](${doc.installLink})`
    );
  });

  return (
    '_This section is generated from [`docs/`](docs/) by ' +
    '[`scripts/build-readme.mjs`](scripts/build-readme.mjs). Edit the docs, not this section._\n\n' +
    entries.join('\n\n')
  );
}

function main() {
  const readme = fs.readFileSync(readmePath, 'utf8');
  const start = readme.indexOf(beginMarker);
  const end = readme.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`README.md must contain ${beginMarker} and ${endMarker} in that order`);
  }

  const section = buildSection(collectDocs());
  const updated =
    readme.slice(0, start + beginMarker.length) + '\n\n' + section + '\n\n' + readme.slice(end);

  if (updated === readme) {
    console.log('README.md is already in sync.');
    return;
  }
  if (checkOnly) {
    console.error('README.md is out of sync. Run `node scripts/build-readme.mjs` to update it.');
    process.exit(1);
  }

  fs.writeFileSync(readmePath, updated);
  console.log(`README.md updated from ${fs.readdirSync(docsDir).filter((f) => f.endsWith('.md')).length} doc(s).`);
}

try {
  main();
} catch (error) {
  console.error(`build-readme: ${error.message}`);
  process.exit(1);
}
