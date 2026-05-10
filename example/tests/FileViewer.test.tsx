import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("deduplicates repeated selectionchange events for the same selection", async () => {
    fetchMock.mockResolvedValue(
      new Response("hello from txt", {
        status: 200,
      }),
    );

    const onTextSelect = vi.fn();
    render(
      <FileViewer
        src="https://example.com/file.txt"
        fileName="file.txt"
        fileId="sample:file.txt"
        onTextSelect={onTextSelect}
      />,
    );

    const selectedTextNode = (await screen.findByText("hello from txt")).firstChild as Text;
    const selectionRange = {
      startContainer: selectedTextNode,
      endContainer: selectedTextNode,
    } as unknown as Range;

    const getSelectionSpy = vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "hello from txt",
      rangeCount: 1,
      anchorNode: selectedTextNode,
      getRangeAt: () => selectionRange,
    } as unknown as Selection);

    document.dispatchEvent(new Event("selectionchange"));
    document.dispatchEvent(new Event("selectionchange"));

    expect(onTextSelect).toHaveBeenCalledTimes(1);

    getSelectionSpy.mockRestore();
  });

  it("ignores selections that extend outside the viewer", async () => {
    fetchMock.mockResolvedValue(
      new Response("hello from txt", {
        status: 200,
      }),
    );

    const onTextSelect = vi.fn();
    render(
      <div>
        <FileViewer
          src="https://example.com/file.txt"
          fileName="file.txt"
          fileId="sample:file.txt"
          onTextSelect={onTextSelect}
        />
        <div data-testid="outside">outside payload panel</div>
      </div>,
    );

    const insideTextNode = (await screen.findByText("hello from txt")).firstChild as Text;
    const outsideTextNode = screen.getByTestId("outside").firstChild as Text;
    const selectionRange = {
      startContainer: insideTextNode,
      endContainer: outsideTextNode,
      commonAncestorContainer: document.body,
    } as unknown as Range;

    const getSelectionSpy = vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "hello from txt outside payload panel",
      rangeCount: 1,
      anchorNode: insideTextNode,
      focusNode: outsideTextNode,
      getRangeAt: () => selectionRange,
    } as unknown as Selection);

    document.dispatchEvent(new Event("selectionchange"));

    expect(onTextSelect).not.toHaveBeenCalled();

    getSelectionSpy.mockRestore();
  });

  it("opens the search UI only after ctrl+f", async () => {
    fetchMock.mockResolvedValue(
      new Response("hello from txt", {
        status: 200,
      }),
    );

    const { container } = render(
      <FileViewer src="https://example.com/file.txt" fileName="file.txt" />,
    );

    await screen.findByText("hello from txt");
    expect(screen.queryByPlaceholderText("Search this file")).not.toBeInTheDocument();

    fireEvent.keyDown(container.firstElementChild as HTMLElement, {
      key: "f",
      ctrlKey: true,
    });

    expect(await screen.findByPlaceholderText("Search this file")).toBeInTheDocument();
  });

  it("applies programmatic search via searchMode", async () => {
    fetchMock.mockResolvedValue(
      new Response("alpha beta alpha", {
        status: 200,
      }),
    );

    const { container } = render(
      <FileViewer
        src="https://example.com/file.txt"
        fileName="file.txt"
        searchMode={{ text: "alpha" }}
      />,
    );

    await screen.findByText("alpha beta alpha");
    expect(screen.queryByPlaceholderText("Search this file")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(
        container.querySelectorAll('mark[data-file-viewer-search-match="true"]').length,
      ).toBeGreaterThan(0);
    });
  });

  it("matches escaped newline sequences in searchMode", async () => {
    fetchMock.mockResolvedValue(
      new Response("!doctype html>\n<html>\n<body>Hello</body>", {
        status: 200,
      }),
    );

    const { container } = render(
      <FileViewer
        src="https://example.com/file.txt"
        fileName="file.txt"
        searchMode={{ text: "!doctype html>\\n<html>\\n" }}
      />,
    );

    await screen.findByText("!doctype html>");

    await waitFor(() => {
      expect(
        container.querySelectorAll('mark[data-file-viewer-search-match="true"]').length,
      ).toBeGreaterThan(0);
    });
  });

  it("searches HTML source when the query targets markup text", async () => {
    fetchMock.mockResolvedValue(
      new Response("<!doctype html>\n<html>\n  <body>Hello</body>\n</html>", {
        status: 200,
      }),
    );

    const { container } = render(
      <FileViewer
        src="https://example.com/file.html"
        fileName="file.html"
        searchMode={{ text: "!doctype html>\\n<html>\\n" }}
      />,
    );

    await screen.findByText(/<!doctype html>/i);

    await waitFor(() => {
      expect(
        container.querySelectorAll('mark[data-file-viewer-search-match="true"]').length,
      ).toBeGreaterThan(0);
    });
  });

  it("searches syntax-highlighted code without inserting fake spaces between tokens", async () => {
    fetchMock.mockResolvedValue(
      new Response('console.log(greet("Edithly"));\n', {
        status: 200,
      }),
    );

    const { container } = render(
      <FileViewer
        src="https://example.com/file.ts"
        fileName="file.ts"
        searchMode={{ text: 'console.log(greet("Edithly"));' }}
      />,
    );

    await screen.findByText(/console/i);

    await waitFor(() => {
      expect(
        container.querySelectorAll('mark[data-file-viewer-search-match="true"]').length,
      ).toBeGreaterThan(0);
    });
  });

  it("searches syntax-highlighted code with real spaces between tokens", async () => {
    fetchMock.mockResolvedValue(
      new Response("export function greet(name: string): string {\n  return `Hello, ${name}`;\n}", {
        status: 200,
      }),
    );

    const { container } = render(
      <FileViewer
        src="https://example.com/file.ts"
        fileName="file.ts"
        searchMode={{ text: "string {" }}
      />,
    );

    await screen.findByText(/export/i);

    await waitFor(() => {
      expect(
        container.querySelectorAll('mark[data-file-viewer-search-match="true"]').length,
      ).toBeGreaterThan(0);
    });
  });

  it("searches syntax-highlighted code across new lines", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        'export function greet(name: string): string {\n  return `Hello, ${name}`;\n}\n\nconsole.log(greet("Edithly"));\n',
        {
          status: 200,
        },
      ),
    );

    const { container } = render(
      <FileViewer
        src="https://example.com/file.ts"
        fileName="file.ts"
        searchMode={{ text: '}\\n\\nconsole.log(greet("Edithly"));' }}
      />,
    );

    await screen.findByText(/console/i);

    await waitFor(() => {
      expect(
        container.querySelectorAll('mark[data-file-viewer-search-match="true"]').length,
      ).toBeGreaterThan(0);
    });
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
