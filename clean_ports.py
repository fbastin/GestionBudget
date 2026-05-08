import os
import signal
import socket

def kill_process_on_port(port):
    """Kills any process listening on the specified port."""
    try:
        # On Linux, this is a more reliable way to find the PID than just socket
        # But for a simple script, we can try to see if port is open
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) == 0:
                print(f"Port {port} is in use, attempting to clear...")
                # Use lsof if available, otherwise just warn
                stream = os.popen(f"lsof -t -i:{port}")
                pids = stream.read().strip().split('\n')
                for pid in pids:
                    if pid:
                        try:
                            os.kill(int(pid), signal.SIGTERM)
                            print(f"Killed process {pid} on port {port}")
                        except:
                            pass
    except Exception as e:
        print(f"Error cleaning port {port}: {e}")

if __name__ == "__main__":
    ports = [8000, 5173, 5174, 5175, 5176, 5177, 5178]
    for port in ports:
        kill_process_on_port(port)
