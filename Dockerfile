FROM node:12-alpine

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
RUN apk add git

WORKDIR ./SBOLCanvasFrontend
RUN npm install
RUN npm rebuild node-sass
RUN node --max-old-space-size=8192
RUN npm run prebuild.prod
RUN ng build --prod --build-optimizer --vendor-chunk --progress --output-hashing=all --stats-json --source-map=true --base-href=/canvas/

#RUN resources/build_automation/build_frontend.sh

# New container
FROM tomcat:9.0-jdk8-openjdk

# Copy backend
COPY --from=0 /opt/backend/SBOLCanvasBackend/WebContent/api.war webapps

# Copy frontend
COPY --from=0 /opt/backend/SBOLCanvasFrontend/dist/SBOLCanvasFrontend webapps/canvas

# Copying configs for tomcat
ARG TOMCAT_AUTOMATION_DIR=/opt/backend/resources/server_automation/tomcat
#COPY --from=0 ${TOMCAT_AUTOMATION_DIR}/base_config_files/tomcat-users.xml ${TOMCAT_AUTOMATION_DIR}/base_config_files/web.xml conf/
#COPY --from=0 ${TOMCAT_AUTOMATION_DIR}/base_config_files/server.xml conf/
#COPY --from=0 ${TOMCAT_AUTOMATION_DIR}/base_config_files/manager-context.xml webapps/manager/META-INF/context.xml 
#COPY --from=0 ${TOMCAT_AUTOMATION_DIR}/base_config_files/host-manager-context.xml webapps/host-manager/META-INF/context.xml 
COPY --from=0 ${TOMCAT_AUTOMATION_DIR}/ROOT_config/index.jsp webapps/ROOT/index.jsp 

COPY --from=0 ${TOMCAT_AUTOMATION_DIR}/frontend_config_files/frontend_context.html webapps/canvas/META-INF/context.html 
COPY --from=0 ${TOMCAT_AUTOMATION_DIR}/frontend_config_files/frontend_rewrite.config webapps/canvas/WEB-INF/rewrite.config 
COPY --from=0 ${TOMCAT_AUTOMATION_DIR}/frontend_config_files/frontend_web.xml webapps/canvas/WEB-INF/web.xml 

