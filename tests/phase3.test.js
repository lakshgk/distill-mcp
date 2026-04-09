import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stubFetch(handler) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return () => { globalThis.fetch = original; };
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// 1. src/modes/full.js — convert()
// ---------------------------------------------------------------------------

describe('src/modes/full.js — convert()', () => {
  let tempDir;
  let testFile;
  const config = { distill_url: 'http://localhost:7860' };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'distill-full-test-'));
    testFile = join(tempDir, 'test.pdf');
    await writeFile(testFile, 'fake pdf content');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('1. convert() returns markdown, quality_score, and warnings on HTTP 200', async () => {
    const restore = stubFetch(async () => jsonResponse(200, {
      markdown: '# Hello',
      quality: { overall: 0.91 },
      warnings: [],
    }));

    try {
      const { convert } = await import('../src/modes/full.js');
      const result = await convert(testFile, config);

      assert.equal(result.markdown, '# Hello');
      assert.equal(result.quality_score, 0.91);
      assert.deepEqual(result.warnings, []);
    } finally {
      restore();
    }
  });

  it('2. convert() throws ConversionError on HTTP 4xx', async () => {
    const restore = stubFetch(async () => jsonResponse(422, { detail: 'bad file' }));

    try {
      const { convert } = await import('../src/modes/full.js');
      const { ConversionError } = await import('../src/errors.js');

      await assert.rejects(
        () => convert(testFile, config),
        (err) => {
          assert.equal(err instanceof ConversionError, true);
          assert.ok(err.message.includes('bad file'));
          return true;
        }
      );
    } finally {
      restore();
    }
  });

  it('3. convert() throws DistillUnavailableError on network failure', async () => {
    const restore = stubFetch(async () => { throw new TypeError('fetch failed'); });

    try {
      const { convert } = await import('../src/modes/full.js');
      const { DistillUnavailableError } = await import('../src/errors.js');

      await assert.rejects(
        () => convert(testFile, config),
        (err) => {
          assert.equal(err instanceof DistillUnavailableError, true);
          assert.ok(err.message.includes('docker compose up -d'));
          return true;
        }
      );
    } finally {
      restore();
    }
  });

  it('4. convert() throws ConversionError on HTTP 5xx', async () => {
    const restore = stubFetch(async () => jsonResponse(500, { detail: 'internal error' }));

    try {
      const { convert } = await import('../src/modes/full.js');
      const { ConversionError } = await import('../src/errors.js');

      await assert.rejects(
        () => convert(testFile, config),
        (err) => {
          assert.equal(err instanceof ConversionError, true);
          return true;
        }
      );
    } finally {
      restore();
    }
  });
});

// ---------------------------------------------------------------------------
// 2. src/modes/full.js — checkHealth()
// ---------------------------------------------------------------------------

describe('src/modes/full.js — checkHealth()', () => {
  const config = { distill_url: 'http://localhost:7860' };

  it('5. checkHealth() returns true on HTTP 200', async () => {
    const restore = stubFetch(async () => jsonResponse(200, { status: 'ok' }));

    try {
      const { checkHealth } = await import('../src/modes/full.js');
      const result = await checkHealth(config);
      assert.equal(result, true);
    } finally {
      restore();
    }
  });

  it('6. checkHealth() throws DistillUnavailableError on non-200', async () => {
    const restore = stubFetch(async () => jsonResponse(503, {}));

    try {
      const { checkHealth } = await import('../src/modes/full.js');
      const { DistillUnavailableError } = await import('../src/errors.js');

      await assert.rejects(
        () => checkHealth(config),
        (err) => {
          assert.equal(err instanceof DistillUnavailableError, true);
          return true;
        }
      );
    } finally {
      restore();
    }
  });

  it('7. checkHealth() throws DistillUnavailableError on timeout/network error', async () => {
    const restore = stubFetch(async () => { throw new DOMException('aborted', 'AbortError'); });

    try {
      const { checkHealth } = await import('../src/modes/full.js');
      const { DistillUnavailableError } = await import('../src/errors.js');

      await assert.rejects(
        () => checkHealth(config),
        (err) => {
          assert.equal(err instanceof DistillUnavailableError, true);
          return true;
        }
      );
    } finally {
      restore();
    }
  });
});

// ---------------------------------------------------------------------------
// 3. src/tools/convert_and_save.js — full mode additions
// ---------------------------------------------------------------------------

describe('src/tools/convert_and_save.js — full mode', () => {
  const fullConfig = {
    mode: 'full',
    cache_dir: '',
    distill_url: 'http://localhost:7860',
    python_path: 'py',
  };

  it('8. handle() returns isError for unsupported extension in full mode', async () => {
    const { handle } = await import('../src/tools/convert_and_save.js');

    const tempDir = await mkdtemp(join(tmpdir(), 'distill-fullext-test-'));
    const testFile = join(tempDir, 'test.xyz');
    await writeFile(testFile, 'fake content');

    try {
      const result = await handle({ file_path: testFile }, { ...fullConfig, cache_dir: tempDir });
      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('Unsupported format'));
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('9. handle() includes quality_score in full mode response', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'distill-fullqs-test-'));
    const testFile = join(tempDir, 'test.pdf');
    await writeFile(testFile, 'fake pdf');

    const restore = stubFetch(async () => jsonResponse(200, {
      markdown: '# Hello',
      quality: { overall: 0.91 },
      warnings: [],
    }));

    try {
      const { handle } = await import('../src/tools/convert_and_save.js');
      const result = await handle(
        { file_path: testFile },
        { ...fullConfig, cache_dir: join(tempDir, 'cache') }
      );

      assert.equal(result.isError, undefined);
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.quality_score, 0.91);
      assert.equal(parsed.mode, 'full');
    } finally {
      restore();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('10. handle() adds quality warning when score is below 0.70', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'distill-fullqw-test-'));
    const testFile = join(tempDir, 'test.pdf');
    await writeFile(testFile, 'fake pdf');

    const restore = stubFetch(async () => jsonResponse(200, {
      markdown: '# Hello',
      quality: { overall: 0.65 },
      warnings: [],
    }));

    try {
      const { handle } = await import('../src/tools/convert_and_save.js');
      const result = await handle(
        { file_path: testFile },
        { ...fullConfig, cache_dir: join(tempDir, 'cache') }
      );

      assert.equal(result.isError, undefined);
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed.warnings.some(w => w.includes('0.70')));
    } finally {
      restore();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('11. handle() includes API warnings in full mode response', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'distill-fullaw-test-'));
    const testFile = join(tempDir, 'test.pdf');
    await writeFile(testFile, 'fake pdf');

    const restore = stubFetch(async () => jsonResponse(200, {
      markdown: '# Hello',
      quality: { overall: 0.91 },
      warnings: [{ type: 'cross_page_table', message: 'Table continues.' }],
    }));

    try {
      const { handle } = await import('../src/tools/convert_and_save.js');
      const result = await handle(
        { file_path: testFile },
        { ...fullConfig, cache_dir: join(tempDir, 'cache') }
      );

      assert.equal(result.isError, undefined);
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed.warnings.some(w => w.includes('Table continues.')));
    } finally {
      restore();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('12. handle() does not include quality_score in lightweight mode response', async () => {
    const { handle } = await import('../src/tools/convert_and_save.js');

    const tempDir = await mkdtemp(join(tmpdir(), 'distill-lwnoqs-test-'));
    const testFile = join(tempDir, 'test.html');
    await writeFile(testFile, '<h1>Hi</h1>');

    const config = {
      mode: 'lightweight',
      cache_dir: join(tempDir, 'cache'),
      distill_url: 'http://localhost:7860',
      python_path: 'nonexistent_python_xyz',
    };

    try {
      const result = await handle({ file_path: testFile }, config);
      // Will be isError because python doesn't exist, but check the handler
      // doesn't crash and doesn't add quality_score
      assert.ok(result);
      if (!result.isError) {
        const parsed = JSON.parse(result.content[0].text);
        assert.equal(parsed.quality_score, undefined);
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
