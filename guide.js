/**
 * Multimedia Wiki Router, Link Parser, Live Search, Hover Quick-Peek Tooltips,
 * Explorer Progress Tracker, and A-Z Glossary Modal.
 */

import { GLOSSARY, WIKI_SECTIONS, WIKI_PAGES } from './src/wikiData.js';
import { mountWidgets } from './src/wikiWidgets.js';

const sidebarNav = document.getElementById('sidebar-nav');
const wikiSidebar = document.getElementById('wiki-sidebar');
const wikiMain = document.getElementById('wiki-main');
const progText = document.getElementById('prog-text');
const progFill = document.getElementById('prog-fill');

const btnBack = document.getElementById('btn-back');
const artKicker = document.getElementById('art-kicker');
const artReadtime = document.getElementById('art-readtime');
const artTitle = document.getElementById('art-title');
const artSummary = document.getElementById('art-summary');
const artBody = document.getElementById('art-body');
const artLabCta = document.getElementById('art-lab-cta');
const btnPrevArt = document.getElementById('btn-prev-art');
const btnNextArt = document.getElementById('btn-next-art');

const railTerms = document.getElementById('rail-terms');
const railRelated = document.getElementById('rail-related');

const popover = document.getElementById('wiki-popover');
const popTerm = document.getElementById('pop-term');
const popShort = document.getElementById('pop-short');
const popAnalogy = document.getElementById('pop-analogy');

const searchInput = document.getElementById('wiki-search');
const searchResults = document.getElementById('search-results');

const glossaryModal = document.getElementById('glossary-modal');
const glossaryFilter = document.getElementById('glossary-filter');
const glossaryList = document.getElementById('glossary-list');

const allPageIds = Object.keys(WIKI_PAGES);
const visitedPages = new Set();
const historyStack = [];
let currentPageId = 'charter';

/** Convert [[key|Display Text]] syntax into clickable, hoverable wiki links */
function renderWikiMarkup(rawHtml) {
  const referencedTerms = new Set();

  const html = rawHtml.replace(/\[\[([a-z0-9_-]+)\|([^\]]+)\]\]/gi, (_, key, label) => {
    if (GLOSSARY[key]) {
      referencedTerms.add(key);
      return `<a class="wiki-link" data-term="${key}" href="#page=${GLOSSARY[key].page}">${label}</a>`;
    }
    if (WIKI_PAGES[key]) {
      return `<a class="wiki-link" data-page="${key}" href="#page=${key}">${label}</a>`;
    }
    return label;
  });

  return { html, referencedTerms: Array.from(referencedTerms) };
}

function buildSidebar() {
  sidebarNav.innerHTML = WIKI_SECTIONS.map(
    (sec) => `
    <div>
      <div class="nav-group-label">${sec.group}</div>
      <ul class="nav-list">
        ${sec.pages
          .map((pid) => {
            const p = WIKI_PAGES[pid];
            const isActive = pid === currentPageId;
            const isVisited = visitedPages.has(pid);
            return `
            <li>
              <button class="nav-link ${isActive ? 'active' : ''}" data-nav-page="${pid}">
                <span>${p.title.split(':')[0]}</span>
                ${isVisited ? '<span class="nav-check" title="Explored">✓</span>' : ''}
              </button>
            </li>`;
          })
          .join('')}
      </ul>
    </div>`
  ).join('');

  sidebarNav.querySelectorAll('[data-nav-page]').forEach((btn) =>
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.navPage);
      wikiSidebar.classList.remove('open');
    })
  );

  progText.textContent = `${visitedPages.size} / ${allPageIds.length}`;
  progFill.style.width = `${Math.round((visitedPages.size / allPageIds.length) * 100)}%`;
}

function navigateTo(pageId, pushHistory = true) {
  if (!WIKI_PAGES[pageId]) pageId = 'charter';
  if (pushHistory && currentPageId && currentPageId !== pageId) {
    historyStack.push(currentPageId);
  }
  currentPageId = pageId;
  visitedPages.add(pageId);
  hidePopover();

  const page = WIKI_PAGES[pageId];
  document.querySelector('.wiki-article').classList.toggle('wide', Boolean(page.wideLayout));
  document.querySelector('.wiki-body').classList.toggle('wide-mode', Boolean(page.wideLayout));
  artKicker.textContent = page.kicker;
  artReadtime.textContent = page.readTime;
  artTitle.textContent = page.title;
  artSummary.textContent = page.summary;

  const { html, referencedTerms } = renderWikiMarkup(page.body);
  artBody.innerHTML = html;

  // Bind wiki links inside article
  artBody.querySelectorAll('.wiki-link').forEach((link) => {
    const termKey = link.dataset.term;
    const directPage = link.dataset.page;

    link.addEventListener('mouseenter', (e) => {
      if (termKey && GLOSSARY[termKey]) showPopover(e, GLOSSARY[termKey]);
      else if (directPage && WIKI_PAGES[directPage]) {
        showPopover(e, {
          term: WIKI_PAGES[directPage].title,
          short: WIKI_PAGES[directPage].summary,
          analogy: 'Wiki Article — click to jump straight there!',
        });
      }
    });
    link.addEventListener('mousemove', positionPopover);
    link.addEventListener('mouseleave', hidePopover);

    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = directPage || (termKey && GLOSSARY[termKey] ? GLOSSARY[termKey].page : null);
      if (target) navigateTo(target);
    });
  });

  // Mount interactive Canvas/DOM widgets & quizzes for this page
  mountWidgets(artBody);

  // Lab CTA Banner (routes Genesis pages to ./index.html, Take-01 pages to ./take01.html)
  if (page.labLink) {
    const targetUrl = page.labLink.target || './take01.html';
    const isGenesis = targetUrl === './index.html';
    artLabCta.innerHTML = `
      <div>
        <strong>${isGenesis ? 'Test this in the Primary Genesis Observatory (Zero Hard-Coded Sexes)' : 'Explore this in the Take-01 Archive Lab (Pre-Labeled Mating Systems)'}</strong>
        <span>${isGenesis ? 'Run the live emergence & negative-control experiments directly in the ocean observatory.' : 'Preserved Take-01 simulator for Bateman’s Principle, Platt valuation, and decoy traps.'}</span>
      </div>
      <a class="wbtn wbtn-primary" href="${targetUrl}?exp=${page.labLink.exp}">${page.labLink.label}</a>
    `;
  }

  // Prev / Next reading trail
  if (page.prevId && WIKI_PAGES[page.prevId]) {
    btnPrevArt.classList.remove('hidden');
    btnPrevArt.innerHTML = `<small>← PREVIOUS ARTICLE</small><strong>${WIKI_PAGES[page.prevId].title.split(':')[0]}</strong>`;
    btnPrevArt.onclick = () => navigateTo(page.prevId);
  } else {
    btnPrevArt.classList.add('hidden');
  }

  if (page.nextId && WIKI_PAGES[page.nextId]) {
    btnNextArt.classList.remove('hidden');
    btnNextArt.innerHTML = `<small>NEXT ARTICLE →</small><strong>${WIKI_PAGES[page.nextId].title.split(':')[0]}</strong>`;
    btnNextArt.onclick = () => navigateTo(page.nextId);
  } else {
    btnNextArt.classList.add('hidden');
  }

  // Right Rail: Terms on This Page
  if (referencedTerms.length > 0) {
    railTerms.innerHTML = referencedTerms
      .map((k) => {
        const g = GLOSSARY[k];
        return `
          <button class="rail-term-card" data-jump="${g.page}">
            <strong>${g.term}</strong>
            <p>${g.short}</p>
          </button>`;
      })
      .join('');
    railTerms.querySelectorAll('[data-jump]').forEach((b) =>
      b.addEventListener('click', () => navigateTo(b.dataset.jump))
    );
  } else {
    railTerms.innerHTML = `<p style="font-size:12px;color:#94a3b8">Open the A–Z Glossary anytime to browse all ${Object.keys(GLOSSARY).length} lab concepts.</p>`;
  }

  // Right Rail: Related Articles
  railRelated.innerHTML = (page.related || [])
    .filter((id) => WIKI_PAGES[id])
    .map(
      (id) => `<button class="rail-rel-btn" data-rel="${id}">→ ${WIKI_PAGES[id].title}</button>`
    )
    .join('');
  railRelated.querySelectorAll('[data-rel]').forEach((b) =>
    b.addEventListener('click', () => navigateTo(b.dataset.rel))
  );

  btnBack.disabled = historyStack.length === 0;
  history.replaceState(null, '', `#page=${pageId}`);
  wikiMain.scrollTop = 0;
  buildSidebar();
}

/* ============================================================================
 * HOVER QUICK-PEEK POPOVER
 * ========================================================================== */
function showPopover(e, entry) {
  popTerm.textContent = entry.term;
  popShort.textContent = entry.short;
  popAnalogy.textContent = `💡 ${entry.analogy}`;
  popover.classList.remove('hidden');
  positionPopover(e);
}

function positionPopover(e) {
  if (popover.classList.contains('hidden')) return;
  const pad = 14;
  let x = e.clientX + 14;
  let y = e.clientY + 16;
  const rect = popover.getBoundingClientRect();
  if (x + rect.width > window.innerWidth - pad) x = e.clientX - rect.width - 14;
  if (y + rect.height > window.innerHeight - pad) y = e.clientY - rect.height - 14;
  popover.style.left = `${Math.max(pad, x)}px`;
  popover.style.top = `${Math.max(pad, y)}px`;
}

function hidePopover() {
  popover.classList.add('hidden');
}

/* ============================================================================
 * LIVE SEARCH (ARTICLES + GLOSSARY)
 * ========================================================================== */
function runSearch(q) {
  const query = q.trim().toLowerCase();
  if (!query) {
    searchResults.classList.add('hidden');
    return;
  }

  const hits = [];
  for (const p of Object.values(WIKI_PAGES)) {
    const hay = `${p.title} ${p.summary} ${p.kicker}`.toLowerCase();
    if (hay.includes(query)) {
      hits.push({ kind: 'Article', title: p.title, desc: p.summary, page: p.id });
    }
  }
  for (const g of Object.values(GLOSSARY)) {
    const hay = `${g.term} ${g.short} ${g.analogy}`.toLowerCase();
    if (hay.includes(query)) {
      hits.push({ kind: 'Concept', title: g.term, desc: g.short, page: g.page });
    }
  }

  if (hits.length === 0) {
    searchResults.innerHTML = `<div class="sr-item"><span class="sr-desc">No matches for "${query}" — try "Gini", "Platt", "peacock", or "decoy".</span></div>`;
  } else {
    searchResults.innerHTML = hits
      .slice(0, 9)
      .map(
        (h) => `
      <button class="sr-item" data-spage="${h.page}">
        <div class="sr-top">
          <strong>${h.title}</strong>
          <span class="sr-tag ${h.kind === 'Concept' ? 'term' : ''}">${h.kind}</span>
        </div>
        <span class="sr-desc">${h.desc}</span>
      </button>`
      )
      .join('');
    searchResults.querySelectorAll('[data-spage]').forEach((b) =>
      b.addEventListener('click', () => {
        navigateTo(b.dataset.spage);
        searchInput.value = '';
        searchResults.classList.add('hidden');
      })
    );
  }
  searchResults.classList.remove('hidden');
}

searchInput.addEventListener('input', (e) => runSearch(e.target.value));
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrap')) searchResults.classList.add('hidden');
});

/* ============================================================================
 * A-Z GLOSSARY MODAL
 * ========================================================================== */
function renderGlossary(filter = '') {
  const q = filter.trim().toLowerCase();
  const entries = Object.values(GLOSSARY)
    .sort((a, b) => a.term.localeCompare(b.term))
    .filter((g) => !q || `${g.term} ${g.short} ${g.analogy}`.toLowerCase().includes(q));

  glossaryList.innerHTML = entries
    .map(
      (g) => `
    <div class="gl-card">
      <h4>${g.term}</h4>
      <p>${g.short}</p>
      <div class="gl-analogy">💡 ${g.analogy}</div>
      <button class="gl-jump" data-gpage="${g.page}">Read full article →</button>
    </div>`
    )
    .join('');

  glossaryList.querySelectorAll('[data-gpage]').forEach((b) =>
    b.addEventListener('click', () => {
      glossaryModal.classList.add('hidden');
      navigateTo(b.dataset.gpage);
    })
  );
}

document.getElementById('btn-glossary').addEventListener('click', () => {
  glossaryFilter.value = '';
  renderGlossary();
  glossaryModal.classList.remove('hidden');
  glossaryFilter.focus();
});
document.getElementById('btn-glossary-close').addEventListener('click', () => {
  glossaryModal.classList.add('hidden');
});
glossaryModal.addEventListener('click', (e) => {
  if (e.target === glossaryModal) glossaryModal.classList.add('hidden');
});
glossaryFilter.addEventListener('input', (e) => renderGlossary(e.target.value));

/* ============================================================================
 * NAVIGATION & BOOT
 * ========================================================================== */
btnBack.addEventListener('click', () => {
  if (historyStack.length === 0) return;
  const prev = historyStack.pop();
  navigateTo(prev, false);
});

document.getElementById('brand-home').addEventListener('click', (e) => {
  e.preventDefault();
  navigateTo('charter');
});

document.getElementById('btn-menu').addEventListener('click', () => {
  wikiSidebar.classList.toggle('open');
});

window.addEventListener('wiki-navigate', (e) => {
  if (e.detail && e.detail.pageId) navigateTo(e.detail.pageId);
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    glossaryModal.classList.add('hidden');
    searchResults.classList.add('hidden');
  }
});

// Boot from URL hash if present (e.g. #page=genesis-lab)
const hashMatch = window.location.hash.match(/page=([a-z0-9_-]+)/i);
const startPage = hashMatch && WIKI_PAGES[hashMatch[1]] ? hashMatch[1] : 'charter';
navigateTo(startPage, false);
