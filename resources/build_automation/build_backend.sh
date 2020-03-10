#!/bin/bash

BACKEND_DIR=$(pwd)/SBOLCanvasBackend
compile_dest_dir=${BACKEND_DIR}/WebContent/WEB-INF/classes
compile_source_dir=${BACKEND_DIR}/src
tomcat_dependencies=$(pwd)/resources/server_automation/tomcat/apache-tomcat-9.0.26/lib
other_dependencies=${BACKEND_DIR}/WebContent/WEB-INF/lib
war_filename=api.war
cur_dir=$(pwd)

# Compile java files into the SBOLCanvasBackend/WebContent/WEB-INF/classes directory
[[ -d ${compile_dest_dir} ]] && rm -rf ${compile_dest_dir} # Make sure we have a clean slate
mkdir ${compile_dest_dir}

javac -source 1.8 -target 1.8 -sourcepath ${compile_source_dir} -d ${compile_dest_dir} -cp ".:${other_dependencies}/*:${tomcat_dependencies}/*" ${compile_source_dir}/**/*.java\

# Build .war file and deploy
cd ${BACKEND_DIR}/WebContent
jar -cf ${war_filename} *
echo "$PWD"
echo $(ls)
