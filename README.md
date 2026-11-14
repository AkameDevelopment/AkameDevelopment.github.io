# AkameDevelopment.github.io
## Website build and clean URLs

Edit the existing HTML/JS/CSS source files. The `Publish website` workflow runs
`scripts/build-pages.py` and deploys its output to GitHub Pages. Each source page
gets a directory route, for example `community.html` becomes `/community/`.
Legacy URLs keep their query strings and hashes when the address is normalized.
Registered Discord OAuth callbacks stay unchanged. Local asset links receive
content versions so browsers also load the updated navigation modules.

Local validation:

```sh
python3 scripts/build-pages.py --output /tmp/akame-pages
npm ci --prefix tests/support
npm test --prefix tests/support
```
