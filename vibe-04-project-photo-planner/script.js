let apiKey = '';
let selectedLat = null;
let selectedLng = null;
let map = null;
let marker = null;

const GOLDEN_MS = 60 * 60 * 1000; // ±1시간
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// ── API Key 모달 ──────────────────────────────────
document.getElementById('api-key-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitKey();
});
document.getElementById('api-submit').addEventListener('click', submitKey);

function submitKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (!key) return;
  apiKey = key;
  document.getElementById('api-modal').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  initMap();
}

// ── Leaflet 지도 ──────────────────────────────────
function initMap() {
  map = L.map('map').setView([36.5, 127.8], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  map.on('click', (e) => setLocation(e.latlng.lat, e.latlng.lng));
}

function setLocation(lat, lng) {
  selectedLat = parseFloat(lat.toFixed(5));
  selectedLng = parseFloat(lng.toFixed(5));

  if (marker) marker.remove();
  marker = L.marker([selectedLat, selectedLng]).addTo(map);

  document.getElementById('lat-input').value = selectedLat;
  document.getElementById('lng-input').value = selectedLng;
  document.getElementById('coord-badge').textContent =
    `위도 ${selectedLat}  경도 ${selectedLng}`;
  document.getElementById('fetch-btn').disabled = false;
}

// 수동 좌표 입력
document.getElementById('manual-btn').addEventListener('click', () => {
  const lat = parseFloat(document.getElementById('lat-input').value);
  const lng = parseFloat(document.getElementById('lng-input').value);
  if (isNaN(lat) || isNaN(lng)) return;
  map.setView([lat, lng], 10);
  setLocation(lat, lng);
});

// ── 데이터 불러오기 ──────────────────────────────
document.getElementById('fetch-btn').addEventListener('click', fetchData);

async function fetchData() {
  const btn = document.getElementById('fetch-btn');
  btn.innerHTML = '<span class="spinner"></span>불러오는 중...';
  btn.disabled = true;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const params = new URLSearchParams({
    lat: selectedLat,
    lng: selectedLng,
    start: start.toISOString(),
    end: end.toISOString(),
  });

  const headers = { Authorization: apiKey };

  try {
    const [tideRes, astroRes] = await Promise.all([
      fetch(`https://api.stormglass.io/v2/tide/extremes/point?${params}`, { headers }),
      fetch(`https://api.stormglass.io/v2/astronomy/point?${params}`, { headers }),
    ]);

    // API 에러 처리
    if (!tideRes.ok || !astroRes.ok) {
      const errRes = !tideRes.ok ? tideRes : astroRes;
      const err = await errRes.json().catch(() => ({}));
      throw new Error(
        err.errors?.key?.[0] ||
        err.message ||
        `HTTP ${errRes.status}: API 요청 실패`
      );
    }

    const { data: tides } = await tideRes.json();
    const { data: astro } = await astroRes.json();

    renderCalendar(tides, astro, start);
  } catch (err) {
    alert('오류: ' + err.message);
  } finally {
    btn.textContent = '데이터 불러오기';
    btn.disabled = false;
  }
}

// ── 캘린더 렌더링 ────────────────────────────────
function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmt(date) {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function dateRangeLabel(start) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts = { month: 'long', day: 'numeric' };
  return `${start.toLocaleDateString('ko-KR', opts)} ~ ${end.toLocaleDateString('ko-KR', opts)}`;
}

function renderCalendar(tides, astroList, startDate) {
  const grid = document.getElementById('calendar-grid');
  const placeholder = document.getElementById('calendar-placeholder');
  const weekLabel = document.getElementById('week-label');

  grid.innerHTML = '';
  placeholder.classList.add('hidden');
  weekLabel.textContent = `📅 ${dateRangeLabel(startDate)}  ·  위도 ${selectedLat}, 경도 ${selectedLng}`;
  weekLabel.classList.remove('hidden');
  grid.classList.remove('hidden');

  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate);
    day.setDate(day.getDate() + i);

    // 천문 데이터
    const astro = astroList.find((a) => isSameLocalDay(new Date(a.time), day));
    const sunrise = astro?.sunrise ? new Date(astro.sunrise) : null;
    const sunset  = astro?.sunset  ? new Date(astro.sunset)  : null;

    // 간조(low tide) 목록
    const lowTides = tides
      .filter((t) => t.type === 'low' && isSameLocalDay(new Date(t.time), day))
      .map((t) => new Date(t.time));

    // 황금 찬스 계산
    const shots = [];
    lowTides.forEach((tideTime) => {
      if (sunrise && Math.abs(tideTime - sunrise) <= GOLDEN_MS) {
        shots.push(`일출 ${fmt(sunrise)} ↔ 간조 ${fmt(tideTime)}`);
      }
      if (sunset && Math.abs(tideTime - sunset) <= GOLDEN_MS) {
        shots.push(`일몰 ${fmt(sunset)} ↔ 간조 ${fmt(tideTime)}`);
      }
    });

    const isGolden = shots.length > 0;
    const isToday  = isSameLocalDay(day, today);
    const dow      = day.getDay(); // 0=일, 6=토

    // 요일 색상
    const nameColor = dow === 0 ? 'sun' : dow === 6 ? 'sat' : '';

    // 간조 행 HTML
    const tidesHtml = lowTides.length
      ? lowTides.map((t) => `<div class="info-row tide">🌊 간조 ${fmt(t)}</div>`).join('')
      : '<div class="info-row no-data">간조 없음</div>';

    // 황금 찬스 행 HTML
    const shotsHtml = shots
      .map((s) => `<div class="info-row highlight">✨ ${s}</div>`)
      .join('');

    const cell = document.createElement('div');
    cell.className = `day-cell${isGolden ? ' golden' : ''}${isToday ? ' today' : ''}`;
    cell.innerHTML = `
      <div class="day-header">
        <span class="day-name ${nameColor}">${DAY_NAMES[dow]}</span>
        <span class="day-date">${day.getMonth() + 1}/${day.getDate()}${isToday ? ' 오늘' : ''}</span>
        ${isGolden ? '<span class="golden-badge">📸 황금찬스</span>' : ''}
      </div>
      <div class="day-body">
        ${sunrise ? `<div class="info-row sunrise">🌅 일출 ${fmt(sunrise)}</div>` : ''}
        ${tidesHtml}
        ${sunset ? `<div class="info-row sunset">🌇 일몰 ${fmt(sunset)}</div>` : ''}
        ${shotsHtml}
      </div>
    `;

    grid.appendChild(cell);
  }
}
