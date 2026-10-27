const tools = Array.isArray(window.TOOL_CATALOG) ? window.TOOL_CATALOG : [];
const categories = ['全部', '音乐', '学习练习', '趣味实验', '已收藏'];
const $ = id => document.getElementById(id);
const searchInput = $('search-input');
const grid = $('tool-grid');
let category = '全部';
let favorites = new Set();

try {
  const saved = JSON.parse(localStorage.getItem('creaey-tool-favorites') || '[]');
  if (Array.isArray(saved)) favorites = new Set(saved.filter(id => tools.some(tool => tool.id === id)));
} catch {}

function toolUrl(tool) { return new URL(tool.path, location.href).href; }
function normalize(value) { return String(value).normalize('NFKC').toLocaleLowerCase(); }
function saveFavorites() { try { localStorage.setItem('creaey-tool-favorites', JSON.stringify([...favorites])); } catch {} }

function renderFilters() {
  const root = $('category-filters');
  root.replaceChildren();
  categories.forEach(name => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter' + (category === name ? ' selected' : '');
    button.textContent = name;
    button.setAttribute('aria-pressed', String(category === name));
    button.addEventListener('click', () => { category = name; render(); });
    root.append(button);
  });
}

function createCard(tool, index) {
  const card = document.createElement('article');
  card.className = 'tool-card' + (tool.featured ? ' featured' : '');
  const top = document.createElement('div');
  top.className = 'card-top';
  const icon = document.createElement('span');
  icon.className = 'tool-icon';
  icon.textContent = tool.icon;
  icon.setAttribute('aria-hidden', 'true');
  const favorite = document.createElement('button');
  favorite.type = 'button';
  favorite.className = 'favorite' + (favorites.has(tool.id) ? ' saved' : '');
  favorite.setAttribute('aria-label', favorites.has(tool.id) ? `取消收藏${tool.title}` : `收藏${tool.title}`);
  favorite.setAttribute('aria-pressed', String(favorites.has(tool.id)));
  favorite.textContent = favorites.has(tool.id) ? '★' : '☆';
  favorite.addEventListener('click', () => {
    if (favorites.has(tool.id)) favorites.delete(tool.id); else favorites.add(tool.id);
    saveFavorites();
    render();
  });
  top.append(icon, favorite);

  const link = document.createElement('a');
  link.className = 'tool-link';
  link.href = '?open=' + encodeURIComponent(tool.id);
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openTool(tool.id);
  });
  const eyebrow = document.createElement('span');
  eyebrow.className = 'card-eyebrow';
  eyebrow.textContent = `${String(index + 1).padStart(2, '0')} / ${tool.category}`;
  const title = document.createElement('h3');
  title.textContent = tool.title;
  const description = document.createElement('p');
  description.textContent = tool.description;
  const tags = document.createElement('span');
  tags.className = 'card-tags';
  tags.textContent = tool.tags.join(' · ');
  const action = document.createElement('span');
  action.className = 'card-action';
  action.innerHTML = '打开工具 <span aria-hidden="true">↗</span>';
  link.append(eyebrow, title, description, tags, action);
  card.append(top, link);
  return card;
}

function render() {
  renderFilters();
  const query = normalize(searchInput.value.trim());
  const visible = tools.filter(tool => {
    const categoryMatches = category === '全部' || (category === '已收藏' ? favorites.has(tool.id) : tool.category === category);
    return categoryMatches && (!query || normalize([tool.title, tool.description, tool.category, ...tool.tags].join(' ')).includes(query));
  });
  grid.replaceChildren(...visible.map((tool, index) => createCard(tool, index)));
  $('result-count').textContent = `显示 ${visible.length} / ${tools.length} 个`;
  $('empty-state').hidden = visible.length > 0;
}

function showViewer(tool) {
  const viewer = $('viewer');
  if (!tool) {
    viewer.hidden = true;
    $('tool-frame').removeAttribute('src');
    document.body.classList.remove('viewer-open');
    document.title = '我的小工具 · Creaey';
    return;
  }
  $('viewer-title').textContent = tool.title;
  $('viewer-category').textContent = tool.category;
  $('viewer-icon').textContent = tool.icon;
  $('open-direct').href = toolUrl(tool);
  $('tool-frame').title = tool.title;
  $('tool-frame').src = toolUrl(tool);
  viewer.hidden = false;
  document.body.classList.add('viewer-open');
  document.title = `${tool.title} · 我的小工具`;
  $('close-viewer').focus();
}

function syncFromUrl() {
  const id = new URLSearchParams(location.search).get('open');
  showViewer(tools.find(tool => tool.id === id));
}

function openTool(id) {
  const tool = tools.find(item => item.id === id);
  if (!tool) return;
  history.pushState({tool: id, fromIndex: true}, '', '?open=' + encodeURIComponent(id));
  showViewer(tool);
}

function closeViewer() {
  if (history.state?.fromIndex) history.back();
  else {
    history.replaceState(null, '', location.pathname);
    showViewer(null);
  }
}

searchInput.addEventListener('input', render);
$('reset-filters').addEventListener('click', () => { searchInput.value = ''; category = '全部'; render(); searchInput.focus(); });
$('close-viewer').addEventListener('click', closeViewer);
window.addEventListener('popstate', syncFromUrl);
window.addEventListener('keydown', event => {
  if (event.key === '/' && !document.body.classList.contains('viewer-open') && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === 'Escape' && ! $('viewer').hidden) closeViewer();
});
$('total-count').textContent = String(tools.length).padStart(2, '0');
render();
syncFromUrl();
