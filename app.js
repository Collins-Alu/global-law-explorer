/* ═══════════════════════════════════════════════════
   LexGlobe — Frontend Application
   All API calls go through the Express server proxy.
   No API keys in this file.
   ═══════════════════════════════════════════════════ */

/* ── DOM References ─────────────────────────────── */
const searchBtn      = document.getElementById("searchBtn");
const lawInput       = document.getElementById("lawInput");
const countrySelect  = document.getElementById("countrySelect");
const resultDiv      = document.getElementById("result");
const heroSection    = document.getElementById("heroSection");
const resultSection  = document.getElementById("resultSection");

const compareBtn     = document.getElementById("compareBtn");
const compareCountry1= document.getElementById("compareCountry1");
const compareCountry2= document.getElementById("compareCountry2");
const compareLawInput= document.getElementById("compareLawInput");

const navSearch      = document.getElementById("navSearch");
const navCompare     = document.getElementById("navCompare");
const navHistory     = document.getElementById("navHistory");
const navBookmarks   = document.getElementById("navBookmarks");

const searchPanel    = document.getElementById("searchPanel");
const comparePanel   = document.getElementById("comparePanel");
const historyPanel   = document.getElementById("historyPanel");
const bookmarksPanel = document.getElementById("bookmarksPanel");

const historyList    = document.getElementById("historyList");
const bookmarksList  = document.getElementById("bookmarksList");
const historyEmpty   = document.getElementById("historyEmpty");
const bookmarksEmpty = document.getElementById("bookmarksEmpty");
const historyFilter  = document.getElementById("historyFilter");
const bookmarksFilter= document.getElementById("bookmarksFilter");

/* ── State ──────────────────────────────────────── */
let history   = JSON.parse(localStorage.getItem("lexglobe_history")   || "[]");
let bookmarks = JSON.parse(localStorage.getItem("lexglobe_bookmarks") || "[]");

/* ── Navigation ─────────────────────────────────── */
function switchPanel(panel) {
  // Deactivate all nav buttons
  [navSearch, navCompare, navHistory, navBookmarks].forEach(b => b.classList.remove("active"));

  // Hide all panels
  [searchPanel, comparePanel, heroSection, resultSection, historyPanel, bookmarksPanel]
    .forEach(el => el.classList.add("hidden"));

  if (panel === "search") {
    navSearch.classList.add("active");
    searchPanel.classList.remove("hidden");
    heroSection.classList.remove("hidden");
    resultSection.classList.remove("hidden");
  } else if (panel === "compare") {
    navCompare.classList.add("active");
    comparePanel.classList.remove("hidden");
    resultSection.classList.remove("hidden");
  } else if (panel === "history") {
    navHistory.classList.add("active");
    historyPanel.classList.remove("hidden");
    historyFilter.value = "";
    renderHistory();
  } else if (panel === "bookmarks") {
    navBookmarks.classList.add("active");
    bookmarksPanel.classList.remove("hidden");
    bookmarksFilter.value = "";
    renderBookmarks();
  }
}

navSearch.addEventListener("click",    () => switchPanel("search"));
navCompare.addEventListener("click",   () => switchPanel("compare"));
navHistory.addEventListener("click",   () => switchPanel("history"));
navBookmarks.addEventListener("click", () => switchPanel("bookmarks"));

/* ── Quick Topic Chips ─────────────────────────── */
document.querySelectorAll(".qt-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    lawInput.value = chip.dataset.topic;
    lawInput.focus();
  });
});

/* ── Enter key to search ───────────────────────── */
lawInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchLaw();
});
compareLawInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchCompare();
});

/* ── Filter listeners ──────────────────────────── */
historyFilter.addEventListener("input", () => renderHistory(historyFilter.value.trim().toLowerCase()));
bookmarksFilter.addEventListener("input", () => renderBookmarks(bookmarksFilter.value.trim().toLowerCase()));

/* ═══════════════════════════════════════════════════
   SEARCH — single country lookup
   ═══════════════════════════════════════════════════ */
searchBtn.addEventListener("click", fetchLaw);

async function fetchLaw() {
  const country = countrySelect.value;
  const law = lawInput.value.trim();

  if (!country || !law) {
    showError("Please select a country and enter a legal topic.");
    return;
  }

  showLoading();
  searchBtn.disabled = true;

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, law }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      showError(data.error || "Something went wrong. Please try again.");
      return;
    }

    const answer = data.answer;

    // Save to history
    history.unshift({ country, law, answer, timestamp: Date.now() });
    if (history.length > 50) history.pop();
    localStorage.setItem("lexglobe_history", JSON.stringify(history));

    showResult(country, law, answer);

  } catch (error) {
    console.error(error);
    showError("Could not connect to the server. Make sure the server is running.");
  } finally {
    searchBtn.disabled = false;
  }
}

/* ═══════════════════════════════════════════════════
   COMPARE — two countries, same topic
   ═══════════════════════════════════════════════════ */
compareBtn.addEventListener("click", fetchCompare);

async function fetchCompare() {
  const c1  = compareCountry1.value;
  const c2  = compareCountry2.value;
  const law = compareLawInput.value.trim();

  if (!c1 || !c2 || !law) {
    showError("Please select two countries and enter a legal topic.");
    return;
  }

  if (c1 === c2) {
    showError("Please select two different countries to compare.");
    return;
  }

  showLoading();
  compareBtn.disabled = true;

  try {
    const response = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country1: c1, country2: c2, law }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      showError(data.error || "Something went wrong. Please try again.");
      return;
    }

    showCompareResult(data.country1, data.country2, data.law, data.answer1, data.answer2);

  } catch (error) {
    console.error(error);
    showError("Could not connect to the server. Make sure the server is running.");
  } finally {
    compareBtn.disabled = false;
  }
}

/* ═══════════════════════════════════════════════════
   RENDER HELPERS
   ═══════════════════════════════════════════════════ */

function showLoading() {
  resultDiv.innerHTML = `
    <div class="result-card">
      <div class="result-header">
        <h3>Searching…</h3>
      </div>
      <div class="loading-skeleton">
        <div class="skel-line"></div>
        <div class="skel-line"></div>
        <div class="skel-line"></div>
        <div class="skel-line"></div>
        <div class="skel-line"></div>
        <div class="skel-line"></div>
        <div class="skel-line"></div>
      </div>
    </div>
  `;
}

function showError(msg) {
  resultDiv.innerHTML = `
    <div class="result-card">
      <div class="result-error">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p>${escapeHTML(msg)}</p>
      </div>
    </div>
  `;
}

/* ── Single result ─────────────────────────────── */
function showResult(country, law, answer) {
  const isBookmarked = bookmarks.some(b => b.country === country && b.law === law);
  const htmlContent = markdownToHTML(answer);

  resultDiv.innerHTML = `
    <div class="result-card">
      <div class="result-header">
        <h3><span>${escapeHTML(country)}</span> — ${escapeHTML(law)}</h3>
        <div class="result-actions">
          <button class="action-btn ${isBookmarked ? 'bookmarked' : ''}" id="bookmarkBtn" title="Bookmark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            ${isBookmarked ? 'Saved' : 'Save'}
          </button>
          <button class="action-btn" id="copyBtn" title="Copy to clipboard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          </button>
        </div>
      </div>
      <div class="result-body">${htmlContent}</div>
      <div class="result-footer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span class="disclaimer">This is AI-generated general information, not professional legal advice. Always consult a qualified lawyer.</span>
      </div>
    </div>
  `;

  document.getElementById("bookmarkBtn").addEventListener("click", () => toggleBookmark(country, law, answer));
  document.getElementById("copyBtn").addEventListener("click", () => copyToClipboard(answer));

  resultDiv.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── Compare result ────────────────────────────── */
function showCompareResult(c1, c2, law, a1, a2) {
  resultDiv.innerHTML = `
    <div class="compare-grid">
      <div class="compare-col">
        <div class="compare-col-header">
          <h3>${escapeHTML(c1)}</h3>
        </div>
        <div class="compare-col-body">${markdownToHTML(a1)}</div>
      </div>
      <div class="compare-col">
        <div class="compare-col-header">
          <h3>${escapeHTML(c2)}</h3>
        </div>
        <div class="compare-col-body">${markdownToHTML(a2)}</div>
      </div>
      <div class="compare-footer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span class="disclaimer">Comparing "${escapeHTML(law)}" — AI-generated general information, not legal advice.</span>
      </div>
    </div>
  `;

  resultDiv.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ═══════════════════════════════════════════════════
   BOOKMARKS
   ═══════════════════════════════════════════════════ */
function toggleBookmark(country, law, answer) {
  const idx = bookmarks.findIndex(b => b.country === country && b.law === law);
  if (idx > -1) {
    bookmarks.splice(idx, 1);
  } else {
    bookmarks.unshift({ country, law, answer, timestamp: Date.now() });
  }
  localStorage.setItem("lexglobe_bookmarks", JSON.stringify(bookmarks));
  showResult(country, law, answer);
}

/* ═══════════════════════════════════════════════════
   HISTORY — with filtering
   ═══════════════════════════════════════════════════ */
function renderHistory(filter = "") {
  const filtered = filter
    ? history.filter(h =>
        h.country.toLowerCase().includes(filter) ||
        h.law.toLowerCase().includes(filter))
    : history;

  if (filtered.length === 0) {
    historyEmpty.classList.remove("hidden");
    historyEmpty.textContent = filter ? "No matches found." : "No searches yet. Start exploring!";
    historyList.innerHTML = "";
    return;
  }

  historyEmpty.classList.add("hidden");
  historyList.innerHTML = filtered.map((item, i) => {
    const realIndex = history.indexOf(item);
    return `
    <div class="history-card" data-index="${realIndex}">
      <div class="card-info">
        <h4>${escapeHTML(item.country)} — ${escapeHTML(item.law)}</h4>
        <p>${timeAgo(item.timestamp)}</p>
      </div>
      <div class="card-actions">
        <button class="card-delete" data-index="${realIndex}" title="Remove">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  `}).join("");

  // Click to view
  historyList.querySelectorAll(".history-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".card-delete")) return;
      const item = history[card.dataset.index];
      countrySelect.value = item.country;
      lawInput.value = item.law;
      switchPanel("search");
      showResult(item.country, item.law, item.answer);
    });
  });

  // Delete
  historyList.querySelectorAll(".card-delete").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      history.splice(parseInt(btn.dataset.index), 1);
      localStorage.setItem("lexglobe_history", JSON.stringify(history));
      renderHistory(historyFilter.value.trim().toLowerCase());
    });
  });
}

/* ═══════════════════════════════════════════════════
   BOOKMARKS — with filtering
   ═══════════════════════════════════════════════════ */
function renderBookmarks(filter = "") {
  const filtered = filter
    ? bookmarks.filter(b =>
        b.country.toLowerCase().includes(filter) ||
        b.law.toLowerCase().includes(filter))
    : bookmarks;

  if (filtered.length === 0) {
    bookmarksEmpty.classList.remove("hidden");
    bookmarksEmpty.textContent = filter ? "No matches found." : "No bookmarks yet. Save results you find useful!";
    bookmarksList.innerHTML = "";
    return;
  }

  bookmarksEmpty.classList.add("hidden");
  bookmarksList.innerHTML = filtered.map((item, i) => {
    const realIndex = bookmarks.indexOf(item);
    return `
    <div class="bookmark-card" data-index="${realIndex}">
      <div class="card-info">
        <h4>${escapeHTML(item.country)} — ${escapeHTML(item.law)}</h4>
        <p>${timeAgo(item.timestamp)}</p>
      </div>
      <div class="card-actions">
        <button class="card-delete" data-index="${realIndex}" title="Remove bookmark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  `}).join("");

  bookmarksList.querySelectorAll(".bookmark-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".card-delete")) return;
      const item = bookmarks[card.dataset.index];
      countrySelect.value = item.country;
      lawInput.value = item.law;
      switchPanel("search");
      showResult(item.country, item.law, item.answer);
    });
  });

  bookmarksList.querySelectorAll(".card-delete").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      bookmarks.splice(parseInt(btn.dataset.index), 1);
      localStorage.setItem("lexglobe_bookmarks", JSON.stringify(bookmarks));
      renderBookmarks(bookmarksFilter.value.trim().toLowerCase());
    });
  });
}

/* ═══════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════ */

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("copyBtn");
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
    setTimeout(() => {
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
    }, 2000);
  });
}

/* ── Minimal Markdown → HTML ───────────────────── */
function markdownToHTML(md) {
  let html = escapeHTML(md);

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h3>$1</h3>');

  // Bold & italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Unordered lists
  html = html.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Numbered lists
  html = html.replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>');

  // Paragraphs
  html = html.replace(/\n{2,}/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Clean up
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>\s*(<h[34]>)/g, '$1');
  html = html.replace(/(<\/h[34]>)\s*<\/p>/g, '$1');
  html = html.replace(/<p>\s*(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');

  return html;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ── Init ──────────────────────────────────────── */
switchPanel("search");