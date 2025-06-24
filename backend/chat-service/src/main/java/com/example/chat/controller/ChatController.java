package com.example.chat.controller;

import com.example.chat.model.ChatMessage;
import com.example.chat.model.ChatSession;
import com.example.chat.repository.ChatMessageRepository;
import com.example.chat.repository.ChatSessionRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@RestController
@RequestMapping("/api/ollama")
public class ChatController {

    private final WebClient ollamaClient;
    private final ChatSessionRepository sessionRepo;
    private final ChatMessageRepository messageRepo;

    public ChatController(ChatSessionRepository sessionRepo, ChatMessageRepository messageRepo) {
        this.sessionRepo = sessionRepo;
        this.messageRepo = messageRepo;
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

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody ChatRequest req, Authentication auth) {
        String username = auth != null ? auth.getName() : "guest";

        ChatSession session;
        if (req.sessionId() == null) {
            session = new ChatSession();
            session.setUsername(username);
            session.setTitle(req.prompt().length() > 40 ? req.prompt().substring(0, 40) : req.prompt());
            sessionRepo.save(session);
        } else {
            session = sessionRepo.findById(req.sessionId()).orElseThrow();
        }

        ChatMessage userMsg = new ChatMessage();
        userMsg.setSession(session);
        userMsg.setRole("user");
        userMsg.setContent(req.prompt());
        messageRepo.save(userMsg);

        Map<String, Object> ollamaReq = Map.of(
                "model", req.model(),
                "stream", false,
                "messages", java.util.List.of(Map.of("role", "user", "content", req.prompt())));

        String assistantReply;
        try {
            assistantReply = ollamaClient.post()
                    .uri("/api/chat")
                    .body(BodyInserters.fromValue(ollamaReq))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .map(m -> (String) m.get("response"))
                    .block();
        } catch (Exception e) {
            assistantReply = "[Ollama error: " + e.getMessage() + "]";
        }

        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setSession(session);
        assistantMsg.setRole("assistant");
        assistantMsg.setContent(assistantReply);
        messageRepo.save(assistantMsg);

        return ResponseEntity.ok(Map.of("sessionId", session.getId(), "reply", assistantReply));
    }

    public record ChatRequest(Long sessionId, String model, String prompt) {
    }
}
