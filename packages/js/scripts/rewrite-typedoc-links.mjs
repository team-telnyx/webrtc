import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..', 'docs', 'ts');
const PREFIX = '/development/webrtc/js-sdk/';
const URL_RE =
  /\/development\/webrtc\/js-sdk\/[^)\s]+?\.md(?:\?[^)\s#]*)?(?:#[^)\s]*)?/g;

function rewriteUrl(url) {
  if (!url.startsWith(PREFIX)) {
    return url;
  }

  const match = url.match(
    /^(\/development\/webrtc\/js-sdk\/.*\/)([^/?#]+)\.md(\?[^#]*)?(#.*)?$/
  );

  if (!match) {
    return url;
  }

  const [, dir, filename, query = '', hash = ''] = match;
  return `${dir}${filename.toLowerCase()}${query}${hash}`;
}

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, onFile);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      onFile(fullPath);
    }
  }
}

walk(ROOT_DIR, (filePath) => {
  const original = fs.readFileSync(filePath, 'utf8');
  const updated = original.replace(URL_RE, rewriteUrl);
  if (updated !== original) {
    fs.writeFileSync(filePath, updated);
  }
});
