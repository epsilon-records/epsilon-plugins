// Keep the core catalogue usable in the HTML response, without executing any script.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync('plugins.json', 'utf8'));
const html = readFileSync('site/index.html', 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const catalogue = html.split('<!-- generated:catalogue -->')[1].split('<!-- /generated:catalogue -->')[0];
const install = html.split('<!-- generated:install -->')[1].split('<!-- /generated:install -->')[0];
const filters = catalogue.match(/<div\b([^>]*\bid="filters"[^>]*)>([\s\S]*?)<\/div>/);
assert(filters, 'Task navigation must be in static HTML');
assert(!/\bhidden\b/.test(filters[1]), 'Task navigation cannot depend on JavaScript');
assert.equal([...catalogue.matchAll(/<article\b/g)].length, data.plugins.length);
assert.equal([...filters[2].matchAll(/<a\b/g)].length, data.tasks.length + 1);
for (const plugin of data.plugins) {
  const id = plugin.name.toLowerCase();
  assert(catalogue.includes(`id="${id}"`), `${plugin.name}: missing card`);
  assert(catalogue.includes(`href="/${id}"`), `${plugin.name}: missing product link`);
  assert(install.includes(`href="${plugin.releases}"`), `${plugin.name}: missing release link`);
}
for (const [, target] of filters[2].matchAll(/href="#([^"]+)"/g)) {
  assert(catalogue.includes(`id="${target}"`), `Task link #${target} has no target`);
}
for (const os of ['mac', 'win', 'linux']) {
  assert(install.includes(`id="steps-${os}"`), `${os}: missing install instructions`);
}
console.log(`${data.plugins.length} static cards/release links, ${data.tasks.length + 1} task links and three OS install guides verified without script execution.`);
