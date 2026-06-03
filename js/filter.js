/* ============================================
   Fast CET — Filter Component (filter.js)
   Tag-based filtering with GSAP transitions
   ============================================ */

const Filter = {
  _container: null,
  _targetContainer: null,
  _activeTags: new Set(),
  _allItems: [],

  /**
   * Initialize filter tags
   * @param {string} filterContainerId - element containing filter tags
   * @param {string} targetContainerId - element containing items to filter
   * @param {object} options
   *   - multiSelect: boolean (default true)
   *   - filterAttr: string (default 'data-category')
   *   - itemSelector: string (default '.filter-item')
   *   - onFilter: function(activeTags) - callback
   */
  init(filterContainerId, targetContainerId, options = {}) {
    this._container = document.getElementById(filterContainerId);
    this._targetContainer = document.getElementById(targetContainerId);
    if (!this._container || !this._targetContainer) return;

    this._options = {
      multiSelect: options.multiSelect !== false,
      filterAttr: options.filterAttr || 'data-category',
      itemSelector: options.itemSelector || '.filter-item',
      onFilter: options.onFilter || null,
    };

    this._activeTags = new Set();
    this._allItems = Array.from(
      this._targetContainer.querySelectorAll(this._options.itemSelector)
    );

    this._bindEvents();
  },

  /** Bind click events to filter tags */
  _bindEvents() {
    const tags = this._container.querySelectorAll('.filter-tag');
    tags.forEach(tag => {
      tag.addEventListener('click', () => {
        const value = tag.getAttribute('data-filter');
        if (!value) return;

        if (this._options.multiSelect) {
          this._toggleTag(tag, value);
        } else {
          this._selectSingle(tag, value);
        }

        this._applyFilter();
        if (this._options.onFilter) {
          this._options.onFilter(Array.from(this._activeTags));
        }
      });
    });
  },

  /** Toggle a tag in multi-select mode */
  _toggleTag(tag, value) {
    if (this._activeTags.has(value)) {
      this._activeTags.delete(value);
      tag.classList.remove('filter-tag--active');
    } else {
      this._activeTags.add(value);
      tag.classList.add('filter-tag--active');
    }
  },

  /** Select a single tag (radio mode) */
  _selectSingle(tag, value) {
    if (this._activeTags.has(value)) {
      // Deselect current
      this._activeTags.clear();
      tag.classList.remove('filter-tag--active');
    } else {
      // Clear all, select one
      this._activeTags.clear();
      this._container.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('filter-tag--active'));
      this._activeTags.add(value);
      tag.classList.add('filter-tag--active');
    }
  },

  /** Apply the filter to items with GSAP transitions */
  _applyFilter() {
    const attr = this._options.filterAttr;
    const items = this._allItems;

    if (this._activeTags.size === 0) {
      // Show all items
      items.forEach(item => {
        item.style.display = '';
        gsap.to(item, {
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: 'back.out(1.4)',
          overwrite: 'auto',
        });
      });
      return;
    }

    items.forEach(item => {
      const itemValue = item.getAttribute(attr);
      const shouldShow = itemValue && this._activeTags.has(itemValue);

      if (shouldShow) {
        item.style.display = '';
        gsap.to(item, {
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: 'back.out(1.4)',
          overwrite: 'auto',
        });
      } else {
        gsap.to(item, {
          opacity: 0,
          scale: 0.9,
          duration: 0.3,
          ease: 'power2.in',
          overwrite: 'auto',
          onComplete: () => {
            if (!this._isItemVisible(item)) {
              item.style.display = 'none';
            }
          },
        });
      }
    });
  },

  /** Check if item should be visible */
  _isItemVisible(item) {
    const itemValue = item.getAttribute(this._options.filterAttr);
    return this._activeTags.size === 0 || (itemValue && this._activeTags.has(itemValue));
  },

  /** Programmatically set active filter */
  setFilter(value) {
    this._activeTags.clear();
    this._container.querySelectorAll('.filter-tag').forEach(t => {
      t.classList.remove('filter-tag--active');
      if (t.getAttribute('data-filter') === value) {
        t.classList.add('filter-tag--active');
        this._activeTags.add(value);
      }
    });
    this._applyFilter();
    if (this._options.onFilter) {
      this._options.onFilter(Array.from(this._activeTags));
    }
  },

  /** Clear all filters */
  clearFilter() {
    this._activeTags.clear();
    this._container.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('filter-tag--active'));
    this._applyFilter();
    if (this._options.onFilter) {
      this._options.onFilter([]);
    }
  },

  /** Get currently active filter values */
  getActive() {
    return Array.from(this._activeTags);
  },

  /** Refresh items (call after dynamically adding items) */
  refresh() {
    this._allItems = Array.from(
      this._targetContainer.querySelectorAll(this._options.itemSelector)
    );
    this._applyFilter();
  },
};