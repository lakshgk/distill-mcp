# Full Mode Setup

Full mode sends documents to the Distill REST API running in Docker. It supports
all lightweight formats plus scanned PDFs (via OCR) and audio transcription.

## Prerequisites

- **Node.js 22 or later**
  Download from [nodejs.org](https://nodejs.org/) if not already installed.
  Verify: `node --version`

- **Docker Desktop installed and running**
  If Docker is not installed, download it from
  <https://docs.docker.com/get-docker/>

  After installing, verify Docker is running:
  ```bash
  docker info
  ```
  This should print system information without errors.

- **Distill service running via Docker**
  From your Distill project directory:
  ```bash
  docker compose up -d
  ```
  Verify the service is up:
  ```bash
  curl http://localhost:7860/docs
  ```
  You should see an HTML page (Swagger UI). If the command fails, check that
  Docker is running and the container started without errors
  (`docker compose logs`).

> **If you skip this step** and launch the MCP server, the first conversion
> will fail with:
> ```
> Distill service is not running. Start it with: docker compose up -d
> Then restart Claude Desktop.
> ```
> This same error appears whether Docker is not installed, Docker is installed
> but not running, or the Distill container has not been started. If you see
> this error, start by confirming Docker is installed and running, then start
> the Distill service with `docker compose up -d`.

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

**macOS / Linux / Windows** (config is identical on all platforms):

```json
{
  "mcpServers": {
    "distill-mcp": {
      "command": "npx",
      "args": ["-y", "distill-mcp"],
      "env": {
        "DISTILL_MCP_CONFIG": "{\"mode\":\"full\",\"distill_url\":\"http://localhost:7860\"}"
      }
    }
  }
}
```

If Distill is running on a non-default host or port, change `distill_url`:

```json
"DISTILL_MCP_CONFIG": "{\"mode\":\"full\",\"distill_url\":\"http://192.168.1.50:7860\"}"
```

## Config reference

| Key | Type | Required | Default | Description |
|---|---|---|---|---|
| `mode` | string | Yes | — | Must be `"full"` |
| `distill_url` | string | No | `http://localhost:7860` | Distill service base URL |
| `cache_dir` | string | No | `~/Documents/distill-cache` | Directory where converted `.md` files are saved |

## Supported formats

Full mode supports everything in lightweight mode, plus additional formats.

| Category | Extensions |
|---|---|
| Microsoft Word | `.docx`, `.doc`, `.odt` |
| Microsoft Excel | `.xlsx`, `.xlsm`, `.csv` |
| Microsoft PowerPoint | `.pptx`, `.ppt` |
| PDF (native text and scanned/OCR) | `.pdf` |
| HTML | `.html`, `.htm` |
| Audio | `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg` |
| EPUB | `.epub` |
| JSON | `.json` |
| SQL | `.sql` |
| WSDL | `.wsdl`, `.wsd` |

## Quality score

Full mode returns a `quality_score` (0.0–1.0) with every conversion. It
measures heading, table, and list preservation plus token efficiency.

- **0.70 and above:** Good conversion. No warning.
- **Below 0.70:** A warning is included in the response:
  ```
  Quality score 0.65 is below threshold (0.70). The conversion completed
  but some structure may be lost. Check the document for complex tables
  or non-standard formatting.
  ```

The conversion is always returned regardless of the score — the warning is
informational, not a failure. The 0.70 threshold is fixed and not configurable.

## Test it

Restart Claude Desktop (fully quit and reopen, including the system tray icon
on Windows). The distill connector should appear in the connectors list.

In a new conversation, type:

> Convert using distill C:\Users\me\Documents\report.pdf to markdown

Claude will call the `convert_and_save` tool, send the file to Distill, and
return the Markdown content. The converted file is also saved to your cache
directory.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Distill service is not running` | Docker not installed, not running, or container not started | Install Docker from [docs.docker.com/get-docker](https://docs.docker.com/get-docker/), start it, then run `docker compose up -d` |
| Health check timeout | Docker Desktop not running, or wrong `distill_url` | Verify Docker is running (`docker info`), check the URL matches your Distill service |
| Quality score warning | Document has complex tables or non-standard formatting | Review the converted Markdown for accuracy. The conversion is still usable |
| `File not found` | Path must be absolute | Provide the full path, e.g. `C:\Users\me\Documents\report.pdf`, not `report.pdf` |
| Tool does not appear in Claude Desktop | Config JSON is malformed or server failed to start | Check `%APPDATA%\Claude\logs\mcp-server-distill.log` (Windows) or `~/Library/Logs/Claude/mcp-server-distill.log` (macOS) for errors |
| Claude asks to upload instead of using the tool | Model did not auto-select the tool | Include "distill" in your prompt: "Convert using distill ..." |
| "Taking longer than usual" during conversion | Large file — Distill needs more time | This is normal for large documents. The conversion will complete |
