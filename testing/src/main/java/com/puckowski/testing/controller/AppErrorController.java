package com.puckowski.testing.controller;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("${server.error.path:${error.path:/error}}")
public class AppErrorController implements ErrorController {

    @RequestMapping
    public ResponseEntity<Map<String, Object>> handleError(HttpServletRequest request) {
        Object statusAttr = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        int statusCode = 500;
        if (statusAttr != null) {
            try {
                statusCode = Integer.parseInt(statusAttr.toString());
            } catch (NumberFormatException ignored) {
            }
        }

        HttpStatus status = HttpStatus.resolve(statusCode);
        if (status == null) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }

        Map<String, Object> body = new HashMap<>();
        body.put("status", status.value());

        if (status == HttpStatus.NOT_FOUND) {
            body.put("error", "Not Found");
            body.put("message", "The requested resource was not found");
        } else {
            body.put("error", status.getReasonPhrase());
            Object msg = request.getAttribute(RequestDispatcher.ERROR_MESSAGE);
            body.put("message", msg != null ? msg.toString() : "");
        }

        return new ResponseEntity<>(body, status);
    }

}
