#!/usr/bin/env python3
"""Persistent local server for the AIGC prompt workbench."""

import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(os.environ.get("AIGC_PROMPT_PORT", "8766"))
    server = ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler)
    print(f"AIGC prompt workbench: http://127.0.0.1:{port}/index.html", flush=True)
    server.serve_forever()
