#!/usr/bin/env python3
"""Local Dom Bosco storefront server (Sapatella-style) + optional live proxy helpers."""
from __future__ import annotations

import gzip
import os
import ssl
import sys
from http.client import HTTPSConnection
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "cache"
ASSETS = ROOT / "assets"
STATIC = ROOT / "static"
INDEX = ROOT / "index.html"
PORT = int(os.environ.get("PORT", "3000"))
ORIGIN_HOST = "www.bibi.com"
CDN_HOST = "calcadosbibi.vtexassets.com"
LOCAL_PREFIXES = (
    ("/assets/", ASSETS),
    ("/static/", STATIC),
)

HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "content-encoding",
    "content-length",
    "strict-transport-security",
    "content-security-policy",
    "content-security-policy-report-only",
    "x-frame-options",
    "public-key-pins",
}

ctx = ssl.create_default_context()


def pick_upstream(path: str) -> tuple[str, str]:
    if path.startswith("/cdn/"):
        return CDN_HOST, path[4:]
    if path.startswith("/vtex/"):
        rest = path[len("/vtex/") :]
        host, _, remainder = rest.partition("/")
        return host, "/" + remainder
    if path.startswith("/ext/"):
        rest = path[len("/ext/") :]
        host, _, remainder = rest.partition("/")
        return host, "/" + remainder
    return ORIGIN_HOST, path


def cache_lookup(path: str) -> Path | None:
    clean = path.split("?", 1)[0]
    candidates = [
        CACHE / clean.lstrip("/"),
        CACHE / "index.html" if clean in ("/", "/index.html") else None,
    ]
    for c in candidates:
        if c and c.is_file():
            return c
    return None


def guess_type(p: Path) -> str:
    ext = p.suffix.lower()
    return {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
        ".woff": "font/woff",
        ".ttf": "font/ttf",
        ".otf": "font/otf",
        ".ico": "image/x-icon",
    }.get(ext, "application/octet-stream")


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def do_GET(self):
        self._handle()

    def do_POST(self):
        self._handle()

    def do_HEAD(self):
        self._handle()

    def do_PUT(self):
        self._handle()

    def do_PATCH(self):
        self._handle()

    def do_DELETE(self):
        self._handle()

    def do_OPTIONS(self):
        self._handle()

    def _local_origin(self) -> str:
        host = self.headers.get("Host") or f"localhost:{PORT}"
        return f"http://{host}"

    def _serve_bytes(self, data: bytes, content_type: str, cache: str = "no-store") -> None:
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", cache)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def _handle(self) -> None:
        parsed = urlsplit(self.path)
        path = parsed.path or "/"

        if self.command in ("GET", "HEAD"):
            if path in ("/", "/index.html") and INDEX.is_file():
                self._serve_bytes(INDEX.read_bytes(), "text/html; charset=utf-8")
                return

            # Páginas HTML na raiz (privacidade, termos, acessibilidade etc.)
            if path != "/" and ".." not in path:
                clean = path.rstrip("/") or "/"
                html_candidate = None
                if clean.endswith(".html"):
                    html_candidate = (ROOT / clean.lstrip("/")).resolve()
                else:
                    html_candidate = (ROOT / f"{clean.lstrip('/')}.html").resolve()
                if (
                    html_candidate
                    and html_candidate.is_file()
                    and html_candidate.suffix.lower() == ".html"
                    and ROOT.resolve() in html_candidate.parents
                ):
                    self._serve_bytes(html_candidate.read_bytes(), "text/html; charset=utf-8")
                    return

            if path == "/favicon.ico":
                for candidate in (ROOT / "favicon.ico", ASSETS / "favicon.ico"):
                    if candidate.is_file():
                        self._serve_bytes(candidate.read_bytes(), "image/x-icon", "public, max-age=86400")
                        return

            for prefix, folder in LOCAL_PREFIXES:
                if path.startswith(prefix):
                    rel = path[len(prefix) :]
                    target = (folder / rel).resolve()
                    if folder.resolve() in target.parents and target.is_file():
                        self._serve_bytes(target.read_bytes(), guess_type(target), "public, max-age=120")
                        return

            hit = cache_lookup(self.path)
            if hit and parsed.query == "" and not path.endswith((".html", "/")):
                self._serve_bytes(hit.read_bytes(), guess_type(hit), "public, max-age=300")
                return

        # Fallback proxy only for non-store paths (legacy assets)
        if path.startswith(("/cdn/", "/vtex/", "/ext/", "/api/", "/_v/")):
            self._proxy()
            return

        msg = b"Not found"
        self.send_response(404)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(msg)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(msg)

    def _proxy(self) -> None:
        host, up_path = pick_upstream(self.path)
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None

        headers = {}
        for k, v in self.headers.items():
            lk = k.lower()
            if lk in HOP or lk == "host":
                continue
            if lk == "accept-encoding":
                headers[k] = "gzip, deflate"
                continue
            headers[k] = v
        headers["Host"] = host
        headers["User-Agent"] = self.headers.get(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )

        try:
            conn = HTTPSConnection(host, 443, context=ctx, timeout=45)
            conn.request(
                self.command,
                up_path if up_path.startswith("/") else "/" + up_path,
                body=body,
                headers=headers,
            )
            resp = conn.getresponse()
            raw = resp.read()
            encoding = (resp.getheader("Content-Encoding") or "").lower()
            if encoding == "gzip":
                try:
                    raw = gzip.decompress(raw)
                except Exception:
                    pass

            self.send_response(resp.status)
            sent_length = False
            for k, v in resp.getheaders():
                lk = k.lower()
                if lk in HOP:
                    continue
                if lk == "location":
                    v = v.replace("https://www.bibi.com", self._local_origin())
                self.send_header(k, v)
                if lk == "content-length":
                    sent_length = True
            if not sent_length:
                self.send_header("Content-Length", str(len(raw)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(raw)
            conn.close()
        except Exception as exc:
            msg = f"Proxy error: {exc}".encode()
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(msg)


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    httpd.allow_reuse_address = True
    print(f"Dom Bosco Calçados em http://localhost:{PORT}", flush=True)
    print("Ctrl+C para encerrar.", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nencerrado")


if __name__ == "__main__":
    main()
