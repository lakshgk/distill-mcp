import { access } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { convert as lightweightConvert } from '../modes/lightweight.js';
import { convert as fullConvert, checkHealth } from '../modes/full.js';
import { save } from '../cache.js';

let healthChecked = false;

const LIGHTWEIGHT_EXTENSIONS = new Set([
  '.docx', '.doc', '.odt',
  '.xlsx', '.xlsm', '.csv',
  '.pptx', '.ppt',
  '.pdf',
  '.html', '.htm',
]);

const FULL_EXTENSIONS = new Set([
  ...LIGHTWEIGHT_EXTENSIONS,
  '.mp3', '.wav', '.m4a', '.flac', '.ogg',
  '.epub', '.json', '.sql', '.wsdl', '.wsd',
]);

const QUALITY_THRESHOLD = 0.70;

function errorResponse(text) {
  return {
    isError: true,
    content: [{ type: 'text', text }],
  };
}

async function sendProgress(extra, progress, total, message) {
  const token = extra?._meta?.progressToken;
  if (token === undefined || !extra?.sendNotification) return;
  try {
    await extra.sendNotification({
      method: 'notifications/progress',
      params: { progressToken: token, progress, total, message },
    });
  } catch {
    // Progress notifications are best-effort
  }
}

export async function handle(args, config, extra) {
  try {
    const filePath = args.file_path;

    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
      return errorResponse('file_path is required and must be a non-empty string.');
    }

    const resolvedPath = resolve(filePath);

    if (resolvedPath.includes('..')) {
      return errorResponse('Path traversal is not allowed.');
    }

    try {
      await access(resolvedPath);
    } catch {
      return errorResponse(`File not found: ${resolvedPath}`);
    }

    const ext = extname(resolvedPath).toLowerCase();
    await sendProgress(extra, 1, 4, 'Validating file');

    const supportedExtensions = config.mode === 'full' ? FULL_EXTENSIONS : LIGHTWEIGHT_EXTENSIONS;

    if (!supportedExtensions.has(ext)) {
      const modeLabel = config.mode === 'full' ? 'full' : 'lightweight';
      const extList = [...supportedExtensions].join(' ');
      return errorResponse(
        `Unsupported format: ${ext}. Supported formats in ${modeLabel} mode: ${extList}.` +
        (config.mode === 'lightweight' ? ' Switch to full mode for scanned PDF and audio.' : '')
      );
    }

    if (config.mode === 'full' && !healthChecked) {
      await sendProgress(extra, 2, 5, 'Checking Distill service');
      try {
        await checkHealth(config);
        healthChecked = true;
      } catch (err) {
        return errorResponse(err.message);
      }
    }

    await sendProgress(extra, config.mode === 'full' ? 3 : 2, config.mode === 'full' ? 5 : 4, 'Converting document with Distill');

    let result;
    try {
      if (config.mode === 'full') {
        result = await fullConvert(resolvedPath, config);
      } else {
        result = await lightweightConvert(resolvedPath, config);
      }
    } catch (err) {
      if (err.message && /scanned/i.test(err.message)) {
        return errorResponse(
          'This PDF appears to be scanned. Switch to full mode for OCR support.'
        );
      }
      return errorResponse(err.message);
    }

    const { markdown } = result;
    await sendProgress(extra, config.mode === 'full' ? 4 : 3, config.mode === 'full' ? 5 : 4, 'Saving to cache');

    const cacheResult = await save(markdown, resolvedPath, config.cache_dir);

    const warnings = [];

    if (config.mode === 'full') {
      if (result.warnings && result.warnings.length > 0) {
        for (const w of result.warnings) {
          warnings.push(typeof w === 'string' ? w : w.message || JSON.stringify(w));
        }
      }
      if (result.quality_score != null && result.quality_score < QUALITY_THRESHOLD) {
        warnings.push(
          `Quality score ${result.quality_score} is below threshold (0.70). The conversion ` +
          'completed but some structure may be lost. Check the document for complex tables ' +
          'or non-standard formatting.'
        );
      }
    }

    if (cacheResult.saveError) {
      warnings.push(`Cache save failed: ${cacheResult.saveError}`);
    }

    await sendProgress(extra, config.mode === 'full' ? 5 : 4, config.mode === 'full' ? 5 : 4, 'Done');

    const response = {
      markdown,
      cached_at: cacheResult.cachedAt,
      overwritten: cacheResult.overwritten,
      source_file: resolvedPath,
      format_detected: ext.slice(1),
      mode: config.mode,
      ...(config.mode === 'full' && result.quality_score != null
        ? { quality_score: result.quality_score }
        : {}),
      warnings,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    };
  } catch (err) {
    return errorResponse(`Unexpected error: ${err.message}`);
  }
}
