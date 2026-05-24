import os
import socket
import sys
import threading
import time
import urllib.request

from werkzeug.serving import make_server

from app import app


APP_NAME = "Karen Music Director"
DEFAULT_PORT = 5000


def find_open_port(start_port=DEFAULT_PORT):
    for port in range(start_port, start_port + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.2)
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                return port
    raise RuntimeError("No open localhost port was found.")


class ServerThread(threading.Thread):
    def __init__(self, port):
        super().__init__(daemon=True)
        self.port = port
        self.server = make_server("127.0.0.1", port, app)
        self.context = app.app_context()

    def run(self):
        self.context.push()
        self.server.serve_forever()

    def stop(self):
        self.server.shutdown()


def wait_for_server(url, timeout_seconds=15):
    deadline = time.time() + timeout_seconds
    last_error = None
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    return
        except Exception as exc:
            last_error = exc
            time.sleep(0.2)
    raise RuntimeError(f"Local app did not start in time: {last_error}")


def run_server_only_until_stopped():
    while True:
        time.sleep(1)


def open_app_window(url):
    import webview

    webview.create_window(
        APP_NAME,
        url,
        width=1280,
        height=860,
        min_size=(980, 680),
        confirm_close=True,
        text_select=True,
        background_color="#121212",
    )
    webview.start(gui="edgechromium", private_mode=False)


def main():
    port = find_open_port()
    server = ServerThread(port)
    server.start()

    url = f"http://127.0.0.1:{port}"
    try:
        wait_for_server(url)
        if os.environ.get("KAREN_MUSIC_NO_BROWSER") == "1" or os.environ.get("KAREN_MUSIC_SERVER_ONLY") == "1":
            run_server_only_until_stopped()
        else:
            open_app_window(url)
    finally:
        server.stop()


if __name__ == "__main__":
    main()
