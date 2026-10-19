# =============================================================================
# Multi-stage Dockerfile for Spring Boot Backend
# =============================================================================

# Stage 1: Build JAR using Gradle
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy gradle wrapper and config files first for caching
COPY gradlew .
COPY gradle/ gradle/
COPY build.gradle .
COPY settings.gradle .

RUN chmod +x ./gradlew
# Download dependencies
RUN ./gradlew dependencies --no-daemon || true

# Copy source code and build
COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test

# Stage 2: Minimal Runtime JRE
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=builder /app/build/libs/*.jar app.jar

ENV TZ=Asia/Ho_Chi_Minh
EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-Duser.timezone=Asia/Ho_Chi_Minh", "-jar", "app.jar"]
