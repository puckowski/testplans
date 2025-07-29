package com.puckowski.testing.controller;

import com.puckowski.testing.dto.TestPlanDTO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RestController
public class BenchmarkController {
    @GetMapping("/test")
    public List<TestPlanDTO> getData() {
        List<TestPlanDTO> list = new ArrayList<>();
        for (int i = 0; i < 10000; i++) {
            list.add(new TestPlanDTO(
                    1l,
                    "name",
                    "description",
                    LocalDateTime.now(),
                    "status",
                    new ArrayList<>(),
                    new ArrayList<>()

            ));
        }
        return list;
    }
}