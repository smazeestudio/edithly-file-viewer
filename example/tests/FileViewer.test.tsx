import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileViewer } from "@edithly/file-viewer";

const fetchMock = vi.fn<typeof fetch>();
globalThis.fetch = fetchMock;

afterEach(() => {
  fetchMock.mockReset();
});

describe("FileViewer", () => {
  it("renders unsupported fallback for unknown types", async () => {
    render(<FileViewer src="https://example.com/file.bin" fileName="file.bin" />);

    expect(await screen.findByText("Unsupported file type")).toBeInTheDocument();
  });

  it("renders text files", async () => {
    fetchMock.mockResolvedValue(
      new Response("hello from txt", {
        status: 200,
      }),
    );

    render(<FileViewer src="https://example.com/file.txt" fileName="file.txt" />);

    expect(await screen.findByText("hello from txt")).toBeInTheDocument();
  });

  it("renders markdown files", async () => {
    fetchMock.mockResolvedValue(
      new Response("# Heading\n\nThis is markdown.", {
        status: 200,
      }),
    );

    render(<FileViewer src="https://example.com/file.md" fileName="file.md" />);

    expect(await screen.findByRole("heading", { name: "Heading" })).toBeInTheDocument();
    expect(await screen.findByText("This is markdown.")).toBeInTheDocument();
  });

  it("renders json files", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ feature: "viewer", enabled: true }), {
        status: 200,
      }),
    );

    render(<FileViewer src="https://example.com/file.json" fileName="file.json" />);

    expect(await screen.findByText(/"feature": "viewer"/)).toBeInTheDocument();
    expect(await screen.findByText(/"enabled": true/)).toBeInTheDocument();
  });
});
