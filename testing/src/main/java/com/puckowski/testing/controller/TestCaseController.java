package com.puckowski.testing.controller;

import com.puckowski.testing.dto.TestPlanDTO;
import com.puckowski.testing.dto.TestCaseDTO;
import com.puckowski.testing.dto.TestTagDTO;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Gatherers;
import java.util.stream.StreamSupport;

@RestController
@RequestMapping("/api")
public class TestCaseController {

    private final DataSource dataSource;

    public TestCaseController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    // ------ CRUD for Test Plans ------

    @GetMapping("/testplans")
    public List<TestPlanDTO> getAllTestPlans() throws SQLException {
        String sql = "SELECT * FROM test_plan";
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            // Convert ResultSet to Iterator<TestPlanDTO>
            Iterator<TestPlanDTO> iter = new Iterator<>() {
                @Override
                public boolean hasNext() {
                    try {
                        return !rs.isClosed() && rs.next();
                    } catch (SQLException e) {
                        throw new RuntimeException(e);
                    }
                }

                @Override
                public TestPlanDTO next() {
                    try {
                        final TestPlanDTO plan = toTestPlanDTO(rs);

                        loadTestPlanTags(plan.id(), plan);

                        return plan;
                    } catch (SQLException e) {
                        throw new RuntimeException(e);
                    }
                }
            };

            // Use StreamSupport to stream the iterator
            var spliterator = Spliterators.spliteratorUnknownSize(iter, Spliterator.ORDERED);
            var stream = StreamSupport.stream(spliterator, false);

            // Use a Gatherer to collect into a List
            return stream.gather(Gatherers.windowFixed(100)) // Gather in fixed-size windows of 100 (for demo)
                    .flatMap(List::stream) // flatten if needed, or just collect directly if you prefer
                    .toList();
        }
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

            // Iterator that lazily loads from the ResultSet
            Iterator<TestCaseDTO> iter = new Iterator<>() {
                boolean nextCalled = false;
                boolean hasNext = false;

                private void advance() {
                    if (!nextCalled) {
                        try {
                            hasNext = rs.next();
                            nextCalled = true;
                        } catch (SQLException e) {
                            throw new RuntimeException(e);
                        }
                    }
                }

                @Override
                public boolean hasNext() {
                    advance();
                    return hasNext;
                }

                @Override
                public TestCaseDTO next() {
                    advance();
                    if (!hasNext) throw new NoSuchElementException();
                    nextCalled = false; // For the next call
                    try {
                        return toTestCaseDTO(rs);
                    } catch (SQLException e) {
                        throw new RuntimeException(e);
                    }
                }
            };

            var spliterator = Spliterators.spliteratorUnknownSize(iter, Spliterator.ORDERED);
            var stream = StreamSupport.stream(spliterator, false);

            // Use Gatherers to batch in fixed-size windows if you want, or flatMap to flatten
            return stream.gather(Gatherers.windowFixed(50)) // Use 50 per window for demo
                    .flatMap(List::stream)
                    .toList();
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
