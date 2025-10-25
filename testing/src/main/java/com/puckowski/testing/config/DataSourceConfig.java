package com.puckowski.testing.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import org.sqlite.SQLiteDataSource;

@Configuration
public class DataSourceConfig {

    @Bean
    public DataSource dataSource() {
        SQLiteDataSource ds = new SQLiteDataSource();
        ds.setUrl("jdbc:sqlite:mydb.sqlite");
        return ds;
    }
}
