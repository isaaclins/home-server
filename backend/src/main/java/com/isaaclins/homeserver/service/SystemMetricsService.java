package com.isaaclins.homeserver.service;

import com.isaaclins.homeserver.entity.SystemMetrics;
import com.isaaclins.homeserver.repository.SystemMetricsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.hardware.GraphicsCard;
import oshi.hardware.HardwareAbstractionLayer;
import oshi.hardware.NetworkIF;
import oshi.software.os.OperatingSystem;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemMetricsService {

    private final SystemMetricsRepository systemMetricsRepository;
    private final SystemInfo systemInfo = new SystemInfo();
    private final HardwareAbstractionLayer hardware = systemInfo.getHardware();
    private final OperatingSystem os = systemInfo.getOperatingSystem();

    // Store previous network stats for delta calculation
    private long previousNetworkReceived = 0;
    private long previousNetworkSent = 0;
    private long[] previousCpuTicks = null;

    @Scheduled(fixedRate = 30000) // Collect metrics every 30 seconds
    public void collectMetrics() {
        try {
            SystemMetrics metrics = new SystemMetrics();
            metrics.setTimestamp(LocalDateTime.now());

            // CPU Usage
            metrics.setCpuUsage(getCpuUsage());

            // GPU Usage
            metrics.setGpuUsage(getGpuUsage());

            // RAM Usage
            GlobalMemory memory = hardware.getMemory();
            metrics.setRamTotal(memory.getTotal());
            metrics.setRamUsed(memory.getTotal() - memory.getAvailable());

            // Network Usage
            NetworkStats networkStats = getNetworkStats();
            metrics.setNetworkBytesReceived(networkStats.bytesReceived);
            metrics.setNetworkBytesSent(networkStats.bytesSent);

            systemMetricsRepository.save(metrics);
            log.debug("Collected system metrics: CPU={}%, GPU={}%, RAM={}MB",
                    metrics.getCpuUsage(), metrics.getGpuUsage(),
                    metrics.getRamUsed() / 1024 / 1024);

        } catch (Exception e) {
            log.error("Error collecting system metrics", e);
        }
    }

    private double getCpuUsage() {
        try {
            CentralProcessor processor = hardware.getProcessor();
            long[] currentTicks = processor.getSystemCpuLoadTicks();

            if (previousCpuTicks == null) {
                previousCpuTicks = currentTicks;
                return 0.0; // First measurement, return 0
            }

            double cpuUsage = processor.getSystemCpuLoadBetweenTicks(previousCpuTicks) * 100;
            previousCpuTicks = currentTicks;

            return Math.max(0, Math.min(100, cpuUsage)); // Clamp between 0-100
        } catch (Exception e) {
            log.warn("Could not get CPU usage", e);
            return 0.0;
        }
    }

    private double getGpuUsage() {
        try {
            List<GraphicsCard> graphicsCards = hardware.getGraphicsCards();
            if (!graphicsCards.isEmpty()) {
                // For simplicity, return a simulated GPU usage
                // In a real implementation, you'd need platform-specific tools
                // or GPU vendor-specific libraries (NVIDIA ML, AMD ADL, etc.)
                return Math.random() * 100; // Placeholder
            }
            return 0.0;
        } catch (Exception e) {
            log.warn("Could not get GPU usage", e);
            return 0.0;
        }
    }

    private NetworkStats getNetworkStats() {
        try {
            List<NetworkIF> networkIFs = hardware.getNetworkIFs();
            long totalReceived = 0;
            long totalSent = 0;

            for (NetworkIF networkIF : networkIFs) {
                networkIF.updateAttributes();
                if (!networkIF.getName().startsWith("lo")) { // Exclude loopback
                    totalReceived += networkIF.getBytesRecv();
                    totalSent += networkIF.getBytesSent();
                }
            }

            // Calculate delta from previous measurement
            long deltaReceived = totalReceived - previousNetworkReceived;
            long deltaSent = totalSent - previousNetworkSent;

            previousNetworkReceived = totalReceived;
            previousNetworkSent = totalSent;

            return new NetworkStats(
                    Math.max(0, deltaReceived), // Ensure non-negative
                    Math.max(0, deltaSent));
        } catch (Exception e) {
            log.warn("Could not get network stats", e);
            return new NetworkStats(0, 0);
        }
    }

    public List<SystemMetrics> getMetricsForLast24Hours() {
        LocalDateTime since = LocalDateTime.now().minusHours(24);
        return systemMetricsRepository.findMetricsSince(since);
    }

    public SystemMetrics getLatestMetrics() {
        List<SystemMetrics> latest = systemMetricsRepository.findLatestMetrics();
        return latest.isEmpty() ? null : latest.get(0);
    }

    @Scheduled(fixedRate = 3600000) // Cleanup old metrics every hour
    public void cleanupOldMetrics() {
        try {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(7); // Keep 7 days of data
            systemMetricsRepository.deleteOldMetrics(cutoff);
            log.info("Cleaned up old metrics older than {}", cutoff);
        } catch (Exception e) {
            log.error("Error cleaning up old metrics", e);
        }
    }

    private static class NetworkStats {
        final long bytesReceived;
        final long bytesSent;

        NetworkStats(long bytesReceived, long bytesSent) {
            this.bytesReceived = bytesReceived;
            this.bytesSent = bytesSent;
        }
    }
}
