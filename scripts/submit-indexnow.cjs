'use strict';
/*
 * IndexNow notifications for the pages added or updated in the current
 * production commit. The key is intentionally public (per IndexNow).
 * No Bing or Naver account credentials are required to notify crawlers.
 */
const fs = require('node:fs');
const cp = require('node:child_process');

const HOST = 'dongbamjeong.com';
const ORIGIN = 'https://' + HOST;
const KEY = '7182c1395cfe391c4953ecd7795b1687';
const KEY_URL = ORIGIN + '/' + KEY + '.txt';
const ENDPOINTS = [
  ['Bing', 'https://www.bing.com/indexnow'],
  ['Naver', 'https://searchadvisor.naver.com/indexnow'],
];

function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].replace(/&amp;/g, '&'))
    .filter((raw) => {
      try {
        const url = new URL(raw);
        return url.protocol === 'https:' && url.hostname === HOST;
      } catch {
        return false;
      }
    });
}
function changedFiles() {
  try {
    return cp.execFileSync('git', ['diff', '--name-only', 'HEAD^', 'HEAD'], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    }).split(/\r?\n/).filter(Boolean);
  } catch (error) {
    throw new Error('Cannot determine changed pages from the commit: ' + error.message);
  }
}
function pageUrlFromFile(file) {
  if (file === 'index.html') return ORIGIN + '/';
  if (!/^(danang|hanoi|hochiminh|nhatrang|golf|casino|pool-villa)\//.test(file)) return null;
  if (!file.endsWith('/index.html')) return null;
  return ORIGIN + '/' + file.slice(0, -'index.html'.length);
}
async function waitForKey() {
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      const response = await fetch(KEY_URL, {
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'Dongbamjeong-IndexNow-Notifier/1.0' },
      });
      const actual = response.ok ? (await response.text()).trim() : '';
      if (actual === KEY) return;
      console.log('IndexNow key not publicly available yet: HTTP ' + response.status + ' (attempt ' + attempt + ')');
    } catch (error) {
      console.log('IndexNow key check attempt ' + attempt + ': ' + error.message);
    }
    if (attempt < 12) await new Promise((resolve) => setTimeout(resolve, 12000));
  }
  throw new Error('IndexNow key file is not publicly accessible; no URLs submitted.');
}
async function main() {
  const sitemap = sitemapUrls(fs.readFileSync('sitemap.xml', 'utf8'));
  if (!sitemap.length) throw new Error('Empty site sitemap.');
  const known = new Set(sitemap);
  const changed = changedFiles();
  const initial = changed.includes(KEY + '.txt');
  const targets = new Set();

  if (initial) {
    // Official domain newly published: notify the existing public URLs once.
    for (const url of sitemap) targets.add(url);
  } else {
    for (const file of changed) {
      const url = pageUrlFromFile(file);
      if (url && known.has(url)) targets.add(url);
    }
    if (changed.includes('sitemap.xml')) {
      // Include new public sitemap entries (not every unchanged URL).
      try {
        const previousXml = cp.execFileSync('git', ['show', 'HEAD^:sitemap.xml'], { encoding: 'utf8' });
        const previous = new Set(sitemapUrls(previousXml));
        for (const url of sitemap) if (!previous.has(url)) targets.add(url);
      } catch (error) {
        console.log('Could not compare previous sitemap: ' + error.message);
      }
    }
  }

  const urlList = [...targets].slice(0, 200);
  if (!urlList.length) {
    console.log('No changed public HTML URLs to submit; skipping IndexNow.');
    return;
  }
  console.log('Submitting ' + urlList.length + ' new/updated URLs to Bing and Naver.');
  await waitForKey();
  const payload = JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_URL, urlList });
  const results = await Promise.allSettled(ENDPOINTS.map(async ([name, endpoint]) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'User-Agent': 'Dongbamjeong-IndexNow-Notifier/1.0' },
      body: payload,
      signal: AbortSignal.timeout(20000),
    });
    const responseText = (await response.text()).slice(0, 300);
    if (response.status !== 200 && response.status !== 202) {
      throw new Error(name + ' IndexNow HTTP ' + response.status + ': ' + responseText);
    }
    console.log(name + ' IndexNow accepted request: HTTP ' + response.status + ', URLs ' + urlList.length);
  }));
  const failures = results.filter((result) => result.status === 'rejected');
  for (const error of failures) console.error(error.reason);
  if (failures.length) throw new Error(failures.length + ' IndexNow endpoints failed.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
