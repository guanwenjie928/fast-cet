/* ============================================
   Fast CET — Exam Renderer (exam-renderer.js)
   Renders exam cards, sections, questions,
   options, and answer reveals with glass-morphism
   ============================================ */

const ExamRenderer = {
  // Track rendered answer states
  _answerVisible: new Map(),

  /* ── Exam Grid (for zhenti.html / moni.html listing pages) ── */
  /**
   * Render a grid of exam cards from data
   * @param {string} containerId - DOM element ID
   * @param {object} options - { type: 'real'|'mock' }
   */
  async renderExamGrid(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Show skeleton while loading
    container.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      container.appendChild(this._createSkeleton());
    }

    let exams;
    if (options.type === 'mock') {
      exams = await DataLoader.loadMockList();
    } else {
      exams = await DataLoader.loadExamList();
    }

    if (!exams || exams.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state__icon">📭</div>
        <p>暂无试卷数据</p>
      </div>`;
      return;
    }

    container.innerHTML = '';
    exams.forEach((exam, i) => {
      const card = this._createExamCard(exam, i);
      container.appendChild(card);
    });
  },

  /* ── Exam Overview (single exam detail page) ── */
  /**
   * Render full exam overview with meta info and section entry cards
   * @param {string|Element} container - DOM element or ID
   * @param {object} examData - full exam JSON
   */
  renderExamOverview(container, examData) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el || !examData || !examData.meta) return;

    const { meta, sections } = examData;

    let html = '';

    // Meta info bar
    html += `<div class="exam-meta-bar glass-card">
      <div class="exam-meta-bar__item">
        <span class="exam-meta-bar__label">年份</span>
        <span class="exam-meta-bar__value">${meta.year}年${meta.month}月</span>
      </div>
      <div class="exam-meta-bar__item">
        <span class="exam-meta-bar__label">套卷</span>
        <span class="exam-meta-bar__value">第${meta.set?.toUpperCase() || '一'}套</span>
      </div>
      <div class="exam-meta-bar__item">
        <span class="exam-meta-bar__label">时长</span>
        <span class="exam-meta-bar__value">${meta.totalTime || 125}分钟</span>
      </div>
      <div class="exam-meta-bar__item">
        <span class="exam-meta-bar__label">总分</span>
        <span class="exam-meta-bar__value">${meta.totalScore || 710}分</span>
      </div>
    </div>`;

    // Section entry cards
    html += `<div class="section-grid">`;
    const sectionOrder = ['writing', 'listening', 'reading', 'translation'];
    const sectionIcons = {
      writing: '✍️',
      listening: '🎧',
      reading: '📖',
      translation: '🌐',
    };
    const sectionColors = {
      writing: 'var(--color-primary)',
      listening: 'var(--color-secondary)',
      reading: 'var(--color-accent)',
      translation: '#10B981',
    };

    for (const key of sectionOrder) {
      const sec = sections[key];
      if (!sec) continue;
      html += `<div class="section-entry glass-card" data-section="${key}" style="--section-color: ${sectionColors[key]}">
        <div class="section-entry__icon">${sectionIcons[key]}</div>
        <div class="section-entry__content">
          <h3 class="section-entry__title">${sec.title}</h3>
          <div class="section-entry__meta">
            <span>⏱ ${sec.time || sec.timeLimit || '—'}分钟</span>
            <span>📊 ${sec.score || '—'}分</span>
          </div>
        </div>
        <div class="section-entry__arrow">→</div>
      </div>`;
    }
    html += `</div>`;

    el.innerHTML = html;
  },

  /* ── Render Single Section ── */
  /**
   * @param {string|Element} container
   * @param {object} sectionData - the section object
   * @param {string} sectionType - 'writing'|'listening'|'reading'|'translation'
   */
  renderSection(container, sectionData, sectionType) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el || !sectionData) return;

    let html = '';

    switch (sectionType) {
      case 'writing':
        html = this._renderWritingSection(sectionData);
        break;
      case 'listening':
        html = this._renderListeningSection(sectionData);
        break;
      case 'reading':
        html = this._renderReadingSection(sectionData);
        break;
      case 'translation':
        html = this._renderTranslationSection(sectionData);
        break;
      default:
        html = '<p>未知题型</p>';
    }

    el.innerHTML = html;
  },

  /* ── Render Question Card ── */
  /**
   * @param {object} question - { id, stem, options, type, questionNumber }
   * @returns {string} HTML string
   */
  renderQuestionCard(question) {
    const qNum = question.questionNumber || question.id || '';
    const stem = question.stem || question.content_json?.stem || '';
    const options = question.options || question.content_json?.options || [];

    let html = `<div class="question-card glass-card" data-question-id="${question.id}">
      <div class="question-card__body">
        <div class="question-card__header">
          <span class="question-card__number">${qNum}</span>
          <span class="question-card__type">${question.type || question.question_type || ''}</span>
          ${question.difficulty ? `<span class="question-card__difficulty" data-level="${question.difficulty}">★ ${question.difficulty}</span>` : ''}
        </div>
        <div class="question-card__stem">${this._escapeHTML(stem)}</div>`;

    if (options.length > 0) {
      html += this.renderOptions(options, question.id);
    }

    html += `</div>`;

    // Answer reveal area
    if (question.answer || question.correct_answer) {
      const answer = question.answer || question.correct_answer;
      const explanation = question.explanation || '';
      html += `<div class="answer-reveal" id="answer-${question.id}">
        <div class="answer-reveal__content">
          <div class="answer-reveal__answer">
            <span class="answer-reveal__label">正确答案：</span>
            <span class="answer-reveal__value">${this._escapeHTML(String(answer))}</span>
          </div>`;
      if (explanation) {
        html += `<div class="answer-reveal__explanation">
          <span class="answer-reveal__label">解析：</span>
          <p>${this._escapeHTML(explanation)}</p>
        </div>`;
      }
      html += `</div>
        <button class="answer-reveal__toggle btn btn-outline" onclick="ExamRenderer._toggleAnswer('${question.id}')">
          查看答案
        </button>
      </div>`;
    }

    html += `</div>`;
    return html;
  },

  /* ── Render Options List ── */
  /**
   * @param {Array} options - [{ key: 'A', text: '...' }] or ['A...', 'B...']
   * @param {string} questionId
   * @returns {string} HTML string
   */
  renderOptions(options, questionId) {
    let html = `<div class="options-grid">`;

    options.forEach((opt, i) => {
      let key, text;
      if (typeof opt === 'object' && opt.key) {
        key = opt.key;
        text = opt.text;
      } else if (typeof opt === 'string') {
        // Parse "A. content" format
        const match = opt.match(/^([A-D])[.、]\s*(.*)/);
        if (match) {
          key = match[1];
          text = match[2];
        } else {
          key = String.fromCharCode(65 + i);
          text = opt;
        }
      } else {
        key = String.fromCharCode(65 + i);
        text = String(opt);
      }

      html += `<label class="option-item" for="opt-${questionId}-${key}">
        <input type="radio" name="q-${questionId}" id="opt-${questionId}-${key}" value="${key}" class="option-item__input">
        <span class="option-item__indicator">${key}</span>
        <span class="option-item__text">${this._escapeHTML(text)}</span>
      </label>`;
    });

    html += `</div>`;
    return html;
  },

  /* ── Word Bank Renderer (for reading - 选词填空) ── */
  /**
   * @param {string[]} words - list of candidate words
   * @returns {string} HTML
   */
  renderWordBank(words) {
    let html = `<div class="word-bank">
      <div class="word-bank__title">📦 词库</div>
      <div class="word-bank__words">`;
    words.forEach((word, i) => {
      html += `<span class="word-bank__word" data-word-index="${i}" draggable="true">${this._escapeHTML(word)}</span>`;
    });
    html += `</div></div>`;
    return html;
  },

  /* ── Score Display ── */
  /**
   * @param {string|Element} container
   * @param {object} scoreData - { total, sections: [{ name, score, max, accuracy }] }
   */
  renderScore(container, scoreData) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el || !scoreData) return;

    let html = `<div class="score-display glass-card">
      <div class="score-display__total">
        <div class="score-display__ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-border)" stroke-width="8"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="url(#scoreGradient)" stroke-width="8"
              stroke-dasharray="${(scoreData.total / 710) * 327} 327" stroke-linecap="round"
              transform="rotate(-90 60 60)" style="transition: stroke-dasharray 1.5s ease;"/>
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="var(--color-primary)"/>
                <stop offset="100%" stop-color="var(--color-secondary)"/>
              </linearGradient>
            </defs>
          </svg>
          <div class="score-display__ring-text">
            <span class="score-display__number">${scoreData.total}</span>
            <span class="score-display__label">/ 710</span>
          </div>
        </div>
      </div>
      <div class="score-breakdown">`;

    if (scoreData.sections) {
      scoreData.sections.forEach(sec => {
        const pct = sec.max ? Math.round((sec.score / sec.max) * 100) : 0;
        html += `<div class="score-breakdown__item">
          <div class="score-breakdown__header">
            <span class="score-breakdown__name">${sec.name}</span>
            <span class="score-breakdown__score">${sec.score}/${sec.max}</span>
          </div>
          <div class="score-breakdown__bar">
            <div class="score-breakdown__fill" style="width: ${pct}%"></div>
          </div>
          <span class="score-breakdown__pct">${pct}%</span>
        </div>`;
      });
    }

    html += `</div></div>`;
    el.innerHTML = html;
  },

  /* ── Internal Helpers ── */

  /** Create a single exam card element */
  _createExamCard(exam, index) {
    const card = document.createElement('div');
    card.className = 'exam-card glass-card';
    card.setAttribute('data-year', exam.year);
    card.setAttribute('data-month', exam.month);
    card.setAttribute('data-type', exam.type || 'real');
    card.style.animationDelay = `${index * 80}ms`;

    const typeLabel = exam.type === 'mock' ? '模拟题' : '真题';
    const typeClass = exam.type === 'mock' ? 'exam-card__badge--mock' : '';

    card.innerHTML = `
      <div class="exam-card__badge ${typeClass}">${typeLabel}</div>
      <div class="exam-card__year">${exam.year}年${exam.month}月</div>
      <div class="exam-card__title">${exam.title || `CET-4 ${exam.year}年${exam.month}月真题`}</div>
      <div class="exam-card__meta">
        ${exam.set ? `<span class="exam-card__set">📋 第${String(exam.set).toUpperCase()}套</span>` : ''}
        <span class="exam-card__time">⏱ ${exam.totalTime || 125}分钟</span>
        <span class="exam-card__score">📊 ${exam.totalScore || 710}分</span>
      </div>
      <div class="exam-card__arrow">→</div>
    `;

    // Click to load exam detail
    card.addEventListener('click', () => {
      if (exam.type === 'mock') {
        DataLoader.loadMock(exam.id).then(data => {
          if (data) this.renderExamOverview('examDetail', data);
        });
      } else {
        DataLoader.loadExam(exam.year, exam.month, exam.set).then(data => {
          if (data) this.renderExamOverview('examDetail', data);
        });
      }
    });

    return card;
  },

  /** Skeleton loading placeholder */
  _createSkeleton() {
    const sk = document.createElement('div');
    sk.className = 'skeleton exam-card';
    sk.innerHTML = `
      <div class="skeleton__line skeleton__line--badge"></div>
      <div class="skeleton__line skeleton__line--title"></div>
      <div class="skeleton__line skeleton__line--text"></div>
      <div class="skeleton__line skeleton__line--text short"></div>
    `;
    return sk;
  },

  /** Toggle answer visibility */
  _toggleAnswer(questionId) {
    const el = document.getElementById(`answer-${questionId}`);
    if (!el) return;
    const isOpen = el.classList.toggle('answer-reveal--open');
    const btn = el.querySelector('.answer-reveal__toggle');
    if (btn) {
      btn.textContent = isOpen ? '隐藏答案' : '查看答案';
    }
  },

  /** Render writing section */
  _renderWritingSection(data) {
    let html = `<div class="content-columns">
      <div class="content-columns__main">
        <div class="question-card glass-card">
          <div class="question-card__body">
            <h3 class="heading-4">📝 作文题目</h3>`;
    if (data.direction) {
      html += `<div class="writing__direction">${this._escapeHTML(data.direction)}</div>`;
    }
    if (data.topic) {
      html += `<div class="writing__topic">${this._escapeHTML(data.topic)}</div>`;
    }
    html += `</div></div></div>
      <div class="content-columns__side">`;

    if (data.sampleEssay) {
      html += `<div class="sample-collapse glass-card">
        <div class="sample-collapse__header" onclick="var b=this.nextElementSibling;var o=b.style.display==='block';b.style.display=o?'none':'block';this.querySelector('.sample-collapse__arrow').style.transform=o?'rotate(0deg)':'rotate(180deg)'">
          <span>📄 参考范文</span>
          <span class="sample-collapse__arrow">▼</span>
        </div>
        <div class="sample-collapse__body" style="display:none">
          <p>${this._escapeHTML(data.sampleEssay)}</p>
        </div>
      </div>`;
    }

    if (data.keyPoints && data.keyPoints.length) {
      html += `<div class="question-card glass-card">
        <div class="question-card__body">
          <h4 class="heading-4">💡 写作要点</h4>
          <ul class="key-points">`;
      data.keyPoints.forEach(kp => {
        html += `<li class="key-points__item">${this._escapeHTML(kp)}</li>`;
      });
      html += `</ul></div></div>`;
    }

    html += `</div></div>`;
    return html;
  },

  /** Render listening section */
  _renderListeningSection(data) {
    let html = `<div class="exam-room">
      <div class="exam-room__main">
        <div class="audio-player glass-card" id="audioPlayer"></div>
        <div class="questions-list">`;

    const allQuestions = [];
    if (data.sections) {
      for (const [subKey, items] of Object.entries(data.sections)) {
        (items || []).forEach(item => {
          if (item.questions) {
            item.questions.forEach(q => {
              q._audioSrc = item.audioSrc;
              allQuestions.push(q);
            });
          }
        });
      }
    }

    allQuestions.forEach((q, i) => {
      html += this.renderQuestionCard({
        ...q,
        questionNumber: i + 1,
        type: '听力',
        options: q.options,
        stem: q.stem,
        answer: q.answer,
        explanation: q.explanation,
      });
    });

    html += `</div></div>
      <div class="exam-room__sidebar">
        <div class="question-nav glass-card">
          <h4 class="heading-4">答题卡</h4>
          <div class="question-nav__grid">`;
    allQuestions.forEach((_, i) => {
      html += `<span class="question-nav__dot" data-index="${i}">${i + 1}</span>`;
    });
    html += `</div></div></div></div>`;
    return html;
  },

  /** Render reading section */
  _renderReadingSection(data) {
    let html = '';

    if (data.sections) {
      // Word bank (选词填空)
      if (data.sections.wordBank) {
        const wb = data.sections.wordBank;
        html += `<div class="question-card glass-card">
          <div class="question-card__body">
            <h3 class="heading-3">📦 选词填空</h3>
            <div class="reading__passage">${this._escapeHTML(wb.passage || '')}</div>
            ${wb.words ? this.renderWordBank(wb.words) : ''}
          </div>
        </div>`;

        if (wb.blanks && wb.questions) {
          wb.questions.forEach((q, i) => {
            html += this.renderQuestionCard({
              ...q,
              questionNumber: `填空${i + 1}`,
              type: '选词填空',
            });
          });
        }
      }

      // Long passage (长篇阅读)
      if (data.sections.longPassage) {
        const lp = data.sections.longPassage;
        html += `<div class="content-columns">
          <div class="content-columns__main">
            <div class="question-card glass-card">
              <div class="question-card__body">
                <h3 class="heading-3">📖 长篇阅读</h3>
                <div class="reading__passage">${this._escapeHTML(lp.passage || '')}</div>
              </div>
            </div>
          </div>
          <div class="content-columns__side">`;
        if (lp.questions) {
          lp.questions.forEach((q, i) => {
            html += this.renderQuestionCard({
              ...q,
              questionNumber: i + 1,
              type: '长篇阅读',
            });
          });
        }
        html += `</div></div>`;
      }

      // In-depth reading (仔细阅读)
      if (data.sections.inDepth && data.sections.inDepth.passages) {
        data.sections.inDepth.passages.forEach((p, pi) => {
          html += `<div class="content-columns">
            <div class="content-columns__main">
              <div class="question-card glass-card">
                <div class="question-card__body">
                  <h3 class="heading-3">📖 仔细阅读 ${pi + 1}</h3>
                  <div class="reading__passage">${this._escapeHTML(p.passage || p.text || '')}</div>
                </div>
              </div>
            </div>
            <div class="content-columns__side">`;
          if (p.questions) {
            p.questions.forEach((q, i) => {
              html += this.renderQuestionCard({
                ...q,
                questionNumber: i + 1,
                type: '仔细阅读',
              });
            });
          }
          html += `</div></div>`;
        });
      }
    }

    return html || '<p>暂无阅读题目数据</p>';
  },

  /** Render translation section */
  _renderTranslationSection(data) {
    let html = `<div class="content-columns">
      <div class="content-columns__main">
        <div class="question-card glass-card">
          <div class="question-card__body">
            <h3 class="heading-3">🌐 段落翻译</h3>`;
    if (data.direction) {
      html += `<div class="translation__direction">${this._escapeHTML(data.direction)}</div>`;
    }
    if (data.chineseText) {
      html += `<div class="translation__source">
        <div class="translation__source-label">中文原文</div>
        <p>${this._escapeHTML(data.chineseText)}</p>
      </div>`;
    }
    html += `</div></div></div>
      <div class="content-columns__side">`;

    if (data.referenceTranslation) {
      html += `<div class="sample-collapse glass-card">
        <div class="sample-collapse__header" onclick="var b=this.nextElementSibling;var o=b.style.display==='block';b.style.display=o?'none':'block';this.querySelector('.sample-collapse__arrow').style.transform=o?'rotate(0deg)':'rotate(180deg)'">
          <span>📄 参考译文</span>
          <span class="sample-collapse__arrow">▼</span>
        </div>
        <div class="sample-collapse__body" style="display:none">
          <p>${this._escapeHTML(data.referenceTranslation)}</p>
        </div>
      </div>`;
    }

    if (data.keyPoints && data.keyPoints.length) {
      html += `<div class="question-card glass-card">
        <div class="question-card__body">
          <h4 class="heading-4">💡 翻译要点</h4>
          <ul class="key-points">`;
      data.keyPoints.forEach(kp => {
        html += `<li class="key-points__item">${this._escapeHTML(kp)}</li>`;
      });
      html += `</ul></div></div>`;
    }

    html += `</div></div>`;
    return html;
  },

  /** Escape HTML entities */
  _escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
