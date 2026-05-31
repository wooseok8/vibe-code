let apiKey     = '';
let allVideos  = [];
let sortBy     = 'engagement';
let chartInst  = null;

const YT_API = 'https://www.googleapis.com/youtube/v3';

// ── 모달 ────────────────────────────────────────
document.getElementById('yt-key').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitKey();
});
document.getElementById('modal-submit').addEventListener('click', submitKey);

function submitKey() {
  const k = document.getElementById('yt-key').value.trim();
  if (!k) { document.getElementById('yt-key').focus(); return; }
  apiKey = k;
  document.getElementById('api-modal').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

document.getElementById('settings-btn').addEventListener('click', () => {
  document.getElementById('api-modal').classList.remove('hidden');
});

// ── 검색 ────────────────────────────────────────
document.getElementById('search-btn').addEventListener('click', doSearch);
document.getElementById('search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});

async function doSearch() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;

  renderSkeletons(12);
  setStatus(`<span class="spinner"></span>"${q}" 검색 중...`);
  document.getElementById('chart-section').classList.add('hidden');

  try {
    // ① 키워드로 영상 ID 목록 검색
    const searchRes = await fetch(
      `${YT_API}/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=20&key=${apiKey}`
    );
    const searchData = await searchRes.json();
    if (searchData.error) throw new Error(searchData.error.message);

    const items = searchData.items || [];
    if (!items.length) { renderEmpty('검색 결과가 없습니다'); setStatus(''); return; }

    const videoIds = items.map((i) => i.id.videoId).join(',');

    // ② 통계 데이터 수집
    const statsRes = await fetch(
      `${YT_API}/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`
    );
    const statsData = await statsRes.json();
    if (statsData.error) throw new Error(statsData.error.message);

    // ③ 참여율 계산
    allVideos = statsData.items.map((v) => {
      const s       = v.statistics || {};
      const views   = parseInt(s.viewCount    || 0);
      const likes   = parseInt(s.likeCount    || 0);
      const comments= parseInt(s.commentCount || 0);
      const engagement = views > 0
        ? parseFloat(((likes + comments) / views * 100).toFixed(3))
        : 0;

      return {
        id:          v.id,
        title:       v.snippet.title,
        channel:     v.snippet.channelTitle,
        thumbnail:   v.snippet.thumbnails?.medium?.url || '',
        publishedAt: v.snippet.publishedAt,
        views, likes, comments, engagement,
      };
    });

    renderBySort();
    setStatus(`"${q}" 검색 결과 ${allVideos.length}개`);
  } catch (err) {
    renderEmpty(`오류: ${err.message}`);
    setStatus('');
  }
}

// ── 정렬 ────────────────────────────────────────
document.querySelectorAll('.sort-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sort-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    sortBy = btn.dataset.sort;
    renderBySort();
  });
});

function renderBySort() {
  const sorted = [...allVideos].sort((a, b) => b[sortBy] - a[sortBy]);
  renderCards(sorted);
  renderChart(sorted.slice(0, 10));
}

// ── 차트 ────────────────────────────────────────
function renderChart(top10) {
  const section = document.getElementById('chart-section');
  section.classList.remove('hidden');

  const labels = top10.map((v, i) => `${i + 1}. ${v.title.slice(0, 28)}…`);
  const data   = top10.map((v) => v.engagement);
  const maxEng = Math.max(...data);

  if (chartInst) chartInst.destroy();

  chartInst = new Chart(document.getElementById('engagement-chart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '참여율 (%)',
        data,
        backgroundColor: data.map((v) => {
          const ratio = maxEng > 0 ? v / maxEng : 0;
          return `rgba(227, 179, 65, ${0.4 + ratio * 0.6})`;
        }),
        borderColor: 'rgba(227, 179, 65, 0.9)',
        borderWidth: 1,
        borderRadius: 6,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` 참여율 ${ctx.raw}%`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#8b949e', callback: (v) => v + '%' },
          grid:  { color: '#30363d' },
        },
        y: {
          ticks: { color: '#e6edf3', font: { size: 11 } },
          grid:  { display: false },
        },
      },
    },
  });
}

// ── 카드 렌더 ────────────────────────────────────
function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function engagementClass(eng, max) {
  const ratio = max > 0 ? eng / max : 0;
  if (ratio >= 0.8) return 'top-engagement';
  if (ratio >= 0.5) return 'high-engagement';
  return '';
}

function renderCards(videos) {
  const grid = document.getElementById('card-grid');
  if (!videos.length) { renderEmpty('결과 없음'); return; }

  const maxEng = Math.max(...videos.map((v) => v.engagement));
  const maxBar = Math.max(...videos.map((v) => v.engagement), 0.001);

  grid.innerHTML = videos.map((v, i) => {
    const engClass  = engagementClass(v.engagement, maxEng);
    const barWidth  = Math.min((v.engagement / maxBar) * 100, 100).toFixed(1);
    const rankLabel = i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`;

    return `
      <article class="video-card ${engClass}">
        <span class="rank-badge">${rankLabel}</span>
        <div class="card-thumb">
          <img src="${v.thumbnail}" alt="" loading="lazy">
          <a class="play-overlay" href="https://youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">▶</a>
        </div>
        <div class="card-body">
          <div class="card-channel">${v.channel}</div>
          <div class="card-title">${v.title}</div>
          <div class="card-stats">
            <div class="stat-item">
              <div class="stat-value">${fmtNum(v.views)}</div>
              <div class="stat-label">👁 조회수</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${fmtNum(v.likes)}</div>
              <div class="stat-label">👍 좋아요</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${fmtNum(v.comments)}</div>
              <div class="stat-label">💬 댓글</div>
            </div>
          </div>
          <div class="engagement-bar-wrap">
            <div class="engagement-label">
              <span>참여율</span>
              <span class="engagement-value">${v.engagement}%</span>
            </div>
            <div class="engagement-bar">
              <div class="engagement-fill" style="width:${barWidth}%"></div>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <a class="card-link" href="https://youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">YouTube에서 보기 →</a>
        </div>
      </article>
    `;
  }).join('');
}

// ── 스켈레톤 / 빈 상태 / 상태 텍스트 ────────────
function renderSkeletons(n) {
  document.getElementById('card-grid').innerHTML = Array.from({ length: n }, () => `
    <div class="skeleton-card">
      <div class="skeleton-thumb"></div>
      <div class="skeleton-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line long"></div>
        <div class="skeleton-line mid"></div>
        <div class="skeleton-line long"></div>
      </div>
    </div>
  `).join('');
}

function renderEmpty(msg) {
  document.getElementById('card-grid').innerHTML = `
    <div class="empty-state">
      <span class="emoji">🔍</span>${msg}
    </div>`;
}

function setStatus(html) {
  document.getElementById('status-text').innerHTML = html;
}
