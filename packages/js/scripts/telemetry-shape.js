/* global require, __dirname, console */
/**
 * Generates src/Modules/Verto/telemetry/structuredShape.ts from the wire
 * contract (src/Modules/Verto/telemetry/contract.ts): for every event, the
 * structured fields of its payload, nested objects included. The SDK keeps
 * those fields where they are and moves everything else under `extra`.
 *
 * Run after changing contract.ts:  node scripts/telemetry-shape.js
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const dir = path.join(__dirname, '../src/Modules/Verto/telemetry');
const contractPath = path.join(dir, 'contract.ts');
const program = ts.createProgram([contractPath], {
  strict: true,
  noEmit: true,
});
const checker = program.getTypeChecker();
const source = program.getSourceFile(contractPath);

function findType(name) {
  let found;
  ts.forEachChild(source, (node) => {
    if (
      (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
      node.name.text === name
    ) {
      found = node;
    }
  });
  if (!found) throw new Error(`contract.ts has no type ${name}`);
  return checker.getTypeAtLocation(found.name);
}

const isObjectType = (type) =>
  !!(type.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection)) &&
  !checker.isArrayType(type) &&
  checker.getPropertiesOfType(type).length > 0 &&
  !checker.getIndexInfosOfType(type).length;

/** true = keep whole; an object = these keys, each with its own shape. */
function shapeOf(type, depth = 0) {
  if (depth > 8) return true;
  const nonNull = checker.getNonNullableType(type);
  if (checker.isArrayType(nonNull)) {
    const element = shapeOf(checker.getTypeArguments(nonNull)[0], depth + 1);
    return element === true ? true : { '[]': element };
  }
  const members = nonNull.isUnion() ? nonNull.types : [nonNull];
  const objects = members.filter(isObjectType);
  if (!objects.length || objects.length !== members.length) return true;
  const shape = {};
  for (const member of objects) {
    for (const prop of checker.getPropertiesOfType(member)) {
      if (prop.name === 'extra') continue;
      const declaration = prop.valueDeclaration || prop.declarations?.[0];
      const propType = checker.getTypeOfSymbolAtLocation(
        prop,
        declaration || source
      );
      const sub = shapeOf(propType, depth + 1);
      shape[prop.name] =
        shape[prop.name] && shape[prop.name] !== true && sub !== true
          ? { ...shape[prop.name], ...sub }
          : shape[prop.name] === undefined || sub === true
            ? sub
            : shape[prop.name];
    }
  }
  return shape;
}

const events = {};
for (const member of findType('EventBodyCore').types) {
  const name = checker
    .typeToString(
      checker.getTypeOfSymbolAtLocation(member.getProperty('name'), source)
    )
    .replace(/"|'/g, '');
  events[name] = shapeOf(
    checker.getTypeOfSymbolAtLocation(member.getProperty('payload'), source)
  );
}
const client = Object.keys(shapeOf(findType('ClientInfo')));

const out = `// Generated from contract.ts by scripts/telemetry-shape.js: do not edit.
// The structured fields of every event; everything else goes under \`extra\`.

/** true = keep whole; an object = only these keys stay, each with its own shape; '[]' = each array element. */
export type Shape = true | { [key: string]: Shape };

/** The structured fields of the envelope's \`client\`. */
export const CLIENT_FIELDS: readonly string[] = ${JSON.stringify(client)};

export const STRUCTURED_SHAPE: Readonly<Record<string, Shape>> = ${JSON.stringify(events, null, 2)};
`;
fs.writeFileSync(path.join(dir, 'structuredShape.ts'), out);
console.log(`wrote structuredShape.ts: ${Object.keys(events).length} events`);
