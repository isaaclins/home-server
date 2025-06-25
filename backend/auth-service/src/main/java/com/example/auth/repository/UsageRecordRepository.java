package com.example.auth.repository;

import com.example.auth.model.UsageRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UsageRecordRepository extends JpaRepository<UsageRecord, Long> {
    List<UsageRecord> findByUserIdOrderByTsDesc(Long userId);
}
