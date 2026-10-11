import os
import signal
import socket
import sys

def kill_process_on_port(port):
    """Kills any process listening on the specified port."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) == 0:
                print(f"Port {port} is in use, attempting to clear...")
                if sys.platform.startswith('win'):
                    import subprocess
                    # Run netstat to find active PID on the port
                    cmd = f'netstat -ano'
                    proc = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    stdout, _ = proc.communicate()
                    lines = stdout.decode('utf-8').strip().split('\n')
                    pids = set()
                    target_str = f":{port}"
                    for line in lines:
                        if target_str in line:
                            parts = line.strip().split()
                            if len(parts) >= 5:
                                pids.add(parts[-1])
                    for pid in pids:
                        if pid and pid != '0':
                            try:
                                subprocess.run(['taskkill', '/F', '/PID', pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                                print(f"Killed process {pid} on port {port} (Windows)")
                            except Exception as ex:
                                print(f"Failed to kill process {pid} on Windows: {ex}")
                else:
                    import time
                    stream = os.popen(f"lsof -t -i:{port}")
                    pids = [p.strip() for p in stream.read().strip().split('\n') if p.strip()]
                    for pid in pids:
                        try:
                            os.kill(int(pid), signal.SIGTERM)
                            print(f"Sent SIGTERM to process {pid} on port {port}")
                        except:
                            pass
                    time.sleep(0.5)
                    stream = os.popen(f"lsof -t -i:{port}")
                    pids = [p.strip() for p in stream.read().strip().split('\n') if p.strip()]
                    for pid in pids:
                        try:
                            os.kill(int(pid), signal.SIGKILL)
                            print(f"Force killed process {pid} on port {port} (SIGKILL)")
                        except:
                            pass
    except Exception as e:
        print(f"Error cleaning port {port}: {e}")

if __name__ == "__main__":
    ports = [8000, 5173, 5174, 5175, 5176, 5177, 5178]
    for port in ports:
        kill_process_on_port(port)
