// Parseur MP4 minimal : ATOMS top-level + sample description (stsd) + sync samples (stss)
// Sortie : faststart, codec FourCC, présence audio, durée, dimensions, nombre de keyframes
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('Usage: node probe-mp4.mjs <file.mp4>'); process.exit(1); }
const buf = readFileSync(file);

const readU32 = (o) => buf.readUInt32BE(o);
const readU64 = (o) => Number(buf.readBigUInt64BE(o));
const fourcc = (o) => buf.toString('ascii', o, o + 4);

function* iterAtoms(start, end) {
  let p = start;
  while (p + 8 <= end) {
    let size = readU32(p);
    const type = fourcc(p + 4);
    let headerSize = 8;
    if (size === 1) { size = readU64(p + 8); headerSize = 16; }
    if (size === 0) size = end - p; // s'étend jusqu'à la fin
    if (size < headerSize || p + size > end) break;
    yield { type, start: p, end: p + size, dataStart: p + headerSize, dataEnd: p + size };
    p += size;
  }
}

function findFirst(start, end, type) {
  for (const a of iterAtoms(start, end)) if (a.type === type) return a;
  return null;
}

// Top-level
const top = [];
for (const a of iterAtoms(0, buf.length)) top.push({ type: a.type, start: a.start, size: a.end - a.start });

const ftyp = top.find(a => a.type === 'ftyp');
const moov = top.find(a => a.type === 'moov');
const mdat = top.find(a => a.type === 'mdat');
const faststart = moov && mdat ? moov.start < mdat.start : null;

// Parse moov pour récupérer les pistes
let durationSec = null;
const tracks = [];
if (moov) {
  const mvhd = findFirst(moov.start + 8, moov.start + moov.size, 'mvhd');
  if (mvhd) {
    const v = buf.readUInt8(mvhd.dataStart);
    let timescale, duration;
    if (v === 1) {
      timescale = readU32(mvhd.dataStart + 4 + 8 + 8);
      duration = readU64(mvhd.dataStart + 4 + 8 + 8 + 4);
    } else {
      timescale = readU32(mvhd.dataStart + 4 + 4 + 4);
      duration = readU32(mvhd.dataStart + 4 + 4 + 4 + 4);
    }
    durationSec = duration / timescale;
  }

  for (const trak of [...iterAtoms(moov.start + 8, moov.start + moov.size)].filter(a => a.type === 'trak')) {
    const mdia = findFirst(trak.dataStart, trak.dataEnd, 'mdia');
    if (!mdia) continue;
    const hdlr = findFirst(mdia.dataStart, mdia.dataEnd, 'hdlr');
    const handler = hdlr ? buf.toString('ascii', hdlr.dataStart + 8, hdlr.dataStart + 12) : '?';
    const minf = findFirst(mdia.dataStart, mdia.dataEnd, 'minf');
    if (!minf) continue;
    const stbl = findFirst(minf.dataStart, minf.dataEnd, 'stbl');
    if (!stbl) continue;
    const stsd = findFirst(stbl.dataStart, stbl.dataEnd, 'stsd');
    let codec = '?';
    if (stsd) {
      // skip 4 bytes version+flags + 4 bytes entry_count, then first entry: 4 bytes size + 4 bytes type
      codec = fourcc(stsd.dataStart + 8 + 4);
    }
    // stss = sync samples list (keyframes). Si absent, tous les samples sont sync.
    const stss = findFirst(stbl.dataStart, stbl.dataEnd, 'stss');
    let keyframeCount = null;
    if (stss) keyframeCount = readU32(stss.dataStart + 4);
    // stsz pour le total samples
    const stsz = findFirst(stbl.dataStart, stbl.dataEnd, 'stsz');
    let sampleCount = null;
    if (stsz) sampleCount = readU32(stsz.dataStart + 4 + 4);

    // tkhd pour width/height (vidéo)
    const tkhd = findFirst(trak.dataStart, trak.dataEnd, 'tkhd');
    let width = null, height = null;
    if (tkhd) {
      const v = buf.readUInt8(tkhd.dataStart);
      const off = v === 1 ? 4 + 8 + 8 + 4 + 4 + 8 + 8 + 2 + 2 + 2 + 2 + 36 : 4 + 4 + 4 + 4 + 4 + 4 + 8 + 2 + 2 + 2 + 2 + 36;
      width = readU32(tkhd.dataStart + off) / 65536;
      height = readU32(tkhd.dataStart + off + 4) / 65536;
    }
    tracks.push({ handler, codec, keyframeCount, sampleCount, width, height });
  }
}

const out = {
  file,
  size: buf.length,
  topLevelAtoms: top.map(a => `${a.type}(${a.size})`).join(' '),
  brand: ftyp ? buf.toString('ascii', ftyp.start + 8, ftyp.start + 12) : null,
  faststart,
  durationSec,
  tracks,
};
console.log(JSON.stringify(out, null, 2));
