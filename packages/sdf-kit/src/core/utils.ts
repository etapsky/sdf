// ─── SDF Utilities ────────────────────────────────────────────────────────────

// Safely parse JSON — returns null on failure instead of throwing
export function safeParseJSON(raw: string): unknown | null {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  
  // Check if a value is a plain object (not array, not null)
  export function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
  
  // Format bytes to human-readable string
  export function formatBytes(bytes: number): string {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  
  // Check for path traversal in ZIP entry paths (SDF_FORMAT.md Section 11.4)
  export function hasPathTraversal(filePath: string): boolean {
    return (
      filePath.includes('..') ||
      filePath.includes('\\') ||
      filePath.startsWith('/')
    );
  }