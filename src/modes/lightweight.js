import { execFile } from 'node:child_process';
import { ConversionError } from '../errors.js';

export async function convert(filePath, config) {
  const pythonPath = config.python_path;

  return new Promise((resolve, reject) => {
    let proc;
    try {
      proc = execFile(
        pythonPath,
        [
          '-c',
          `import distill, sys, io; sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8'); result = distill.convert(sys.argv[1]); print(result.markdown)`,
          filePath,
        ],
        { maxBuffer: 50 * 1024 * 1024, encoding: 'utf-8' },
        (error, stdout, stderr) => {
          if (error) {
            reject(
              new ConversionError(
                stderr ? stderr.trim() : error.message
              )
            );
            return;
          }
          resolve({ markdown: stdout });
        }
      );
    } catch (err) {
      reject(
        new ConversionError(
          `Failed to spawn subprocess: ${err.message}`
        )
      );
      return;
    }

    proc.on('error', (err) => {
      reject(
        new ConversionError(
          `Failed to spawn subprocess: ${err.message}`
        )
      );
    });
  });
}
