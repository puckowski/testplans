package com.puckowski.testing.controller;

import com.puckowski.testing.dto.WalInitResponseDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;
import java.util.stream.Collectors;

@RestController
public class AdminController {

    @Autowired
    private DataSource dataSource;

    @PostMapping("/init")
    public WalInitResponseDTO initWalMode() {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {

            // Enable WAL mode
            stmt.execute("PRAGMA journal_mode=WAL;");

            // Read and execute init.sql from resources/static
            String sql = readSqlFile("static/init.sql");
            // Split and execute each statement
            for (String statement : sql.split(";")) {
                String trimmed = statement.trim();
                if (!trimmed.isEmpty()) {
                    stmt.execute(trimmed);
                }
            }

            return new WalInitResponseDTO(0, "SQLite database initialized in WAL mode and schema created.");
        } catch (Exception ex) {
            ex.printStackTrace();
            return new WalInitResponseDTO(1, "Failed to initialize: " + ex.getMessage());
        }
    }

    private String readSqlFile(String path) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                getClass().getClassLoader().getResourceAsStream(path)))) {
            return reader.lines().collect(Collectors.joining("\n"));
        }
    }
}
