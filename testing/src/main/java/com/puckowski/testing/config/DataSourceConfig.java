package com.puckowski.testing.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tech.turso.TursoConfig;
import tech.turso.TursoDataSource;

import javax.sql.DataSource;
import java.util.Properties;

@Configuration
public class DataSourceConfig {

    @Bean
    public DataSource dataSource() {
        TursoDataSource ds = new TursoDataSource(new TursoConfig(new Properties()),"jdbc:turso:sample.db");
        return ds;
    }
}
