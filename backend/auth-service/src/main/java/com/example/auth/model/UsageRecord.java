package com.example.auth.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "usage_record")
@Getter
@Setter
@NoArgsConstructor
public class UsageRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    private int containers;

    private int ramMb;

    private int diskMb;

    private int bandwidthMb;

    private Instant ts = Instant.now();
}
