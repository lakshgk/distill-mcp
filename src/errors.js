class DistillMcpError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DistillMcpError';
    this.code = code;
  }
}

class ConfigError extends DistillMcpError {
  constructor(message) {
    super('CONFIG_ERROR', message);
    this.name = 'ConfigError';
  }
}

class FileNotFoundError extends DistillMcpError {
  constructor(message) {
    super('FILE_NOT_FOUND_ERROR', message);
    this.name = 'FileNotFoundError';
  }
}

class UnsupportedFormatError extends DistillMcpError {
  constructor(message) {
    super('UNSUPPORTED_FORMAT_ERROR', message);
    this.name = 'UnsupportedFormatError';
  }
}

class DistillUnavailableError extends DistillMcpError {
  constructor(message) {
    super('DISTILL_UNAVAILABLE_ERROR', message);
    this.name = 'DistillUnavailableError';
  }
}

class CacheWriteError extends DistillMcpError {
  constructor(message) {
    super('CACHE_WRITE_ERROR', message);
    this.name = 'CacheWriteError';
  }
}

class ConversionError extends DistillMcpError {
  constructor(message) {
    super('CONVERSION_ERROR', message);
    this.name = 'ConversionError';
  }
}

export {
  DistillMcpError,
  ConfigError,
  FileNotFoundError,
  UnsupportedFormatError,
  DistillUnavailableError,
  CacheWriteError,
  ConversionError,
};
