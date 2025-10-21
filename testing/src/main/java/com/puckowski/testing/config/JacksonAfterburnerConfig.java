package com.puckowski.testing.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.module.afterburner.AfterburnerModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonAfterburnerConfig {

    @Bean
    public AfterburnerModule afterburnerModule() {
        AfterburnerModule module = new AfterburnerModule().setUseValueClassLoader(true);
        return module;
    }

    @Bean
    public ObjectMapper objectMapper() {
        var mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        mapper.registerModule(new AfterburnerModule()
                .setUseValueClassLoader(true));
        return mapper;
    }
}
