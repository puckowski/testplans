package com.puckowski.testing.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final DataSource dataSource;

    public ReportController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    private Timestamp parseTimestamp(String s) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        // normalize space to 'T' for LocalDateTime parsing
        if (!t.contains("T") && t.contains(" ")) {
            t = t.replace(' ', 'T');
        }
        try {
            LocalDateTime ldt = LocalDateTime.parse(t);
            return Timestamp.valueOf(ldt);
        } catch (Exception e) {
            // Fallback: try Timestamp.valueOf with space-separated format
            try {
                String alt = t.replace('T', ' ');
                return Timestamp.valueOf(alt);
            } catch (Exception ex) {
                // Could not parse; return null to let DB insert null
                return null;
            }
        }
    }

    /**
     * Returns a report that sums test case durations for a test plan across executions
     * that started and finished within the last month.
     * <p>
     * The response contains:
     * - planId
     * - periodStart, periodEnd (SQL datetime strings)
     * - executionCount
     * - perExecutionDurationSum (sum of durations of all test cases belonging to the plan)
     * - totalDuration (perExecutionDurationSum * executionCount)
     */
    @GetMapping("/testplans/{planId}/duration-sum-last-month")
    public Map<String, Object> getDurationSumLastMonth(@PathVariable Long planId) throws SQLException {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneMonthAgo = now.minusMonths(1);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        String periodStart = oneMonthAgo.format(fmt);
        String periodEnd = now.format(fmt);

        // Count executions in the period
        String execCountSql = "SELECT COUNT(*) FROM test_plan_execution WHERE test_plan_id = ? AND started_at >= ? AND finished_at <= ?";
        int executionCount = 0;
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(execCountSql)) {
            ps.setLong(1, planId);
            ps.setTimestamp(2, parseTimestamp(periodStart));
            ps.setTimestamp(3, parseTimestamp(periodEnd));
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) executionCount = rs.getInt(1);
            }
        }

        // Sum durations of test cases for the plan (per execution)
        String sumSql = "SELECT SUM(duration) FROM test_case WHERE test_plan_id = ?";
        Integer perExecutionSum = 0;
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sumSql)) {
            ps.setLong(1, planId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    Object o = rs.getObject(1);
                    if (o != null) perExecutionSum = ((Number) o).intValue();
                }
            }
        }

        long totalDuration = ((long) perExecutionSum) * ((long) executionCount);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("planId", planId);
        resp.put("periodStart", periodStart);
        resp.put("periodEnd", periodEnd);
        resp.put("executionCount", executionCount);
        resp.put("perExecutionDurationSum", perExecutionSum);
        resp.put("totalDuration", totalDuration);
        return resp;
    }
}
