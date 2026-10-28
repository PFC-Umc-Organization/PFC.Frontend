// Serves the built front with an SPA fallback: an unknown path gets index.html.
// Same Content-Security-Policy as the CloudFront response headers policy in
// PFC.Infra (modules/cloudfront-s3), so the suite fails if the build needs more.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(process.argv[2]), port = +process.argv[3];
const csp = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "font-src 'self'", "img-src 'self' data:",
  "connect-src 'self' https://376uriw318.execute-api.us-east-1.amazonaws.com https://fake-bucket.s3.us-east-1.amazonaws.com https://fake-bucket.s3.amazonaws.com",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  let f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] ?? 'application/octet-stream', 'Content-Security-Policy': csp });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('serving on', port));
