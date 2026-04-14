# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build

RUN apk add git

COPY . /opt/canvas

WORKDIR /opt/canvas/SBOLCanvasFrontend
RUN npm install
RUN npm run gitversion
RUN npm run build -- --configuration production --base-href=/canvas/

# Stage 2: Build backend with Maven
FROM maven:3.9-eclipse-temurin-8 AS backend-build
WORKDIR /build
COPY SBOLCanvasBackend/pom.xml .
COPY SBOLCanvasBackend/repo/ repo/
RUN mvn dependency:go-offline -B
COPY SBOLCanvasBackend/src/ src/
RUN mvn package -DskipTests -B

# Stage 3: Assemble Tomcat server
FROM tomcat:9.0-jdk8-openjdk
WORKDIR /usr/local/tomcat

# Backend WAR
COPY --from=backend-build /build/target/api.war webapps/api.war

# Frontend static files
COPY --from=frontend-build /opt/canvas/SBOLCanvasFrontend/dist/browser webapps/canvas

# Tomcat configuration
ARG TOMCAT_AUTOMATION_DIR=resources/server_automation/tomcat
COPY ${TOMCAT_AUTOMATION_DIR}/ROOT_config/index.jsp webapps/ROOT/index.jsp
COPY ${TOMCAT_AUTOMATION_DIR}/frontend_config_files/frontend_context.html webapps/canvas/META-INF/context.html
COPY ${TOMCAT_AUTOMATION_DIR}/frontend_config_files/frontend_rewrite.config webapps/canvas/WEB-INF/rewrite.config
COPY ${TOMCAT_AUTOMATION_DIR}/frontend_config_files/frontend_web.xml webapps/canvas/WEB-INF/web.xml
