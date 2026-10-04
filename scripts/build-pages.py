"""Stage public Pages assets, preserving the supplied production homepage.

Example: python3 scripts/build-pages.py --homepage /path/to/preserved-index.html
         --output /workspace/builds/minsung-pages
Build piggy-quest/dist/index.html before running this script.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = ['cargame.html', 'gam.html', 'index copy.html']
PUBLIC_DIRS = ['assets', 'ball', 'guangboo', 'guangboo-v2', 'gravity-flip',
               'marble-builder', 'mario']
EXTENSIONS = {'.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.svg',
              '.webp', '.ico', '.wav', '.mp3', '.ogg', '.mp4', '.woff', '.woff2'}


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
    copy(ROOT / 'piggy-quest/dist/index.html', Path('piggy-quest/index.html'))
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
