#!/bin/bash

# Set constant variables and get our function definitions
. deployment_variables.sh
. deployment_functions.sh

# Ensure we are running as root
ensure_superuser

echo "----------- Deploying backend... ------------"

compile_dest_dir=${BACKEND_DIR}/WebContent/WEB-INF/classes
compile_source_dir=${BACKEND_DIR}/src
tomcat_dependencies=tomcat/apache-tomcat-9.0.26/lib
other_dependencies=${BACKEND_DIR}/WebContent/WEB-INF/lib
war_filename=api.war
cur_dir=$(pwd)

# Compile java files into the SBOLCanvasBackend/WebContent/WEB-INF/classes directory
[[ -d ${compile_dest_dir} ]] && rm -rf ${compile_dest_dir} # Make sure we have a clean slate
mkdir ${compile_dest_dir}

javac -source 1.8 -target 1.8 -sourcepath ${compile_source_dir} -d ${compile_dest_dir} -cp ".:${other_dependencies}/*:${tomcat_dependencies}/*" ${compile_source_dir}/**/*.java\
 || die "Failed to compile backend source code"

# Build .war file and deploy
cd ${BACKEND_DIR}/WebContent
jar -cf ${war_filename} * || die "Failed to generate .war file for backend"
scp -P ${SERVER_SSH_PORT} ${war_filename} root@${SERVER_ADDRESS}:${TOMCAT_SERVER_DIR}/webapps || die "Failed to scp backend .war file to server"

echo "--------- Backend successfully deployed ---------"