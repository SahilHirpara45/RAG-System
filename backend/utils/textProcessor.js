const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

/**
 * Text Processor Utility
 *
 * Handles text extraction from different file types and intelligent
 * chunking with overlap to prevent context loss at boundaries.
 */

/**
 * Extract text from uploaded file buffer
 *
 * @param {Object} file - Express file upload object
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromFile(file) {
  const mimeType = file.mimetype;

  if (mimeType === "text/plain") {
    return file.data.toString("utf-8");
  }

  if (mimeType === "application/pdf") {
    const pdfData = await pdfParse(file.data);
    return pdfData.text;
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: file.data });
    return result.value;
  }

  throw new Error(
    `Unsupported file type: ${mimeType}. Supported: PDF, DOCX, TXT`
  );
}

/**
 * Clean extracted text — remove extra whitespace, control characters, etc.
 *
 * @param {string} text - Raw text
 * @returns {string} - Cleaned text
 */
function cleanText(text) {
  if (!text) return "";

  return (
    text
      // Remove HTML tags if any
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      // Remove extra whitespace
      .replace(/\s+/g, " ")
      // Remove control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim()
  );
}

/**
 * Clean HTML content from web crawling — removes scripts, styles,
 * navigation, footer, and other non-content elements.
 *
 * @param {string} html - Raw HTML
 * @param {Object} cheerio - Cheerio instance
 * @returns {string} - Extracted visible text
 */
function cleanHTMLContent(html, cheerio) {
  const $ = cheerio.load(html);

  // Remove non-content elements
  $(
    "script, style, nav, footer, header, aside, iframe, noscript, " +
      "form, button, [role='navigation'], [role='banner'], " +
      "[role='complementary'], .sidebar, .nav, .footer, .header, " +
      ".cookie-banner, .advertisement, .ad"
  ).remove();

  // Extract text from main content areas (prefer article/main)
  let text = "";
  const mainContent = $("article, main, [role='main']");

  if (mainContent.length > 0) {
    text = mainContent.text();
  } else {
    text = $("body").text();
  }

  return cleanText(text);
}

/**
 * Split text into chunks with overlap (Recursive Text Splitter)
 *
 * This is significantly better than the original simple split because:
 * 1. Uses sentence boundaries (not arbitrary character positions)
 * 2. Adds overlap between chunks to prevent context loss
 * 3. Preserves paragraph structure where possible
 *
 * @param {string} text - Text to chunk
 * @param {number} maxTokens - Maximum tokens per chunk (~4 chars = 1 token)
 * @param {number} overlapTokens - Overlap tokens between chunks
 * @returns {string[]} - Array of text chunks
 */
function chunkText(text, maxTokens = 500, overlapTokens = 50) {
  if (!text || text.trim().length === 0) return [];

  // Approximate token count (1 token ≈ 4 characters for English)
  const charsPerToken = 4;
  const maxChars = maxTokens * charsPerToken;
  const overlapChars = overlapTokens * charsPerToken;

  // First try to split by paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  // Then split paragraphs into sentences
  const sentences = [];
  for (const para of paragraphs) {
    const paraSentences = para
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);
    sentences.push(...paraSentences);
  }

  if (sentences.length === 0) return [text.trim()];

  const chunks = [];
  let currentChunk = "";
  let previousOverlap = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();

    // If adding this sentence would exceed the max, save current chunk
    if (
      currentChunk.length > 0 &&
      currentChunk.length + trimmedSentence.length + 1 > maxChars
    ) {
      chunks.push(currentChunk.trim());

      // Create overlap from the end of the current chunk
      previousOverlap = currentChunk.slice(-overlapChars).trim();
      currentChunk = previousOverlap + " " + trimmedSentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + trimmedSentence;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // Filter out very small chunks (less than 20 chars)
  return chunks.filter((chunk) => chunk.length >= 20);
}

/**
 * Format a Q&A pair for embedding
 *
 * @param {string} question
 * @param {string} answer
 * @returns {string}
 */
function formatQAPair(question, answer) {
  return `Question: ${question.trim()}\nAnswer: ${answer.trim()}`;
}

module.exports = {
  extractTextFromFile,
  cleanText,
  cleanHTMLContent,
  chunkText,
  formatQAPair,
};
