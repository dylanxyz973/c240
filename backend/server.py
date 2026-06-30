import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent / "frontend"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def do_GET(self):
        if self.path == "/api/health":
            payload = {"status": "ok", "message": "C240 starter server is running"}
            response = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)
            return

        return super().do_GET()

    def log_message(self, format, *args):
        print(f"[server] {self.address_string()} - {format % args}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    print(f"Starting server on http://localhost:{port}")
    with ThreadingHTTPServer(("0.0.0.0", port), Handler) as httpd:
        httpd.serve_forever()
