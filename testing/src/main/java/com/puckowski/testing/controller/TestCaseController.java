package com.puckowski.testing.controller;

import com.puckowski.testing.dto.TestPlanCountDTO;
import com.puckowski.testing.dto.TestPlanDTO;
import com.puckowski.testing.dto.TestCaseDTO;
import com.puckowski.testing.dto.TestTagDTO;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api")
public class TestCaseController {

    private final DataSource dataSource;

    public TestCaseController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    // ------ CRUD for Test Plans ------

    @GetMapping("/testplans/count")
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
                    return new TestPlanCountDTO(rs.getLong(1));
                } else {
                    throw new SQLException("Failed to count test plans");
                }
            }
        }
    }

    @GetMapping("/testplans/{id}/with-testcases")
    public TestPlanDTO getTestPlanWithTestCases(@PathVariable Long id) throws SQLException {
        TestPlanDTO plan = getTestPlan(id);

        String sql = "SELECT * FROM test_case WHERE test_plan_id = ?";
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
    public List<TestPlanDTO> getAllTestPlans(
            @RequestParam(required = false, name = "after") Long after,
            @RequestParam(required = false, name = "filter") String filter,
            @RequestParam(name = "per", defaultValue = "20") int limit
    ) throws SQLException {
        String baseSql = "SELECT DISTINCT tp.* FROM test_plan tp";
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
            List<Long> planIds = new ArrayList<>();
            while (rs.next()) {
                TestPlanDTO plan = toTestPlanDTO(rs);
                plans.add(plan);
                planIds.add(plan.id());
            }
            rs.close();

            Map<Long, List<TestTagDTO>> tagsByPlanId = new HashMap<>();
            final int batchSize = 10;
            for (int i = 0; i < planIds.size(); i += batchSize) {
                int end = Math.min(i + batchSize, planIds.size());
                List<Long> batch = planIds.subList(i, end);

                String placeholders = String.join(",", Collections.nCopies(batch.size(), "?"));
                String tagSql = "SELECT * FROM test_plan_tags WHERE test_plan_id IN (" + placeholders + ")";

                try (PreparedStatement tagPs = conn.prepareStatement(tagSql)) {
                    for (int j = 0; j < batch.size(); j++) {
                        tagPs.setLong(j + 1, batch.get(j));
                    }
                    try (ResultSet tagRs = tagPs.executeQuery()) {
                        while (tagRs.next()) {
                            Long planId = tagRs.getLong("test_plan_id");
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
        String sql = "SELECT * FROM test_plan WHERE id = ?";
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

    @PostMapping("/testplans")
    public TestPlanDTO createTestPlan(@RequestBody TestPlanDTO dto) throws SQLException {
        String sql = "INSERT INTO test_plan (name, description, status) VALUES (?, ?, ?)";
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false); // Begin transaction

            try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, dto.name());
                ps.setString(2, dto.description());
                ps.setString(3, dto.status());
                ps.executeUpdate();

                try (ResultSet keys = ps.getGeneratedKeys()) {
                    if (keys.next()) {
                        Long planId = keys.getLong(1);

                        // Insert tags in the same transaction/connection
                        updateTestPlanTagsTransactional(conn, planId, dto);

                        conn.commit(); // Commit if everything succeeds

                        return getTestPlan(planId);
                    } else {
                        conn.rollback();
                        throw new SQLException("Failed to retrieve ID");
                    }
                }
            } catch (Exception ex) {
                conn.rollback(); // Rollback on error
                throw ex;
            } finally {
                conn.setAutoCommit(true); // Always restore for pooled connections
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
    }

    // ------ CRUD for Test Cases ------

    @GetMapping("/testplans/{planId}/testcases")
    public List<TestCaseDTO> getTestCasesByPlan(@PathVariable Long planId) throws SQLException {
        String sql = "SELECT * FROM test_case WHERE test_plan_id = ?";
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
        String sql = "SELECT * FROM test_case WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) return toTestCaseDTO(rs);
                throw new NoSuchElementException("TestCase not found");
            }
        }
    }

    @PostMapping("/testplans/{planId}/testcases")
    public TestCaseDTO createTestCase(@PathVariable Long planId, @RequestBody TestCaseDTO dto) throws SQLException {
        String sql = "INSERT INTO test_case (test_plan_id, name, description, status, expected_result, priority, steps) VALUES (?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setLong(1, planId);
            ps.setString(2, dto.name());
            ps.setString(3, dto.description());
            ps.setString(4, dto.status() == null ? "PENDING" : dto.status());
            ps.setString(5, dto.expectedResult());
            ps.setString(6, dto.priority());
            ps.setString(7, dto.steps());
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    return getTestCase(keys.getLong(1));
                } else {
                    throw new SQLException("Failed to retrieve ID");
                }
            }
        }
    }

    @PutMapping("/testcases/{id}")
    public TestCaseDTO updateTestCase(@PathVariable Long id, @RequestBody TestCaseDTO dto) throws SQLException {
        String sql = "UPDATE test_case SET name = ?, description = ?, status = ?, expected_result = ?, priority = ?, steps = ? WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, dto.name());
            ps.setString(2, dto.description());
            ps.setString(3, dto.status());
            ps.setString(4, dto.expectedResult());
            ps.setString(5, dto.priority());
            ps.setString(6, dto.steps());
            ps.setLong(7, id);
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

    // ------ Helper methods ------

    private TestPlanDTO toTestPlanDTO(ResultSet rs) throws SQLException {
        return new TestPlanDTO(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("description"),
                getLocalDateTime(rs, "created_at"),
                rs.getString("status"),
                new ArrayList<>(),
                new ArrayList<>()
        );
    }

    private TestCaseDTO toTestCaseDTO(ResultSet rs) throws SQLException {
        return new TestCaseDTO(
                rs.getLong("id"),
                rs.getLong("test_plan_id"),
                rs.getString("name"),
                rs.getString("description"),
                rs.getString("status"),
                getLocalDateTime(rs, "created_at"),
                rs.getString("expected_result"),
                rs.getString("priority"),
                rs.getString("steps")
        );
    }

    private TestTagDTO toTestTagDTO(ResultSet rs) throws SQLException {
        return new TestTagDTO(
                rs.getLong("id"),
                rs.getLong("test_plan_id"),
                rs.getString("tag")
        );
    }

    private LocalDateTime getLocalDateTime(ResultSet rs, String column) throws SQLException {
        var val = rs.getString(column);
        return val == null ? null : LocalDateTime.parse(val.replace(" ", "T"));
    }
}
