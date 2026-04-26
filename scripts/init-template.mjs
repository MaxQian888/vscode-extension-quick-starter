#!/usr/bin/env node
import { access, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { argv, exit, stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const breadcrumb = path.join(repoRoot, '.template-init.json');

const CURRENT = {
  publisher: 'your-publisher',
  name: 'vscode-extension-quick-starter',
  displayName: 'VSCode Extension Quick Starter',
  description: 'VSCode extension starter with React + shadcn/ui',
  ownerOrg: 'AstroAir',
  commandId: 'hello-world.showHelloWorld',
  commandTitle: 'Hello World: Show',
};

function parseFlags(argvSlice) {
  const flags = {};
  for (let i = 0; i < argvSlice.length; i++) {
    const arg = argvSlice[i];
    if (!arg.startsWith('--'))
      continue;
    const eq = arg.indexOf('=');
    if (eq !== -1)
      flags[arg.slice(2, eq)] = arg.slice(eq + 1);
    else flags[arg.slice(2)] = true;
  }
  return flags;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  }
  catch {
    return false;
  }
}

async function prompt(rl, question, defaultValue) {
  const suffix = defaultValue ? ` (${defaultValue})` : '';
  const ans = (await rl.question(`? ${question}${suffix}: `)).trim();
  return ans || defaultValue || '';
}

async function gather(flags) {
  if (flags.yes) {
    return {
      publisher: flags.publisher ?? '',
      name: flags.name ?? '',
      displayName: flags.display ?? flags.displayName ?? '',
      description: flags.description ?? '',
      repoUrl: flags.repo ?? flags.repoUrl ?? '',
      author: flags.author ?? '',
      commandId: flags['command-id'] ?? `${flags.name ?? 'my-ext'}.show`,
    };
  }
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const publisher = await prompt(rl, 'Publisher ID');
    const name = await prompt(rl, 'Extension name (kebab-case)');
    const displayName = await prompt(rl, 'Display name', name);
    const description = await prompt(rl, 'Description', '');
    const repoUrl = await prompt(rl, 'Repository URL (https://github.com/.../...)');
    const author = await prompt(rl, 'Author name');
    const commandId = await prompt(rl, 'Replace command ID hello-world.showHelloWorld with', `${name}.show`);
    return { publisher, name, displayName, description, repoUrl, author, commandId };
  }
  finally {
    rl.close();
  }
}

function validate(values) {
  const errors = [];
  if (!values.publisher)
    errors.push('publisher is required');
  if (!values.name)
    errors.push('name is required');
  if (!/^[a-z][a-z0-9-]*$/.test(values.name))
    errors.push('name must be kebab-case (lowercase, hyphens, alphanumerics)');
  if (values.repoUrl && !/^https?:\/\//.test(values.repoUrl))
    errors.push('repoUrl must start with http(s)://');
  return errors;
}

function deriveOwnerFromRepo(repoUrl) {
  const m = repoUrl.match(/github\.com[/:](?<org>[^/]+)\/(?<repo>[^/.]+)/);
  return m ? { org: m.groups.org, repo: m.groups.repo } : null;
}

const FILE_REPLACERS = [
  {
    file: 'package.json',
    transform: (text, v, _derived) => {
      const json = JSON.parse(text);
      json.publisher = v.publisher;
      json.name = v.name;
      json.displayName = v.displayName;
      json.description = v.description;
      if (v.repoUrl) {
        json.repository = { type: 'git', url: v.repoUrl };
        json.homepage = `${v.repoUrl}#readme`;
        json.bugs = { url: `${v.repoUrl}/issues` };
      }
      if (v.author)
        json.author = v.author;
      if (json.contributes?.commands) {
        json.contributes.commands = json.contributes.commands.map(c =>
          c.command === CURRENT.commandId
            ? { ...c, command: v.commandId, title: `${v.displayName}: Show` }
            : c,
        );
      }
      if (json.scripts)
        delete json.scripts['init:template'];
      return `${JSON.stringify(json, null, 2)}\n`;
    },
  },
  {
    file: 'extension/commands/showHelloWorld.ts',
    transform: (text, v) => text.replaceAll(CURRENT.commandId, v.commandId),
  },
  {
    file: 'README.md',
    transform: (text, v, derived) => {
      let out = text.replaceAll(CURRENT.publisher, v.publisher);
      out = out.replaceAll(CURRENT.name, v.name);
      out = out.replaceAll(CURRENT.displayName, v.displayName);
      if (derived?.org)
        out = out.replaceAll(CURRENT.ownerOrg, derived.org);
      return out;
    },
  },
  {
    file: 'CHANGELOG.md',
    transform: (text, v) => text.replaceAll(CURRENT.displayName, v.displayName),
  },
  {
    file: '.github/CODEOWNERS',
    transform: (text, v, derived) => derived?.org ? text.replaceAll(`@${CURRENT.ownerOrg}`, `@${derived.org}`) : text,
  },
  {
    file: 'SECURITY.md',
    transform: (text, v, derived) => derived ? text.replaceAll(`${CURRENT.ownerOrg}/${CURRENT.name}`, `${derived.org}/${derived.repo}`) : text,
  },
  {
    file: '__tests__/extension/suite/extension.test.ts',
    transform: (text, v) => text
      .replaceAll(CURRENT.publisher, v.publisher)
      .replaceAll(CURRENT.name, v.name)
      .replaceAll(CURRENT.commandId, v.commandId),
  },
];

async function applyReplacers(values, derived, dryRun) {
  const changes = [];
  for (const { file, transform } of FILE_REPLACERS) {
    const fp = path.join(repoRoot, file);
    if (!(await exists(fp)))
      continue;
    const original = await readFile(fp, 'utf8');
    const updated = transform(original, values, derived);
    if (updated !== original)
      changes.push({ file, fp, updated });
  }
  if (dryRun) {
    console.log('\n=== Dry run — files that would change ===');
    for (const c of changes) console.log('  ✎', c.file);
    return changes;
  }
  for (const c of changes) {
    const tmp = `${c.fp}.tmp`;
    await writeFile(tmp, c.updated, 'utf8');
    await rename(tmp, c.fp);
    console.log('  ✓', c.file);
  }
  return changes;
}

async function selfDelete(dryRun) {
  if (dryRun) {
    console.log('  ✎ scripts/init-template.mjs (would delete)');
    return;
  }
  const here = fileURLToPath(import.meta.url);
  await unlink(here);
  console.log('  ✓ removed scripts/init-template.mjs');
}

async function checkAlreadyInitialized() {
  if (await exists(breadcrumb)) {
    const data = JSON.parse(await readFile(breadcrumb, 'utf8'));
    console.warn(`\n[!] This template appears to have been initialized on ${data.timestamp} for publisher "${data.publisher}".`);
    console.warn('    Re-running will overwrite that customization.');
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question('Continue? [y/N] ');
    rl.close();
    if (!/^y(?:es)?$/i.test(answer.trim())) {
      console.log('Aborted.');
      exit(0);
    }
  }
}

async function writeBreadcrumb(values) {
  await writeFile(breadcrumb, `${JSON.stringify({
    timestamp: new Date().toISOString(),
    publisher: values.publisher,
    name: values.name,
  }, null, 2)}\n`);
}

async function main() {
  const flags = parseFlags(argv.slice(2));
  const dryRun = !!flags['dry-run'];

  if (!dryRun)
    await checkAlreadyInitialized();

  console.log('VSCode Extension Quick Starter — template initialization\n');
  const values = await gather(flags);
  const errors = validate(values);
  if (errors.length) {
    console.error('Invalid input:');
    for (const e of errors) console.error('  -', e);
    exit(1);
  }
  const derived = values.repoUrl ? deriveOwnerFromRepo(values.repoUrl) : null;

  console.log(`\nApplying changes${dryRun ? ' (dry run)' : ''}…`);
  await applyReplacers(values, derived, dryRun);

  if (!dryRun) {
    await writeBreadcrumb(values);
    await selfDelete(false);
    console.log('\nDone. Suggested next steps:');
    console.log('  1. Review the diff: git diff');
    console.log('  2. Replace assets/icon.png with your real icon');
    console.log('  3. Set "private": false in package.json before publishing');
    console.log('  4. git add -A && git commit -m "chore: initialize from template"');
  }
}

main().catch((err) => {
  console.error(err);
  exit(1);
});
