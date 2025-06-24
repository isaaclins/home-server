package com.example.chat.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.util.Map;

@RestController
@RequestMapping("/api/ollama")
public class ChatController {

    private final WebClient ollamaClient;

    public ChatController() {
        this.ollamaClient = WebClient.builder()
                .baseUrl("http://ollama:11434")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @GetMapping("/models")
    public ResponseEntity<String> listModels() {
        String body = ollamaClient.get()
                .uri("/api/tags")
                .retrieve()
                .bodyToMono(String.class)
                .block();
        return ResponseEntity.ok(body);
    }

    @PostMapping("/models/pull")
    public ResponseEntity<String> pullModel(@RequestBody Map<String, Object> payload) {
        String resp = ollamaClient.post()
                .uri("/api/pull")
                .body(BodyInserters.fromValue(payload))
                .retrieve()
                .bodyToMono(String.class)
                .block();
        return ResponseEntity.ok(resp);
    }

    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> chat(@RequestBody Map<String, Object> payload) {
        return ollamaClient.post()
                .uri("/api/chat")
                .body(BodyInserters.fromValue(payload))
                .retrieve()
                .bodyToFlux(String.class);
    }
}
