"""Bundle the exact source into a self-contained HTML and a directory source manifest.
Only public project files are allowlisted. Browser saves, keys, environment files,
node_modules, user uploads, screenshots and generated archives are never bundled.
"""
from pathlib import Path
import json, re, hashlib
ROOT=Path(__file__).resolve().parents[1]
ROOT_FILES=['index.html','source.html','styles.css','package.json','README.md','HANDOFF.md','AGENTS.md','CODEX_PROMPT.md']
DIRS=['src','assets','scripts','tests','docs']
EXTS={'.js','.cjs','.mjs','.json','.html','.css','.md','.svg','.py'}

def source_files():
    paths=[ROOT/n for n in ROOT_FILES if (ROOT/n).is_file()]
    for folder in DIRS:
        paths += [p for p in (ROOT/folder).rglob('*') if p.is_file() and p.suffix in EXTS and '__pycache__' not in str(p)]
    return {str(p.relative_to(ROOT)).replace('\\','/'):p.read_text(encoding='utf-8') for p in sorted(set(paths))}

def build():
    files=source_files()
    payload=json.dumps(files,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    bundle='globalThis.PIGGY=globalThis.PIGGY||{};globalThis.PIGGY.SOURCE_FILES='+payload+';\n'
    (ROOT/'source-bundle.js').write_text(bundle,encoding='utf-8')
    html=files['index.html']
    html=html.replace('<link rel="stylesheet" href="styles.css">','<style>\n'+files['styles.css']+'\n</style>')
    def inline(match):
        name=match.group(1)
        text=bundle if name=='source-bundle.js' else files[name]
        text=re.sub(r'</script',r'<\\/script',text,flags=re.I)
        return '<script>\n'+text+'\n</script>'
    html=re.sub(r'<script src="([^"]+)"></script>',inline,html)
    dist=ROOT/'dist';dist.mkdir(exist_ok=True)
    (dist/'index.html').write_text(html,encoding='utf-8')
    info={'version':'0.2.0','source_file_count':len(files),'html_bytes':len(html.encode()),'sha256':hashlib.sha256(html.encode()).hexdigest(),'network_required':False,'published':False}
    (dist/'build-info.json').write_text(json.dumps(info,indent=2)+'\n')
    print(json.dumps(info,indent=2))

if __name__=='__main__':build()
