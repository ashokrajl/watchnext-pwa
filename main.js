const API_BASE = '/api/tmdb'; // serverless proxy
const IMG = (path) => path ? `https://image.tmdb.org/t/p/w342${path}` : '';

const els = {
  grid: document.getElementById('grid'),
  genres: document.getElementById('genres'),
  yearFrom: document.getElementById('yearFrom'),
  yearTo: document.getElementById('yearTo'),
  apply: document.getElementById('apply'),
  loadMore: document.getElementById('loadMore'),
  clearSeen: document.getElementById('clearSeen'),
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
};

let state = {
  page: 1,
  totalPages: 999,
  genres: [],
  selectedGenres: new Set(),
  yearFrom: 2023,
  yearTo: new Date().getFullYear(),
  seen: new Set(loadSeen()),
};

function loadSeen() {
  try { return JSON.parse(localStorage.getItem('seen') || '[]'); }
  catch { return []; }
}
function saveSeen() {
  localStorage.setItem('seen', JSON.stringify([...state.seen]));
}

function showLoading(on=true){ els.loading.classList.toggle('hidden', !on); }
function showError(msg){ els.error.textContent=msg; els.error.classList.toggle('hidden', !msg); }

async function fetchGenres() {
  const r = await fetch(`${API_BASE}/?mode=genres);
  if (!r.ok) throw new Error('Genres fetch failed');
  const { genres } = await r.json();
  state.genres = genres;
  // populate select
  els.genres.innerHTML = '';
  genres.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    els.genres.appendChild(opt);
  });
}

async function fetchMovies() {
  const params = new URLSearchParams({
    page: state.page,
    from: `${state.yearFrom}-01-01`,
    to: `${state.yearTo}-12-31`,
  });
  if (state.selectedGenres.size) {
    params.set('genres', [...state.selectedGenres].join(','));
  }
  const r = await fetch(`${API_BASE}/d?mode=discover&params}`);
  if (!r.ok) throw new Error('Movie fetch failed');
  return r.json();
}

function renderMovies(results=[]) {
  const frag = document.createDocumentFragment();
  results
    .filter(m => m.poster_path && !state.seen.has(m.id))
    .forEach(m => {
      const card = document.createElement('div');
      card.className = 'card';

      const img = document.createElement('img');
      img.className = 'poster';
      img.src = IMG(m.poster_path);
      img.alt = m.title || '';
      card.appendChild(img);

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = m.title || '';
      card.appendChild(title);

      const tag = document.createElement('div');
      tag.className = 'tag';
      tag.textContent = (m.release_date || '').slice(0,4);
      card.appendChild(tag);

      const row = document.createElement('div');
      row.className = 'row';
      const btn = document.createElement('button');
      btn.textContent = 'Seen';
      btn.addEventListener('click', () => {
        state.seen.add(m.id);
        saveSeen();
        card.remove();
      });
      row.appendChild(btn);
      card.appendChild(row);

      frag.appendChild(card);
    });
  els.grid.appendChild(frag);
}

async function loadNextPage() {
  if (state.page > state.totalPages) return;
  showLoading(true); showError('');
  try {
    const data = await fetchMovies();
    state.totalPages = data.total_pages || state.totalPages;
    renderMovies(data.results || []);
    state.page += 1;
  } catch (e) {
    showError(e.message || 'Error');
  } finally {
    showLoading(false);
  }
}

function applyFilters() {
  state.yearFrom = parseInt(els.yearFrom.value, 10) || state.yearFrom;
  state.yearTo   = parseInt(els.yearTo.value, 10) || state.yearTo;
  state.selectedGenres = new Set([...els.genres.selectedOptions].map(o => parseInt(o.value,10)));
  state.page = 1; state.totalPages = 999;
  els.grid.innerHTML = '';
  loadNextPage();
}

els.apply.addEventListener('click', applyFilters);
els.loadMore.addEventListener('click', loadNextPage);
els.clearSeen.addEventListener('click', () => {
  if (confirm('Clear Seen list?')) {
    state.seen.clear(); saveSeen();
    // re-apply current filters to re-render
    applyFilters();
  }
});

// boot
(async function init(){
  try {
    await fetchGenres();
    applyFilters();
  } catch (e) {
    showError(e.message || 'Init failed');
  }
})();
