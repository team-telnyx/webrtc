/**
 * Rewrites TypeDoc-generated Markdown links under /docs/ts.
 *
 * Rules:
 * - Only process links starting with /development/webrtc/js-sdk.
 * - If the link targets the same file and includes an anchor, collapse to #anchor.
 * - For special pages (Call, TelnyxRTC, ICallOptions, IClientOptions, INotifications),
 *   point to developers.telnyx.com and drop the .md extension in the path.
 *   This list is expected to grow over time; keep it in sync with docs needs.
 *   Source of special pages: https://github.com/team-telnyx/developer-docs-mintlify/tree/main/snippets/development/webrtc/js-sdk
 * - For everything else, point to the GitHub docs tree and keep the rest of the path.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..', 'docs', 'ts');
const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const PREFIX = '/development/webrtc/js-sdk';
const DEV_DOCS_BASE = 'https://developers.telnyx.com/development/webrtc/js-sdk';
const GITHUB_BASE =
  'https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts';

// Dev docs currently rely on a hardcoded list of pages from their repo.
// We keep these in sync to avoid dead links, until dev docs can derive the list by walking the project tree.
const SPECIAL_FILES = new Set([
  'call',
  'telnyxrtc',
  'icalloptions',
  'iclientoptions',
  'inotifications',
]);

function splitLink(url) {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) {
    return { pathPart: url, anchor: null };
  }
  return {
    pathPart: url.slice(0, hashIndex),
    anchor: url.slice(hashIndex + 1),
  };
}

function getFileBaseFromPath(rest) {
  if (!rest) {
    return '';
  }
  const base = path.posix.basename(rest);
  if (base.toLowerCase().endsWith('.md')) {
    return base.slice(0, -3);
  }
  return base;
}

function rewritePathForDevDocs(rest) {
  if (!rest) {
    return '';
  }
  const normalized = rest.startsWith('/') ? rest : `/${rest}`;
  const dir = path.posix.dirname(normalized);
  const base = path.posix.basename(normalized);
  if (!base || base === '/') {
    return normalized;
  }
  if (base.toLowerCase().endsWith('.md')) {
    const baseNoExt = base.slice(0, -3).toLowerCase();
    if (dir === '/' || dir === '.') {
      return `/${baseNoExt}`;
    }
    return `${dir}/${baseNoExt}`;
  }
  return normalized;
}

function rewritePrefixedLinks(content, currentFileBase) {
  const isSpecial = SPECIAL_FILES.has(currentFileBase.toLowerCase());
  return content.replace(LINK_RE, (match, label, url, offset, full) => {
    if (offset > 0 && full[offset - 1] === '!') {
      return match;
    }

    const trimmed = url.trim();
    if (trimmed !== PREFIX && !trimmed.startsWith(`${PREFIX}/`)) {
      return match;
    }

    const { pathPart, anchor } = splitLink(trimmed);
    const rest = pathPart === PREFIX ? '' : pathPart.slice(PREFIX.length);
    const filename = getFileBaseFromPath(rest);

    if (filename && filename.toLowerCase() === currentFileBase.toLowerCase()) {
      if (anchor) {
        return `[${label}](#${anchor})`;
      }
    }

    if (isSpecial) {
      const rewrittenPath = rewritePathForDevDocs(rest);
      return `[${label}](${DEV_DOCS_BASE}${rewrittenPath}${
        anchor ? `#${anchor}` : ''
      })`;
    }

    return `[${label}](${GITHUB_BASE}${rest}${anchor ? `#${anchor}` : ''})`;
  });
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
  const baseName = path.basename(filePath, '.md');
  const updated = rewritePrefixedLinks(original, baseName);
  if (updated !== original) {
    fs.writeFileSync(filePath, updated);
  }
});
