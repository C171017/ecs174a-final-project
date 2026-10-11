# ECS 174A · Final project

Shared workspace for the group final project and course recording library.

- **Website:** https://C171017.github.io/ecs174a-final-project/
- **Repository:** https://github.com/C171017/ecs174a-final-project
- **Project planning:** [docs/PROJECT.md](docs/PROJECT.md)

The website is public and supports audio playback, transcript previews, full-text search, and downloads. It has no framework, paid service, or external analytics.

## Work together

```sh
git clone https://github.com/C171017/ecs174a-final-project.git
cd ecs174a-final-project
```

Anyone can view and download. Direct push access requires a GitHub collaborator invitation; otherwise propose changes through a fork and pull request.

Keep implementation in `src/`, planning/report material in `docs/`, and large future datasets in `data/` (ignored by default). The project topic and responsibilities are still open.

## Course library

`recordings/` is a separate copy of the local course archive. Public audio and transcript copies are SHA-256 checked in `recordings-manifest.json`; the complete local inventory is in `.local/recordings-manifest.json`. The current library contains eight Soundcore MP3s and thirteen transcript sources (eight Soundcore/Superwhisper and five Feishu). The October 11 update adds October 1, 2, 6, 8, and 9 Soundcore recordings plus October 1 and 6 Feishu transcripts found in the unassigned inbox. Their course assignment was inferred with high confidence from transcript content and the archived lecture/discussion schedule; the original inbox records remain unchanged. Feishu audio was not downloaded into the course archive. Separate source records do not establish separate lectures or verified same-lecture pairs.

Original transcripts and exports are preserved as supplied, with automatic transcription errors possible. The complete archive, including provider notes, metadata, and browser captures, is retained locally. Only MP3s, raw transcripts, and TXT/SRT transcript exports are committed and published. No lecture slides, textbooks, private inboxes, or unrelated course files are included.

## Preview and update

From this folder:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://localhost:8000. To copy newly filed course recordings and regenerate the search/download index on the original machine:

```sh
python3 scripts/sync_recordings.py
git add recordings library.json recordings-manifest.json transcripts.zip
git commit -m "Update course recording library"
git push
```

On other machines pass `--source /path/to/course/Recordings`. Sync adds or replaces copied files without deleting historical copies. It does not fetch recordings from providers or run automatically. GitHub Pages publishes `main` from the repository root. No secrets belong in this public repository.

Each ordinary GitHub file must stay below 100 MiB; the current largest MP3 is about 84 MiB. For future larger files, use separate release assets or suitable storage rather than silently reducing recording quality.
