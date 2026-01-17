
/**
 * Compresses the terminal text using heuristic regexes.
 * Since LLMLingua-2 is not available, we use an aggressive regex-based approach.
 * 
 * 1. Strips ANSI color codes.
 * 2. Strips timestamps.
 * 3. Filters for lines containing "Error", "Exception", "Stack Trace", or stack trace frames ("at ...").
 */
export function compressText(text: string): { compressed: string; originalSize: number; compressedSize: number } {
    const originalSize = text.length;

    // 1. Strip ANSI color codes
    // eslint-disable-next-line no-control-regex
    let processed = text.replace(/\x1b\[[0-9;]*m/g, '');

    // 2. Strip Timestamps (Simple heuristics: Start of line YYYY-MM-DD...)
    processed = processed.replace(/^\d{4}-\d{2}-\d{2}.*?\s/gm, '');

    // 3. Aggressive filtering
    const lines = processed.split('\n');
    const meaningfulLines = lines.filter(line => {
        // Keep lines with Error, Exception, Stack Trace
        if (/Error|Exception|Stack Trace/i.test(line)) {
            return true;
        }
        // Keep stack trace lines (typically start with "at " in JS/TS/Java, or similar patterns)
        if (/^\s*at\s/.test(line)) {
            return true;
        }
        // Keep Python stack trace lines
        if (/^\s*File\s".*",\sline\s\d+/.test(line)) {
            return true;
        }
        return false;
    });

    let compressed = '';
    
    // If aggressive filtering removed too much (e.g. valid log with no errors), 
    // fall back to keeping the last 50 lines of the cleaned text.
    if (meaningfulLines.length === 0) {
        compressed = lines.slice(-50).join('\n');
    } else {
        compressed = meaningfulLines.join('\n');
    }

    return {
        compressed,
        originalSize,
        compressedSize: compressed.length
    };
}
