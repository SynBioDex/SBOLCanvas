FROM alpine

RUN apk add openjdk8 bash

ENV JAVA_HOME=/usr/lib/jvm/java-1.8-openjdk
ENV PATH="$JAVA_HOME/bin:${PATH}"

WORKDIR /opt/backend

COPY . .

# This should be in the Dockerfile, but for now it's a script
RUN resources/build_automation/build_backend.sh

## Build angular stuff and copy into WEB-INF
RUN apk add --update nodejs npm
RUN npm install -g @angular/cli
RUN resources/build_automation/build_frontend.sh

# New container
FROM tomcat:9.0-jdk8-openjdk 
COPY --from=0 SBOLCanvasBackend/WebContent/api.war webapps

