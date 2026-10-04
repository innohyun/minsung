"""Upload reviewed public Pages assets sequentially through the platform proxy.

This does not activate a deployment. Run Wrangler pages deploy afterward.
Requires the public manifest produced by build-pages.py and the installed Wrangler.
"""
import argparse
import base64
import hashlib
import json
import mimetypes
import os
from pathlib import Path
import subprocess
import urllib.error
import urllib.request

ACCOUNT = '8326f1e0ab93e6bea3b3b6753b9d8fcf'
BASE = 'https://api.cloudflare.com/client/v4'
ROOT = Path(__file__).resolve().parents[1]


def api(path, token, body=None):
    request = urllib.request.Request(BASE + path,
        data=None if body is None else json.dumps(body).encode(),
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        # Never log headers, credentials, or raw response bodies.
        raise SystemExit(f'Pages API HTTP {error.code} at {path}') from None
    if not result.get('success'):
        raise SystemExit(f'Pages API returned success=false at {path}')
    return result.get('result')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, required=True)
    directory = parser.parse_args().directory.resolve()
    if directory == ROOT or directory.is_relative_to(ROOT) or ROOT.is_relative_to(directory):
        raise SystemExit('Use a reviewed output directory outside the checkout.')
    if os.environ.get('CLOUDFLARE_ACCOUNT_ID') != ACCOUNT:
        raise SystemExit('Configured account does not match the minsung project account.')
    token = os.environ.get('CLOUDFLARE_API_TOKEN')
    if not token:
        raise SystemExit('CLOUDFLARE_API_TOKEN is not applied.')
    manifest = json.loads((directory.parent / (directory.name + '-manifest.json')).read_text())
    paths = []
    blocked = {'.git', '.local', 'node_modules', 'tests', 'scripts', '__pycache__'}
    for item in manifest['files']:
        relative = Path(item['path']); path = directory / relative
        if relative.is_absolute() or set(relative.parts) & blocked or path.is_symlink() or not path.resolve().is_relative_to(directory):
            raise SystemExit('Unsafe path in public manifest.')
        if hashlib.sha256(path.read_bytes()).hexdigest() != item['sha256']:
            raise SystemExit('Output changed since public manifest review.')
        paths.append(str(path))
    # Match Wrangler 4.147.0's asset hashing without modifying the installed CLI.
    code = """
        const fs=require('node:fs'),path=require('node:path');
        const {createRequire}=require('node:module');
        const blake3=createRequire('/workspace/.tools/minsung-cloudflare/package.json')('blake3-wasm');
        process.stdout.write(JSON.stringify(JSON.parse(fs.readFileSync(0,'utf8')).map(p=>({path:p,
          hash:blake3.hash(fs.readFileSync(p).toString('base64')+path.extname(p).slice(1)).toString('hex').slice(0,32)}))));
    """
    files = json.loads(subprocess.run(['node', '-e', code], input=json.dumps(paths),
                       text=True, capture_output=True, check=True).stdout)
    jwt = api(f'/accounts/{ACCOUNT}/pages/projects/minsung/upload-token', token)['jwt']
    hashes = [file['hash'] for file in files]
    missing = set(api('/pages/assets/check-missing', jwt, {'hashes': hashes}))
    selected = [file for file in files if file['hash'] in missing]
    print(f'Missing public assets: {len(selected)}', flush=True)
    for index, file in enumerate(selected, 1):
        path = Path(file['path'])
        api('/pages/assets/upload', jwt, [{'key': file['hash'],
            'value': base64.b64encode(path.read_bytes()).decode(),
            'metadata': {'contentType': mimetypes.guess_type(path)[0] or 'application/octet-stream'},
            'base64': True}])
        if index % 10 == 0 or index == len(selected):
            print(f'Uploaded {index}/{len(selected)} public assets', flush=True)
    api('/pages/assets/upsert-hashes', jwt, {'hashes': hashes})
    if api('/pages/assets/check-missing', jwt, {'hashes': hashes}):
        raise SystemExit('Assets remain missing.')
    print('All asset hashes registered. No deployment activated by this helper.')


if __name__ == '__main__':
    main()
