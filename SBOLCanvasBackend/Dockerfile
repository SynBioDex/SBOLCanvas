# Stage 1: Build with Maven
FROM maven:3.9-eclipse-temurin-8 AS build
WORKDIR /build
COPY pom.xml .
COPY repo/ repo/
RUN mvn dependency:go-offline -B
COPY src/ src/
RUN mvn package -DskipTests -B

# Stage 2: Deploy to Tomcat
FROM tomcat:9.0-jdk8-openjdk
COPY --from=build /build/target/api.war /usr/local/tomcat/webapps/api.war
