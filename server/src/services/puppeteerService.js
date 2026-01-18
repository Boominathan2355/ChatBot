const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Advanced Scraper Service using Puppeteer
 * Handles JavaScript-rendered content and dynamic interactions.
 */
class PuppeteerService {
    constructor() {
        this.browser = null;
    }

    /**
     * Launch browser instance if not already running
     */
    async getBrowser() {
        if (!this.browser) {
            console.log('🚀 Launching Puppeteer browser...');
            this.browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        return this.browser;
    }

    /**
     * Close browser instance
     */
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Advanced scraping of a URL
     */
    async scrapePage(url) {
        let page = null;
        try {
            const browser = await this.getBrowser();
            page = await browser.newPage();

            // Set User Agent to avoid detection
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

            // Optimizations: block images/fonts for speed
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            console.log(`🕷️ [Advanced] Scraping: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            // Extract data
            const data = await page.evaluate(() => {
                // Helper to clean text
                const clean = (text) => text?.replace(/\s+/g, ' ').trim() || '';

                // Remove clutter
                document.querySelectorAll('script, style, nav, footer, iframe, .ad, .advertisement').forEach(el => el.remove());

                return {
                    title: document.title,
                    description: document.querySelector('meta[name="description"]')?.content || '',
                    content: clean(document.body.innerText),
                    html: document.documentElement.outerHTML
                };
            });

            return {
                ...data,
                url,
                scrapedAt: new Date().toISOString(),
                method: 'puppeteer'
            };

        } catch (error) {
            console.error(`❌ [Advanced] Scraping failed for ${url}:`, error.message);
            return null;
        } finally {
            if (page) await page.close();
        }
    }

    /**
     * Perform Google/DuckDuckGo Search via Puppeteer (if API blocked)
     */
    async performSearch(query) {
        let page = null;
        try {
            const browser = await this.getBrowser();
            page = await browser.newPage();

            // Search on DuckDuckGo (Dynamic)
            const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`;
            await page.goto(searchUrl, { waitUntil: 'networkidle2' });

            // Wait for results
            await page.waitForSelector('.react-results--main', { timeout: 5000 }).catch(() => null);

            const results = await page.evaluate(() => {
                const items = document.querySelectorAll('article'); // DDG uses article tags often in dynamic view
                const data = [];
                items.forEach((item, index) => {
                    if (index > 5) return;
                    const titleEl = item.querySelector('h2 a');
                    const snipEl = item.querySelector('.result__snippet'); // Class names change often...

                    if (titleEl) {
                        data.push({
                            title: titleEl.innerText,
                            url: titleEl.href,
                            description: snipEl ? snipEl.innerText : ''
                        });
                    }
                });
                return data;
            });

            // Fallback for DDG selector changes: try generic
            if (results.length === 0) {
                // Try parsing simpler structure if 'article' failed
                // ... (Simplified for this example)
            }

            return { web: { results } };

        } catch (error) {
            console.error('❌ [Advanced] Search failed:', error.message);
            return null;
        } finally {
            if (page) await page.close();
        }
    }
}

module.exports = new PuppeteerService();
