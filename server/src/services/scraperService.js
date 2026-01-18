const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const puppeteerService = require('./puppeteerService');

/**
 * Web scraper service that extracts all types of data from web pages
 * and stores them in files for chat context.
 */
class ScraperService {
    constructor() {
        this.storageDir = path.join(__dirname, '../../data/scraped');
        this.cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours
        this.rateLimit = 1000; // 1 second between requests
        this.lastRequest = 0;
    }

    /**
     * Initialize storage directory
     */
    async initialize() {
        try {
            await fs.mkdir(this.storageDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create scraper storage directory:', error.message);
        }
    }

    /**
     * Scrape a web page and extract all data
     */
    async scrapePage(url) {
        try {
            // Rate limiting
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequest;
            if (timeSinceLastRequest < this.rateLimit) {
                await new Promise(resolve => setTimeout(resolve, this.rateLimit - timeSinceLastRequest));
            }
            this.lastRequest = Date.now();

            console.log(`🕷️ Scraping: ${url}`);

            // Fetch page
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; JarvisBot/1.0; +http://jarvis.ai/bot)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-IND,en;q=0.5'
                },
                timeout: 10000,
                maxRedirects: 3
            });

            const html = response.data;
            const $ = cheerio.load(html);

            // Extract all types of data
            const scrapedData = {
                url,
                scrapedAt: new Date().toISOString(),
                domain: new URL(url).hostname,

                // Text content
                title: this.extractTitle($),
                description: this.extractDescription($),
                content: this.extractMainContent($),
                author: this.extractAuthor($),
                publishDate: this.extractPublishDate($),

                // Media
                images: this.extractImages($, url),
                videos: this.extractVideos($),

                // Metadata
                keywords: this.extractKeywords($),
                category: this.extractCategory($),
                tags: this.extractTags($),

                // Links
                links: this.extractLinks($, url),

                // Extra data
                wordCount: 0,
                readingTime: 0
            };

            // Calculate word count and reading time
            const words = scrapedData.content.split(/\s+/).filter(w => w.length > 0);
            scrapedData.wordCount = words.length;
            scrapedData.readingTime = Math.ceil(words.length / 200); // ~200 words per minute

            console.log(`✅ Scraped: ${scrapedData.title} (${scrapedData.wordCount} words)`);
            return scrapedData;

        } catch (error) {
            console.error(`❌ Scraping failed for ${url}:`, error.message);
            return null;
        }
    }

    /**
     * Advanced scraping using Puppeteer (Headless Browser)
     * Useful for SPA (Single Page Apps) and sites with anti-bot protection.
     */
    async scrapePageAdvanced(url) {
        console.log(`🕷️ [Advanced] Delegating to Puppeteer for: ${url}`);
        const data = await puppeteerService.scrapePage(url);

        if (data) {
            // Calculate word count for compatibility
            const words = data.content.split(/\s+/).filter(w => w.length > 0);
            data.wordCount = words.length;
            data.readingTime = Math.ceil(words.length / 200);

            console.log(`✅ [Advanced] Scraped: ${data.title} (${data.wordCount} words)`);
            return data;
        }
        return null;
    }

    /**
     * Extract page title
     */
    extractTitle($) {
        return $('title').text().trim() ||
            $('meta[property="og:title"]').attr('content') ||
            $('h1').first().text().trim() ||
            'No title';
    }

    /**
     * Extract description
     */
    extractDescription($) {
        return $('meta[name="description"]').attr('content') ||
            $('meta[property="og:description"]').attr('content') ||
            $('p').first().text().trim().substring(0, 200) ||
            '';
    }

    /**
     * Extract main content (article body)
     */
    extractMainContent($) {
        // Try common article containers
        const selectors = [
            'article',
            '[role="main"]',
            '.post-content',
            '.article-content',
            '.entry-content',
            '.content',
            'main'
        ];

        for (const selector of selectors) {
            const content = $(selector).first();
            if (content.length > 0) {
                // Remove scripts, styles, ads, navigation
                content.find('script, style, nav, aside, .ad, .advertisement, .social-share').remove();
                const text = content.text().trim();
                if (text.length > 100) {
                    return text;
                }
            }
        }

        // Fallback: get all paragraph text
        const paragraphs = [];
        $('p').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text.length > 50) {
                paragraphs.push(text);
            }
        });
        return paragraphs.join('\n\n');
    }

    /**
     * Extract author information
     */
    extractAuthor($) {
        return $('meta[name="author"]').attr('content') ||
            $('[rel="author"]').text().trim() ||
            $('.author').text().trim() ||
            '';
    }

    /**
     * Extract publish date
     */
    extractPublishDate($) {
        const dateStr = $('meta[property="article:published_time"]').attr('content') ||
            $('meta[name="publish_date"]').attr('content') ||
            $('time').attr('datetime') ||
            $('.publish-date').text().trim() ||
            '';
        return dateStr;
    }

    /**
     * Extract images
     */
    extractImages($, baseUrl) {
        const images = [];
        $('img').each((i, elem) => {
            const src = $(elem).attr('src');
            const alt = $(elem).attr('alt') || '';
            if (src) {
                try {
                    const absoluteUrl = new URL(src, baseUrl).href;
                    images.push({ url: absoluteUrl, alt });
                } catch (e) {
                    // Invalid URL, skip
                }
            }
        });
        return images.slice(0, 10); // Limit to 10 images
    }

    /**
     * Extract video sources
     */
    extractVideos($) {
        const videos = [];
        $('video source, iframe[src*="youtube"], iframe[src*="vimeo"]').each((i, elem) => {
            const src = $(elem).attr('src');
            if (src) {
                videos.push(src);
            }
        });
        return videos;
    }

    /**
     * Extract keywords
     */
    extractKeywords($) {
        const keywords = $('meta[name="keywords"]').attr('content') || '';
        return keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    }

    /**
     * Extract category
     */
    extractCategory($) {
        return $('meta[property="article:section"]').attr('content') ||
            $('.category').first().text().trim() ||
            '';
    }

    /**
     * Extract tags
     */
    extractTags($) {
        const tags = [];
        $('.tag, .tags a, [rel="tag"]').each((i, elem) => {
            const tag = $(elem).text().trim();
            if (tag) tags.push(tag);
        });
        return tags;
    }

    /**
     * Extract links
     */
    extractLinks($, baseUrl) {
        const links = [];
        $('a[href]').each((i, elem) => {
            const href = $(elem).attr('href');
            const text = $(elem).text().trim();
            if (href && text) {
                try {
                    const absoluteUrl = new URL(href, baseUrl).href;
                    links.push({ url: absoluteUrl, text });
                } catch (e) {
                    // Invalid URL, skip
                }
            }
        });
        return links.slice(0, 20); // Limit to 20 links
    }

    /**
     * Save search results to file
     */
    async saveSearchResults(query, results) {
        await this.initialize();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const sanitizedQuery = query.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        const filename = `search_${timestamp}_${sanitizedQuery}_${Date.now()}.json`;
        const filepath = path.join(this.storageDir, filename);

        const storageData = {
            query,
            timestamp: new Date().toISOString(),
            type: 'search_results',
            results: results.web?.results || []
        };

        try {
            await fs.writeFile(filepath, JSON.stringify(storageData, null, 2), 'utf8');
            console.log(`💾 Saved search results: ${filename}`);
            return filepath;
        } catch (error) {
            console.error('Failed to save search results:', error.message);
            return null;
        }
    }

    /**
     * Save scraped data to file
     */
    async saveToFile(scrapedData) {
        if (!scrapedData) return null;

        await this.initialize();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const domain = scrapedData.domain.replace(/[^a-z0-9]/gi, '_');
        const filename = `${timestamp}_${domain}_${Date.now()}.json`;
        const filepath = path.join(this.storageDir, filename);

        try {
            await fs.writeFile(filepath, JSON.stringify(scrapedData, null, 2), 'utf8');
            console.log(`💾 Saved to: ${filename}`);
            return filepath;
        } catch (error) {
            console.error('Failed to save scraped data:', error.message);
            return null;
        }
    }

    /**
     * Load recent scraped files
     */
    async loadRecentFiles(maxAge = this.cacheMaxAge) {
        await this.initialize();

        try {
            const files = await fs.readdir(this.storageDir);
            const now = Date.now();
            const recentFiles = [];

            for (const file of files) {
                if (!file.endsWith('.json')) continue;

                const filepath = path.join(this.storageDir, file);
                const stats = await fs.stat(filepath);
                const age = now - stats.mtimeMs;

                if (age < maxAge) {
                    const content = await fs.readFile(filepath, 'utf8');
                    recentFiles.push(JSON.parse(content));
                }
            }

            return recentFiles;
        } catch (error) {
            console.error('Failed to load recent files:', error.message);
            return [];
        }
    }

    /**
     * Clean up old files
     */
    async cleanup() {
        await this.initialize();

        try {
            const files = await fs.readdir(this.storageDir);
            const now = Date.now();
            let deletedCount = 0;

            for (const file of files) {
                if (!file.endsWith('.json')) continue;

                const filepath = path.join(this.storageDir, file);
                const stats = await fs.stat(filepath);
                const age = now - stats.mtimeMs;

                if (age > this.cacheMaxAge) {
                    await fs.unlink(filepath);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                console.log(`🗑️ Cleaned up ${deletedCount} old scraped files`);
            }
        } catch (error) {
            console.error('Cleanup failed:', error.message);
        }
    }

    /**
     * Fallback web search using scraping (DuckDuckGo HTML)
     * "Advanced Level" - Attempts to get search results without API key
     */
    async performWebSearch(query) {
        try {
            console.log(`🕵️ scraperService: Performing fallback search for "${query}"`);

            // Use DuckDuckGo HTML version which is easier to scrape
            const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': 'https://html.duckduckgo.com/'
                },
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            const results = [];

            // DuckDuckGo HTML structure selectors
            $('.result').each((i, elem) => {
                if (i >= 5) return false; // Limit to 5 results

                const titleElement = $(elem).find('.result__a');
                const snippetElement = $(elem).find('.result__snippet');
                const urlElement = $(elem).find('.result__url');

                const title = titleElement.text().trim();
                const url = titleElement.attr('href'); // The href is usually the direct link or a redirect
                const description = snippetElement.text().trim();

                if (title && url) {
                    // Clean up DDG redirect URLs if needed, often they are clean in HTML version or need decoding
                    // In HTML version, href is typically relative or absolute.

                    results.push({
                        title,
                        url, // We might need to handle relative URLs, but usually DDG HTML returns full or redirect links
                        description: description || 'No description available',
                        profile: { name: new URL(url, 'https://duckduckgo.com').hostname } // Mock profile
                    });
                }
            });

            console.log(`✅ Scraper found ${results.length} results for "${query}"`);

            // Format to match Brave Search API structure for compatibility
            return {
                web: {
                    results: results.map(r => ({
                        title: r.title,
                        url: r.url,
                        description: r.description,
                        profile: r.profile
                    }))
                }
            };

        } catch (error) {
            console.error('❌ Scraper search failed:', error.message);

            // Fallback to Puppeteer if Axios fails (e.g. 403 Forbidden)
            try {
                console.log('⚠️ Axios failed, trying Puppeteer for search...');
                return await puppeteerService.performSearch(query);
            } catch (pError) {
                console.error('❌ Puppeteer search also failed:', pError.message);
                return null;
            }
        }
    }
}

module.exports = new ScraperService();
