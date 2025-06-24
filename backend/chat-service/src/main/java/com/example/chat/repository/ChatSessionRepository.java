package com.example.chat.repository;

import com.example.chat.model.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {
    List<ChatSession> findByUsernameOrderByCreatedAtDesc(String username);
}
