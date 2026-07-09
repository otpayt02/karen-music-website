import os
import socket
import sys
import time
import urllib.request
import threading

import uvicorn

APP_NAME = "Karen Music Director"
DEFAULT_PORT = 5000


def find_open_port(start_port=DEFAULT_PORT):
    for port in range(start_port, start_port + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.2)
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                return port
    raise RuntimeError("No open localhost port was found.")


def wait_for_server(url, timeout_seconds=30):
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    return
        except Exception:
            time.sleep(0.3)
    raise RuntimeError("Local app did not start in time.")


def open_app_window(url):
    import webview

    webview.create_window(APP_NAME, url, width=1280, height=860, min_size=(980, 680), confirm_close=True, text_select=True)
    webview.start(gui="edgechromium", private_mode=False)


def start_server(port: int):
    from app import app as fastapi_app

    config = uvicorn.Config(
        fastapi_app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
        log_config=None,
        access_log=False,
    )
    server = uvicorn.Server(config)
    server.install_signal_handlers = lambda: None
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    return server, thread


def main():
    port = DEFAULT_PORT
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        if sock.connect_ex(("127.0.0.1", port)) == 0:
            raise RuntimeError(f"localhost:{port} is already in use. Close the other Karen Music app before launching.")
    os.environ["UVICORN_PORT"] = str(port)
    os.environ["KAREN_MUSIC_API_ORIGIN"] = f"http://127.0.0.1:{port}"
    server, thread = start_server(port)
    try:
        wait_for_server(f"http://127.0.0.1:{port}")
        if os.environ.get("KAREN_MUSIC_NO_BROWSER") == "1":
            while thread.is_alive():
                time.sleep(1)
        else:
            open_app_window(f"http://127.0.0.1:{port}")
    finally:
        server.should_exit = True
        thread.join(timeout=5)


if __name__ == "__main__":
    main()
