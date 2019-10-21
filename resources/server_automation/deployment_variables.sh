#!/bin/bash


cur_dir=$(pwd)
cd ../../SBOLCanvasFrontend # Assuming were running in resources/server_automation for now.
FRONTEND_DIRECTORY=$(pwd)
cd ${cur_dir}

cur_dir=$(pwd)
cd ../../SBOLCanvasBackend # Assuming were running in resources/server_automation for now.
BACKEND_DIR=$(pwd)
cd ${cur_dir}


SERVER_ADDRESS=sbolcanvas.org
SERVER_SSH_PORT=666

TOMCAT_SERVER_DIR=/opt/tomcat/enabled

TOMCAT_FRONTEND_DIR=${TOMCAT_SERVER_DIR}/webapps/canvas
TOMCAT_AUTOMATION_DIR=$(pwd)/tomcat # Assuming were running in resources/server_automation for now.
FRONTEND_TARBALL_NAME=front_end_deployment.tar

TOMCAT_BACKEND_DIR=${TOMCAT_SERVER_DIR}/webapps/api