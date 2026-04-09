# Lightweight Mode Setup

Lightweight mode shells out to the distill-core Python library to convert
documents. No Docker required.

## Prerequisites

- **Node.js 22 or later**
  Download from [nodejs.org](https://nodejs.org/) if not already installed.
  Verify: `node --version`

- **Python 3**
  The Python command differs by operating system:
  - **Windows:** Install from [python.org](https://www.python.org/downloads/).
    The standard launcher is invoked as `py`.
  - **macOS/Linux:** Typically pre-installed. Invoked as `python3`.
  Verify: `py --version` (Windows) or `python3 --version` (macOS/Linux)

- **distill-core Python package**
  Install via pip:
  - **Windows:** `py -m pip install distill-core`
  - **macOS/Linux:** `python3 -m pip install distill-core`

## Installation

No global install required. The server runs via `npx`:

```bash
npx -y distill-mcp
```

## Configuration

Open your `claude_desktop_config.json`:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the distill server to the `mcpServers` section.

**macOS / Linux:**

```json
{
  "mcpServers": {
    "distill-mcp": {
      "command": "npx",
      "args": ["-y", "distill-mcp"],
      "env": {
        "DISTILL_MCP_CONFIG": "{\"mode\":\"lightweight\",\"python_path\":\"python3\"}"
      }
    }
  }
}
```

**Windows:**

```json
{
  "mcpServers": {
    "distill-mcp": {
      "command": "npx",
      "args": ["-y", "distill-mcp"],
      "env": {
        "DISTILL_MCP_CONFIG": "{\"mode\":\"lightweight\",\"python_path\":\"py\"}"
      }
    }
  }
}
```

The only difference is `python_path` — `"python3"` on macOS/Linux, `"py"` on
Windows.

## Config reference

| Key | Type | Required | Default | Description |
|---|---|---|---|---|
| `mode` | string | Yes | — | Must be `"lightweight"` |
| `python_path` | string | No | `"py"` (Windows) / `"python3"` (macOS/Linux) | Path to Python binary |
| `cache_dir` | string | No | `~/Documents/distill-cache` | Directory where converted `.md` files are saved |

## Supported formats

| Category | Extensions |
|---|---|
| Microsoft Word | `.docx`, `.doc`, `.odt` |
| Microsoft Excel | `.xlsx`, `.xlsm`, `.csv` |
| Microsoft PowerPoint | `.pptx`, `.ppt` |
| PDF (native text only) | `.pdf` |
| HTML | `.html`, `.htm` |

Scanned/image PDFs are not supported in lightweight mode. Use
[full mode](full-setup.md) for OCR and audio transcription.

## Test it

Restart Claude Desktop (fully quit and reopen). In a new conversation, type:

> Convert using distill C:\Users\me\Documents\report.pdf to markdown

Claude will call the `convert_and_save` tool and return the Markdown content.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ModuleNotFoundError: No module named 'distill'` | distill-core is not installed | Run `py -m pip install distill-core` (Windows) or `python3 -m pip install distill-core` (macOS/Linux) |
| `No module named distill.__main__` | Wrong invocation — distill-core has no CLI entry point | Ensure `python_path` is set correctly (`py` on Windows, `python3` on macOS/Linux). The server uses the Python API, not `python -m distill` |
| `File not found` | Path must be absolute | Provide the full path, e.g. `C:\Users\me\Documents\report.pdf`, not `report.pdf` |
| `Unsupported format` | File extension is not in the lightweight supported list | Check the supported formats table above. For scanned PDFs and audio, switch to [full mode](full-setup.md) |
| Claude asks to upload instead of using the tool | Model did not auto-select the tool | Include "distill" in your prompt: "Convert using distill ..." |
