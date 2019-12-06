#!/bin/bash

# Set constant variables and get our function definitions
. deployment_variables.sh
. deployment_functions.sh

# Ensure we are running as root
ensure_superuser

echo "----------- Deploying frontend... ------------"

# Build front end
cur_dir=$(pwd) # Save away our current directory to come back to.
cd ${FRONTEND_DIRECTORY}
#ng build --prod --base-href=/canvas/
ng build --prod --build-optimizer --vendor-chunk --progress --output-hashing=all --stats-json --source-map=true --base-href=/canvas/

# $? is the return code of the last operation
[[ $? -eq 0 ]] || die "Build failed"

# Make a tar ball, we are still in the front end directory.
cd dist
tar -cf ${FRONTEND_TARBALL_NAME} SBOLCanvasFrontend || die "Failed to tar the balls up"

# Get files over to server.
scp -P ${SERVER_SSH_PORT} -o StrictHostKeyChecking=no ${FRONTEND_TARBALL_NAME} root@${SERVER_ADDRESS}:${TOMCAT_SERVER_DIR} || die "Failed to scp tarball to server"

# run this script on the server to unpack the tarball and setup the directories
cd ${cur_dir}
ssh -p ${SERVER_SSH_PORT} root@${SERVER_ADDRESS} env TOMCAT_SERVER_DIR=${TOMCAT_SERVER_DIR} TOMCAT_FRONTEND_DIR=${TOMCAT_FRONTEND_DIR} FRONTEND_TARBALL_NAME=${FRONTEND_TARBALL_NAME} /bin/bash -s < ./runs_on_target_machine/setup_frontend.sh root\
 || die "Failed to setup frontend directory on server"

# scp the remaining config files on over
scp -P ${SERVER_SSH_PORT} ${TOMCAT_AUTOMATION_DIR}/frontend_config_files/frontend_context.html root@${SERVER_ADDRESS}:${TOMCAT_FRONTEND_DIR}/META-INF/context.html || die "Failed to copy over frontend context.html file"
scp -P ${SERVER_SSH_PORT} ${TOMCAT_AUTOMATION_DIR}/frontend_config_files/frontend_rewrite.config root@${SERVER_ADDRESS}:${TOMCAT_FRONTEND_DIR}/WEB-INF/rewrite.config || die "Failed to copy over frontend rewrite.config file"

echo "-------- Frontend successfully deployed ---------"
