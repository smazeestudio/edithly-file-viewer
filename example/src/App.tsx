import { useEffect, useMemo, useState } from "react";
import { FileViewer } from "@smazeeapps/file-viewer";
import type { TextSelectionPayload } from "@smazeeapps/file-viewer";

type DemoOption = {
  label: string;
  fileName: string;
  src: string;
};

const demoFiles: DemoOption[] = [
  { label: "Markdown", fileName: "example.md", src: "/samples/example.md" },
  { label: "Text", fileName: "server.log", src: "/samples/server.log" },
  { label: "Code", fileName: "example.ts", src: "/samples/example.ts" },
  { label: "HTML", fileName: "preview.html", src: "/samples/preview.html" },
  { label: "CSV", fileName: "metrics.csv", src: "/samples/metrics.csv" },
  { label: "Excel", fileName: "report.xlsx", src: "/samples/report.xlsx" },
  { label: "JSON", fileName: "config.json", src: "/samples/config.json" },
  { label: "Broken JSON", fileName: "broken.json", src: "/samples/broken.json" },
  { label: "DOCX", fileName: "proposal.docx", src: "/samples/proposal.docx" },
  { label: "PPTX", fileName: "deck.pptx", src: "/samples/deck.pptx" },
  { label: "Image", fileName: "sample.svg", src: "/samples/sample.svg" }
];

export function App() {
  const [selected, setSelected] = useState<DemoOption>(demoFiles[0]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [searchText, setSearchText] = useState("");
  const [selectionPayload, setSelectionPayload] = useState<TextSelectionPayload | null>(null);

  const viewerProps = useMemo(() => {
    if (uploadedFile) {
      return {
        src: uploadedFile,
        fileName: uploadedFile.name,
        fileId: `upload:${uploadedFile.name}`,
      };
    }

    return {
      src: selected.src,
      fileName: selected.fileName,
      fileId: `sample:${selected.fileName}`,
    };
  }, [selected, uploadedFile]);

  useEffect(() => {
    setSelectionPayload(null);
  }, [viewerProps.fileId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme === "dark" ? "#020617" : "#f8fafc",
        color: theme === "dark" ? "#e2e8f0" : "#0f172a",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 32 }}>File Viewer Test Workspace</h1>
            <p style={{ margin: "8px 0 0", opacity: 0.75 }}>
              Use built-in samples or upload your own files without mixing test tooling into the package.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
            style={buttonStyle}
          >
            Theme: {theme}
          </button>
        </div>

        <div
          style={{
            marginTop: 24,
            marginBottom: 24,
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <label style={fieldStyle}>
            <span>Sample file</span>
            <select
              value={selected.fileName}
              onChange={(event) => {
                const next = demoFiles.find((item) => item.fileName === event.target.value);
                if (next) {
                  setSelected(next);
                  setUploadedFile(null);
                }
              }}
              style={inputStyle}
            >
              {demoFiles.map((item) => (
                <option key={item.fileName} value={item.fileName}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label style={fieldStyle}>
            <span>Upload local file</span>
            <input
              type="file"
              onChange={(event) => setUploadedFile(event.target.files?.[0] ?? null)}
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span>Programmatic search</span>
            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Type text to highlight"
              style={inputStyle}
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setUploadedFile(null);
              setSearchText("");
            }}
            style={{ ...buttonStyle, alignSelf: "end", height: 44 }}
          >
            Reset demo
          </button>
        </div>

        <div style={{ marginBottom: 12, opacity: 0.8 }}>
          Now viewing: <strong>{viewerProps.fileName}</strong>
        </div>

        <div
          style={{
            marginBottom: 16,
            border: `1px solid ${theme === "dark" ? "#334155" : "#cbd5e1"}`,
            borderRadius: 14,
            padding: 16,
            background: theme === "dark" ? "#0f172a" : "#ffffff",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
            Selection Payload
          </div>
          {selectionPayload ? (
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 13,
                lineHeight: 1.6,
                fontFamily:
                  'ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                color: theme === "dark" ? "#bfdbfe" : "#1d4ed8",
              }}
            >
              {JSON.stringify(selectionPayload, null, 2)}
            </pre>
          ) : (
            <div style={{ fontSize: 14, opacity: 0.7 }}>
              Select text inside the viewer to see the emitted JSON payload here.
            </div>
          )}
        </div>

        <FileViewer
          src={viewerProps.src}
          fileName={viewerProps.fileName}
          fileId={viewerProps.fileId}
          height="70vh"
          theme={theme}
          searchMode={searchText.trim() ? { text: searchText } : undefined}
          onTextSelect={setSelectionPayload}
        />
      </div>
    </div>
  );
}

const fieldStyle = {
  display: "grid",
  gap: 8,
  fontSize: 14,
} as const;

const inputStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  background: "#fff",
  color: "#0f172a",
} as const;

const buttonStyle = {
  border: "1px solid #94a3b8",
  borderRadius: 999,
  padding: "10px 16px",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
} as const;
