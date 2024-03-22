FROM node:12-alpine as frontend-build

RUN apk add git

# copy files -- need to copy whole repo for gitversion
COPY . /opt/canvas

# build frontend
WORKDIR /opt/canvas/SBOLCanvasFrontend
RUN npm install
RUN npm run gitversion
RUN npm run build
# RUN npm run debug-build


FROM tomcat:9.0-jdk8-openjdk as server

# copy backend files
WORKDIR /opt/backend
COPY SBOLCanvasBackend .

# make directories
RUN mkdir -p WebContent/WEB-INF/classes

# compile java files
RUN javac -source 1.8 -target 1.8 -sourcepath src -d WebContent/WEB-INF/classes -cp ".:WebContent/WEB-INF/lib/*:/usr/local/tomcat/lib/*" src/**/*.java

# build WAR file -- directly into tomcat webapps directory
# modified to set cwd of command to WebContent instead of including it in glob pattern
RUN jar -cf /usr/local/tomcat/webapps/api.war -C WebContent .

WORKDIR /usr/local/tomcat

# copy built frontend files
COPY --from=frontend-build /opt/canvas/SBOLCanvasFrontend/dist webapps/canvas

# copy configs for tomcat
ARG TOMCAT_AUTOMATION_DIR=resources/server_automation/tomcat
# COPY --from=0 ${TOMCAT_AUTOMATION_DIR}/base_config_files/tomcat-users.xml ${TOMCAT_AUTOMATION_DIR}/base_config_files/web.xml conf/
# COPY --from=0 ${TOMCAT_AUTOMATION_DIR}/base_config_files/server.xml conf/
# COPY --from=0 ${TOMCAT_AUTOMATION_DIR}/base_config_files/manager-context.xml webapps/manager/META-INF/context.xml 
# COPY --from=0 ${TOMCAT_AUTOMATION_DIR}/base_config_files/host-manager-context.xml webapps/host-manager/META-INF/context.xml 
COPY ${TOMCAT_AUTOMATION_DIR}/ROOT_config/index.jsp webapps/ROOT/index.jsp 

COPY ${TOMCAT_AUTOMATION_DIR}/frontend_config_files/frontend_context.html webapps/canvas/META-INF/context.html 
COPY ${TOMCAT_AUTOMATION_DIR}/frontend_config_files/frontend_rewrite.config webapps/canvas/WEB-INF/rewrite.config 
COPY ${TOMCAT_AUTOMATION_DIR}/frontend_config_files/frontend_web.xml webapps/canvas/WEB-INF/web.xml 
