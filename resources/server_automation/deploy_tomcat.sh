#!/bin/bash

# Set constant variables and get our function definitions
. deployment_variables.sh
. deployment_functions.sh

# Ensure we are running as root
ensure_superuser

echo "----------- Deploying tomcat... ------------"

scp -P ${SERVER_SSH_PORT} ${TOMCAT_AUTOMATION_DIR}/base_config_files/tomcat-users.xml ${TOMCAT_AUTOMATION_DIR}/base_config_files/server.xml root@${SERVER_ADDRESS}:${TOMCAT_SERVER_DIR}/conf/ \
|| die "Failed to scp tomcat base config files to server"
scp -P ${SERVER_SSH_PORT} ${TOMCAT_AUTOMATION_DIR}/base_config_files/manager-context.xml root@${SERVER_ADDRESS}:${TOMCAT_SERVER_DIR}/webapps/manager/META-INF/context.xml \
|| die "Failed to scp tomcat manager config to server"
scp -P ${SERVER_SSH_PORT} ${TOMCAT_AUTOMATION_DIR}/base_config_files/host-manager-context.xml root@${SERVER_ADDRESS}:${TOMCAT_SERVER_DIR}/webapps/host-manager/META-INF/context.xml \
|| die "Failed to scp tomcat host-manager config to server"

scp -P ${SERVER_SSH_PORT} ${TOMCAT_AUTOMATION_DIR}/base_config_files/tomcat.service /etc/systemd/system/ \
|| die "Failed to scp systemd unit file for tomcat to server"

# Runs script on the server directly.
ssh -p ${SERVER_SSH_PORT} root@${SERVER_ADDRESS} /bin/bash -s < ./runs_on_target_machine/refresh_tomcat.sh root \
|| die "Failed to refresh systemd tomcat service on server"

echo "-------- Tomcat successfully deployed ---------"