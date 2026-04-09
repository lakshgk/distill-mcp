# distill-mcp

An MCP server that connects any MCP-compatible client to Distill, converting
local documents to clean, token-efficient Markdown before the LLM reads them.
Typical token reduction is 40–80% compared to raw document text, letting the
model fit more content into its context window and reason over it faster.

Works with Claude Desktop, Claude Code, Cursor, Windsurf, and any other
MCP client that supports tool calling.

## Two Modes

| | Lightweight | Full (Docker) |
|---|---|---|
| Requires Docker | No | Yes |
| DOCX, XLSX, PPTX, native PDF, HTML | Yes | Yes |
| Scanned PDF (OCR) | No | Yes |
| Audio (MP3, WAV, etc.) | No | Yes |
| Quality score | No | Yes |
| Install time | ~2 min | ~10 min |

**Lightweight** needs only Python and pip. **Full** needs Docker with
the Distill service running. See the setup guides for details.

## Quick install

No global install required:

```bash
npx -y distill-mcp-server
```

Then configure Claude Desktop — see
[Lightweight setup](docs/lightweight-setup.md) or
[Full setup](docs/full-setup.md) for step-by-step instructions.

## Configuration

Add the server to your `claude_desktop_config.json`.

**Lightweight mode — macOS / Linux:**

```json
{
  "mcpServers": {
    "distill-mcp": {
      "command": "npx",
      "args": ["-y", "distill-mcp-server"],
      "env": {
        "DISTILL_MCP_CONFIG": "{\"mode\":\"lightweight\",\"python_path\":\"python3\"}"
      }
    }
  }
}
```

**Lightweight mode — Windows:**

```json
{
  "mcpServers": {
    "distill-mcp": {
      "command": "npx",
      "args": ["-y", "distill-mcp-server"],
      "env": {
        "DISTILL_MCP_CONFIG": "{\"mode\":\"lightweight\",\"python_path\":\"py\"}"
      }
    }
  }
}
```

**Full mode — all platforms:**

```json
{
  "mcpServers": {
    "distill-mcp": {
      "command": "npx",
      "args": ["-y", "distill-mcp-server"],
      "env": {
        "DISTILL_MCP_CONFIG": "{\"mode\":\"full\",\"distill_url\":\"http://localhost:7860\"}"
      }
    }
  }
}
```

Full config key reference is in the setup guides:
[Lightweight](docs/lightweight-setup.md#config-reference) |
[Full](docs/full-setup.md#config-reference)

## CLAUDE.md snippet

Paste this into your project's `CLAUDE.md` so Claude knows how to use the
tool automatically. Copy the block below as-is:

```markdown
## Document Conversion — distill-mcp

When the user references a local file path (e.g. a PDF, DOCX, PPTX, XLSX,
HTML, or audio file), ALWAYS call the `convert_and_save` tool before reading
or reasoning about the document. Do not read the original file directly via
filesystem tools — use only the Markdown returned by `convert_and_save` as
the document content.

### Rules

1. Call `convert_and_save` with the absolute file path before doing anything
   else with the document.
2. Use ONLY the Markdown output from `convert_and_save` as the document
   content. Never read the original file with filesystem tools.
3. If the response includes `"overwritten": true`, tell the user that a
   previous cached version was replaced before proceeding.
4. If the response includes any `warnings`, surface them to the user before
   proceeding with the document content.
5. If `convert_and_save` returns an unsupported format error, tell the user
   which formats are supported and suggest switching modes if applicable.

### Supported formats

| Category | Lightweight | Full (Docker) |
|---|---|---|
| Word | .docx, .doc, .odt | .docx, .doc, .odt |
| Excel | .xlsx, .xlsm, .csv | .xlsx, .xlsm, .csv |
| PowerPoint | .pptx, .ppt | .pptx, .ppt |
| PDF | .pdf (native text) | .pdf (native + scanned OCR) |
| HTML | .html, .htm | .html, .htm |
| Audio | — | .mp3, .wav, .m4a, .flac, .ogg |
| Other | — | .epub, .json, .sql, .wsdl, .wsd |

### Usage

Say "convert using distill" followed by the file path:
> Convert using distill C:\Users\me\Documents\report.pdf to markdown
```

The snippet is also available in
[docs/CLAUDE.md-snippet.md](docs/CLAUDE.md-snippet.md).

## Supported formats

| Category | Extensions | Lightweight | Full |
|---|---|---|---|
| Microsoft Word | `.docx`, `.doc`, `.odt` | Yes | Yes |
| Microsoft Excel | `.xlsx`, `.xlsm`, `.csv` | Yes | Yes |
| Microsoft PowerPoint | `.pptx`, `.ppt` | Yes | Yes |
| PDF (native text) | `.pdf` | Yes | Yes |
| PDF (scanned/OCR) | `.pdf` | No | Yes |
| HTML | `.html`, `.htm` | Yes | Yes |
| Audio | `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg` | No | Yes |
| EPUB | `.epub` | No | Yes |
| JSON | `.json` | No | Yes |
| SQL | `.sql` | No | Yes |
| WSDL | `.wsdl`, `.wsd` | No | Yes |

## Privacy

All processing happens locally. In lightweight mode, documents are converted
by the distill-core Python library on your machine — no data leaves your
computer. In full mode, documents are sent to the Distill Docker service
running locally on your machine — no data is sent to external services.

## Built on

[Distill](https://github.com/nicholasgasior/distill) — document-to-Markdown
conversion engine.

## License

MIT
