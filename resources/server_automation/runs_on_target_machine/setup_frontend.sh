#!/bin/bash

#
# This script is meant to run on the server machine.
# Variables that this script uses are set before
# the script runs.
#

# Wipe everything out and start from scratch -- BE CAREFUL
rm -rvf ${TOMCAT_SERVER_DIR}/webapps/canvas > /dev/null

[[ -d ${TOMCAT_FRONTEND_DIR} ]] || mkdir -p ${TOMCAT_FRONTEND_DIR}
cd ${TOMCAT_FRONTEND_DIR}

# We are now in the tomcat frontend webapp directory
[[ -d META-INF ]] || mkdir META-INF 
[[ -d WEB-INF ]] || mkdir WEB-INF
mv ${TOMCAT_SERVER_DIR}/${FRONTEND_TARBALL_NAME} ${TOMCAT_FRONTEND_DIR}
tar -xf ${FRONTEND_TARBALL_NAME}

mv SBOLCanvasFrontend/* ./

rm -rf SBOLCanvasFrontend

# After all this is done, the server will receive its
# configuration files for the front end.