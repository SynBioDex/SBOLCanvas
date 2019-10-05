#!/bin/bash

cur_dir=$(pwd)
echo ${cur_dir}

cd ../../SBOLCanvasFrontend # Assuming were running in resources/server_automation for now.
FRONTEND_DIRECTORY=$(pwd)
cd ${cur_dir}

SERVER_ADDRESS=73.65.143.200
TOMCAT_SERVER_DIR=/opt/tomcat/enabled
TOMCAT_FRONTEND_DIR=${TOMCAT_SERVER_DIR}/webapps/canvas
TOMCAT_AUTOMATION_DIR=$(pwd)/tomcat # Assuming were running in resources/server_automation for now.
FRONTEND_TARBALL_NAME=front_end_deployment.tar