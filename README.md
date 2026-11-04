# Harshil Srivastav — portfolio (v30)

A static site with no build step. Vercel serves everything in `public/` from its CDN.

```
public/                     ← deployed (the website)
  index.html, js/, img/
  resume/Harshil-Srivastav-Resume.pdf   ← PUBLIC copy (INR figures redacted)
  robots.txt
documents/                  ← NOT deployed, NOT in Git
  Harshil_Srivastav_Resume-3_ORIGINAL_CONFIDENTIAL.pdf   ← untouched original
docs/                       ← NOT deployed (domain checklist, sitemap template)
vercel.json                 ← output dir, PDF headers, asset caching
.vercelignore / .gitignore  ← keep documents/ out of deployments and Git
verify-deploy.sh            ← checks a deployed URL
```

## Résumé URL

`https://<your-domain>/resume/Harshil-Srivastav-Resume.pdf`

- It opens inline in the browser. The browser's PDF viewer has a download button, and the site also has an "or download the PDF" link.
- Headers come from `vercel.json`:
  - `Content-Type: application/pdf`
  - `Content-Disposition: inline; filename="Harshil-Srivastav-Resume.pdf"`
  - `Cache-Control: public, max-age=0, must-revalidate`
- Browsers always revalidate the PDF, and Vercel clears its CDN cache on every deploy. A new résumé deployed under the same filename shows up straight away at the same URL.
- To update it, replace the file in `public/resume/`, keeping the exact filename, and redeploy.

## Deploy into your EXISTING Vercel project (do not create a new one)

```bash
cd harshil-portfolio
npx vercel@latest login      # once
npx vercel@latest link       # choose your existing team + existing project ("Link to existing project? Y")
npx vercel@latest            # PREVIEW deployment → prints a preview URL
./verify-deploy.sh https://<preview-url>     # must end with "ALL CHECKS PASSED"
```

On the preview, also check by hand:

- Open the preview in a private/incognito window.
- Click "Check this out: the résumé ↗". The PDF should open. Try "or download the PDF" too.
- Do the same on a phone (iPhone Safari and Android Chrome).
- Scroll the opener down and back up on desktop and phone.

Preview deployments can be password-protected, depending on your project's Deployment Protection setting. If `verify-deploy.sh` gets 401s, run it on production instead or turn protection off for the check.

When the preview is right:

```bash
npx vercel@latest --prod
./verify-deploy.sh https://<your-production-domain>
```

This doesn't change your domains, environment variables or other project settings. `vercel.json` only sets the output directory, build command (none), framework ("Other") and headers. If the project is connected to Git, you can push this folder to it instead. `.gitignore` keeps `documents/` out of the repo.

## Before going live

- The public résumé hides the eight INR amounts (profit, revenue, price, sponsorship, surplus and funding). Grey boxes cover them, and the text is removed from the file, not just covered. The phone number and all counts are still visible.
- `docs/DOMAIN-CHECKLIST.md` lists what to fill in once the domain is known: canonical URL, absolute link-preview image URLs, the sitemap, and the `Sitemap:` line in robots.txt.
