package com.puckowski.testing.dto;

import java.time.LocalDateTime;
import java.util.List;

public record TestPlanDTO(Long id, String name, String description, LocalDateTime createdAt, String status, List<TestTagDTO> tagList) {}
