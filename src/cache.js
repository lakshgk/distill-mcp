import { mkdir, writeFile, access } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

export async function save(markdown, sourcePath, cacheDir) {
  const sourceBase = basename(sourcePath);
  const ext = extname(sourceBase);
  const nameWithoutExt = ext ? sourceBase.slice(0, -ext.length) : sourceBase;
  const cacheFilename = `${nameWithoutExt}.md`;
  const targetPath = join(cacheDir, cacheFilename);

  let overwritten = false;

  try {
    try {
      await access(targetPath);
      overwritten = true;
    } catch {
      overwritten = false;
    }

    await mkdir(cacheDir, { recursive: true });
    await writeFile(targetPath, markdown, 'utf-8');

    return { cachedAt: targetPath, overwritten };
  } catch (err) {
    return { cachedAt: null, overwritten: false, saveError: err.message };
  }
}
