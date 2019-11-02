#!/bin/bash

# This makes variables in variables.sh available to us here
. tomcat_automation_variables.sh

cp ${TOMCAT_AUTOMATION_HOME}/base_config_files/tomcat-users.xml ${TOMCAT_HOME}/conf/
cp ${TOMCAT_AUTOMATION_HOME}/base_config_files/server.xml ${TOMCAT_HOME}/conf/
cp ${TOMCAT_AUTOMATION_HOME}/base_config_files/manager-context.xml ${TOMCAT_HOME}/webapps/manager/META-INF/context.xml
cp ${TOMCAT_AUTOMATION_HOME}/base_config_files/host-manager-context.xml ${TOMCAT_HOME}/webapps/host-manager/META-INF/context.xml

cp ${TOMCAT_AUTOMATION_HOME}/base_config_files/tomcat.service /etc/systemd/system/

systemctl daemon-reload
systemctl restart tomcat

