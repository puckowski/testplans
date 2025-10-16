package com.puckowski.testing.dto;

import java.time.LocalDateTime;

public record TestCaseDTO(Integer id, Integer testPlanId, String name, String description, String status, LocalDateTime createdAt, String expectedResult, String priority, String steps) {}
