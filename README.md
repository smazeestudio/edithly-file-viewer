# `@edithly/file-viewer`

React file viewer for rendering common document, text, code, and image formats in the browser with a single component.

The package is built for browser-based preview workflows where you want one entry point, lazy-loaded format-specific viewers, and a consistent UI for file inspection.

## Features

- Single `FileViewer` component API
- Supports remote URLs and local `File` objects
- Lazy-loads heavy viewers by file type
- Built-in search toolbar for searchable viewer content
- Emits text-selection metadata through `onTextSelect`
- Light and dark themes
- TypeScript types included

## Supported file types

The viewer detects format from `fileName`:

- `pdf`
- `docx`
- `ppt` / `pptx`
- `txt` / `log`
- code files: `js`, `ts`, `tsx`, `jsx`, `py`, `java`, `cpp`, `c`, `go`, `rs`, `php`, `rb`, `css`, `scss`, `sql`, `yaml`, `yml`, `xml`
- `html` / `htm`
- `md` / `markdown`
- `csv`
- `xls` / `xlsx`
- `json`
- images: `png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `bmp`, `ico`

Unknown extensions fall back to an unsupported-file state instead of throwing.

## Install

```bash
npm install @edithly/file-viewer react react-dom
```

## Basic usage

```tsx
import { FileViewer } from "@edithly/file-viewer";

export function Example() {
  return (
    <FileViewer
      src="https://example.com/files/report.pdf"
      fileName="report.pdf"
      height="800px"
      theme="light"
    />
  );
}
```

## With local uploads

```tsx
import { useState } from "react";
import { FileViewer } from "@edithly/file-viewer";

export function UploadPreview() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div>
      <input
        type="file"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />

      {file ? (
        <FileViewer
          src={file}
          fileName={file.name}
          fileId={`upload:${file.name}`}
          height="70vh"
          theme="dark"
        />
      ) : null}
    </div>
  );
}
```

## API

### `FileViewer`

```tsx
type FileViewerTheme = "light" | "dark";

type TextSelectionPayload = {
  file_name: string;
  file_id?: string;
  text: string;
  page_number?: number;
  line_number?: string;
};

type FileViewerProps = {
  src: string | File;
  fileName: string;
  fileId?: string;
  height?: string;
  theme?: FileViewerTheme;
  onTextSelect?: (payload: TextSelectionPayload) => void;
};
```

### Props

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `src` | `string \| File` | yes | Remote file URL or browser `File` object |
| `fileName` | `string` | yes | Used for file-type detection |
| `fileId` | `string` | no | Passed back in selection events |
| `height` | `string` | no | Defaults to `"800px"` |
| `theme` | `"light" \| "dark"` | no | Defaults to `"light"` |
| `onTextSelect` | `(payload) => void` | no | Fired when text is selected inside supported viewers |

## Exports

```tsx
import {
  FileViewer,
  detectFileType,
  type FileViewerProps,
  type FileViewerTheme,
  type FileKind,
  type TextSelectionPayload,
} from "@edithly/file-viewer";
```

## Viewer behavior

- PDF viewer supports single-page, continuous, and two-column reading modes.
- HTML, Markdown, and CSV viewers provide preview/source-style workflows.
- JSON files render as a tree, and invalid JSON shows parser errors with line context.
- Code files use Prism-based syntax highlighting with line numbers.
- Excel files render worksheet data in a spreadsheet-like table.
- DOCX and PPTX files are rendered in-browser without requiring external services.

## Search and text selection

`FileViewer` includes a search bar above the content area. Search highlights matches inside the rendered viewer content where the DOM is searchable.

If you provide `onTextSelect`, the component emits a payload like:

```json
{
  "file_name": "example.ts",
  "file_id": "sample:example.ts",
  "text": "selected text",
  "page_number": 2,
  "line_number": "14-16"
}
```

`page_number` and `line_number` are included when the active viewer can resolve them.

## Development

### Package scripts

```bash
npm run build
npm run dev
npm run typecheck
```

### Example app

The repository includes a separate example workspace in [`example`](./example) with sample files and tests.

```bash
cd example
npm install
npm run demo
```

Useful example scripts:

- `npm test`
- `npm run test:watch`
- `npm run typecheck`

## Notes

- This package is intended for browser environments. Browser-only APIs are used inside effects and lazy-loaded viewers.
- PDF rendering depends on `pdfjs-dist` and configures its worker at runtime.
- Remote file URLs must be fetchable by the browser running your app.

## License

MIT
