import psutil
import socket
import platform
import json
import os

def get_system_info():
    uname = platform.uname()
    return {
        "system": uname.system,
        "node_name": uname.node,
        "release": uname.release,
        "version": uname.version,
        "machine": uname.machine,
        "processor": uname.processor
    }

def get_cpu_info():
    return {
        "physical_cores": psutil.cpu_count(logical=False),
        "total_cores": psutil.cpu_count(logical=True),
        "max_frequency_mhz": psutil.cpu_freq().max,
        "min_frequency_mhz": psutil.cpu_freq().min,
        "current_frequency_mhz": psutil.cpu_freq().current,
        "cpu_usage_percent_per_core": psutil.cpu_percent(percpu=True, interval=1),
        "total_cpu_usage_percent": psutil.cpu_percent()
    }

def get_memory_info():
    svmem = psutil.virtual_memory()
    return {
        "total_memory_gb": round(svmem.total / (1024 ** 3), 2),
        "available_memory_gb": round(svmem.available / (1024 ** 3), 2),
        "used_memory_gb": round(svmem.used / (1024 ** 3), 2),
        "memory_usage_percent": svmem.percent
    }

def get_swap_info():
    swap = psutil.swap_memory()
    return {
        "total_swap_gb": round(swap.total / (1024 ** 3), 2),
        "free_swap_gb": round(swap.free / (1024 ** 3), 2),
        "used_swap_gb": round(swap.used / (1024 ** 3), 2),
        "swap_usage_percent": swap.percent
    }

def get_disk_info():
    partitions = psutil.disk_partitions()
    disk_info = {}
    for partition in partitions:
        try:
            usage = psutil.disk_usage(partition.mountpoint)
            disk_info[partition.mountpoint] = {
                "total_size_gb": round(usage.total / (1024 ** 3), 2),
                "used_size_gb": round(usage.used / (1024 ** 3), 2),
                "free_size_gb": round(usage.free / (1024 ** 3), 2),
                "usage_percent": usage.percent
            }
        except PermissionError:
            continue
    return disk_info

def get_network_info():
    net_io = psutil.net_io_counters()
    return {
        "bytes_sent_mb": round(net_io.bytes_sent / (1024 ** 2), 2),
        "bytes_received_mb": round(net_io.bytes_recv / (1024 ** 2), 2),
        "packets_sent": net_io.packets_sent,
        "packets_received": net_io.packets_recv
    }

def get_hostname_resolution():
    try:
        localhost_ip = socket.gethostbyname('localhost')
        return {
            "localhost_resolves_to": localhost_ip,
            "is_localhost_correct": localhost_ip == "127.0.0.1"
        }
    except socket.error as e:
        return {
            "localhost_resolves_to": None,
            "is_localhost_correct": False,
            "error": str(e)
        }

def perform_health_check():
    health_data = {
        "system_info": get_system_info(),
        "cpu_info": get_cpu_info(),
        "memory_info": get_memory_info(),
        "swap_info": get_swap_info(),
        "disk_info": get_disk_info(),
        "network_info": get_network_info(),
        "hostname_resolution": get_hostname_resolution()
    }
    return health_data

def health_check():
    return perform_health_check()
