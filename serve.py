#!/usr/bin/env python3
"""Static file server for Toybox that tells the browser never to cache.

The game is plain ES modules with no build step, so with the stock `python -m http.server` (which sends
only Last-Modified) a browser can keep serving stale copies of some files and mix them with new ones
after an update, which breaks the module graph and the game just won't start. No-store avoids that.

    python3 serve.py [port] [bind-address]      # defaults: 8000 127.0.0.1
"""
import http.server
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    bind = sys.argv[2] if len(sys.argv) > 2 else '127.0.0.1'
    with http.server.ThreadingHTTPServer((bind, port), NoCache) as server:
        server.serve_forever()
