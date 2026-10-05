"""Stage public Pages assets, preserving the supplied production homepage.

Example: python3 scripts/build-pages.py --homepage /path/to/preserved-index.html
         --output /workspace/builds/minsung-pages
Build piggy-quest/dist/index.html before running this script.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = ['cargame.html', 'gam.html', 'index copy.html']
PUBLIC_DIRS = ['assets', 'ball', 'guangboo', 'guangboo-v2', 'gravity-flip',
               'marble-builder', 'mario']
EXTENSIONS = {'.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.svg',
              '.webp', '.ico', '.wav', '.mp3', '.ogg', '.mp4', '.woff', '.woff2'}


def pages_game(out):
    """Keep the exact offline source payload, in small parser-ordered static files.

    Large single requests fail in the managed proxy's credential path even when
    the same upload JWT accepts smaller files. No art or runtime code is changed.
    The original self-contained dist/index.html remains the offline download.
    """
    bundle = (ROOT / 'piggy-quest/source-bundle.js').read_text()
    prefix = 'globalThis.PIGGY=globalThis.PIGGY||{};globalThis.PIGGY.SOURCE_FILES='
    if not bundle.startswith(prefix) or not bundle.endswith(';\n'):
        raise SystemExit('Unexpected source bundle format; rebuild the game first.')
    payload = bundle[len(prefix):-2]
    sources = json.loads(payload)
    if not isinstance(sources, dict) or 'src/game.js' not in sources:
        raise SystemExit('Public source manifest is incomplete.')
    html = (ROOT / 'piggy-quest/dist/index.html').read_text()
    inline = '<script>\n' + re.sub(r'</script', r'<\\/script', bundle, flags=re.I) + '\n</script>'
    if html.count(inline) != 1:
        raise SystemExit('Source bundle does not match the standalone HTML.')
    digest = hashlib.sha256(payload.encode()).hexdigest()[:16]
    scripts = []
    parts = []
    target = out / 'piggy-quest/source-parts'
    target.mkdir(parents=True)
    for index, start in enumerate(range(0, len(payload), 500_000), 1):
        part = payload[start:start + 500_000]
        parts.append(part)
        name = f'{digest}-{index:02d}.js'
        js = ('globalThis.__PIGGY_SOURCE_PARTS=globalThis.__PIGGY_SOURCE_PARTS||[];'
              'globalThis.__PIGGY_SOURCE_PARTS.push(' + json.dumps(part, ensure_ascii=False) + ');\n')
        if len(js.encode()) > 2_100_000:
            raise SystemExit('Source part exceeded the reviewed upload size.')
        (target / name).write_text(js)
        scripts.append(f'<script src="source-parts/{name}"></script>')
    if ''.join(parts) != payload:
        raise SystemExit('Source part reconstruction failed.')
    scripts.append('<script>globalThis.PIGGY=globalThis.PIGGY||{};'
                   'globalThis.PIGGY.SOURCE_FILES=JSON.parse(globalThis.__PIGGY_SOURCE_PARTS.join(""));'
                   'delete globalThis.__PIGGY_SOURCE_PARTS;</script>')
    (out / 'piggy-quest/index.html').write_text(html.replace(inline, '\n'.join(scripts)))
    return len(parts)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--homepage', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    out = args.output.resolve()
    homepage = args.homepage.resolve()
    if out == ROOT or out.is_relative_to(ROOT) or ROOT.is_relative_to(out):
        raise SystemExit('Output must be a dedicated directory outside the checkout.')
    if out.exists():
        raise SystemExit('Output already exists; use a new directory to preserve earlier builds.')
    if not homepage.is_file():
        raise SystemExit('A saved production homepage is required.')
    out.mkdir(parents=True)

    def copy(source, relative):
        if source.is_symlink() or not source.resolve().is_relative_to(ROOT):
            raise SystemExit(f'Unexpected public source path: {source}')
        target = out / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)

    shutil.copyfile(homepage, out / 'index.html')
    copy(ROOT / 'index.html', Path('dashboard.html'))
    for name in PUBLIC_FILES:
        copy(ROOT / name, Path(name))
    for name in PUBLIC_DIRS:
        for source in sorted((ROOT / name).rglob('*')):
            if source.is_symlink():
                raise SystemExit(f'Symlink is not a public build input: {source}')
            if source.is_file() and source.suffix.lower() in EXTENSIONS:
                copy(source, source.relative_to(ROOT))
    source_parts = pages_game(out)
    copy(ROOT / 'piggy-quest/source.html', Path('piggy-quest/source.html'))
    copy(ROOT / 'piggy-quest/assets/pig.svg', Path('piggy-quest/assets/pig.svg'))
    files = sorted(p for p in out.rglob('*') if p.is_file())
    blocked = {'.git', '.local', 'node_modules', 'tests', 'scripts', '__pycache__'}
    for path in files:
        rel = path.relative_to(out)
        if set(rel.parts) & blocked or path.suffix in {'.sqlite', '.db', '.mjs', '.py'}:
            raise SystemExit(f'Private or development file in output: {rel}')
    report = {
        'file_count': len(files),
        'homepage_sha256': hashlib.sha256((out / 'index.html').read_bytes()).hexdigest(),
        'game_sha256': hashlib.sha256((out / 'piggy-quest/index.html').read_bytes()).hexdigest(),
        'offline_game_sha256': hashlib.sha256((ROOT / 'piggy-quest/dist/index.html').read_bytes()).hexdigest(),
        'source_part_count': source_parts,
        'total_bytes': sum(p.stat().st_size for p in files),
    }
    # Keep the manifest beside the output; upload only the dedicated output directory.
    manifest = out.parent / (out.name + '-manifest.json')
    manifest.write_text(json.dumps({'summary': report, 'files': [
        {'path': str(p.relative_to(out)), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
        for p in files
    ]}, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
