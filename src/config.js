import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { ConfigError } from './errors.js';

const VALID_MODES = ['lightweight', 'full'];

// Windows: "py" is the standard launcher; macOS/Linux: "python3"
const DEFAULT_PYTHON_PATH = platform() === 'win32' ? 'py' : 'python3';

function getDefaultCacheDir() {
  const home = homedir();
  return join(home, 'Documents', 'distill-cache');
}

export function loadConfig() {
  const raw = process.env.DISTILL_MCP_CONFIG;

  if (!raw) {
    throw new ConfigError(
      'DISTILL_MCP_CONFIG environment variable is not set. See README for configuration instructions.'
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigError(
      'DISTILL_MCP_CONFIG is not valid JSON. See README for configuration instructions.'
    );
  }

  const { mode, cache_dir, distill_url, python_path } = parsed;

  if (!mode || !VALID_MODES.includes(mode)) {
    throw new ConfigError(
      `Invalid or missing "mode". Must be one of: ${VALID_MODES.join(', ')}. See README for configuration instructions.`
    );
  }

  let resolvedCacheDir = cache_dir || getDefaultCacheDir();
  if (typeof resolvedCacheDir === 'string' && resolvedCacheDir.startsWith('~')) {
    resolvedCacheDir = join(homedir(), resolvedCacheDir.slice(1));
  }

  return {
    mode,
    cache_dir: resolvedCacheDir,
    distill_url: distill_url || 'http://localhost:7860',
    python_path: python_path || DEFAULT_PYTHON_PATH,
  };
}
