import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
    );
}
const files = walk(path.join(root, 'src')).filter((file) => /\.(tsx?|css)$/.test(file));
const graph = new Map();
const errors = [];
for (const file of files) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const source = fs.readFileSync(file, 'utf8');
  const lines = source.split('\n').filter((line) => line.trim()).length;
  // A guardrail against growing another page-sized monolith, not a substitute
  // for review. Domain logic is tested independently of the rendering modules.
  if (file.endsWith('.tsx') && lines > 550)
    errors.push(`${relative}: ${lines} non-empty lines; split responsibilities (limit 550)`);
  if (file.endsWith('.css') && lines > 500)
    errors.push(`${relative}: stylesheet exceeds 500 non-empty lines`);
  if (file.endsWith('.css')) continue;
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const dependencies = [];
  for (const node of ast.statements) {
    if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) continue;
    const specifier = node.moduleSpecifier;
    if (!specifier || !ts.isStringLiteral(specifier) || !specifier.text.startsWith('.')) continue;
    const target = ts.resolveModuleName(
      specifier.text,
      file,
      { moduleResolution: ts.ModuleResolutionKind.Bundler },
      ts.sys,
    ).resolvedModule?.resolvedFileName;
    if (!target) continue;
    const destination = path.relative(root, target).replaceAll('\\', '/');
    if (
      relative.startsWith('src/components/ui/') &&
      /src\/(features|preferences)\/|src\/(context|storage|model|files|database-)/.test(destination)
    )
      errors.push(`${relative}: shared UI must not import business state ${destination}`);
    if (file.endsWith('.ts') && /database-(engine|schema)\.ts$/.test(file) && /\.tsx$/.test(target))
      errors.push(`${relative}: domain logic must not import UI`);
    dependencies.push(path.resolve(target));
  }
  graph.set(path.resolve(file), dependencies);
}
const done = new Set();
function visit(file, stack) {
  if (stack.includes(file)) {
    errors.push(
      `Dependency cycle: ${[...stack.slice(stack.indexOf(file)), file].map((p) => path.relative(root, p)).join(' -> ')}`,
    );
    return;
  }
  if (done.has(file)) return;
  for (const dependency of graph.get(file) ?? []) visit(dependency, [...stack, file]);
  done.add(file);
}
for (const file of graph.keys()) visit(file, []);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Architecture checks passed: ${graph.size} modules, no dependency cycles, UI/domain boundaries intact.`,
  );
