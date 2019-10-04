#!/bin/bash

# This makes variables in variables.sh available to us here
. tomcat_automation_variables.sh

cp ${TOMCAT_AUTOMATION_HOME}/tomcat-users.xml ${TOMCAT_HOME}/conf/
cp ${TOMCAT_AUTOMATION_HOME}/manager-context.xml ${TOMCAT_HOME}/webapps/manager/META-INF/context.xml
cp ${TOMCAT_AUTOMATION_HOME}/host-manager-context.xml ${TOMCAT_HOME}/webapps/host-manager/META-INF/context.xml

cp ${TOMCAT_AUTOMATION_HOME}/tomcat.service /etc/systemd/system/

systemctl daemon-reload
systemctl restart tomcat

