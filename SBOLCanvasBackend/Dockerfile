FROM tomcat:9.0-jdk8-openjdk

# Set up working directory
WORKDIR /opt/backend

# Variables to make building easier
ARG web_content_dir=WEB-INF
ARG compile_source_dir=src
ARG compile_dest_dir=${web_content_dir}/classes
ARG dependencies_dir=${web_content_dir}/lib
ARG tomcat_dependencies=/usr/local/tomcat/lib

# Set up build directory
RUN mkdir -p ${compile_dest_dir}

# Copy source, dependencies, and web.xml
COPY src src
COPY lib ${web_content_dir}/lib
COPY web.xml ${web_content_dir}

# Compile java files into the backend/WebContent/WEB-INF/classes directory
RUN javac -source 1.8 -target 1.8 -sourcepath ${compile_source_dir} -d ${compile_dest_dir} -cp ".:${dependencies_dir}/*:${tomcat_dependencies}/*" ${compile_source_dir}/**/*.java

# Build .war file
RUN jar -cf /usr/local/tomcat/webapps/api.war ${web_content_dir}/*
