/* ============================================
   Fast CET — Data Loader (data-loader.js)
   JSON data fetcher with caching, preloading,
   and API_BASE config for backend migration
   ============================================ */

const DataLoader = {
  // Auto-detect correct data path (works on both local & GitHub Pages)
  API_BASE: (function() {
    var path = window.location.pathname;
    // If current page is under /pages/ dir, data is one level up
    if (path.includes('/pages/')) {
      return '../data/';
    }
    return 'data/';
  })(),

  // Internal cache
  _cache: new Map(),
  _pendingRequests: new Map(),

  /**
   * Fetch JSON with caching and deduplication.
   * Uses fetch() first (works on HTTP), falls back to XHR (works on file://).
   * @param {string} path - relative path from API_BASE
   * @returns {Promise<object|null>}
   */
  async _fetchJSON(path) {
    const url = this.API_BASE + path;

    // Return cached
    if (this._cache.has(url)) {
      return this._cache.get(url);
    }

    // Deduplicate concurrent requests
    if (this._pendingRequests.has(url)) {
      return this._pendingRequests.get(url);
    }

    const promise = this._doFetch(url);
    this._pendingRequests.set(url, promise);
    return promise;
  },

  /**
   * Internal: try fetch() first, fall back to XHR for file:// compatibility.
   */
  async _doFetch(url) {
    // Try fetch() first (works on HTTP/S)
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const data = await res.json();
      this._cache.set(url, data);
      this._pendingRequests.delete(url);
      return data;
    } catch (fetchErr) {
      // If fetch fails (e.g. file:// protocol), try XHR fallback
      try {
        const data = await this._xhrFetch(url);
        this._cache.set(url, data);
        this._pendingRequests.delete(url);
        return data;
      } catch (xhrErr) {
        this._pendingRequests.delete(url);
        console.warn(`[DataLoader] Failed to load ${url}:`, fetchErr.message);
        return null;
      }
    }
  },

  /**
   * XHR-based JSON loader — works with file:// protocol where fetch() fails.
   * @param {string} url
   * @returns {Promise<object>}
   */
  _xhrFetch(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.overrideMimeType('application/json');
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error(`JSON parse error for ${url}: ${e.message}`));
          }
        } else {
          reject(new Error(`XHR ${xhr.status} for ${url}`));
        }
      };
      xhr.onerror = () => reject(new Error(`XHR network error for ${url}`));
      xhr.ontimeout = () => reject(new Error(`XHR timeout for ${url}`));
      xhr.timeout = 10000;
      xhr.send();
    });
  },

  /**
   * Load a single exam by year, month, and set
   * @param {number} year
   * @param {number} month
   * @param {string} set - 'a' | 'b' | 'c'
   * @returns {Promise<object|null>}
   */
  async loadExam(year, month, set) {
    const filename = `zhenti-${year}-${String(month).padStart(2, '0')}-${set}.json`;
    return this._fetchJSON(filename);
  },

  /**
   * Load all available exam metadata (lightweight list)
   * @returns {Promise<Array|null>}
   */
  async loadExamList() {
    // Try to load the index file first
    const index = await this._fetchJSON('exam-index.json');
    if (index) return index;

    // Fallback: scan known exam files
    const knownExams = [
      { year: 2024, month: 6, set: 'a' },
      { year: 2024, month: 6, set: 'b' },
      { year: 2024, month: 6, set: 'c' },
      { year: 2024, month: 12, set: 'a' },
      { year: 2024, month: 12, set: 'b' },
      { year: 2024, month: 12, set: 'c' },
    ];

    const results = await Promise.all(
      knownExams.map(exam => this.loadExamMeta(exam.year, exam.month, exam.set))
    );

    return results.filter(Boolean);
  },

  /**
   * Load only exam metadata (not full content)
   * @param {number} year
   * @param {number} month
   * @param {string} set
   * @returns {Promise<object|null>}
   */
  async loadExamMeta(year, month, set) {
    const data = await this.loadExam(year, month, set);
    if (!data || !data.meta) return null;
    return {
      id: data.meta.id,
      year: data.meta.year,
      month: data.meta.month,
      set: data.meta.set,
      title: data.meta.title,
      totalTime: data.meta.totalTime,
      totalScore: data.meta.totalScore,
      type: data.meta.type || 'real',
    };
  },

  /**
   * Load a mock exam by ID
   * @param {string} id - e.g. '01', '02', '03'
   * @returns {Promise<object|null>}
   */
  async loadMock(id) {
    const filename = `moni-${String(id).padStart(2, '0')}.json`;
    return this._fetchJSON(filename);
  },

  /**
   * Load all mock exam metadata
   * @returns {Promise<Array|null>}
   */
  async loadMockList() {
    const ids = ['01', '02', '03'];
    const results = await Promise.all(
      ids.map(async id => {
        const data = await this.loadMock(id);
        if (!data || !data.meta) return null;
        return {
          id: data.meta.id,
          year: data.meta.year,
          month: data.meta.month,
          title: data.meta.title,
          totalTime: data.meta.totalTime,
          totalScore: data.meta.totalScore,
          type: 'mock',
        };
      })
    );
    return results.filter(Boolean);
  },

  /**
   * Load a question bank by type
   * @param {string} type - 'listening' | 'reading' | 'translation' | 'writing'
   * @returns {Promise<object|null>}
   */
  async loadQuestionBank(type) {
    const filename = `${type}-bank.json`;
    return this._fetchJSON(filename);
  },

  /**
   * Preload all exam data in the background
   * @returns {Promise<void>}
   */
  async preloadAll() {
    const tasks = [
      this.loadExamList(),
      this.loadMockList(),
      this.loadQuestionBank('listening'),
      this.loadQuestionBank('reading'),
      this.loadQuestionBank('translation'),
      this.loadQuestionBank('writing'),
      this.loadQuestionBank('vocabulary'),
    ];
    await Promise.allSettled(tasks);
  },

  /**
   * Clear the cache (useful for testing / data refresh)
   */
  clearCache() {
    this._cache.clear();
    this._pendingRequests.clear();
  },

  /**
   * Get cache stats
   * @returns {{ size: number, keys: string[] }}
   */
  getCacheStats() {
    return {
      size: this._cache.size,
      keys: Array.from(this._cache.keys()),
    };
  },
};