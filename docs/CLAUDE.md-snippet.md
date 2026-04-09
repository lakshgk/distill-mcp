# CLAUDE.md Snippet for distill-mcp

Paste the block below into your project's `CLAUDE.md` file. This tells Claude
how to use the `convert_and_save` tool when it encounters document file paths.

---

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
