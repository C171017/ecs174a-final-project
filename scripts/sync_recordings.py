#!/usr/bin/env python3
"""Copy the course archive and generate the static site's index. No dependencies."""
import argparse
import hashlib
import json
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT.parent / 'Recordings')
    args = parser.parse_args()
    source = args.source.resolve()
    destination = ROOT / 'recordings'
    if source == destination.resolve() or source in destination.resolve().parents:
        raise SystemExit('Source must be separate from the project recordings folder.')
    catalog = json.loads((source / 'sources.json').read_text())
    # Merge new files without deleting historical copies or editing originals.
    shutil.copytree(source, destination, dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns('.gitignore', '.DS_Store'))
    # The course archive's Git ignore rules are not part of its recording content.
    copied_ignore = destination / '.gitignore'
    if copied_ignore.exists():
        copied_ignore.unlink()
    files = []
    for original in sorted(source.rglob('*')):
        if not original.is_file() or original.name in ('.gitignore', '.DS_Store'):
            continue
        rel = original.relative_to(source)
        copied = destination / rel
        sha = digest(original)
        if digest(copied) != sha:
            raise SystemExit(f'Copy verification failed: {rel}')
        public = original.name in ('audio.mp3', 'transcript.raw.txt') or (
            rel.parent.name == 'exports' and original.name in ('01-transcript.txt', '02-transcript.srt'))
        files.append({'path': 'recordings/' + rel.as_posix(),
                      'bytes': original.stat().st_size, 'sha256': sha,
                      'published': public})

    def url(relative):
        if relative and (destination / relative).is_file():
            return 'recordings/' + relative
        return None

    entries = []
    for record in catalog['sources']:
        metadata = json.loads((destination / record['source_metadata']).read_text())
        folder = Path(record['transcript']).parent
        is_feishu = record['capture_source'] == 'feishu'
        extras = []
        for filename, label in [('exports/01-transcript.txt', 'Exported TXT'),
                                ('exports/02-transcript.srt', 'Subtitles · SRT')]:
            relative = (folder / filename).as_posix()
            if url(relative) and (destination / relative).stat().st_size:
                extras.append({'label': label, 'url': url(relative)})
        audio = url(record.get('audio'))
        entries.append({
            'id': record['source_id'], 'title': record['title'],
            'provider': record['capture_source'],
            'transcriptProvider': record['transcript_provider'],
            'recordedAt': metadata.get('recorded_at_derived') if is_feishu else record['title'],
            'dateNote': 'Date parsed from provider display' if is_feishu else 'Recording title time',
            'durationSeconds': record.get('duration_seconds'),
            'audio': audio,
            'audioBytes': (ROOT / audio).stat().st_size if audio else None,
            'transcript': url(record.get('transcript')),
            'extras': extras,
        })
    entries.sort(key=lambda entry: (entry['recordedAt'] or '', entry['provider']), reverse=True)
    generated = datetime.now(timezone.utc).isoformat()
    result = {'generatedAt': generated, 'sourceCatalogUpdatedAt': catalog.get('updated_at'),
              'recordingCount': sum(bool(e['audio']) for e in entries),
              'transcriptCount': sum(bool(e['transcript']) for e in entries),
              'audioBytes': sum(e['audioBytes'] or 0 for e in entries), 'entries': entries}
    (ROOT / 'library.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    local = ROOT / '.local'
    local.mkdir(exist_ok=True)
    (local / 'recordings-manifest.json').write_text(json.dumps({
        'generatedAt': generated, 'files': files,
        'note': 'Full local copy inventory; only audio and transcripts are published.'
    }, indent=2) + '\n')
    (ROOT / 'recordings-manifest.json').write_text(json.dumps({
        'generatedAt': generated, 'files': [item for item in files if item['published']],
        'note': 'SHA-256 verified audio and transcript copies.'
    }, indent=2) + '\n')
    with zipfile.ZipFile(ROOT / 'transcripts.zip', 'w', zipfile.ZIP_DEFLATED) as bundle:
        for item in files:
            path = Path(item['path'])
            if item['published'] and path.suffix in ('.txt', '.srt'):
                bundle.write(ROOT / path, arcname=path.as_posix())
    print(f"Verified {len(files)} copied files; {result['recordingCount']} audio files; "
          f"{result['transcriptCount']} transcript sources.")


if __name__ == '__main__':
    main()
