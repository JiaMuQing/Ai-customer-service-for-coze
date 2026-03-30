import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/** Keys that must be non-empty for the app to boot with full modules. */
export const REQUIRED_ENV_KEYS = [
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'JWT_SECRET',
  'DB_HOST',
  'DB_DATABASE',
  'DB_USERNAME',
  'DB_PASSWORD',
  'COZE_PAT',
  'COZE_BOT_ID',
] as const;

export type RequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[number];

export function getEnvFilePath(): string {
  return join(process.cwd(), '.env');
}

/** Parse .env file into a map (no multiline values). */
export function readEnvFileMap(): Record<string, string> {
  const p = getEnvFilePath();
  const map: Record<string, string> = {};
  if (!existsSync(p)) return map;
  const text = readFileSync(p, 'utf8');
  for (const line of text.split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
    map[k] = v;
  }
  return map;
}

function allRequiredPresent(map: Record<string, string>): boolean {
  for (const key of REQUIRED_ENV_KEYS) {
    if (key === 'DB_PASSWORD') {
      if (!Object.prototype.hasOwnProperty.call(map, key)) return false;
      continue;
    }
    if (!String(map[key] ?? '').trim()) return false;
  }
  return true;
}

/** After `dotenv.config()`, use this to decide full vs install bootstrap. */
export function isConfiguredFromProcessEnv(): boolean {
  for (const key of REQUIRED_ENV_KEYS) {
    if (key === 'DB_PASSWORD') {
      if (process.env.DB_PASSWORD === undefined) return false;
      continue;
    }
    if (!String(process.env[key] ?? '').trim()) return false;
  }
  return true;
}

/** Read .env on disk only (used after POST apply before restart). */
export function isEnvFileComplete(): boolean {
  return allRequiredPresent(readEnvFileMap());
}

export function mergeAndWriteEnv(updates: Record<string, string>): void {
  const map = readEnvFileMap();
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) map[k] = v;
  }
  const preferredOrder = [
    'PORT',
    'BASE_URL',
    'ADMIN_USERNAME',
    'ADMIN_PASSWORD',
    'JWT_SECRET',
    'DB_HOST',
    'DB_PORT',
    'DB_DATABASE',
    'DB_USERNAME',
    'DB_PASSWORD',
    'COZE_API_BASE',
    'COZE_PAT',
    'COZE_BOT_ID',
  ];
  const lines: string[] = [
    '# AI customer service — .env (updated by install wizard or manually)',
    '# Do not commit to git.',
    '',
  ];
  const used = new Set<string>();
  for (const k of preferredOrder) {
    if (map[k] !== undefined) {
      lines.push(`${k}=${escapeEnvValue(map[k])}`);
      used.add(k);
    }
  }
  for (const k of Object.keys(map).sort()) {
    if (used.has(k)) continue;
    lines.push(`${k}=${escapeEnvValue(map[k])}`);
  }
  writeFileSync(getEnvFilePath(), `${lines.join('\n')}\n`, 'utf8');
}

function escapeEnvValue(v: string): string {
  if (/[\r\n#"]/.test(v) || /^\s/.test(v) || /\s$/.test(v)) {
    return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n')}"`;
  }
  return v;
}
