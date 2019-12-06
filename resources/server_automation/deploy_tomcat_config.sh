#!/bin/bash

# Set constant variables and get our function definitions
. deployment_variables.sh
. deployment_functions.sh

# Ensure we are running as root
ensure_superuser

echo "----------- Deploying tomcat... ------------"

scp -P ${SERVER_SSH_PORT} ${TOMCAT_AUTOMATION_DIR}/base_config_files/tomcat-users.xml ${TOMCAT_AUTOMATION_DIR}/base_config_files/server.xml ${TOMCAT_AUTOMATION_DIR}/base_config_files/web.xml root@${SERVER_ADDRESS}:${TOMCAT_SERVER_DIR}/conf/ \
|| die "Failed to scp tomcat base config files to server"
scp -P ${SERVER_SSH_PORT} ${TOMCAT_AUTOMATION_DIR}/base_config_files/manager-context.xml root@${SERVER_ADDRESS}:${TOMCAT_SERVER_DIR}/webapps/manager/META-INF/context.xml \
|| die "Failed to scp tomcat manager config to server"
scp -P ${SERVER_SSH_PORT} ${TOMCAT_AUTOMATION_DIR}/base_config_files/host-manager-context.xml root@${SERVER_ADDRESS}:${TOMCAT_SERVER_DIR}/webapps/host-manager/META-INF/context.xml \
|| die "Failed to scp tomcat host-manager config to server"
scp -P ${SERVER_SSH_PORT} ${TOMCAT_AUTOMATION_DIR}/ROOT_config/index.jsp root@${SERVER_ADDRESS}:${TOMCAT_SERVER_DIR}/webapps/ROOT/index.jsp \
|| die "Failed to scp ROOT config to server"

scp -P ${SERVER_SSH_PORT} ${TOMCAT_AUTOMATION_DIR}/base_config_files/tomcat.service root@${SERVER_ADDRESS}:/etc/systemd/system/ \
|| die "Failed to scp systemd unit file for tomcat to server"

scp -P ${SERVER_SSH_PORT} ${TOMCAT_AUTOMATION_DIR}/frontend_config_files/frontend_context.html root@${SERVER_ADDRESS}:${TOMCAT_SERVER_DIR}/webapps/canvas/META-INF/context.html \
|| die "Failed to scp front end config files to server"
scp -P ${SERVER_SSH_PORT} ${TOMCAT_AUTOMATION_DIR}/frontend_config_files/frontend_rewrite.config root@${SERVER_ADDRESS}:${TOMCAT_SERVER_DIR}/webapps/canvas/WEB-INF/rewrite.config \
|| die "Failed to scp front end config files to server"
scp -P ${SERVER_SSH_PORT} ${TOMCAT_AUTOMATION_DIR}/frontend_config_files/frontend_web.xml root@${SERVER_ADDRESS}:${TOMCAT_SERVER_DIR}/webapps/canvas/WEB-INF/web.xml \
|| die "Failed to scp front end config files to server"

# Runs script on the server directly.
ssh -p ${SERVER_SSH_PORT} root@${SERVER_ADDRESS} /bin/bash -s < ./runs_on_target_machine/refresh_tomcat.sh root \
|| die "Failed to refresh systemd tomcat service on server"

ssh -p ${SERVER_SSH_PORT} root@${SERVER_ADDRESS} /bin/bash -s < ./runs_on_target_machine/tomcat_configure_firewall.sh root \
|| die "Failed to configure firewall on server"

echo "-------- Tomcat configuration successfully deployed ---------"
