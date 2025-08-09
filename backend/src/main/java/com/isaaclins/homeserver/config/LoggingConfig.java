package com.isaaclins.homeserver.config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.encoder.PatternLayoutEncoder;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.ConsoleAppender;
import ch.qos.logback.core.rolling.RollingFileAppender;
import ch.qos.logback.core.rolling.TimeBasedRollingPolicy;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;

@Configuration
public class LoggingConfig {

    @Value("${logging.level.root:INFO}")
    private String rootLogLevel;

    @Value("${logging.level.com.isaaclins.homeserver:DEBUG}")
    private String applicationLogLevel;

    @Value("${logging.file.path:/var/log/homeserver}")
    private String logFilePath;

    @Value("${logging.pattern.console:%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n}")
    private String consolePattern;

    @Value("${logging.pattern.file:%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{50} - %X{correlationId} - %msg%n}")
    private String filePattern;

    @PostConstruct
    public void configureLogging() {
        LoggerContext loggerContext = (LoggerContext) LoggerFactory.getILoggerFactory();
        
        // Configure console appender
        configureConsoleAppender(loggerContext);
        
        // Configure file appenders
        configureApplicationFileAppender(loggerContext);
        configureSecurityFileAppender(loggerContext);
        configureAccessFileAppender(loggerContext);
        
        // Configure loggers
        configureLoggers(loggerContext);
    }

    private void configureConsoleAppender(LoggerContext loggerContext) {
        ConsoleAppender<ILoggingEvent> consoleAppender = new ConsoleAppender<>();
        consoleAppender.setContext(loggerContext);
        consoleAppender.setName("CONSOLE");

        PatternLayoutEncoder encoder = new PatternLayoutEncoder();
        encoder.setContext(loggerContext);
        encoder.setPattern(consolePattern);
        encoder.setCharset(StandardCharsets.UTF_8);
        encoder.start();

        consoleAppender.setEncoder(encoder);
        consoleAppender.start();

        Logger rootLogger = loggerContext.getLogger(Logger.ROOT_LOGGER_NAME);
        rootLogger.addAppender(consoleAppender);
        rootLogger.setLevel(Level.toLevel(rootLogLevel));
    }

    private void configureApplicationFileAppender(LoggerContext loggerContext) {
        RollingFileAppender<ILoggingEvent> fileAppender = new RollingFileAppender<>();
        fileAppender.setContext(loggerContext);
        fileAppender.setName("APPLICATION_FILE");
        fileAppender.setFile(logFilePath + "/application.log");

        TimeBasedRollingPolicy<ILoggingEvent> rollingPolicy = new TimeBasedRollingPolicy<>();
        rollingPolicy.setContext(loggerContext);
        rollingPolicy.setParent(fileAppender);
        rollingPolicy.setFileNamePattern(logFilePath + "/application.log.%d{yyyy-MM-dd}");
        rollingPolicy.setMaxHistory(30); // Keep 30 days of logs
        rollingPolicy.start();

        PatternLayoutEncoder encoder = new PatternLayoutEncoder();
        encoder.setContext(loggerContext);
        encoder.setPattern(filePattern);
        encoder.setCharset(StandardCharsets.UTF_8);
        encoder.start();

        fileAppender.setEncoder(encoder);
        fileAppender.setRollingPolicy(rollingPolicy);
        fileAppender.start();

        Logger applicationLogger = loggerContext.getLogger("com.isaaclins.homeserver");
        applicationLogger.addAppender(fileAppender);
        applicationLogger.setLevel(Level.toLevel(applicationLogLevel));
        applicationLogger.setAdditive(false);
    }

    private void configureSecurityFileAppender(LoggerContext loggerContext) {
        RollingFileAppender<ILoggingEvent> securityAppender = new RollingFileAppender<>();
        securityAppender.setContext(loggerContext);
        securityAppender.setName("SECURITY_FILE");
        securityAppender.setFile(logFilePath + "/security.log");

        TimeBasedRollingPolicy<ILoggingEvent> rollingPolicy = new TimeBasedRollingPolicy<>();
        rollingPolicy.setContext(loggerContext);
        rollingPolicy.setParent(securityAppender);
        rollingPolicy.setFileNamePattern(logFilePath + "/security.log.%d{yyyy-MM-dd}");
        rollingPolicy.setMaxHistory(90); // Keep 90 days of security logs
        rollingPolicy.start();

        PatternLayoutEncoder encoder = new PatternLayoutEncoder();
        encoder.setContext(loggerContext);
        encoder.setPattern(filePattern);
        encoder.setCharset(StandardCharsets.UTF_8);
        encoder.start();

        securityAppender.setEncoder(encoder);
        securityAppender.setRollingPolicy(rollingPolicy);
        securityAppender.start();

        Logger securityLogger = loggerContext.getLogger("SECURITY");
        securityLogger.addAppender(securityAppender);
        securityLogger.setLevel(Level.INFO);
        securityLogger.setAdditive(false);
    }

    private void configureAccessFileAppender(LoggerContext loggerContext) {
        RollingFileAppender<ILoggingEvent> accessAppender = new RollingFileAppender<>();
        accessAppender.setContext(loggerContext);
        accessAppender.setName("ACCESS_FILE");
        accessAppender.setFile(logFilePath + "/access.log");

        TimeBasedRollingPolicy<ILoggingEvent> rollingPolicy = new TimeBasedRollingPolicy<>();
        rollingPolicy.setContext(loggerContext);
        rollingPolicy.setParent(accessAppender);
        rollingPolicy.setFileNamePattern(logFilePath + "/access.log.%d{yyyy-MM-dd}");
        rollingPolicy.setMaxHistory(30); // Keep 30 days of access logs
        rollingPolicy.start();

        PatternLayoutEncoder encoder = new PatternLayoutEncoder();
        encoder.setContext(loggerContext);
        encoder.setPattern("%d{yyyy-MM-dd HH:mm:ss.SSS} - %msg%n");
        encoder.setCharset(StandardCharsets.UTF_8);
        encoder.start();

        accessAppender.setEncoder(encoder);
        accessAppender.setRollingPolicy(rollingPolicy);
        accessAppender.start();

        Logger accessLogger = loggerContext.getLogger("ACCESS");
        accessLogger.addAppender(accessAppender);
        accessLogger.setLevel(Level.INFO);
        accessLogger.setAdditive(false);
    }

    private void configureLoggers(LoggerContext loggerContext) {
        // Spring Security logging
        Logger springSecurityLogger = loggerContext.getLogger("org.springframework.security");
        springSecurityLogger.setLevel(Level.WARN);

        // Hibernate/JPA logging
        Logger hibernateLogger = loggerContext.getLogger("org.hibernate");
        hibernateLogger.setLevel(Level.WARN);

        // HTTP client logging
        Logger httpLogger = loggerContext.getLogger("org.apache.http");
        httpLogger.setLevel(Level.WARN);

        // SQL logging (for debugging)
        Logger sqlLogger = loggerContext.getLogger("org.hibernate.SQL");
        sqlLogger.setLevel(Level.DEBUG);

        // Parameter logging (for debugging)
        Logger paramLogger = loggerContext.getLogger("org.hibernate.type.descriptor.sql.BasicBinder");
        paramLogger.setLevel(Level.TRACE);
    }
}