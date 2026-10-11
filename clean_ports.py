import os
import signal
import subprocess
import sys
import time

def windows_listening_pids(port):
    """PIDs of the processes with a TCP socket listening on the specified port (netstat -ano)."""
    output = subprocess.run(['netstat', '-ano'], capture_output=True).stdout.decode(errors='replace')
    pids = set()
    for line in output.splitlines():
        parts = line.split()
        # Columns: Proto, Local Address, Foreign Address, State, PID. The State column is localized,
        # so a listening socket is recognized by its empty foreign address instead. Matching only the
        # local address avoids killing clients connected to the port (e.g. the browser).
        if (len(parts) == 5 and parts[0] == 'TCP' and parts[1].endswith(f':{port}')
                and parts[2] in ('0.0.0.0:0', '[::]:0') and parts[4] != '0'):
            pids.add(parts[4])
    return pids

def linux_listening_pids(port):
    """PIDs of the processes with a TCP socket listening on the specified port (lsof)."""
    output = subprocess.run(['lsof', '-t', f'-iTCP:{port}', '-sTCP:LISTEN'], capture_output=True, text=True).stdout
    return set(output.split())

def kill_process_on_port(port):
    """Kills any process listening on the specified port. Clients connected to it are left alone."""
    try:
        if sys.platform.startswith('win'):
            pids = windows_listening_pids(port)
            if pids:
                print(f"Port {port} is in use, attempting to clear...")
            for pid in pids:
                try:
                    subprocess.run(['taskkill', '/F', '/PID', pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    print(f"Killed process {pid} on port {port} (Windows)")
                except Exception as ex:
                    print(f"Failed to kill process {pid} on Windows: {ex}")
        else:
            pids = linux_listening_pids(port)
            if not pids:
                return
            print(f"Port {port} is in use, attempting to clear...")
            for pid in pids:
                try:
                    os.kill(int(pid), signal.SIGTERM)
                    print(f"Sent SIGTERM to process {pid} on port {port}")
                except:
                    pass
            time.sleep(0.5)
            for pid in linux_listening_pids(port):
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
