import { scenarios, replay } from './scenarios.mjs';
const $ = (id) => document.getElementById(id);
const number = (n) => Math.round(n).toLocaleString('en-US');
let scene = scenarios[0], policy = 'safe', position = 0, running = false;
let timer = null, lastWallTime = 0, ledgerSignature = '', selectedEvent = null;
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const announce = (message) => { $('announcement').textContent = message; };
for (const [index, scenario] of scenarios.entries()) {
  const button = el('button', 'scenario-button');
  button.dataset.scenario = scenario.id;
  button.append(el('span', 'scenario-index', String(index + 1).padStart(2, '0')));
  const copy = el('span');
  copy.append(el('span', 'scenario-name', scenario.name), el('span', 'scenario-short', scenario.short));
  button.append(copy);
  button.addEventListener('click', () => chooseScenario(scenario.id));
  $('scenario-list').append(button);
  const option = el('option', '', scenario.name);
  option.value = scenario.id;
  $('scenario-select').append(option);
}
function stop() {
  running = false;
  if (timer !== null) cancelAnimationFrame(timer);
  timer = null;
}
function saveLocation() { history.replaceState(null, '', `#${scene.id}/${policy}/${Math.round(position)}`); }
function clearInspector() {
  selectedEvent = null;
  ledgerSignature = '';
  $('inspector').open = false;
  $('inspector-label').textContent = 'No event selected';
  $('payload').textContent = 'Select a ledger event to inspect its payload.';
}
function chooseScenario(id) {
  stop();
  scene = scenarios.find((item) => item.id === id) || scenarios[0];
  position = 0;
  clearInspector();
  $('events').scrollTop = 0;
  render(); saveLocation();
  announce(`${scene.name} selected. ${scene.question}`);
}
function seek(at) {
  stop(); clearInspector();
  position = Math.max(0, Math.min(scene.duration, at));
  render(); saveLocation();
}
function frame(wallTime) {
  if (!running) return;
  const delta = Math.min(200, Math.max(0, wallTime - lastWallTime));
  lastWallTime = wallTime;
  position = Math.min(scene.duration, position + delta * Number($('speed').value));
  render();
  if (position >= scene.duration) {
    stop(); render(); saveLocation();
    announce(`Experiment finished. ${policy === 'safe' ? scene.safe : scene.broken}`);
  } else timer = requestAnimationFrame(frame);
}
function togglePlay() {
  if (running) { stop(); render(); saveLocation(); announce('Paused.'); return; }
  if (position >= scene.duration) seek(0);
  running = true;
  lastWallTime = performance.now();
  render(); timer = requestAnimationFrame(frame);
  announce('Running. All timing and playback are simulated; no sound is produced.');
}
function choosePolicy(next) {
  stop(); policy = next; clearInspector();
  render(); saveLocation();
  announce(`${next === 'safe' ? 'Safe' : 'Broken'} client. Same inputs replayed at ${number(position)} milliseconds.`);
}
function renderTimeline(state) {
  const plot = el('div', 'timeline-plot');
  const axis = el('div', 'timeline-axis');
  for (let i = 0; i <= 4; i++) axis.append(el('span', '', number(scene.duration * i / 4)));
  plot.append(axis);
  for (const id of ['turn-a', 'turn-b']) {
    const lane = el('div', 'timeline-lane');
    lane.append(el('span', 'lane-label', id));
    for (const segment of state.segments.filter((item) => item.contextId === id)) {
      const end = segment.endedAt ?? state.now;
      const bar = el('span', `segment ${id}`, segment.chunkId.replace('chunk-', '#'));
      bar.style.left = `${segment.startedAt / scene.duration * 100}%`;
      bar.style.width = `${(end - segment.startedAt) / scene.duration * 100}%`;
      bar.title = `${id}: ${segment.label}; ${number(segment.startedAt)}–${number(end)} ms`;
      lane.append(bar);
      if (segment.staleFrom !== null && end > segment.staleFrom) {
        const stale = el('span', 'segment stale', 'old');
        stale.style.left = `${segment.staleFrom / scene.duration * 100}%`;
        stale.style.width = `${(end - segment.staleFrom) / scene.duration * 100}%`;
        stale.title = `Wrong-turn playback: ${number(end - segment.staleFrom)} simulated ms`;
        lane.append(stale);
      }
    }
    plot.append(lane);
  }
  for (const event of scene.events.filter((event) => event.type === 'interrupt')) {
    const marker = el('span', 'interrupt-marker');
    marker.style.left = `${event.at / scene.duration * 100}%`;
    marker.title = `Scripted interruption at ${number(event.at)} ms`;
    plot.append(marker);
  }
  const playhead = el('span', 'playhead');
  playhead.style.left = `${state.now / scene.duration * 100}%`;
  plot.append(playhead);
  $('timeline').replaceChildren(plot);
  $('timeline').setAttribute('aria-label', `Simulated playback at ${number(state.now)} milliseconds. ${number(state.stats.leakedMs)} milliseconds of wrong-turn playback.`);
}
function inspect(event, button) {
  selectedEvent = event.id;
  document.querySelectorAll('.event-button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  $('inspector-label').textContent = `${number(event.at)} ms · ${event.kind}`;
  $('payload').textContent = JSON.stringify({ note: 'Synthetic fixture data. The demo envelope is not a provider wire format.', decision: event.title, detail: event.detail, simulated_ms: event.at, context_id: event.contextId, payload: event.raw }, null, 2);
  $('inspector').open = true;
}
function renderLedger(state) {
  const filter = $('filter').value;
  const signature = `${scene.id}/${policy}/${state.log.length}/${filter}`;
  if (signature === ledgerSignature) return;
  ledgerSignature = signature;
  const oldScroll = $('events').scrollTop;
  const wasAtEnd = $('events').scrollHeight - oldScroll - $('events').clientHeight < 30;
  const visible = state.log.filter((event) => filter === 'all' || (filter === 'frame' ? event.raw !== null : !['audio', 'start', 'play'].includes(event.kind)));
  $('events').replaceChildren(...visible.map((event) => {
    const li = el('li');
    const button = el('button', 'event-button');
    button.dataset.tone = event.tone;
    button.setAttribute('aria-pressed', String(selectedEvent === event.id));
    button.setAttribute('aria-label', `${number(event.at)} milliseconds. ${event.contextId || 'Receiver'}. ${event.title}. ${event.detail}`);
    button.append(el('span', 'event-time', `${number(event.at)} ms`), el('span', `event-context ${event.contextId || ''}`, event.contextId || 'receiver'), el('span', 'event-message', event.title), el('span', 'event-tag', event.kind));
    button.addEventListener('click', () => inspect(event, button));
    li.append(button); return li;
  }));
  $('empty-events').hidden = visible.length !== 0;
  $('events').scrollTop = running && wasAtEnd ? $('events').scrollHeight : oldScroll;
  $('contexts').replaceChildren(...Object.values(state.contexts).map((context) => {
    const chip = el('span', `context-chip ${context.id}`);
    chip.append(el('strong', '', context.id), el('span', '', context.status), el('small', '', context.id === state.activeId ? 'speaker owner' : 'background'));
    return chip;
  }));
}
function render() {
  const state = replay(scene, policy, position);
  $('scenario-name').textContent = scene.name;
  $('scenario-question').textContent = scene.question;
  $('scenario-select').value = scene.id;
  document.querySelectorAll('.scenario-button').forEach((button) => button.setAttribute('aria-current', String(button.dataset.scenario === scene.id)));
  $('safe').setAttribute('aria-pressed', String(policy === 'safe'));
  $('broken').setAttribute('aria-pressed', String(policy === 'broken'));
  const ended = position >= scene.duration;
  $('run-state').textContent = running ? 'Running' : ended ? 'Window ended' : position === 0 ? 'Ready' : 'Paused';
  $('run-state').dataset.state = running ? 'running' : 'paused';
  $('play').querySelector('span').textContent = running ? 'Pause' : ended ? 'Replay' : position > 0 ? 'Continue' : 'Run experiment';
  $('play').querySelector('path').setAttribute('d', running ? 'M5 4h3v12H5zm7 0h3v12h-3z' : 'm6 4 10 6-10 6Z');
  $('step').disabled = ended;
  $('clock').textContent = `${number(position)} / ${number(scene.duration)} ms`;
  $('scrubber').max = scene.duration;
  $('scrubber').value = Math.round(position);
  $('scrubber').setAttribute('aria-valuetext', `${number(position)} of ${number(scene.duration)} simulated milliseconds`);
  const active = state.contexts[state.activeId];
  const leak = state.playing && (state.playing.contextId !== state.activeId || ['interrupted', 'fatal', 'timed-out'].includes(state.contexts[state.playing.contextId].status) || state.contexts[state.playing.contextId].revokedAt !== null);
  $('playback-owner').textContent = state.playing ? `Local speaker · ${state.playing.contextId}` : 'Local speaker · quiet';
  $('playback-text').textContent = state.playing?.label || (position === 0 ? 'Ready for the first chunk' : state.crashed ? 'Receiver halted by the bad frame' : active?.status === 'streaming' ? 'Quiet. Still waiting for this context…' : 'No local audio queued to play');
  $('playback-status').textContent = leak ? 'WRONG TURN' : state.playing ? 'PLAYING' : 'SILENT';
  document.querySelector('.now-playing').dataset.leak = String(Boolean(leak));
  $('accepted-count').textContent = state.stats.accepted;
  $('dropped-count').textContent = state.stats.dropped;
  $('leak-count').replaceChildren(document.createTextNode(`${number(state.stats.leakedMs)} `), el('b', '', 'ms'));
  $('leak-count').classList.toggle('danger', state.stats.leakedMs > 0);
  $('first-frame').textContent = active?.firstAudioAt !== null && active?.firstAudioAt !== undefined ? `${number(active.firstAudioAt - active.startedAt)} ms` : '—';
  $('lesson').dataset.policy = policy;
  $('lesson-title').textContent = policy === 'safe' ? 'The safe client' : 'The deliberately broken client';
  $('lesson-text').textContent = scene[policy];
  renderTimeline(state); renderLedger(state);
}
$('play').addEventListener('click', togglePlay);
$('reset').addEventListener('click', () => { seek(0); announce('Experiment reset.'); });
$('step').addEventListener('click', () => {
  const next = scene.events.find((event) => event.at > position)?.at ?? scene.duration;
  seek(next); announce(`Stepped to ${number(next)} milliseconds.`);
});
$('jump').addEventListener('click', () => { seek(scene.moment); announce(`Key moment: ${scene[policy]}`); });
$('scrubber').addEventListener('input', () => seek(Number($('scrubber').value)));
$('scenario-select').addEventListener('change', () => chooseScenario($('scenario-select').value));
$('safe').addEventListener('click', () => choosePolicy('safe'));
$('broken').addEventListener('click', () => choosePolicy('broken'));
$('filter').addEventListener('change', render);
$('export').addEventListener('click', () => {
  const trace = { project: 'TurnGuard', formatVersion: 1, simulated: true, disclaimer: 'Synthetic client simulation. No TTS or provider performance measured.', scenario: scene.id, policy, observationMs: Math.round(position), state: replay(scene, policy, position) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(trace, null, 2)], { type: 'application/json' }));
  const anchor = el('a'); anchor.href = url; anchor.download = `turnguard-${scene.id}-${policy}.json`;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce('Synthetic trace exported as JSON.');
});
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName) || event.target.isContentEditable) return;
  if (event.key.toLowerCase() === 'k') { event.preventDefault(); togglePlay(); }
  if (event.key.toLowerCase() === 'r') { event.preventDefault(); seek(0); announce('Experiment reset.'); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && running) { stop(); render(); saveLocation(); } });
window.addEventListener('pagehide', () => { stop(); render(); saveLocation(); });
window.addEventListener('hashchange', loadLocation);
function loadLocation() {
  const [id, nextPolicy, time] = location.hash.slice(1).split('/');
  if (!scenarios.some((item) => item.id === id)) return;
  stop(); scene = scenarios.find((item) => item.id === id);
  policy = nextPolicy === 'broken' ? 'broken' : 'safe';
  position = Math.max(0, Math.min(scene.duration, Number(time) || 0));
  clearInspector(); render();
}
document.documentElement.dataset.reducedMotion = String(matchMedia('(prefers-reduced-motion: reduce)').matches);
loadLocation(); render();
