package com.isaaclins.homeserver.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;

@Service
public class JwtService {

    private Key key;
    private static final long EXPIRATION_MS = 24 * 60 * 60 * 1000; // 1 day

    @PostConstruct
    public void init() {
        String secret = System.getenv("JWT_SECRET");
        if (secret == null || secret.length() < 32) {
            // Fallback insecure key for dev only
            secret = "dev_secret_key_012345678901234567890123456";
        }
        key = Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(String subject) {
        Date now = new Date();
        return Jwts.builder()
                .setSubject(subject)
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + EXPIRATION_MS))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validate(String token) {
        try {
            Jwts.parser().setSigningKey(key).parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String getSubject(String token) {
        return Jwts.parser().setSigningKey(key).parseClaimsJws(token).getBody().getSubject();
    }
}
