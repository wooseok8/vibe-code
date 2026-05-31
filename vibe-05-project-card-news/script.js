let newsApiKey = '';
let openAiKey  = '';
let currentCat = 'general';
let currentQ   = '';

const PROXY = 'https://api.allorigins.win/raw?url=';

// ── 모달 ──────────────────────────────────────────
document.getElementById('modal-submit').addEventListener('click', submitKeys);
document.getElementById('news-key').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitKeys(); });

function submitKeys() {
  const nk = document.getElementById('news-key').value.trim();
  if (!nk) { document.getElementById('news-key').focus(); return; }
  newsApiKey = nk;
  openAiKey  = document.getElementById('openai-key').value.trim();
  document.getElementById('api-modal').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  loadNews();
}

// 설정 버튼으로 모달 재오픈
document.getElementById('settings-btn').addEventListener('click', () => {
  document.getElementById('api-modal').classList.remove('hidden');
});

// ── 카테고리 탭 ───────────────────────────────────
document.querySelectorAll('.cat-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentCat = btn.dataset.cat;
    currentQ   = '';
    document.getElementById('search-input').value = '';
    loadNews();
  });
});

// ── 검색 ──────────────────────────────────────────
document.getElementById('search-btn').addEventListener('click', doSearch);
document.getElementById('search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});

function doSearch() {
  currentQ = document.getElementById('search-input').value.trim();
  loadNews();
}

// ── 뉴스 로딩 ─────────────────────────────────────
async function loadNews() {
  renderSkeletons(9);

  const params = new URLSearchParams({
    apiKey:   newsApiKey,
    language: 'en',
    pageSize: 9,
  });

  if (currentQ) {
    // 키워드 검색: everything 엔드포인트
    params.set('q', currentQ);
    params.set('sortBy', 'publishedAt');
  } else {
    // 카테고리: top-headlines 엔드포인트
    params.set('category', currentCat);
    params.set('country', 'us');
  }

  const endpoint = currentQ
    ? `https://newsapi.org/v2/everything?${params}`
    : `https://newsapi.org/v2/top-headlines?${params}`;

  try {
    const res  = await fetch(`${PROXY}${encodeURIComponent(endpoint)}`);
    const data = await res.json();

    if (data.status !== 'ok') throw new Error(data.message || 'API 오류');

    const articles = data.articles.filter(
      (a) => a.title && a.title !== '[Removed]'
    );

    updateStatus(data.totalResults, currentQ || currentCat);
    renderCards(articles);

    // 카드 렌더 후 AI 요약 (비동기 병렬)
    if (openAiKey) {
      articles.forEach((_, i) => summarizeCard(i, articles[i]));
    }
  } catch (err) {
    renderError(err.message);
  }
}

// ── 상태바 ────────────────────────────────────────
function updateStatus(total, label) {
  const bar = document.getElementById('status-bar');
  const aiTag = openAiKey ? '· <span style="color:var(--green)">AI 요약 ON</span>' : '· 요약 없음 (OpenAI Key 미입력)';
  bar.innerHTML = `총 <strong>${total}</strong>건 중 9건 표시 ${aiTag}`;
  bar.classList.remove('hidden');
}

// ── 스켈레톤 ──────────────────────────────────────
function renderSkeletons(n) {
  const grid = document.getElementById('card-grid');
  grid.innerHTML = Array.from({ length: n }, () => `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line long"></div>
        <div class="skeleton-line mid"></div>
        <div class="skeleton-line long"></div>
        <div class="skeleton-line short"></div>
      </div>
    </div>
  `).join('');
}

// ── 카드 렌더 ─────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function renderCards(articles) {
  const grid = document.getElementById('card-grid');

  if (!articles.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <span class="emoji">🔍</span>
        검색 결과가 없습니다
      </div>`;
    return;
  }

  grid.innerHTML = articles.map((a, i) => {
    const imgHtml = a.urlToImage
      ? `<img class="card-img" src="${a.urlToImage}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      + `<div class="card-img-placeholder" style="display:none">📰</div>`
      : `<div class="card-img-placeholder">📰</div>`;

    const summaryContent = openAiKey
      ? `<div class="summary-loading"><span class="spinner"></span> AI 요약 중...</div>`
      : `<div class="summary-text">${a.description || '설명 없음'}</div>`;

    const summaryLabel = openAiKey ? '🤖 AI 요약' : '📝 기사 설명';

    return `
      <article class="news-card">
        ${imgHtml}
        <div class="card-body">
          <div class="card-meta">
            <span class="card-source">${a.source?.name || '출처 없음'}</span>
            <span>${formatDate(a.publishedAt)}</span>
          </div>
          <div class="card-title">${a.title}</div>
          <div class="card-summary">
            <div class="summary-label">${summaryLabel}</div>
            <div class="summary-content" id="summary-${i}">${summaryContent}</div>
          </div>
        </div>
        <div class="card-footer">
          <a class="card-link" href="${a.url}" target="_blank" rel="noopener">기사 원문 읽기 →</a>
        </div>
      </article>
    `;
  }).join('');
}

// ── AI 요약 (OpenAI) ──────────────────────────────
async function summarizeCard(index, article) {
  const el = document.getElementById(`summary-${index}`);
  if (!el) return;

  try {
    const prompt = `다음 영어 뉴스 기사를 한국어로 2~3문장으로 간결하게 요약해줘. 마크다운 없이 일반 텍스트로만 답해줘.\n\n제목: ${article.title}\n설명: ${article.description || ''}\n내용: ${article.content || ''}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.5,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || '';
    el.innerHTML = `<div class="summary-text">${summary}</div>`;
  } catch {
    el.innerHTML = `<div class="summary-text">${article.description || '요약 실패'}</div>`;
  }
}

// ── 에러 렌더 ─────────────────────────────────────
function renderError(msg) {
  document.getElementById('card-grid').innerHTML = `
    <div class="empty-state">
      <span class="emoji">⚠️</span>
      <strong>오류 발생</strong><br>
      <span style="font-size:0.85rem;margin-top:8px;display:block">${msg}</span>
    </div>`;
}
