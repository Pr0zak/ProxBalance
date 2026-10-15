// Unit tests for the disk health (SMART) view helper (diskHealth.js).
// Run: node tests/js/disk-health.mjs
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const out = await build({
  entryPoints: ['src/utils/diskHealth.js'],
  bundle: true, format: 'esm', write: false,
});
const { diskHealthView, failedDiskCount, fmtDiskSize, fmtWearout } =
  await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

const nvme = { devpath: '/dev/nvme0n1', model: 'SPCC M.2 PCIe SSD', type: 'nvme', size_bytes: 2048408248320, health: 'PASSED', wearout: 87 };
const hdd = { devpath: '/dev/sdb', model: 'ST5000LM000-2AN170', type: 'hdd', size_bytes: 5000981078016, health: 'PASSED', wearout: null };
const wrap = (disks) => ({ count: disks.length, disks });

test('unread or empty list shows nothing', () => {
  assert.equal(diskHealthView(null), null);
  assert.equal(diskHealthView(undefined), null);
  assert.equal(diskHealthView(wrap([])), null);
  assert.equal(failedDiskCount(null), 0);
});

test('all passed is one line', () => {
  const v = diskHealthView(wrap([nvme, hdd, { ...hdd, devpath: '/dev/sdc' }]));
  assert.equal(v.summary, 'Disks: 3, all passed SMART');
  assert.equal(v.tone, 'ok');
  assert.deepEqual(v.lines, []);
});

test('failed disk gets its own line, absent wearout is a dash', () => {
  const v = diskHealthView(wrap([nvme, { ...hdd, health: 'FAILED' }]));
  assert.equal(v.summary, 'Disks: 2, 1 passed SMART');
  assert.equal(v.tone, 'bad');
  assert.equal(v.lines.length, 1);
  assert.equal(v.lines[0].text, 'sdb · ST5000LM000-2AN170 · 5.0 TB: SMART failed, life left —');
  assert.equal(v.lines[0].short, 'sdb: SMART failed');
  assert.equal(failedDiskCount(wrap([nvme, { ...hdd, health: 'FAILED' }])), 1);
});

test('unknown and worn disks are amber; 21% left is not listed', () => {
  const v = diskHealthView(wrap([
    { ...nvme, wearout: 20 },
    { ...nvme, devpath: '/dev/nvme1n1', wearout: 21 },
    { ...hdd, health: 'UNKNOWN' },
  ]));
  assert.equal(v.tone, 'warn');
  assert.deepEqual(v.lines.map(l => l.text), [
    'nvme0n1 · SPCC M.2 PCIe SSD · 2.0 TB: SMART passed, life left 20%',
    'sdb · ST5000LM000-2AN170 · 5.0 TB: SMART unknown, life left —',
  ]);
  assert.deepEqual(v.lines.map(l => l.short), ['nvme0n1: 20% life left', 'sdb: SMART unknown']);
});

test('formatters keep absent as a dash, not 0', () => {
  assert.equal(fmtWearout(null), '—');
  assert.equal(fmtWearout(0), '0%');
  assert.equal(fmtDiskSize(null), '—');
  assert.equal(fmtDiskSize(118410444800), '118 GB');
  assert.equal(fmtDiskSize(14000519643136), '14 TB');
});
