/**
 * Client-Side PDF Text Extractor Utility
 * 
 * Extracts plain text from PDF files in the browser without heavy external dependencies.
 * Handles text streams (BT...ET blocks, Tj and TJ operators, hex strings, escaped octal).
 * Provides fallback text extraction for students when analyzing PDFs offline or without an API key.
 */

/**
 * Extract plain text content from a PDF ArrayBuffer or Uint8Array
 * @param {ArrayBuffer|Uint8Array} buffer 
 * @returns {Promise<string>} Extracted text content
 */
export async function extractTextFromPdfBuffer(buffer) {
  try {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const decoder = new TextDecoder("latin1");
    const rawString = decoder.decode(bytes);

    const textPieces = [];

    // Find all stream ... endstream blocks
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;

    while ((match = streamRegex.exec(rawString)) !== null) {
      const streamContent = match[1];

      // Extract text inside BT ... ET (Begin Text ... End Text) blocks
      const btRegex = /BT[\r\n]+([\s\S]*?)[\r\n]+ET/g;
      let btMatch;

      while ((btMatch = btRegex.exec(streamContent)) !== null) {
        const textBlock = btMatch[1];
        const extracted = parseTextBlock(textBlock);
        if (extracted.trim()) {
          textPieces.push(extracted);
        }
      }
    }

    // If stream parsing found text, join it
    if (textPieces.length > 0) {
      return textPieces.join("\n");
    }

    // Secondary pass: Scan directly for readable string operators in raw string
    const fallbackPieces = [];
    const directBtRegex = /BT[\r\n]+([\s\S]*?)[\r\n]+ET/g;
    let directMatch;

    while ((directMatch = directBtRegex.exec(rawString)) !== null) {
      const block = directMatch[1];
      const parsed = parseTextBlock(block);
      if (parsed.trim()) {
        fallbackPieces.push(parsed);
      }
    }

    if (fallbackPieces.length > 0) {
      return fallbackPieces.join("\n");
    }

    // Tertiary pass: regex search for parenthesized strings followed by Tj or ' or "
    const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
    let tjMatch;
    const tjPieces = [];
    while ((tjMatch = tjRegex.exec(rawString)) !== null) {
      const cleaned = cleanPdfString(tjMatch[1]);
      if (cleaned.length > 1) {
        tjPieces.push(cleaned);
      }
    }

    return tjPieces.join(" ");
  } catch (err) {
    console.warn("Client-side PDF text extraction encountered an error:", err);
    return "";
  }
}

/**
 * Parse a single PDF BT ... ET text block
 */
function parseTextBlock(block) {
  const lines = [];

  // Match TJ operator: array of strings and spacing adjustments e.g. [(Hello) -10 (World)] TJ
  const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
  let tjArrayMatch;
  while ((tjArrayMatch = tjArrayRegex.exec(block)) !== null) {
    const arrayContent = tjArrayMatch[1];
    const stringRegex = /\(([^)]*)\)/g;
    let strMatch;
    const parts = [];
    while ((strMatch = stringRegex.exec(arrayContent)) !== null) {
      parts.push(cleanPdfString(strMatch[1]));
    }
    if (parts.length > 0) {
      lines.push(parts.join(""));
    }
  }

  // Match single Tj operator: (Hello) Tj
  const singleTjRegex = /\(([^)]*)\)\s*(?:Tj|'|")/g;
  let singleMatch;
  while ((singleMatch = singleTjRegex.exec(block)) !== null) {
    lines.push(cleanPdfString(singleMatch[1]));
  }

  // Match hex strings: <48656c6c6f> Tj
  const hexTjRegex = /<([0-9a-fA-F]+)>\s*(?:Tj|TJ)/g;
  let hexMatch;
  while ((hexMatch = hexTjRegex.exec(block)) !== null) {
    lines.push(decodeHexPdfString(hexMatch[1]));
  }

  return lines.join(" ");
}

/**
 * Clean and unescape standard PDF literal string characters
 */
function cleanPdfString(str) {
  if (!str) return "";
  return str
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

/**
 * Decode hex encoded PDF string (e.g. 48656c6c6f -> Hello)
 */
function decodeHexPdfString(hex) {
  let str = "";
  for (let i = 0; i < hex.length; i += 2) {
    const code = parseInt(hex.substr(i, 2), 16);
    if (!isNaN(code) && code >= 32 && code <= 126) {
      str += String.fromCharCode(code);
    }
  }
  return str;
}
