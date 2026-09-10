const axios = require("axios");
const cheerio = require("cheerio");
const { cleanHTMLContent } = require("../utils/textProcessor");

/**
 * Web Crawler Service
 *
 * Crawls websites to extract text content for training.
 * Improvements over the original:
 * - Domain restriction (prevents crawling external sites)
 * - Depth and page limits
 * - Better error handling per page
 * - Progress callback for real-time updates
 * - Deduplication of content
 */
class CrawlerService {
  /**
   * Crawl a website and extract text from all internal pages
   *
   * @param {string} startUrl - Starting URL
   * @param {Object} options
   * @param {number} [options.maxDepth=3] - Maximum crawl depth
   * @param {number} [options.maxPages=50] - Maximum pages to crawl
   * @param {number} [options.timeout=10000] - Request timeout (ms)
   * @param {Function} [options.onProgress] - Progress callback
   * @returns {Promise<Object>} - { text, pagesFound, pagesCrawled, urls }
   */
  async crawl(startUrl, options = {}) {
    const {
      maxDepth = 3,
      maxPages = 50,
      timeout = 10000,
      onProgress = null,
    } = options;

    // Parse the base domain to restrict crawling
    const baseUrl = new URL(startUrl);
    const baseDomain = baseUrl.hostname;

    const visited = new Set();
    const toVisit = [{ url: startUrl, depth: 0 }];
    const allText = [];
    const crawledUrls = [];
    let pagesCrawled = 0;

    while (toVisit.length > 0 && pagesCrawled < maxPages) {
      const { url: currentUrl, depth } = toVisit.shift();

      // Skip if already visited or exceeds depth
      if (visited.has(currentUrl) || depth > maxDepth) continue;
      visited.add(currentUrl);

      try {
        // Fetch the page
        const response = await axios.get(currentUrl, {
          timeout,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; RAGBot/1.0; +training-crawler)",
          },
          maxContentLength: 5 * 1024 * 1024, // 5MB limit
        });

        // Only process HTML content
        const contentType = response.headers["content-type"] || "";
        if (!contentType.includes("text/html")) continue;

        const html = response.data;
        const $ = cheerio.load(html);

        // Extract clean text
        const pageText = cleanHTMLContent(html, cheerio);
        if (pageText.length > 50) {
          // Only add pages with meaningful content
          allText.push(pageText);
          crawledUrls.push(currentUrl);
          pagesCrawled++;
        }

        // Report progress
        if (onProgress) {
          onProgress({
            currentUrl,
            pagesCrawled,
            pagesFound: visited.size,
            queueSize: toVisit.length,
          });
        }

        // Extract links for further crawling (only same domain)
        if (depth < maxDepth) {
          const links = $("a[href]")
            .map((_, el) => $(el).attr("href"))
            .get()
            .filter((href) => href && !href.startsWith("#") && !href.startsWith("mailto:") && !href.startsWith("tel:") && !href.startsWith("javascript:"))
            .map((href) => {
              try {
                return new URL(href, currentUrl).toString();
              } catch {
                return null;
              }
            })
            .filter((href) => {
              if (!href) return false;
              try {
                const parsedUrl = new URL(href);
                // Only follow same-domain links
                return parsedUrl.hostname === baseDomain;
              } catch {
                return false;
              }
            });

          // Add unique links to the queue
          for (const link of [...new Set(links)]) {
            if (!visited.has(link)) {
              toVisit.push({ url: link, depth: depth + 1 });
            }
          }
        }
      } catch (error) {
        // Log but don't fail — continue crawling other pages
        console.warn(`⚠  Failed to crawl ${currentUrl}: ${error.message}`);
      }
    }

    const combinedText = allText.join("\n\n");

    return {
      text: combinedText,
      pagesCrawled,
      pagesFound: visited.size,
      urls: crawledUrls,
    };
  }

  /**
   * Extract text from a single URL (no crawling)
   *
   * @param {string} url
   * @returns {Promise<string>} - Extracted text
   */
  async extractSinglePage(url) {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RAGBot/1.0; +training-crawler)",
      },
    });

    return cleanHTMLContent(response.data, cheerio);
  }
}

module.exports = new CrawlerService();
