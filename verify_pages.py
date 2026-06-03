#!/usr/bin/env python3
"""E2E verification: GitHub Pages Fast CET data loading & error checks"""
from playwright.sync_api import sync_playwright
import sys

BASE = 'https://guanwenjie928.github.io/fast-cet'

tests = [
    ('Homepage', f'{BASE}/index.html'),
    ('Zhenti (Exam Grid)', f'{BASE}/pages/zhenti.html'),
    ('Moni (Mock Exam)', f'{BASE}/pages/moni.html'),
    ('Listening Bank', f'{BASE}/pages/listening.html'),
    ('Reading Bank', f'{BASE}/pages/reading.html'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    all_ok = True

    for name, url in tests:
        print(f'\n{"="*60}')
        print(f'Testing: {name}  →  {url}')
        page = browser.new_page()
        errors = []
        warnings = []

        page.on('pageerror', lambda err: errors.append(err.message))
        page.on('console',
            lambda msg: warnings.append(msg.text) if msg.type == 'warning' else None)

        page.goto(url, wait_until='networkidle', timeout=15000)

        # Check for 404 on data files
        has_data_404 = any('/data/' in w and 'Failed to load' in w for w in warnings)
        
        # Check JS errors
        has_fatal_error = any(
            'is not defined' in e or 'Cannot read' in e or 'Unexpected token' in e
            for e in errors
        )

        cards = page.query_selector_all('.exam-card, .question-card')
        skeletons = page.query_selector_all('.skeleton')

        print(f'  Cards rendered:  {len(cards)}')
        print(f'  Skeletons left:  {len(skeletons)}')
        print(f'  JS errors:       {len(errors)}')
        print(f'  Data 404 warn:   {has_data_404}')
        print(f'  Fatal JS err:    {has_fatal_error}')

        if errors:
            for e in errors[:5]:
                print(f'    [JS_ERROR] {e[:120]}')
        if has_data_404:
            for w in warnings:
                if 'Failed to load' in w:
                    print(f'    [DATA_404] {w[:150]}')

        ok = len(cards) > 0 and not has_data_404 and not has_fatal_error
        print(f'  RESULT: {"PASS" if ok else "FAIL"}')
        if not ok:
            all_ok = False

        page.close()

    browser.close()
    print(f'\n{"="*60}')
    print(f'OVERALL: {"ALL PASS" if all_ok else "SOME FAILED"}')
    sys.exit(0 if all_ok else 1)
