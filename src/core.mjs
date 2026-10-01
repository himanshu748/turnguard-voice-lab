/** Deterministic client-policy model. No I/O, timers, audio device or vendor calls. */
export const CONTEXT_TIMEOUT_MS = 3000;
const validId = (value) => typeof value === 'string' && /^[a-z][a-z0-9-]{0,47}$/.test(value);
const shortText = (value, max = 240) => typeof value === 'string' && value.length > 0 && value.length <= max;
const terminal = new Set(['interrupted', 'fatal', 'timed-out', 'blocked']);

export function initialState(policy = 'safe') {
  if (!['safe', 'broken'].includes(policy)) throw new Error('Unknown policy');
  return {
    policy, now: 0, activeId: null, contexts: {}, queue: [], playing: null,
    segments: [], log: [], outbound: [], crashed: false,
    stats: { accepted: 0, dropped: 0, warnings: 0, errors: 0, malformed: 0, timeouts: 0, leakedMs: 0 },
  };
}

/** The demo envelope is our fixture format, never a Murf audio decoder. */
export function parseFrame(raw) {
  let frame;
  try {
    if (typeof raw === 'string' && raw.length > 20000) return { ok: false, reason: 'Frame exceeds the fixture size limit' };
    frame = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch { return { ok: false, reason: 'Invalid JSON; frame quarantined' }; }
  const bad = (reason) => ({ ok: false, reason });
  if (!frame || typeof frame !== 'object' || Array.isArray(frame)) return bad('Expected an object frame');
  if (!validId(frame.context_id)) return bad('Missing or invalid context_id');
  if (frame.trace_id !== undefined && !shortText(frame.trace_id, 120)) return bad('Invalid trace_id');
  const hasAudio = Object.hasOwn(frame, 'audio');
  const hasWarning = Object.hasOwn(frame, 'warning');
  const hasError = Object.hasOwn(frame, 'error');
  if (frame.final !== undefined && typeof frame.final !== 'boolean') return bad('final must be boolean');
  const flags = Number(hasAudio || frame.final === true) + Number(hasWarning) + Number(hasError);
  if (flags !== 1) return bad('Ambiguous or unknown frame type');
  if (hasAudio && (!shortText(frame.audio) || !frame.audio.startsWith('synthetic:') ||
      !frame.demo || !validId(frame.demo.chunk_id) || !Number.isInteger(frame.demo.duration_ms) ||
      frame.demo.duration_ms <= 0 || frame.demo.duration_ms > 2000 || !shortText(frame.demo.label))) {
    return bad('Invalid synthetic audio envelope');
  }
  if (hasWarning && (!shortText(frame.warning) || !shortText(frame.warning_code, 80))) return bad('Warning needs message and code');
  if (hasError && (!shortText(frame.error) || !shortText(frame.error_code, 80) || typeof frame.fatal !== 'boolean')) return bad('Error needs code and boolean fatal');
  return { ok: true, frame, kind: hasAudio ? 'audio' : hasWarning ? 'warning' : hasError ? 'error' : 'final' };
}

function log(s, kind, contextId, title, detail, tone = 'neutral', raw = null) {
  s.log.push({ id: s.log.length, at: s.now, kind, contextId, title, detail, tone, raw });
}
function outbound(s, payload) { s.outbound.push({ at: s.now, payload }); }
function finishPlaying(s, reason) {
  if (!s.playing) return;
  const seg = s.segments[s.playing.segmentIndex];
  seg.endedAt = s.now;
  seg.reason = reason;
  s.playing = null;
}
function cancelLocal(s, id, reason) {
  s.queue = s.queue.filter((item) => item.contextId !== id);
  if (s.playing?.contextId === id) finishPlaying(s, reason);
}
function retire(s, id) {
  const context = Object.hasOwn(s.contexts, id) ? s.contexts[id] : null;
  if (!context || terminal.has(context.status)) return;
  context.status = 'interrupted';
  context.endedAt = s.now;
  context.revokedAt = s.now;
  outbound(s, { context_id: id, clear: true });
  if (s.policy === 'safe') {
    cancelLocal(s, id, 'interrupted');
    log(s, 'interrupt', id, 'Stopped locally. Clear sent.', 'Playback stopped now; queued chunks purged. Server cancellation is separate.', 'safe');
  } else {
    if (s.playing?.contextId === id) {
      const seg = s.segments[s.playing.segmentIndex];
      seg.stale = true;
      seg.staleFrom ??= s.now;
    }
    log(s, 'interrupt', id, 'Clear sent. Playback kept going.', 'Broken client assumes server clear also stops its local player.', 'danger');
  }
}
function beginPlayback(s) {
  if (s.playing || s.crashed) return;
  const index = s.policy === 'broken' ? (s.queue.length ? 0 : -1) : s.queue.findIndex((item) => item.contextId === s.activeId);
  if (index < 0) return;
  const item = s.queue.splice(index, 1)[0];
  const stale = item.contextId !== s.activeId || terminal.has(s.contexts[item.contextId].status) || s.contexts[item.contextId].revokedAt !== null;
  const segmentIndex = s.segments.length;
  s.segments.push({ ...item, startedAt: s.now, endedAt: null, reason: null, stale, staleFrom: stale ? s.now : null });
  s.playing = { ...item, remainingMs: item.durationMs, segmentIndex };
  s.contexts[item.contextId].played++;
  log(s, 'play', item.contextId, stale ? 'Wrong-turn playback' : 'Local playback started', item.label, stale ? 'danger' : 'safe');
}
function expire(s) {
  if (s.policy !== 'safe') return;
  for (const context of Object.values(s.contexts)) {
    if (context.status !== 'streaming' || context.deadlineAt > s.now) continue;
    context.status = 'timed-out';
    context.endedAt = s.now;
    s.stats.timeouts++;
    cancelLocal(s, context.id, 'timed-out');
    outbound(s, { context_id: context.id, clear: true });
    log(s, 'timeout', context.id, 'Deadline reached. Context closed.', 'Demo policy: 3,000 ms total context deadline, not a Murf service limit.', 'warning');
  }
}
function advance(s, at) {
  while (s.now < at) {
    expire(s);
    beginPlayback(s);
    const deadline = s.policy === 'safe' ? Math.min(...Object.values(s.contexts).filter((c) => c.status === 'streaming').map((c) => c.deadlineAt)) : Infinity;
    const end = s.playing ? s.now + s.playing.remainingMs : Infinity;
    const next = Math.min(at, deadline, end);
    const elapsed = next - s.now;
    if (s.playing) {
      const context = s.contexts[s.playing.contextId];
      const stale = s.playing.contextId !== s.activeId || terminal.has(context.status) || context.revokedAt !== null;
      if (stale) s.stats.leakedMs += elapsed;
      s.playing.remainingMs -= elapsed;
    }
    s.now = next;
    if (s.playing?.remainingMs === 0) finishPlaying(s, 'finished');
    expire(s);
    beginPlayback(s);
  }
}
function drop(s, id, detail, raw) {
  s.stats.dropped++;
  log(s, 'drop', id, 'Frame rejected', detail, 'safe', raw);
}
function receive(s, raw) {
  const parsed = parseFrame(raw);
  if (!parsed.ok) {
    s.stats.malformed++;
    log(s, 'malformed', null, 'Malformed frame quarantined', parsed.reason, 'warning', raw);
    if (s.policy === 'broken') {
      s.crashed = true;
      if (s.activeId) cancelLocal(s, s.activeId, 'parser-halted');
      log(s, 'crash', null, 'Broken receiver halted', 'Simulated missing parser boundary. The lab itself remains usable.', 'danger');
    }
    return;
  }
  const { frame, kind } = parsed;
  const id = frame.context_id;
  const context = Object.hasOwn(s.contexts, id) ? s.contexts[id] : null;
  if (!context) { drop(s, id, 'No registered context owns this frame', raw); return; }
  if (s.crashed) { drop(s, id, 'Broken receiver already halted', raw); return; }
  if (s.policy === 'safe' && context.status !== 'streaming') {
    drop(s, id, `Context is ${context.status}; late ${kind} cannot reopen it`, raw); return;
  }
  if (frame.trace_id) context.traceId = frame.trace_id;
  if (kind === 'warning') {
    s.stats.warnings++;
    log(s, kind, id, frame.warning_code, s.policy === 'safe' ? 'Warning recorded; synthesis continues.' : 'Broken client mistakes a warning for failure.', s.policy === 'safe' ? 'warning' : 'danger', raw);
    if (s.policy === 'broken') { context.status = 'blocked'; cancelLocal(s, id, 'warning-misclassified'); }
    return;
  }
  if (kind === 'error') {
    s.stats.errors++;
    log(s, kind, id, `${frame.error_code}${frame.fatal ? ' · fatal' : ''}`, frame.fatal ? (s.policy === 'safe' ? 'Context closed immediately. No final frame needed.' : 'Broken client waits for a final frame that will not come.') : 'Nonfatal error recorded; context remains open.', frame.fatal ? 'danger' : 'warning', raw);
    if (frame.fatal && s.policy === 'safe') { context.status = 'fatal'; context.endedAt = s.now; cancelLocal(s, id, 'fatal'); }
    return;
  }
  if (s.policy === 'broken' && context.status === 'blocked') { drop(s, id, 'Broken warning handler already blocked this context', raw); return; }
  if (kind === 'audio') {
    const chunkId = frame.demo.chunk_id;
    if (context.seen.includes(chunkId)) { drop(s, id, 'Duplicate chunk ID', raw); return; }
    context.seen.push(chunkId);
    context.received++;
    context.firstAudioAt ??= s.now;
    s.stats.accepted++;
    s.queue.push({ contextId: id, chunkId, label: frame.demo.label, durationMs: frame.demo.duration_ms });
    log(s, kind, id, `Chunk accepted · ${chunkId}`, frame.demo.label, 'neutral', raw);
  }
  if (frame.final === true) {
    context.status = 'complete';
    context.endedAt = s.now;
    log(s, 'final', id, 'Final received', 'Input closed. Already accepted playback can drain.', 'safe', raw);
  }
}

/** Returns a fresh, serializable snapshot. Events require monotonic simulated time. */
export function transition(state, event) {
  if (!event || !Number.isFinite(event.at) || event.at < state.now) throw new Error('Events require finite monotonic time');
  if (!['start', 'interrupt', 'frame', 'tick'].includes(event.type)) throw new Error('Unknown event type');
  const s = structuredClone(state);
  advance(s, event.at);
  if (event.type === 'start') {
    const id = event.contextId;
    if (!validId(id) || Object.hasOwn(s.contexts, id)) { drop(s, id, 'Context ID invalid or already used', null); return s; }
    if (event.focus !== false) {
      if (s.activeId) retire(s, s.activeId);
      s.activeId = id;
    }
    s.contexts[id] = { id, status: 'streaming', startedAt: s.now, deadlineAt: s.now + CONTEXT_TIMEOUT_MS, firstAudioAt: null, endedAt: null, revokedAt: null, received: 0, played: 0, seen: [], traceId: null };
    outbound(s, { context_id: id, text: event.text || 'Synthetic demonstration turn.', end: true });
    log(s, 'start', id, event.focus === false ? 'Background context opened' : 'New playback owner', event.text || 'Synthetic demonstration turn.', 'neutral');
  } else if (event.type === 'interrupt') retire(s, event.contextId || s.activeId);
  else if (event.type === 'frame') receive(s, event.raw);
  beginPlayback(s);
  return s;
}
