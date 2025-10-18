package com.puckowski.testing.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

@Component
public class StartupWarmup implements ApplicationRunner {

    private final DataSource dataSource;

    public StartupWarmup(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        // ensure pool/driver initialization and prime file/OS caches
        try (Connection conn = dataSource.getConnection()) {
            // very cheap driver/pool sanity check
            try (PreparedStatement ps = conn.prepareStatement("SELECT 1")) {
                try (ResultSet rs = ps.executeQuery()) {
                    // no-op
                }
            }

            // Prime a small sample of rows/pages so subsequent queries hit cache
            try (PreparedStatement ps = conn.prepareStatement("SELECT id FROM test_case LIMIT 4")) {
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) { /* consume to warm page cache */ }
                }
            }
        } catch (Exception ex) {
            // log and continue; warmup is best-effort
            System.err.println("DB warmup failed: " + ex.getMessage());
        }
    }
}