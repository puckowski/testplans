package com.puckowski.testing.controller;

import com.puckowski.testing.dto.*;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api")
public class TestCaseController {

    private final DataSource dataSource;

    public TestCaseController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    // ------ CRUD for Test Plans ------

    @CacheEvict(value = "testPlanCount", allEntries = true)
    private void evictTestPlanCountCache() {

    }

    @CacheEvict(value = "testPlans", allEntries = true)
    private void evictTestPlanCache() {

    }

    @GetMapping("/testplans/count")
    @Cacheable(cacheNames = "testPlanCount")
    public TestPlanCountDTO getTestPlanCount(
            @RequestParam(required = false) String tag
    ) throws SQLException {
        String baseSql = "SELECT COUNT(DISTINCT tp.id) FROM test_plan tp";
        String joinSql = "";
        String whereSql = "";
        List<Object> params = new ArrayList<>();
        if (tag != null && !tag.isBlank()) {
            joinSql = " INNER JOIN test_plan_tags tpt ON tp.id = tpt.test_plan_id";
            whereSql = " WHERE tpt.tag = ?";
            params.add(tag);
        }
        String sql = baseSql + joinSql + whereSql;

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            int paramIndex = 1;
            for (Object param : params) {
                ps.setObject(paramIndex++, param);
            }

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new TestPlanCountDTO(rs.getInt(1));
                } else {
                    throw new SQLException("Failed to count test plans");
                }
            }
        }
    }

    @GetMapping("/testplans/{id}/with-testcases")
    public TestPlanDTO getTestPlanWithTestCases(@PathVariable Long id) throws SQLException {
        TestPlanDTO plan = getTestPlan(id);

    String sql = "SELECT id, test_plan_id, name, description, status, created_at, expected_result, priority, steps, duration FROM test_case WHERE test_plan_id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, id);
            ResultSet rs = ps.executeQuery();

            List<TestCaseDTO> testCases = new ArrayList<>();
            while (rs.next()) {
                testCases.add(toTestCaseDTO(rs));
            }

            // Return a new TestPlanDTO with test cases added
            return new TestPlanDTO(
                    plan.id(),
                    plan.name(),
                    plan.description(),
                    plan.createdAt(),
                    plan.status(),
                    plan.tagList(),
                    testCases
            );
        }
    }


    @GetMapping("/testplans")
    @Cacheable(cacheNames = "testPlans")
    public List<TestPlanDTO> getAllTestPlans(
            @RequestParam(required = false, name = "after") Long after,
            @RequestParam(required = false, name = "filter") String filter,
            @RequestParam(name = "per", defaultValue = "20") int limit
    ) throws SQLException {
        String baseSql = "SELECT DISTINCT id,name,description,created_at,status FROM test_plan tp";
        String joinSql = "";
        String whereSql = "";
        List<Object> params = new ArrayList<>();
        if (filter != null && !filter.isBlank()) {
            joinSql = " INNER JOIN test_plan_tags tpt ON tp.id = tpt.test_plan_id";
            whereSql = " WHERE tpt.tag = ?";
            params.add(filter);
        }

        if (after != null) {
            if (whereSql.isEmpty()) {
                whereSql = " WHERE tp.id > ?";
            } else {
                whereSql += " AND tp.id > ?";
            }
            params.add(after);
        }

        String orderSql = " ORDER BY tp.id LIMIT ?";
        String sql = baseSql + joinSql + whereSql + orderSql;

        List<TestPlanDTO> result = new ArrayList<>();

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            int paramIndex = 1;
            for (Object param : params) {
                ps.setObject(paramIndex++, param);
            }
            ps.setInt(paramIndex++, limit);

            ResultSet rs = ps.executeQuery();

            List<TestPlanDTO> plans = new ArrayList<>();
            List<Integer> planIds = new ArrayList<>();
            while (rs.next()) {
                TestPlanDTO plan = toTestPlanDTO(rs);
                plans.add(plan);
                planIds.add(plan.id());
            }
            rs.close();

            Map<Integer, List<TestTagDTO>> tagsByPlanId = new HashMap<>();
            final int batchSize = 10;
            for (int i = 0; i < planIds.size(); i += batchSize) {
                int end = Math.min(i + batchSize, planIds.size());
                List<Integer> batch = planIds.subList(i, end);

                String placeholders = String.join(",", Collections.nCopies(batch.size(), "?"));
                String tagSql = "SELECT * FROM test_plan_tags WHERE test_plan_id IN (" + placeholders + ")";

                try (PreparedStatement tagPs = conn.prepareStatement(tagSql)) {
                    for (int j = 0; j < batch.size(); j++) {
                        tagPs.setLong(j + 1, batch.get(j));
                    }
                    try (ResultSet tagRs = tagPs.executeQuery()) {
                        while (tagRs.next()) {
                            Integer planId = tagRs.getInt("test_plan_id");
                            tagsByPlanId
                                    .computeIfAbsent(planId, k -> new ArrayList<>())
                                    .add(toTestTagDTO(tagRs));
                        }
                    }
                }
            }

            for (TestPlanDTO plan : plans) {
                List<TestTagDTO> tags = tagsByPlanId.getOrDefault(plan.id(), Collections.emptyList());
                plan.tagList().addAll(tags);
                result.add(plan);
            }
        }

        return result;
    }

    @GetMapping("/testplans/{id}")
    public TestPlanDTO getTestPlan(@PathVariable Long id) throws SQLException {
        String sql = "SELECT id,name,description,created_at,status FROM test_plan WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    final TestPlanDTO plan = toTestPlanDTO(rs);

                    loadTestPlanTags(id, plan);

                    return plan;
                }
                throw new NoSuchElementException("TestPlan not found");
            }
        }
    }

    private void loadTestPlanTags(final Long id, final TestPlanDTO plan) throws SQLException {
        String sql = "SELECT * FROM test_plan_tags WHERE test_plan_id = ?";
        try (Connection tagConn = dataSource.getConnection();
             PreparedStatement tagPs = tagConn.prepareStatement(sql)) {
            tagPs.setLong(1, id);
            try (ResultSet tagRs = tagPs.executeQuery()) {
                while (tagRs.next()) {
                    plan.tagList().add(toTestTagDTO(tagRs));
                }
            }
        }
    }

    private long fetchLastInsertId(Connection conn) throws SQLException {
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery("SELECT last_insert_rowid()")) {
            if (rs.next()) {
                return rs.getInt(1);
            } else {
                throw new SQLException("Failed to retrieve last_insert_rowid()");
            }
        }
    }

    @PostMapping("/testplans")
    public TestPlanDTO createTestPlan(@RequestBody TestPlanDTO dto) throws SQLException {
        String sql = "INSERT INTO test_plan (name, description, status) VALUES (?, ?, ?)";
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false);
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, dto.name());
                ps.setString(2, dto.description());
                ps.setString(3, dto.status());
                ps.executeUpdate();

                long planId = fetchLastInsertId(conn);  // Turso-safe replacement

                updateTestPlanTagsTransactional(conn, planId, dto);
                conn.commit();

                return getTestPlan(planId);
            } catch (Exception ex) {
                conn.rollback();
                throw ex;
            } finally {
                conn.setAutoCommit(true);
                evictTestPlanCache();
                evictTestPlanCountCache();
            }
        }
    }

    private void updateTestPlanTagsTransactional(Connection conn, final Long id, final TestPlanDTO dto) throws SQLException {
        // Always delete, even if new list is empty, to remove old tags
        String deleteSql = "DELETE FROM test_plan_tags WHERE test_plan_id = ?";
        String insertSql = "INSERT INTO test_plan_tags (test_plan_id, tag) VALUES (?, ?)";

        try (PreparedStatement deletePs = conn.prepareStatement(deleteSql)) {
            deletePs.setLong(1, id);
            deletePs.executeUpdate();
        }

        if (dto.tagList() != null && !dto.tagList().isEmpty()) {
            try (PreparedStatement insertPs = conn.prepareStatement(insertSql)) {
                for (TestTagDTO tag : dto.tagList()) {
                    insertPs.setLong(1, id);
                    insertPs.setString(2, tag.tag());
                    insertPs.addBatch();
                }
                insertPs.executeBatch();
            }
        }
    }

    @PutMapping("/testplans/{id}")
    public TestPlanDTO updateTestPlan(@PathVariable Long id, @RequestBody TestPlanDTO dto) throws SQLException {
        String sql = "UPDATE test_plan SET name = ?, description = ?, status = ? WHERE id = ?";
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false); // Begin transaction

            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, dto.name());
                ps.setString(2, dto.description());
                ps.setString(3, dto.status());
                ps.setLong(4, id);
                int updated = ps.executeUpdate();

                // Pass the *same connection* to update tags
                updateTestPlanTagsTransactional(conn, id, dto);

                if (updated > 0) {
                    conn.commit(); // Success! Commit transaction
                    return getTestPlan(id); // Get fresh from DB for response
                } else {
                    conn.rollback();
                    throw new NoSuchElementException("TestPlan not found");
                }
            } catch (Exception ex) {
                conn.rollback(); // Rollback on any error
                throw ex;
            } finally {
                conn.setAutoCommit(true); // Restore autocommit for connection pool
                evictTestPlanCache();
                evictTestPlanCountCache();
            }
        }
    }

    @DeleteMapping("/testplans/{id}")
    public void deleteTestPlan(@PathVariable Long id) throws SQLException {
        String sql = "DELETE FROM test_plan WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, id);
            ps.executeUpdate();
        }
        evictTestPlanCache();
        evictTestPlanCountCache();
    }

    // ------ CRUD for Test Cases ------

    @GetMapping("/testplans/{planId}/testcases")
    public List<TestCaseDTO> getTestCasesByPlan(@PathVariable Long planId) throws SQLException {
    String sql = "SELECT id, test_plan_id, name, description, status, created_at, expected_result, priority, steps, duration FROM test_case WHERE test_plan_id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, planId);
            ResultSet rs = ps.executeQuery();

            List<TestCaseDTO> result = new ArrayList<>();
            while (rs.next()) {
                result.add(toTestCaseDTO(rs));
            }
            rs.close();
            return result;
        }
    }

    @GetMapping("/testcases/{id}")
    public TestCaseDTO getTestCase(@PathVariable Long id) throws SQLException {
    String sql = "SELECT id, test_plan_id, name, description, status, created_at, expected_result, priority, steps, duration FROM test_case WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) return toTestCaseDTO(rs);
                throw new NoSuchElementException("TestCase not found");
            }
        }
    }

    @GetMapping(value = "/testplans/{planId}/testcases", params = "bench")
    public Map<String, Object> benchmarkGetTestCasesByPlan(
            @PathVariable Long planId,
            @RequestParam(name = "bench", defaultValue = "100") int iterations
    ) throws SQLException {
    String sql = "SELECT id, test_plan_id, name, description, status, created_at, expected_result, priority, steps, duration " +
        "FROM test_case WHERE test_plan_id = ?";

        List<TestCaseDTO> lastResult = null;

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            // Warmup: run a few iterations but don't count them
            int warmup = Math.min(10, Math.max(1, iterations / 10));
            for (int i = 0; i < warmup; i++) {
                ps.setLong(1, planId);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) { /* consume */ }
                }
            }

            long start = System.nanoTime();
            for (int i = 0; i < iterations; i++) {
                ps.setLong(1, planId);
                try (ResultSet rs = ps.executeQuery()) {
                    List<TestCaseDTO> result = new ArrayList<>();
                    while (rs.next()) {
                        result.add(toTestCaseDTO(rs));
                    }
                    lastResult = result;
                }
            }
            long end = System.nanoTime();

            double totalMs = (end - start) / 1_000_000.0;
            double avgMs = totalMs / iterations;

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("iterations", iterations);
            response.put("total_time_ms", totalMs);
            response.put("avg_time_ms_per_query", avgMs);
            response.put("result_count", lastResult != null ? lastResult.size() : 0);
            response.put("sample_result", lastResult);
            return response;
        }
    }

    @PostMapping("/testplans/{planId}/testcases")
    public TestCaseDTO createTestCase(@PathVariable Long planId, @RequestBody TestCaseDTO dto) throws SQLException {
    String sql = "INSERT INTO test_case (test_plan_id, name, description, status, expected_result, priority, steps, duration) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false);
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setLong(1, planId);
                ps.setString(2, dto.name());
                ps.setString(3, dto.description());
                ps.setString(4, dto.status() == null ? "PENDING" : dto.status());
                ps.setString(5, dto.expectedResult());
                ps.setString(6, dto.priority());
                ps.setString(7, dto.steps());
                if (dto.duration() != null) ps.setInt(8, dto.duration()); else ps.setNull(8, Types.INTEGER);
                ps.executeUpdate();

                long id = fetchLastInsertId(conn);  // ← replaces getGeneratedKeys()
                conn.commit();

                return getTestCase(id);
            } catch (Exception ex) {
                conn.rollback();
                throw ex;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    @PutMapping("/testcases/{id}")
    public TestCaseDTO updateTestCase(@PathVariable Long id, @RequestBody TestCaseDTO dto) throws SQLException {
        String sql = "UPDATE test_case SET name = ?, description = ?, status = ?, expected_result = ?, priority = ?, steps = ?, duration = ? WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, dto.name());
            ps.setString(2, dto.description());
            ps.setString(3, dto.status());
            ps.setString(4, dto.expectedResult());
            ps.setString(5, dto.priority());
            ps.setString(6, dto.steps());
            if (dto.duration() != null) ps.setInt(7, dto.duration()); else ps.setNull(7, Types.INTEGER);
            ps.setLong(8, id);
            int updated = ps.executeUpdate();
            if (updated > 0) return getTestCase(id);
            else throw new NoSuchElementException("TestCase not found");
        }
    }

    @DeleteMapping("/testcases/{id}")
    public void deleteTestCase(@PathVariable Long id) throws SQLException {
        String sql = "DELETE FROM test_case WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, id);
            ps.executeUpdate();
        }
    }

    // ------ CRUD for Test Plan Executions ------

    @GetMapping("/testplans/{planId}/executions")
    public List<TestPlanExecutionDTO> getExecutionsByPlan(@PathVariable Long planId) throws SQLException {
        String sql = "SELECT id, test_plan_id, status, started_at, finished_at, result_notes, created_at, updated_at FROM test_plan_execution WHERE test_plan_id = ? ORDER BY id DESC";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, planId);
            try (ResultSet rs = ps.executeQuery()) {
                List<TestPlanExecutionDTO> result = new ArrayList<>();
                while (rs.next()) {
                    result.add(toTestPlanExecutionDTO(rs));
                }
                return result;
            }
        }
    }

    @PostMapping("/testplans/{planId}/executions")
    public TestPlanExecutionDTO createExecution(@PathVariable Long planId, @RequestBody TestPlanExecutionDTO dto) throws SQLException {
        String sql = "INSERT INTO test_plan_execution (test_plan_id, status, started_at, finished_at, result_notes) VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false);
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setLong(1, planId);
                ps.setString(2, dto.status());
                ps.setTimestamp(3, parseTimestamp(dto.startedAt()));
                ps.setTimestamp(4, parseTimestamp(dto.finishedAt()));
                ps.setString(5, dto.resultNotes());
                ps.executeUpdate();

                long id = fetchLastInsertId(conn);
                conn.commit();
                return getExecution(id);
            } catch (Exception ex) {
                conn.rollback();
                throw ex;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    @GetMapping("/executions/{id}")
    public TestPlanExecutionDTO getExecution(@PathVariable Long id) throws SQLException {
        String sql = "SELECT id, test_plan_id, status, started_at, finished_at, result_notes, created_at, updated_at FROM test_plan_execution WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) return toTestPlanExecutionDTO(rs);
                throw new NoSuchElementException("Execution not found");
            }
        }
    }

    @PutMapping("/executions/{id}")
    public TestPlanExecutionDTO updateExecution(@PathVariable Long id, @RequestBody TestPlanExecutionDTO dto) throws SQLException {
        String sql = "UPDATE test_plan_execution SET status = ?, finished_at = ?, result_notes = ? WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, dto.status());
            ps.setTimestamp(2, parseTimestamp(dto.finishedAt()));
            ps.setString(3, dto.resultNotes());
            ps.setLong(4, id);
            int updated = ps.executeUpdate();
            if (updated > 0) return getExecution(id);
            throw new NoSuchElementException("Execution not found");
        }
    }

    @DeleteMapping("/executions/{id}")
    public void deleteExecution(@PathVariable Long id) throws SQLException {
        String sql = "DELETE FROM test_plan_execution WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, id);
            ps.executeUpdate();
        }
    }

    // ------ Helper methods ------

    private TestPlanDTO toTestPlanDTO(ResultSet rs) throws SQLException {
        return new TestPlanDTO(
                rs.getInt(1),
                rs.getString(2),
                rs.getString(3),
                getLocalDateTime(rs, 4),
                rs.getString(5),
                new ArrayList<>(),
                new ArrayList<>()
        );
    }

    private TestCaseDTO toTestCaseDTO(ResultSet rs) throws SQLException {
        return new TestCaseDTO(
                rs.getInt(1),
                rs.getInt(2),
                rs.getString(3),
                rs.getString(4),
                rs.getString(5),
                getLocalDateTime(rs, 6),
                rs.getString(7),
                rs.getString(8),
                rs.getString(9),
                rs.getObject(10) == null ? null : rs.getInt(10)
        );
    }

    private TestTagDTO toTestTagDTO(ResultSet rs) throws SQLException {
        return new TestTagDTO(
                rs.getInt(1),
                rs.getInt(2),
                rs.getString(3)
        );
    }

    private TestPlanExecutionDTO toTestPlanExecutionDTO(ResultSet rs) throws SQLException {
        // id, test_plan_id, status, started_at, finished_at, result_notes, created_at, updated_at
        return new TestPlanExecutionDTO(
                rs.getInt(1),
                rs.getInt(2),
                rs.getString(3),
                normalizeDbObjectToIso(rs.getObject(4)),
                normalizeDbObjectToIso(rs.getObject(5)),
                rs.getString(6),
                normalizeDbObjectToIso(rs.getObject(7)),
                normalizeDbObjectToIso(rs.getObject(8))
        );
    }

    private LocalDateTime getLocalDateTime(ResultSet rs, Integer column) throws SQLException {
        var val = rs.getObject(column);
        return val == null ? null : LocalDateTime.parse(val.toString().replace(" ", "T"));
    }

    private LocalDateTime getLocalDateTime(ResultSet rs, String column) throws SQLException {
        var val = rs.getObject(column);
        return val == null ? null : LocalDateTime.parse(val.toString().replace(" ", "T"));
    }

    /**
     * Parse a variety of incoming timestamp string representations into java.sql.Timestamp.
     * Accepts ISO-like strings with 'T' or space, optional fractional seconds.
     */
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

    private String normalizeDbStringToIso(String s) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        // If DB uses space separator, convert to 'T'
        t = t.replace(' ', 'T');
        // Remove fractional seconds if present
        int dot = t.indexOf('.');
        if (dot > 0) {
            t = t.substring(0, dot);
        }
        return t;
    }

    private String normalizeDbObjectToIso(Object obj) {
        if (obj == null) return null;
        // If the DB returned a java.sql.Blob (driver stored text as blob), read bytes and decode as UTF-8
        if (obj instanceof java.sql.Blob) {
            try {
                java.sql.Blob b = (java.sql.Blob) obj;
                long len = b.length();
                if (len <= 0) return null;
                int intLen = (int) Math.min(len, Integer.MAX_VALUE);
                byte[] bytes = b.getBytes(1, intLen);
                String s = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
                return normalizeDbStringToIso(s);
            } catch (Exception e) {
                return null;
            }
        }
        // If the DB returned a byte[] (BLOB stored text), decode as UTF-8
        if (obj instanceof byte[]) {
            try {
                String s = new String((byte[]) obj, java.nio.charset.StandardCharsets.UTF_8);
                return normalizeDbStringToIso(s);
            } catch (Exception e) {
                return null;
            }
        }
        // For other types, use toString()
        return normalizeDbStringToIso(obj.toString());
    }

    private String formatForSql(String s) {
        if (s == null) return null;
        Timestamp ts = parseTimestamp(s);
        if (ts == null) return null;
        // Format as 'yyyy-MM-dd HH:mm:ss' to match CURRENT_TIMESTAMP style and avoid storing binary
        return ts.toLocalDateTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
}
