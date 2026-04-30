# `@edithly/file-viewer`

React-based browser file viewer with a single component API and per-format lazy-loaded renderers.

## Install

```bash
npm install @edithly/file-viewer react react-dom
```

## Usage

```tsx
import { FileViewer } from "@edithly/file-viewer";

export function Example() {
  return (
    <FileViewer
      src="https://example.com/file.pdf"
      fileName="file.pdf"
      height="800px"
      theme="light"
    />
  );
}
```

## Supported formats

- PDF
- Text / logs
- Source code
- HTML
- Markdown
- CSV
- Excel
- JSON
- Images

## Notes

- Viewer modules are lazy-loaded to reduce base bundle size.
- The package is SSR-safe and only accesses browser APIs inside effects.
- Unsupported file types render a fallback state instead of throwing.
