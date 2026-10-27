# Website: how it is organised and how to publish

This repo holds two things:

- `README.md`: the GitHub profile shown at github.com/mdism
- `site/`: the website at shaikhismail.com (only this folder is published)

```
site/
├── index.html                 Home page
├── tools/index.html           Free tools page (edit the TOOLS list at the bottom)
├── assets/css/site.css        Shared styles (colours, light/dark theme)
├── assets/js/site.js          Theme toggle, mobile menu, Ctrl+K menu, agent terminal replay
├── assets/img/                Resume preview, link-preview image (og.png)
└── resume/                    The PDFs visitors download
resume/                        Editable Word versions (not published)
.cpanel.yml                    Tells MilesWeb to copy only site/ into public_html
```

## Updating the resume

1. Edit the Word file in `resume/`.
2. Export it to PDF with the same name and replace the file in `site/resume/`.
3. Regenerate `site/assets/img/resume-preview.jpg` from page 1 if the layout changed.
4. Commit, push, and deploy (below). The site always links to the newest PDF.

## Publishing on MilesWeb (cPanel), one-time setup

1. Back up the current live site: cPanel → File Manager → `public_html` → select all → Compress → download the zip.
2. cPanel → **Git Version Control** → Create → turn on **Clone a Repository**:
   - Clone URL: `https://github.com/mdism/mdism.git`
   - Repository path: something outside public_html, e.g. `repositories/mdism`
3. After it clones, open **Manage → Pull or Deploy**.

## Publishing an update

cPanel → Git Version Control → Manage → **Pull or Deploy** → *Update from Remote*, then *Deploy HEAD Commit*.

## Versioning

The footer shows the site version from `site/version.json` and links to `CHANGELOG.md`.
Before each release, run from the repo root:

```
python scripts/bump_version.py 2.2.0 "What changed"
```

It updates `site/version.json`, adds a `CHANGELOG.md` entry, and sets `?v=2.2.0` on the CSS/JS links
so visitors' browsers load the new files. Then commit, push, and deploy.
Use MAJOR for a redesign, MINOR for new sections or features, PATCH for fixes and content updates.
