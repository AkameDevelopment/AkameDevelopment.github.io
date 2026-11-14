#!/usr/bin/env python3
"""Build GitHub Pages directory routes from the existing HTML sources.

Source HTML stays editable at its current path. Run with --output outside the
checkout for a local build; CI deploys the generated directory using Pages.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://akamedevelopment.github.io'
EXCLUDE = {'.git', '.github', 'tests', 'backups', 'scripts', 'supabase', 'node_modules', '_site'}


def build(output):
    output = output.resolve()
    if output == ROOT or output in ROOT.parents:
        raise ValueError('Output must not replace the source checkout or its parents')
    pages = sorted(p for p in ROOT.rglob('*.html') if not any(part in EXCLUDE for part in p.relative_to(ROOT).parts))
    routes = {p.relative_to(ROOT).as_posix(): '/' if p.name == 'index.html' and p.parent == ROOT else '/' + p.relative_to(ROOT).with_suffix('').as_posix() + '/' for p in pages}
    # Preserve the registered OAuth callback addresses. The route bootstrap below
    # cleans the address in place, keeping both the PKCE query and token hash.
    oauth = re.compile(r'''redirectTo\s*:\s*(?:["'][^"']+["']|location\.origin\s*\+\s*["'][^"']+["'])''')

    def rewrite(value):
        protected = []
        def keep(match):
            protected.append(match.group()); return f'__OAUTH_CALLBACK_{len(protected)-1}__'
        value = oauth.sub(keep, value)
        for source, target in sorted(routes.items(), key=lambda pair: -len(pair[0])):
            value = value.replace(ORIGIN + '/' + source, ORIGIN + target)
            value = re.sub(r'''(["'`])/?''' + re.escape(source) + r'''(?=[?#"'`])''', lambda m: m[1] + target, value)
            value = re.sub(r'(?i)(url=)/?' + re.escape(source) + r'(?=[?#"\s>])', lambda m: m[1] + target, value)
        for i, callback in enumerate(protected):
            value = value.replace(f'__OAUTH_CALLBACK_{i}__', callback)
        return value

    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    for path in ROOT.rglob('*'):
        if not path.is_file() or path.is_symlink():
            continue
        relative = path.relative_to(ROOT)
        if any(part in EXCLUDE for part in relative.parts) or output in path.parents:
            continue
        dest = output / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        if path.suffix not in {'.html', '.js'}:
            shutil.copy2(path, dest)
            continue
        value = rewrite(path.read_text(encoding='utf-8'))
        if path.suffix == '.html':
            value = re.sub(r'<head\b[^>]*>', lambda m: m[0] + '<base href="/"><script src="/site-routes.js"></script>', value, count=1, flags=re.I)
        dest.write_text(value, encoding='utf-8')
        if relative.as_posix() in routes and relative.as_posix() != 'index.html':
            clean = output / routes[relative.as_posix()].lstrip('/') / 'index.html'
            clean.parent.mkdir(parents=True, exist_ok=True)
            clean.write_text(value, encoding='utf-8')
    mapping = {'/' + source: target for source, target in routes.items()}
    mapping.update({target + 'index.html': target for target in routes.values()})
    bootstrap = '(function(){"use strict";var routes=' + json.dumps(mapping, separators=(',', ':')) + ';var target=routes[location.pathname];if(target)history.replaceState(history.state,"",target+location.search+location.hash);})();\n'
    (output / 'site-routes.js').write_text(bootstrap, encoding='utf-8')
    # Fresh asset URLs also invalidate cached modules whose internal links changed.
    salt = Path(__file__).read_bytes()
    fingerprints = {p.relative_to(output).as_posix(): hashlib.sha256(p.read_bytes() + salt).hexdigest()[:12]
                    for p in output.rglob('*') if p.is_file() and p.suffix in {'.js', '.css'}}
    asset = re.compile(r"([\"'`])((?:\./|/)?[a-zA-Z0-9_/-]+\.(?:js|css))(?:\?[^\"'`<>\s]*)?\1")
    def version(match):
        path = match[2].removeprefix('./').removeprefix('/')
        digest = fingerprints.get(path)
        return match[1] + match[2] + '?v=' + digest + match[1] if digest else match[0]
    for path in output.rglob('*'):
        if path.is_file() and path.suffix in {'.html', '.js'}:
            path.write_text(asset.sub(version, path.read_text(encoding='utf-8')), encoding='utf-8')
    (output / '.nojekyll').touch()
    print(f'Built {len(routes)} clean page routes in {output}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    build(parser.parse_args().output)
