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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.core.ParameterizedTypeReference;
import reactor.core.publisher.Flux;
import java.util.concurrent.atomic.AtomicReference;

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

    @GetMapping("/sessions")
    public ResponseEntity<?> listSessions(Authentication auth) {
        String username = auth != null ? auth.getName() : "guest";
        return ResponseEntity.ok(sessionRepo.findByUsernameOrderByCreatedAtDesc(username));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<?> listMessages(@PathVariable Long sessionId, Authentication auth) {
        String username = auth != null ? auth.getName() : "guest";
        ChatSession session = sessionRepo.findById(sessionId).orElseThrow();
        if (!session.getUsername().equals(username)) {
            return ResponseEntity.status(403).body("Forbidden");
        }
        return ResponseEntity.ok(messageRepo.findBySessionOrderByCreatedAtAsc(session));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/models/delete")
    public ResponseEntity<String> deleteModel(@RequestBody Map<String, Object> payload) {
        String name = (String) payload.get("name");
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body("Missing model name");
        }
        try {
            String resp = ollamaClient.delete()
                    .uri(uriBuilder -> uriBuilder.path("/api/delete").queryParam("name", name).build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return ResponseEntity.ok(resp != null ? resp : "deleted");
        } catch (Exception e) {
            return ResponseEntity.ok("Delete request forwarded (Ollama returned: " + e.getMessage() + ")");
        }
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> chatStream(@RequestBody ChatRequest req, Authentication auth) {
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
                "stream", true,
                "messages", java.util.List.of(Map.of("role", "user", "content", req.prompt())));

        AtomicReference<StringBuilder> assistantBuilder = new AtomicReference<>(new StringBuilder());

        return ollamaClient.post()
                .uri("/api/chat")
                .body(BodyInserters.fromValue(ollamaReq))
                .retrieve()
                .bodyToFlux(new ParameterizedTypeReference<Map<String, Object>>() {
                })
                .map(chunk -> {
                    boolean done = Boolean.TRUE.equals(chunk.get("done"));
                    String resp = (String) chunk.getOrDefault("response", "");
                    if (!resp.isEmpty())
                        assistantBuilder.get().append(resp);
                    ServerSentEvent<String> sse = ServerSentEvent.builder(resp)
                            .event(done ? "done" : "delta")
                            .build();
                    if (done) {
                        ChatMessage assistantMsg = new ChatMessage();
                        assistantMsg.setSession(session);
                        assistantMsg.setRole("assistant");
                        assistantMsg.setContent(assistantBuilder.get().toString());
                        messageRepo.save(assistantMsg);
                    }
                    return sse;
                });
    }

    public record ChatRequest(Long sessionId, String model, String prompt) {
    }
}
