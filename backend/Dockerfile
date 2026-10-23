# =============================================================================
# Multi-stage Dockerfile for Spring Boot Backend (Java 21 LTS)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Application with Gradle
# -----------------------------------------------------------------------------
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Copy gradle wrapper and build definitions first for layer caching
COPY gradlew ./
COPY gradle/ ./gradle/
COPY build.gradle ./
COPY settings.gradle ./

RUN chmod +x ./gradlew

# Limit Gradle daemon memory allocation to prevent OOM/heavy swap on constrained VPS (1GB RAM)
ENV GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx512m -XX:MaxMetaspaceSize=256m"

# Pre-download dependencies to leverage Docker layer cache
RUN ./gradlew dependencies --no-daemon || true

# Copy application source code
COPY src/ ./src/

# Build production JAR without running tests (tests are validated in CI workflow)
RUN ./gradlew bootJar --no-daemon -x test

# -----------------------------------------------------------------------------
# Stage 2: Minimal Production JRE Runtime
# -----------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Create non-root user for security hardening
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy built JAR from builder stage
COPY --from=builder /app/build/libs/*.jar app.jar

# Set Timezone to Vietnam (UTC+7)
ENV TZ=Asia/Ho_Chi_Minh
EXPOSE 8080

# Run with security and performance JVM flags
ENTRYPOINT ["java", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-Duser.timezone=Asia/Ho_Chi_Minh", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
