'use strict';
const categories = ['Todas', 'Academia', 'Ciencia', 'Cultura', 'Comunidad'];
const symbols = { Academia: 'Aa', Ciencia: '◎', Cultura: '¶', Comunidad: '✳' };
const storageKey = 'gaceta.guardadas.v1';
const grid = document.querySelector('#news-grid');
const dialog = document.querySelector('#article-dialog');
let articles = window.GACETA_NOTICIAS;
let category = 'Todas';
let savedOnly = false;
let currentArticle = null;
let saved = new Set();
try {
  const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(stored)) saved = new Set(stored.filter(id => typeof id === 'string'));
} catch { /* La lectura sigue disponible si el navegador bloquea el almacenamiento. */ }
const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const formatDate = date => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text; // El contenido remoto se trata como texto, nunca como HTML.
  return node;
}
function renderNews() {
  const query = normalize(document.querySelector('#search').value.trim());
  const filtered = articles.filter(article => (category === 'Todas' || article.category === category) && (!savedOnly || saved.has(article.id)) && normalize(`${article.title} ${article.summary} ${article.category}`).includes(query));
  grid.replaceChildren();
  for (const article of filtered) {
    const card = element('article', 'news-card');
    const art = element('div', `card-art art-${normalize(article.category)}`);
    art.setAttribute('aria-hidden', 'true');
    art.append(element('span', '', symbols[article.category]));
    const heading = element('h3');
    const button = element('button', 'headline-button', article.title);
    button.dataset.article = article.id;
    heading.append(button);
    const metadata = element('div', 'card-meta');
    const date = element('time', '', formatDate(article.date));
    date.dateTime = article.date;
    metadata.append(date, element('span', '', saved.has(article.id) ? 'Guardada ✓' : 'Leer historia ↗'));
    card.append(art, element('p', 'eyebrow', article.category.toUpperCase()), heading, element('p', '', article.summary), metadata);
    grid.append(card);
  }
  document.querySelector('#results-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'noticia' : 'noticias'}${savedOnly ? ' guardadas' : ''}`;
  document.querySelector('#empty-state').hidden = filtered.length !== 0;
}
function updateSaveButton() {
  const isSaved = saved.has(currentArticle.id);
  const button = document.querySelector('#save-article');
  button.textContent = isSaved ? 'Quitar de guardadas' : 'Guardar noticia';
  button.setAttribute('aria-pressed', String(isSaved));
}
function openArticle(id) {
  // La portada editorial conserva su artículo local aunque cambie la fuente de noticias.
  currentArticle = articles.find(article => article.id === id) || window.GACETA_NOTICIAS.find(article => article.id === id);
  if (!currentArticle) return;
  document.querySelector('#article-title').textContent = currentArticle.title;
  document.querySelector('#article-category').textContent = currentArticle.category;
  document.querySelector('#article-meta').textContent = `${currentArticle.author} · ${formatDate(currentArticle.date)}`;
  document.querySelector('#article-body').replaceChildren(...currentArticle.body.map(paragraph => element('p', '', paragraph)));
  document.querySelector('#save-status').textContent = '';
  updateSaveButton();
  dialog.showModal();
}
document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-article]');
  if (trigger) openArticle(trigger.dataset.article);
});
document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
  category = button.dataset.category;
  document.querySelectorAll('[data-category]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  renderNews();
}));
document.querySelector('#search').addEventListener('input', renderNews);
document.querySelector('#saved-filter').addEventListener('click', event => {
  savedOnly = !savedOnly;
  event.currentTarget.setAttribute('aria-pressed', String(savedOnly));
  event.currentTarget.textContent = savedOnly ? 'Ver todas' : 'Ver guardadas';
  renderNews();
});
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#print-article').addEventListener('click', () => window.print());
document.querySelector('#save-article').addEventListener('click', () => {
  if (saved.has(currentArticle.id)) saved.delete(currentArticle.id);
  else saved.add(currentArticle.id);
  let message = saved.has(currentArticle.id) ? 'Noticia guardada en este navegador.' : 'Noticia eliminada de tus guardadas.';
  try { localStorage.setItem(storageKey, JSON.stringify([...saved])); }
  catch { message = 'Cambio aplicado solo durante esta sesión: el almacenamiento no está disponible.'; }
  document.querySelector('#save-status').textContent = message;
  updateSaveButton();
  renderNews();
});
// Contrato limitado y validado antes de sustituir los ejemplos locales.
function isValidArticle(article) {
  return article && ['id', 'title', 'summary', 'author', 'date'].every(key => typeof article[key] === 'string' && article[key].trim().length > 0 && article[key].length <= 1000)
    && categories.slice(1).includes(article.category)
    && /^\d{4}-\d{2}-\d{2}$/.test(article.date)
    && Number.isFinite(Date.parse(`${article.date}T12:00:00Z`))
    && new Date(`${article.date}T12:00:00Z`).toISOString().slice(0, 10) === article.date
    && Array.isArray(article.body) && article.body.length > 0 && article.body.length <= 30
    && article.body.every(paragraph => typeof paragraph === 'string' && paragraph.trim().length > 0 && paragraph.length <= 10000);
}
async function loadRemoteNews() {
  const endpoint = window.GACETA_CONFIG.newsEndpoint;
  if (!endpoint) return;
  const status = document.querySelector('#source-status');
  status.textContent = 'Consultando las noticias de la universidad…';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:') throw new Error('La API debe usar HTTPS.');
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit' });
    if (!response.ok) throw new Error('No se pudo consultar la API.');
    const data = await response.json();
    if (!Array.isArray(data) || data.length > 200 || !data.every(isValidArticle) || new Set(data.map(article => article.id)).size !== data.length) throw new Error('Respuesta inválida.');
    articles = data;
    status.textContent = 'Noticias actualizadas desde la universidad.';
    renderNews();
  } catch {
    status.textContent = 'No se pudo actualizar la información. Mostramos noticias de demostración.';
  } finally { clearTimeout(timeout); }
}
renderNews();
loadRemoteNews();
