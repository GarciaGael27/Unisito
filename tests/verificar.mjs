// Pruebas de lógica sin dependencias. El DOM mínimo no sustituye una prueba visual.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

class Element {
  constructor(tag = 'div') { this.tag = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.handlers = {}; this.value = ''; this.textContent = ''; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(type, handler) { this.handlers[type] = handler; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  click() { this.handlers.click({ currentTarget: this, target: this }); }
}
function setup({ endpoint = '', fetch, storageFails = false } = {}) {
  const nodes = new Map();
  const filters = ['Todas', 'Academia', 'Ciencia', 'Cultura', 'Comunidad'].map(category => {
    const node = new Element('button'); node.dataset.category = category; return node;
  });
  const document = {
    querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, new Element()); return nodes.get(selector); },
    querySelectorAll() { return filters; },
    createElement(tag) { return new Element(tag); },
    addEventListener() {},
  };
  const storage = new Map();
  const context = vm.createContext({ document, window: { GACETA_CONFIG: { newsEndpoint: endpoint } }, localStorage: {
    getItem(key) { return storage.get(key) ?? null; },
    setItem(key, value) { if (storageFails) throw Error('blocked'); storage.set(key, value); },
  }, Intl, URL, AbortController, setTimeout, clearTimeout, fetch });
  vm.runInContext(readFileSync(new URL('../noticias.js', import.meta.url), 'utf8'), context);
  vm.runInContext(readFileSync(new URL('../app.js', import.meta.url), 'utf8'), context);
  return { context, filters, node: selector => document.querySelector(selector), run: code => vm.runInContext(code, context), storage };
}
const app = setup();
assert.equal(app.node('#news-grid').children.length, 6);
app.filters[2].click();
assert.equal(app.node('#news-grid').children.length, 2);
app.node('#search').value = 'agua';
app.node('#search').handlers.input();
assert.equal(app.node('#news-grid').children.length, 1, 'Categoría y búsqueda combinadas');
app.node('#search').value = '';
app.filters[0].click();
app.node('#search').value = 'investigacion';
app.node('#search').handlers.input();
assert.equal(app.node('#news-grid').children.length, 1, 'Búsqueda sin acentos');
app.node('#search').value = 'inexistente';
app.node('#search').handlers.input();
assert.equal(app.node('#empty-state').hidden, false);
app.node('#search').value = '';
app.run("openArticle('agua')");
assert.equal(app.node('#article-dialog').open, true);
assert.match(app.node('#article-title').textContent, /agua/);
app.node('#save-article').click();
assert.match(app.storage.get('gaceta.guardadas.v1'), /agua/);
app.node('#saved-filter').click();
assert.equal(app.node('#news-grid').children.length, 1);
app.node('#save-article').click();
assert.equal(app.node('#news-grid').children.length, 0);
app.node('#close-dialog').click();
assert.equal(app.node('#article-dialog').open, false);
assert.equal(app.run('window.GACETA_NOTICIAS.every(isValidArticle)'), true);
assert.equal(app.run("isValidArticle({...window.GACETA_NOTICIAS[0], date: '2026-02-30'})"), false);
assert.equal(app.run("isValidArticle({...window.GACETA_NOTICIAS[0], body: []})"), false);
const blocked = setup({ storageFails: true });
blocked.run("openArticle('agua')"); blocked.node('#save-article').click();
assert.match(blocked.node('#save-status').textContent, /solo durante esta sesión/);
const failed = setup({ endpoint: 'https://example.test/noticias', fetch: async () => { throw Error('offline'); } });
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(failed.node('#news-grid').children.length, 6);
assert.match(failed.node('#source-status').textContent, /demostración/);
const invalid = setup({ endpoint: 'https://example.test/noticias', fetch: async () => ({ ok: true, json: async () => [{ title: 'incompleto' }] }) });
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(invalid.node('#news-grid').children.length, 6);
const remote = setup({ endpoint: 'https://example.test/noticias', fetch: async () => ({ ok: true, json: async () => [{ id: 'remota', title: '<img src=x onerror=alert(1)>', summary: 'Contenido remoto', author: 'UH', category: 'Ciencia', date: '2026-10-10', body: ['Texto de prueba.'] }] }) });
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(remote.node('#news-grid').children.length, 1);
remote.run("openArticle('remota')");
assert.equal(remote.node('#article-title').textContent, '<img src=x onerror=alert(1)>');
assert.equal(remote.node('#article-title').children.length, 0, 'El contenido se inserta como texto');
console.log('Correcto: renderizado, filtros, búsqueda, vacío, lectura, guardadas, almacenamiento bloqueado, validación y API simulada.');
