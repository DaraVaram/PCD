# Priority-Constrained Descent — project page

A self-contained static project page for the PCD paper. No build step, no
dependencies to install — just HTML, CSS, and vanilla JS. The only external
request is Google Fonts (with system-font fallbacks if it's blocked).

```
PCD-Project-Page/
├── index.html          # the page
├── css/style.css       # design system
├── js/vectors.js       # the interactive vector figure (draggable g1/g2, τ slider, auto-tour)
├── js/main.js          # scroll reveals, nav, BibTeX copy  ← set your links here
└── assets/             # web-optimized figures from the paper
```

## 1. Set your links

Open `js/main.js` and fill in the three URLs at the top:

```js
var LINKS = {
  paper: "",   // e.g. "https://arxiv.org/pdf/2026.xxxxx"
  arxiv: "",   // e.g. "https://arxiv.org/abs/2026.xxxxx"
  code:  ""    // e.g. "https://github.com/yourname/pcd"
};
```

Any link left empty stays a gentle "coming soon" placeholder instead of a dead link.

## 2. Preview locally

Because the page fetches local files, open it through a tiny web server (not `file://`):

```bash
cd PCD-Project-Page
python -m http.server 8000
# then visit http://localhost:8000
```

## 3. Deploy

It's static, so any host works:

- **GitHub Pages** — push this folder to a repo and enable Pages on the branch.
- **Netlify / Vercel / Cloudflare Pages** — drag-and-drop the folder, or point at the repo (no build command, publish directory = this folder).
- **Your own web server** — copy the folder into your web root.

## 4. Linking it from arXiv

arXiv hosts the LaTeX source, not a website, so you don't upload this page to
arXiv itself. Instead, host it (step 3) and link it from the paper — e.g. add a
"Project page: <url>" line near the abstract, and/or list it under the paper's
arXiv listing. Reviewers and readers follow the link to the live page.

---

Figures in `assets/` are downscaled copies of the paper's figures. The
interactive vector figure is an exact, formula-faithful remake of the paper's
method-comparison figure (it ships with a self-test that runs in the console).
