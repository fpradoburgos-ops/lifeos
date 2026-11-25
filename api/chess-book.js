module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method not allowed');
  }
  const id = String(req.query.id || '');
  if (!/^\d{1,8}$/.test(id)) return res.status(400).send('Invalid book id');
  const urls = [
    'https://www.gutenberg.org/cache/epub/' + id + '/pg' + id + '.txt',
    'https://www.gutenberg.org/files/' + id + '/' + id + '-0.txt',
    'https://www.gutenberg.org/files/' + id + '/' + id + '.txt'
  ];
  for (const url of urls) {
    try {
      const upstream = await fetch(url, { headers: { 'User-Agent': 'LifeOS Chess Reader/1.0' } });
      if (!upstream.ok) continue;
      const body = await upstream.text();
      if (!body.trim()) continue;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).send(body);
    } catch (_) {}
  }
  return res.status(404).send('No se encontró una versión de texto para este libro en Project Gutenberg.');
};
