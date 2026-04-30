function isFile(value: string | File): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

export async function readFileAsText(src: string | File): Promise<string> {
  if (isFile(src)) {
    return src.text();
  }

  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

export async function readFileAsArrayBuffer(src: string | File): Promise<ArrayBuffer> {
  if (isFile(src)) {
    return src.arrayBuffer();
  }

  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
  }

  return response.arrayBuffer();
}

export function toObjectUrl(src: string | File): string | null {
  if (!isFile(src)) return null;
  return URL.createObjectURL(src);
}
