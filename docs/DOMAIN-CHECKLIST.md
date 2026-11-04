# When the domain is ready

Replace `<domain>` with the real domain (for example `harshil.example`) in five places:

1. `index.html` – uncomment the "DOMAIN NEEDED" block in `<head>`: `<link rel="canonical">` and `<meta property="og:url">`.
2. `index.html` – make `og:image` and `twitter:image` absolute: `https://<domain>/img/og-card.jpg`.
3. `index.html` – optionally add `"url": "https://<domain>/"` to the Person in the JSON-LD block.
4. `robots.txt` – the `Sitemap:` line. Serve the file at the site root.
5. `sitemap.xml` – the `<loc>` value (write the domain plainly, without `&lt;`/`&gt;`). Serve it at the site root.

Then check:
- https://www.opengraph.xyz or LinkedIn Post Inspector (https://www.linkedin.com/post-inspector/) shows the card image.
- Google Search Console: add the property, submit the sitemap, run URL Inspection on the home page.
- Rich Results Test (https://search.google.com/test/rich-results) reads the ProfilePage data.
- Serve with gzip or brotli compression (most hosts do this by default). The performance numbers in the report assume it.
