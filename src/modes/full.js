import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { ConversionError, DistillUnavailableError } from '../errors.js';

const SERVICE_DOWN_MESSAGE =
  'Distill service is not running. Start it with: docker compose up -d\nThen restart Claude Desktop.';

export async function convert(filePath, config) {
  const url = `${config.distill_url}/api/convert`;

  let fileBuffer;
  try {
    fileBuffer = await readFile(filePath);
  } catch (err) {
    throw new ConversionError(`Failed to read file: ${err.message}`);
  }

  const form = new FormData();
  form.append('file', new Blob([fileBuffer]), basename(filePath));
  form.append('output_format', 'markdown');

  let response;
  try {
    response = await fetch(url, { method: 'POST', body: form });
  } catch {
    throw new DistillUnavailableError(SERVICE_DOWN_MESSAGE);
  }

  if (!response.ok) {
    let detail;
    try {
      const body = await response.json();
      detail = body.detail || `HTTP ${response.status}`;
    } catch {
      detail = `HTTP ${response.status}`;
    }
    throw new ConversionError(detail);
  }

  const data = await response.json();

  return {
    markdown: data.markdown,
    quality_score: data.quality?.overall ?? null,
    warnings: data.warnings || [],
  };
}

export async function checkHealth(config) {
  const url = `${config.distill_url}/`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new DistillUnavailableError(SERVICE_DOWN_MESSAGE);
    }
    return true;
  } catch (err) {
    if (err instanceof DistillUnavailableError) {
      throw err;
    }
    throw new DistillUnavailableError(SERVICE_DOWN_MESSAGE);
  } finally {
    clearTimeout(timeout);
  }
}
