# Use multi-stage build for optimal image size
FROM eclipse-temurin:17-jdk AS build

# Set working directory
WORKDIR /app

# Copy pom.xml and download dependencies (for better layer caching)
COPY pom.xml .
RUN apt-get update && apt-get install -y maven && \
    mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre

# Install curl for health checks and remove package cache
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Set working directory
WORKDIR /app

# Copy the built jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Create non-root user for security
RUN groupadd -r -g 1001 spring && \
    useradd -r -u 1001 -g spring spring && \
    mkdir -p /tmp && \
    chown -R spring:spring /app /tmp

# Switch to non-root user
USER spring

# Expose port
EXPOSE 8080

# Health check with security considerations
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# JVM security and performance tuning
ENV JAVA_OPTS="-Djava.security.egd=file:/dev/./urandom \
               -Dspring.profiles.active=docker \
               -Xms256m -Xmx512m \
               -XX:+UseG1GC \
               -XX:+UnlockExperimentalVMOptions \
               -XX:+UseContainerSupport \
               -XX:MaxRAMPercentage=75.0 \
               -Djava.awt.headless=true \
               -Dfile.encoding=UTF-8"

# Run the application with security flags
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"] 
