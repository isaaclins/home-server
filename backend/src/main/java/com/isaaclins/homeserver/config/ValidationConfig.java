package com.isaaclins.homeserver.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.web.context.request.WebRequest;
import org.springframework.security.access.AccessDeniedException;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Configuration
public class ValidationConfig implements WebMvcConfigurer {

    @RestControllerAdvice
    public static class GlobalExceptionHandler {

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ValidationErrorResponse> handleValidationExceptions(
                MethodArgumentNotValidException ex, HttpServletRequest request) {

            Map<String, String> errors = new HashMap<>();
            ex.getBindingResult().getAllErrors().forEach((error) -> {
                String fieldName = ((FieldError) error).getField();
                String errorMessage = error.getDefaultMessage();
                errors.put(fieldName, errorMessage);
            });

            ValidationErrorResponse errorResponse = ValidationErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(HttpStatus.BAD_REQUEST.value())
                    .error("Validation Failed")
                    .message("Input validation failed")
                    .path(request.getRequestURI())
                    .validationErrors(errors)
                    .build();

            return ResponseEntity.badRequest().body(errorResponse);
        }

        @ExceptionHandler(HttpMessageNotReadableException.class)
        public ResponseEntity<ValidationErrorResponse> handleHttpMessageNotReadable(
                HttpMessageNotReadableException ex, HttpServletRequest request) {
            ValidationErrorResponse errorResponse = ValidationErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(HttpStatus.BAD_REQUEST.value())
                    .error("Bad Request")
                    .message("Malformed JSON request")
                    .path(request.getRequestURI())
                    .build();

            return ResponseEntity.badRequest().body(errorResponse);
        }

        @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
        public ResponseEntity<ValidationErrorResponse> handleMethodNotSupported(
                HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
            ValidationErrorResponse errorResponse = ValidationErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(HttpStatus.METHOD_NOT_ALLOWED.value())
                    .error("Method Not Allowed")
                    .message("HTTP method not supported for this endpoint")
                    .path(request.getRequestURI())
                    .build();

            return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(errorResponse);
        }

        @ExceptionHandler(NoHandlerFoundException.class)
        public ResponseEntity<ValidationErrorResponse> handleNoHandlerFound(
                NoHandlerFoundException ex, HttpServletRequest request) {
            ValidationErrorResponse errorResponse = ValidationErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(HttpStatus.NOT_FOUND.value())
                    .error("Not Found")
                    .message("Endpoint not found")
                    .path(request.getRequestURI())
                    .build();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
        }

        @ExceptionHandler(NoResourceFoundException.class)
        public ResponseEntity<ValidationErrorResponse> handleNoResourceFound(
                NoResourceFoundException ex, HttpServletRequest request) {
            ValidationErrorResponse errorResponse = ValidationErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(HttpStatus.NOT_FOUND.value())
                    .error("Not Found")
                    .message("Resource not found")
                    .path(request.getRequestURI())
                    .build();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
        }

        @ExceptionHandler(ResponseStatusException.class)
        public ResponseEntity<ValidationErrorResponse> handleResponseStatus(
                ResponseStatusException ex, HttpServletRequest request) {
            ValidationErrorResponse errorResponse = ValidationErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(ex.getStatusCode().value())
                    .error(ex.getStatusCode().toString())
                    .message(ex.getReason() != null ? ex.getReason() : "")
                    .path(request.getRequestURI())
                    .build();
            return ResponseEntity.status(ex.getStatusCode()).body(errorResponse);
        }

        @ExceptionHandler(ConstraintViolationException.class)
        public ResponseEntity<ValidationErrorResponse> handleConstraintViolationException(
                ConstraintViolationException ex, HttpServletRequest request) {

            Map<String, String> errors = ex.getConstraintViolations().stream()
                    .collect(Collectors.toMap(
                            violation -> violation.getPropertyPath().toString(),
                            ConstraintViolation::getMessage));

            ValidationErrorResponse errorResponse = ValidationErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(HttpStatus.BAD_REQUEST.value())
                    .error("Constraint Violation")
                    .message("Validation constraints violated")
                    .path(request.getRequestURI())
                    .validationErrors(errors)
                    .build();

            return ResponseEntity.badRequest().body(errorResponse);
        }

        @ExceptionHandler(BindException.class)
        public ResponseEntity<ValidationErrorResponse> handleBindException(
                BindException ex, HttpServletRequest request) {

            Map<String, String> errors = new HashMap<>();
            ex.getBindingResult().getAllErrors().forEach((error) -> {
                String fieldName = ((FieldError) error).getField();
                String errorMessage = error.getDefaultMessage();
                errors.put(fieldName, errorMessage);
            });

            ValidationErrorResponse errorResponse = ValidationErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(HttpStatus.BAD_REQUEST.value())
                    .error("Binding Failed")
                    .message("Request binding failed")
                    .path(request.getRequestURI())
                    .validationErrors(errors)
                    .build();

            return ResponseEntity.badRequest().body(errorResponse);
        }

        @ExceptionHandler(MethodArgumentTypeMismatchException.class)
        public ResponseEntity<ValidationErrorResponse> handleTypeMismatch(
                MethodArgumentTypeMismatchException ex, HttpServletRequest request) {

            String message = String.format("Invalid value '%s' for parameter '%s'. Expected type: %s",
                    ex.getValue(), ex.getName(), ex.getRequiredType().getSimpleName());

            ValidationErrorResponse errorResponse = ValidationErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(HttpStatus.BAD_REQUEST.value())
                    .error("Type Mismatch")
                    .message(message)
                    .path(request.getRequestURI())
                    .build();

            return ResponseEntity.badRequest().body(errorResponse);
        }

        @ExceptionHandler(AccessDeniedException.class)
        public ResponseEntity<ValidationErrorResponse> handleAccessDeniedException(
                AccessDeniedException ex, HttpServletRequest request) {

            ValidationErrorResponse errorResponse = ValidationErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(HttpStatus.FORBIDDEN.value())
                    .error("Access Denied")
                    .message("Insufficient privileges to access this resource")
                    .path(request.getRequestURI())
                    .build();

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
        }

        @ExceptionHandler(Exception.class)
        public ResponseEntity<ValidationErrorResponse> handleGenericException(
                Exception ex, HttpServletRequest request) {

            // Don't expose internal error details in production
            String message = "An internal error occurred";

            ValidationErrorResponse errorResponse = ValidationErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                    .error("Internal Server Error")
                    .message(message)
                    .path(request.getRequestURI())
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    public static class ValidationErrorResponse {
        private LocalDateTime timestamp;
        private int status;
        private String error;
        private String message;
        private String path;
        private Map<String, String> validationErrors;

        public static ValidationErrorResponseBuilder builder() {
            return new ValidationErrorResponseBuilder();
        }

        // Getters
        public LocalDateTime getTimestamp() {
            return timestamp;
        }

        public int getStatus() {
            return status;
        }

        public String getError() {
            return error;
        }

        public String getMessage() {
            return message;
        }

        public String getPath() {
            return path;
        }

        public Map<String, String> getValidationErrors() {
            return validationErrors;
        }

        // Setters
        public void setTimestamp(LocalDateTime timestamp) {
            this.timestamp = timestamp;
        }

        public void setStatus(int status) {
            this.status = status;
        }

        public void setError(String error) {
            this.error = error;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public void setPath(String path) {
            this.path = path;
        }

        public void setValidationErrors(Map<String, String> validationErrors) {
            this.validationErrors = validationErrors;
        }

        public static class ValidationErrorResponseBuilder {
            private LocalDateTime timestamp;
            private int status;
            private String error;
            private String message;
            private String path;
            private Map<String, String> validationErrors;

            public ValidationErrorResponseBuilder timestamp(LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            public ValidationErrorResponseBuilder status(int status) {
                this.status = status;
                return this;
            }

            public ValidationErrorResponseBuilder error(String error) {
                this.error = error;
                return this;
            }

            public ValidationErrorResponseBuilder message(String message) {
                this.message = message;
                return this;
            }

            public ValidationErrorResponseBuilder path(String path) {
                this.path = path;
                return this;
            }

            public ValidationErrorResponseBuilder validationErrors(Map<String, String> validationErrors) {
                this.validationErrors = validationErrors;
                return this;
            }

            public ValidationErrorResponse build() {
                ValidationErrorResponse response = new ValidationErrorResponse();
                response.setTimestamp(this.timestamp);
                response.setStatus(this.status);
                response.setError(this.error);
                response.setMessage(this.message);
                response.setPath(this.path);
                response.setValidationErrors(this.validationErrors);
                return response;
            }
        }
    }
}
