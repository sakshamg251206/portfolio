# Saksham Garg — Portfolio

Personal portfolio covering quantitative research, machine learning, generative AI and systems work.

Static site, no build step: `index.html` + `assets/` (CSS, JS, résumé PDF, favicon).

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Any static host works with the repository root as the publish directory.

- **GitHub Pages:** Settings → Pages → Deploy from branch → `main` / root. (`.nojekyll` is included.)
- **Netlify:** import the repo; `netlify.toml` publishes the root.
- **Vercel:** import the repo; framework preset "Other", no build command.

## Updating content

- Projects, experience and achievements live directly in `index.html`.
- The Alpha Lab equity chart reads `assets/js/alpha-lab-data.js`, generated from
  `systematic-alpha-lab/web/public/research-data/{equity-curves,verdicts}.json`.
- Replace `assets/docs/Saksham_Garg_Resume.pdf` to update the résumé.
