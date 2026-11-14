// Generates one static page per plugin (site/<name>.html) from plugins.json.
// No dependencies. Run from the repo root: node scripts/generate-plugin-pages.mjs
// It also rewrites site/sitemap.xml and site/llms.txt, and the per-plugin rewrites in
// netlify.toml between its "generated:plugins" marker lines.
import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("plugins.json", "utf8"));
const SITE = "https://plugins.epsilonrecords.com";
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const taskName = Object.fromEntries(data.tasks.map(t => [t.id, t]));
const OS = { "macos-universal": "macOS (Apple Silicon and Intel)", "windows-x64": "Windows (x64)", "linux-x64": "Linux (x64)" };

// WebP (lossy, "VP8 ") pixel size, read from the file header.
function webpSize(file) {
  const b = readFileSync(file);
  if (b.toString("ascii", 12, 16) !== "VP8 ") throw new Error(file + ": not a lossy WebP");
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}

const formatsFor = os => data.platforms[os].join(", ");
const allFormats = [...new Set(Object.values(data.platforms).flat())];

function page(p) {
  const id = p.name.toLowerCase();
  const url = `${SITE}/${id}`;
  const img = `${SITE}/img/${id}.webp`;
  const [w, h] = webpSize(`site/img/${id}.webp`);
  const kind = p.type === "instrument" ? "instrument" : "effect";
  const title = `${p.name}: free ${p.subtitle.toLowerCase()} plugin · Epsilon Audio`;
  const summary = p.summary.replace(/\.$/, "");
  const desc = `${p.name} is a free, open-source ${p.subtitle.toLowerCase()} ${kind} plugin from Epsilon Audio. ${summary}. ${allFormats.slice(0, 3).join(", ")} for macOS, Windows and Linux.`;
  const alt = `${p.name} interface`;
  const peers = data.plugins.filter(q => q.task === p.task && q.name !== p.name);
  const ld = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${url}#software`,
    name: p.name, url, description: p.summary, image: img,
    applicationCategory: "MultimediaApplication", applicationSubCategory: p.subtitle,
    operatingSystem: "macOS, Windows, Linux", softwareVersion: p.version,
    isAccessibleForFree: true, license: `${data.repo}/blob/main/LICENSE`,
    publisher: { "@type": "Organization", name: "Epsilon Records", url: "https://epsilonrecords.com/" },
    isPartOf: { "@id": `${SITE}/#plugins` },
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  };
  const rows = [
    ["What it is", `${p.subtitle} (${kind})`],
    ["Price", "Free, open source under the MIT licence"],
    ["Version", p.version],
    ["Factory presets", p.factory_presets],
    ...Object.keys(OS).map(k => [OS[k], formatsFor(k)]),
    ["CLAP ID", `<code>${esc(p.clap_id)}</code>`],
  ].map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${typeof v === "string" && v.startsWith("<code>") ? v : esc(v)}</td></tr>`).join("\n        ");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Epsilon Audio">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="${w}">
<meta property="og:image:height" content="${h}">
<meta property="og:image:alt" content="${esc(alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${img}">
<meta name="twitter:image:alt" content="${esc(alt)}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="pages.css">
<script src="/analytics.js" defer></script>
<script type="application/ld+json">
${JSON.stringify(ld, null, 2).replace(/<\//g, "<\\/")}
</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="/"><span class="brand-mark" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 32 32" fill="none"><rect x="6" y="8" width="20" height="3.4" fill="currentColor"/><rect x="10" y="14.3" width="16" height="3.4" fill="currentColor"/><rect x="6" y="20.6" width="20" height="3.4" fill="currentColor"/></svg></span><span>Epsilon Audio</span><span class="by">by Epsilon Records</span></a>
    <nav class="nav-links" aria-label="Pages">
      <a href="/#plugins">Plugins</a>
      <a href="install">Install guides</a>
      <a href="made">How they're made</a>
      <a class="btn btn-primary btn-sm" href="/#download">Download</a>
    </nav>
  </div>
</header>

<main id="main">
  <div class="wrap">
    <p class="label">${esc(taskName[p.task].name)} · ${esc(kind)}</p>
    <h1>${esc(p.name)}: ${esc(p.subtitle.toLowerCase())}</h1>
    <p class="lede">${esc(p.name)} is a free, open-source ${esc(kind)} plugin. ${esc(p.summary)}</p>
    <p>Version ${esc(p.version)} comes with ${p.factory_presets} factory presets and a manual. It runs on macOS, Windows and Linux as ${esc(allFormats.slice(0, 3).join(", "))}, with VST2 on Windows and Linux. It costs nothing and the source is public under the MIT licence.</p>
    <p class="cta"><a class="btn btn-primary" href="${esc(p.releases)}" target="_blank" rel="noopener">Download ${esc(p.name)}</a> <a class="btn" href="${esc(p.repo)}/blob/main/docs/MANUAL.md" target="_blank" rel="noopener">Manual</a> <a class="btn" href="${esc(p.repo)}" target="_blank" rel="noopener">Source</a></p>
    <p><img src="img/${id}.webp" alt="${esc(alt)}" width="${w}" height="${h}" style="height:auto"></p>

    <h2>Facts</h2>
    <div class="table-scroll">
      <table>
        <tbody>
        ${rows}
        </tbody>
      </table>
    </div>
    <p class="note">Install: unpack the download and copy the plugin files into your system's plugin folders, then rescan in your host. The <a href="install">install guides</a> show where.</p>

    <h2>More from Epsilon Audio</h2>
    <p><a href="/#plugins">All fifteen plugins</a>${peers.length ? `. Also in ${esc(taskName[p.task].name)}: ${peers.map(q => `<a href="${q.name.toLowerCase()}">${esc(q.name)}</a>`).join(", ")}` : ""}. Written from scratch: <a href="made">how they're made</a>.</p>
  </div>
</main>

<footer class="site-footer">
  <div class="wrap footer">
    <div class="footer-brand">
      <strong>Epsilon Audio</strong>
      <span>© 2026 Nate Houk / Epsilon Records · MIT License</span>
    </div>
    <nav aria-label="Footer">
      <a href="/">Plugins</a>
      <a href="install">Install guides</a>
      <a href="https://epsilonrecords.com/privacy/">Privacy</a>
      <a href="https://github.com/epsilon-records/epsilon-plugins/discussions" target="_blank" rel="noopener">Discussions</a>
      <a href="https://github.com/epsilon-records/epsilon-plugins" target="_blank" rel="noopener">Source</a>
      <a href="https://epsilonrecords.com/">Epsilon Records</a>
    </nav>
  </div>
</footer>
</body>
</html>
`;
}

// Replace the text between two marker lines, or fail loudly if they are missing.
function between(file, start, end, body) {
  const t = readFileSync(file, "utf8");
  const a = t.indexOf(start), b = t.indexOf(end);
  if (a < 0 || b < a) throw new Error(`${file}: markers not found`);
  writeFileSync(file, t.slice(0, a + start.length) + "\n" + body + t.slice(b));
}

for (const p of data.plugins) writeFileSync(`site/${p.name.toLowerCase()}.html`, page(p));

const urls = [`${SITE}/`, `${SITE}/install`, `${SITE}/made`, ...data.plugins.map(p => `${SITE}/${p.name.toLowerCase()}`)];
writeFileSync("site/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc></url>\n`).join("")}</urlset>
`);

writeFileSync("site/llms.txt", `# Epsilon Audio

> Epsilon Audio is a free, open-source series of fifteen audio plugins (3 instruments and 12 effects) from Epsilon Records, Amsterdam. They come in VST3, AU and CLAP formats for macOS (universal), Windows (x64) and Linux (x64), with VST2 on Windows and Linux. Every plugin is free, MIT-licensed and ships with factory presets and a manual.

## Pages

- [Epsilon Audio](${SITE}/): the full catalogue, download links and what each plugin does
- [Install guides](${SITE}/install): where the plugin files go on macOS, Windows and Linux, and troubleshooting
- [How they're made](${SITE}/made): clean-room designs written from scratch, open source under the MIT licence

## Plugins

Each plugin has its own page, with its formats, version and download link, and its own source repository.

${data.plugins.map(p => `- [${p.name}](${SITE}/${p.name.toLowerCase()}): ${p.summary.replace(/\.$/, "")}.`).join("\n")}

## Source

- [epsilon-plugins on GitHub](${data.repo}): the plugin index and machine-readable catalogue (plugins.json)
- [Epsilon Records](https://epsilonrecords.com): the label behind Epsilon Audio
`);
between("netlify.toml", "# generated:plugins", "# /generated:plugins",
  data.plugins.map(p => `\n[[redirects]]\n  from = "/${p.name.toLowerCase()}"\n  to = "/${p.name.toLowerCase()}.html"\n  status = 200\n`).join(""));
console.log(`wrote ${data.plugins.length} pages`);
