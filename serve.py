"""שרת מקומי למצגות: מגיש את הקבצים בלי מטמון, ומאפשר לעורך לשמור מצגות ולהעלות תמונות.

מאזין רק למחשב הזה (127.0.0.1). הרצה: edit.bat
"""
import datetime
import http.server
import ipaddress
import json
import os
import re
import socket
import socketserver
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get('SLIDES_PORT', 8030))
MAX_BYTES = 30 * 1024 * 1024
ID_RE = re.compile(r'^[\w-]{1,60}$')
IMG_EXT = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'}
BACKUPS_PER_DECK = 30


def atomic_write(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    with open(tmp, 'wb') as f:
        f.write(data)
    os.replace(tmp, path)


def deck_path(deck_id):
    return os.path.join(ROOT, 'decks', deck_id + '.js')


def write_deck(deck_id, deck):
    path = deck_path(deck_id)
    if os.path.exists(path):
        bdir = os.path.join(ROOT, 'decks', '_backup')
        os.makedirs(bdir, exist_ok=True)
        stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
        with open(path, 'rb') as src:
            atomic_write(os.path.join(bdir, '%s-%s.js' % (deck_id, stamp)), src.read())
        olds = sorted(f for f in os.listdir(bdir) if f.startswith(deck_id + '-'))
        for f in olds[:-BACKUPS_PER_DECK]:
            os.remove(os.path.join(bdir, f))
    js = 'window.DECKS = window.DECKS || {};\nwindow.DECKS[%s] = %s;\n' % (
        json.dumps(deck_id), json.dumps(deck, ensure_ascii=False, indent=2))
    atomic_write(path, js.encode('utf-8'))


def read_manifest():
    with open(os.path.join(ROOT, 'decks', 'manifest.js'), encoding='utf-8') as f:
        text = f.read()
    return json.loads(text[text.index('['):text.rindex(']') + 1])


def write_manifest(items):
    body = ',\n'.join('  ' + json.dumps(i, ensure_ascii=False) for i in items)
    js = '/* רשימת המצגות. נשמרת אוטומטית מהעורך. שורה בלי id מוצגת כ״בקרוב״. */\nwindow.MANIFEST = [\n%s\n];\n' % body
    atomic_write(os.path.join(ROOT, 'decks', 'manifest.js'), js.encode('utf-8'))


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def _check_public(url):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ('http', 'https') or not parsed.hostname:
        raise ValueError('bad url')
    for info in socket.getaddrinfo(parsed.hostname, parsed.port or (443 if parsed.scheme == 'https' else 80)):
        if not ipaddress.ip_address(info[4][0]).is_global:
            raise ValueError('address not allowed')


def fetch_image(url):
    """מוריד תמונה מהאינטרנט עבור גרירה מדפי אתרים. רק כתובות ציבוריות, עד 5 הפניות."""
    opener = urllib.request.build_opener(_NoRedirect)
    for _ in range(6):
        _check_public(url)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*,*/*;q=0.5'})
        try:
            resp = opener.open(req, timeout=15)
        except urllib.error.HTTPError as e:
            if e.code in (301, 302, 303, 307, 308) and e.headers.get('Location'):
                url = urllib.parse.urljoin(url, e.headers['Location'])
                continue
            raise ValueError('HTTP %d' % e.code)
        ctype = resp.headers.get_content_type()
        if not ctype.startswith('image/'):
            raise ValueError('not an image')
        data = resp.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError('too large')
        return data, ctype, url
    raise ValueError('too many redirects')


CTYPE_EXT = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg'}


def valid_deck(d):
    return (isinstance(d, dict) and isinstance(d.get('title'), str) and isinstance(d.get('slides'), list)
            and all(isinstance(s, dict) and isinstance(s.get('type'), str) for s in d['slides']))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        if self.path.startswith('/assets/img/'):
            self.send_header('Content-Security-Policy', 'sandbox')  # SVG שהורד לא ירוץ כקוד
        super().end_headers()

    def log_message(self, fmt, *args):
        pass

    def host_ok(self):
        return self.headers.get('Host', '').split(':')[0] in ('localhost', '127.0.0.1')

    def reply(self, code, obj):
        data = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.split('?')[0]
        if path.startswith('/api/'):
            if not self.host_ok():
                return self.reply(403, {'error': 'host'})
            if path == '/api/ping':
                return self.reply(200, {'ok': True})
            return self.reply(404, {'error': 'not found'})
        return super().do_GET()

    def do_POST(self):
        path, _, query = self.path.partition('?')
        params = dict(p.split('=', 1) for p in query.split('&') if '=' in p)
        if not path.startswith('/api/') or not self.host_ok() or self.headers.get('X-Deck-Edit') != '1':
            return self.reply(403, {'error': 'forbidden'})
        length = int(self.headers.get('Content-Length') or 0)
        if length > MAX_BYTES:
            return self.reply(413, {'error': 'too large'})
        body = self.rfile.read(length)
        try:
            if path == '/api/save-deck':
                deck_id = params.get('id', '')
                if not ID_RE.match(deck_id):
                    return self.reply(400, {'error': 'bad id'})
                deck = json.loads(body.decode('utf-8'))
                if not valid_deck(deck):
                    return self.reply(400, {'error': 'bad deck'})
                write_deck(deck_id, deck)
                return self.reply(200, {'ok': True, 'saved': datetime.datetime.now().strftime('%H:%M:%S')})
            if path == '/api/upload':
                from urllib.parse import unquote
                name = unquote(params.get('name', 'img'))
                stem, ext = os.path.splitext(os.path.basename(name))
                ext = ext.lower()
                if ext not in IMG_EXT:
                    return self.reply(400, {'error': 'not an image'})
                safe = re.sub(r'[^A-Za-z0-9_-]+', '-', stem).strip('-')[:40] or 'img'
                fname = '%d-%s%s' % (int(time.time()), safe, ext)
                atomic_write(os.path.join(ROOT, 'assets', 'img', fname), body)
                return self.reply(200, {'ok': True, 'path': 'assets/img/' + fname})
            if path == '/api/fetch-image':
                url = json.loads(body.decode('utf-8'))['url']
                data, ctype, final = fetch_image(url)
                ext = CTYPE_EXT.get(ctype)
                if not ext:
                    return self.reply(400, {'error': 'unsupported image type'})
                stem = os.path.splitext(os.path.basename(urllib.parse.urlparse(final).path))[0]
                safe = re.sub(r'[^A-Za-z0-9_-]+', '-', stem).strip('-')[:40] or 'web'
                fname = '%d-%s%s' % (int(time.time()), safe, ext)
                atomic_write(os.path.join(ROOT, 'assets', 'img', fname), data)
                return self.reply(200, {'ok': True, 'path': 'assets/img/' + fname})
            if path == '/api/new-deck':
                info = json.loads(body.decode('utf-8'))
                n = int(info['n'])
                items = read_manifest()
                entry = next((i for i in items if i.get('n') == n), None)
                if entry is None or entry.get('id'):
                    return self.reply(400, {'error': 'no such pending lecture'})
                deck_id = '%02d-deck' % n
                while os.path.exists(deck_path(deck_id)):
                    deck_id += 'x'
                deck = {'title': 'מפגש %d · %s' % (n, entry['title']), 'slides': [{
                    'type': 'title', 'kicker': 'כלים דיגיטליים א׳', 'title': entry['title'], 'sub': '',
                    'extra': '', 'foot': 'מנחם שיינין | מפגש %d · %s' % (n, entry.get('date', '')), 'notes': ''}]}
                write_deck(deck_id, deck)
                entry['id'] = deck_id
                write_manifest(items)
                return self.reply(200, {'ok': True, 'id': deck_id})
        except (ValueError, KeyError, TypeError, OSError, urllib.error.URLError) as e:
            return self.reply(400, {'error': str(e)})
        return self.reply(404, {'error': 'not found'})


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    with Server(('127.0.0.1', PORT), Handler) as httpd:
        print('Slides editor server: http://localhost:%d  (Ctrl+C to stop)' % PORT)
        httpd.serve_forever()
