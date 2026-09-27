// Generates src/generated from the contract with openapi-generator-cli (typescript-fetch, the same options the
// Maven build proved in docs/research/backend-and-infra.md section 2). `--check` generates into a temp dir and
// fails when the committed output differs, so the client can never drift from openapi.yaml.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgDir = fileURLToPath(new URL('..', import.meta.url));
const spec = resolve(pkgDir, '../../apps/api/contract/src/main/openapi/openapi.yaml');
const out = resolve(pkgDir, 'src/generated');
const check = process.argv.includes('--check');

if (!existsSync(spec)) {
  console.error(`api-client: contract not found at ${spec}`);
  process.exit(1);
}

const cli = resolve(pkgDir, 'node_modules/.bin/openapi-generator-cli');
const cliBin = existsSync(cli) ? cli : resolve(pkgDir, '../../node_modules/.bin/openapi-generator-cli');

function generate(target) {
  rmSync(target, { recursive: true, force: true });
  execFileSync(
    cliBin,
    [
      'generate',
      '-i',
      spec,
      '-g',
      'typescript-fetch',
      '-o',
      target,
      '--global-property',
      'apiDocs=false,modelDocs=false',
      '--additional-properties',
      // NOT withoutRuntimeChecks=false: the CLI reads the option's presence as true and drops every FromJSON/ToJSON
      // transformer (dates would stay strings). The default is already false; the assertion below guards it.
      'useOneOfDiscriminatorLookup=true,supportsES6=true,typescriptThreePlus=true',
    ],
    { cwd: pkgDir, stdio: check ? 'pipe' : 'inherit' },
  );
  // The FILES manifest is regenerated on every run and is not part of the contract.
  rmSync(join(target, '.openapi-generator', 'FILES'), { force: true });
  const meApi = readFileSync(join(target, 'apis', 'MeApi.ts'), 'utf8');
  if (!meApi.includes('MeFromJSON(jsonValue)')) {
    throw new Error(
      'api-client: generated client has no runtime transformers (dates would stay strings); check the generator options',
    );
  }
}

function listFiles(dir, acc = [], base = dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listFiles(p, acc, base);
    else acc.push(relative(base, p));
  }
  return acc.sort();
}

if (check) {
  const tmp = mkdtempSync(join(tmpdir(), 'klokka-api-client-'));
  try {
    generate(tmp);
    const expected = listFiles(tmp);
    const actual = existsSync(out) ? listFiles(out) : [];
    const differences = [];
    for (const f of new Set([...expected, ...actual])) {
      const a = expected.includes(f) ? readFileSync(join(tmp, f), 'utf8') : null;
      const b = actual.includes(f) ? readFileSync(join(out, f), 'utf8') : null;
      if (a !== b) differences.push(f);
    }
    if (differences.length) {
      console.error(
        'api-client: src/generated is out of date. Run `npm run generate -w @klokka/api-client` and commit.',
      );
      for (const f of differences) console.error(`  ${f}`);
      process.exit(1);
    }
    console.log(`api-client: src/generated matches the contract (${expected.length} files)`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
} else {
  const tmp = mkdtempSync(join(tmpdir(), 'klokka-api-client-'));
  try {
    generate(tmp);
    rmSync(out, { recursive: true, force: true });
    cpSync(tmp, out, { recursive: true });
    console.log(`api-client: wrote ${listFiles(out).length} files to src/generated`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
