import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCadenceStatus,
  extractLinksForThreadsReply,
  splitIntoXThread,
} from '../src/lib/platforms.ts';

test('splitIntoXThread preserves single tweets under 280 chars and splits long notes cleanly', () => {
  const short = 'Shipped a 5-day React/TS sprint for a Seed startup.';
  assert.deepEqual(splitIntoXThread(short), [short]);

  const longNote = Array.from({ length: 18 }, (_, i) => `Sentence ${i + 1} explains concrete product progress.`).join(' ');
  const thread = splitIntoXThread(longNote, 280);
  assert.ok(thread.length >= 3);
  for (const t of thread) {
    assert.ok(t.length <= 280, `Tweet exceeded 280 chars (${t.length})`);
  }
  assert.match(thread[0], /\(1\/\d+\)$/);
});

test('extractLinksForThreadsReply moves URLs out of main Threads body into reply', () => {
  const res = extractLinksForThreadsReply(
    'We just shipped a fast local docs search tool.\n\nTry it here: https://pipes.pink/studio'
  );
  assert.equal(res.mainText, 'We just shipped a fast local docs search tool.\n\nTry it here:');
  assert.equal(res.replyText, 'Link: https://pipes.pink/studio');
});

test('computeCadenceStatus flags never-posted, fresh, due, and overdue channels accurately', () => {
  const now = new Date('2026-11-16T15:00:00Z');
  assert.equal(computeCadenceStatus('threads', null, 4, now).state, 'never');
  assert.equal(computeCadenceStatus('x', '2026-11-16 10:00:00', 3, now).state, 'fresh');
  assert.equal(computeCadenceStatus('threads', '2026-11-12 10:00:00', 4, now).state, 'due');
  assert.equal(computeCadenceStatus('instagram', '2026-11-01 10:00:00', 5, now).state, 'overdue');
});
