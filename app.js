'use strict';
const el = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fileURL = path => path.split('/').map(encodeURIComponent).join('/');
const transcriptCache = new Map();
let entries = [];
let textReady = false;
let searchTimer;
function duration(seconds) {
  if (!Number.isFinite(seconds)) return 'Duration unknown';
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
}
function recordedDate(entry) {
  // Soundcore titles are local recording clocks; don't shift them to a browser timezone.
  if (entry.provider === 'soundcore') return entry.recordedAt.replace(' ', ' · ');
  if (!entry.recordedAt) return 'Date unknown';
  return new Intl.DateTimeFormat('en-US', {month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', timeZone:'America/Los_Angeles'}).format(new Date(entry.recordedAt));
}
function download(path, label) {
  return path ? `<a class="download" href="${fileURL(path)}" download>${escapeHTML(label)} <span aria-hidden="true">↓</span></a>` : '';
}
function snippet(entry, query) {
  if (!query) return '';
  const text = transcriptCache.get(entry.id) || '';
  const index = text.toLocaleLowerCase().indexOf(query);
  if (index < 0) return '';
  const start = Math.max(0, index - 75);
  const end = Math.min(text.length, index + query.length + 150);
  return `<p class="snippet">${start ? '…' : ''}${escapeHTML(text.slice(start, index))}<mark>${escapeHTML(text.slice(index, index + query.length))}</mark>${escapeHTML(text.slice(index + query.length, end))}${end < text.length ? '…' : ''}</p>`;
}
function render() {
  const query = el('search').value.trim().toLocaleLowerCase();
  const provider = el('provider').value;
  const selected = entries.filter(entry => (provider === 'all' || entry.provider === provider) &&
    (!query || `${entry.title} ${entry.recordedAt} ${entry.provider}`.toLocaleLowerCase().includes(query) || (transcriptCache.get(entry.id) || '').toLocaleLowerCase().includes(query)));
  el('result-count').textContent = `${selected.length} of ${entries.length} sources${query && !textReady ? ' · loading transcript text…' : ''}`;
  el('empty').hidden = selected.length !== 0;
  el('cards').innerHTML = selected.map(entry => {
    const title = entry.displayTitle || (entry.provider === 'soundcore' ? `Recording · ${entry.title.slice(0,10)}` : entry.title);
    const audio = entry.audio ? `<audio controls preload="none" aria-label="Play ${escapeHTML(title)}" src="${fileURL(entry.audio)}"></audio>` : `<p class="missing-audio">No local audio file · transcript saved</p>`;
    const extraLinks = entry.extras.map(item => `<a href="${fileURL(item.url)}" download>${escapeHTML(item.label)}</a>`);
    return `<article class="card" data-id="${escapeHTML(entry.id)}"><div class="card-top"><span class="badge ${entry.provider === 'feishu' ? 'feishu' : ''}">${entry.provider === 'feishu' ? 'FEISHU' : 'SOUNDCORE'}</span><span class="duration">${duration(entry.durationSeconds)}</span></div><h3>${escapeHTML(title)}</h3><p class="meta">${escapeHTML(recordedDate(entry))} · ${entry.provider === 'feishu' ? 'Provider transcript' : 'Superwhisper transcript'}</p>${audio}<div class="downloads">${download(entry.audio, `Audio · ${entry.audioBytes ? (entry.audioBytes / 1048576).toFixed(1) + ' MB' : 'MP3'}`)}${download(entry.transcript, 'Transcript · TXT')}</div><div class="extra-links">${extraLinks.join('')}</div>${snippet(entry, query)}<details class="preview"><summary>Read transcript</summary><pre tabindex="0">${escapeHTML(transcriptCache.get(entry.id) || 'Loading transcript…')}</pre></details></article>`;
  }).join('');
}
async function initialize() {
  try {
    const response = await fetch('library.json');
    if (!response.ok) throw new Error('Library index could not be loaded.');
    const library = await response.json();
    entries = library.entries;
    el('audio-count').textContent = library.recordingCount;
    el('transcript-count').textContent = library.transcriptCount;
    el('audio-hours').textContent = duration(entries.filter(entry => entry.audio).reduce((sum, entry) => sum + (entry.durationSeconds || 0), 0));
    el('snapshot').textContent = `Archive copied ${new Intl.DateTimeFormat('en-US', {month:'short',day:'numeric',year:'numeric', timeZone:'America/Los_Angeles'}).format(new Date(library.generatedAt))}`;
    render();
    el('search').addEventListener('input', () => {clearTimeout(searchTimer); searchTimer = setTimeout(render, 150);});
    el('provider').addEventListener('change', render);
    document.addEventListener('keydown', event => {
      if (event.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {event.preventDefault(); el('search').focus();}
    });
    await Promise.all(entries.map(async entry => {
      if (!entry.transcript) return;
      try {
        const response = await fetch(fileURL(entry.transcript));
        if (!response.ok) throw new Error();
        transcriptCache.set(entry.id, await response.text());
      } catch {transcriptCache.set(entry.id, 'Preview unavailable. Use the transcript download link.');}
    }));
    textReady = true;
    // Update previews without resetting an audio player the visitor has started.
    el('cards').querySelectorAll('.card').forEach(card => {
      card.querySelector('pre').textContent = transcriptCache.get(card.dataset.id) || 'Transcript unavailable.';
    });
    if (el('search').value.trim()) render();
  } catch(error) {
    el('result-count').textContent = error.message;
  }
}
initialize();
