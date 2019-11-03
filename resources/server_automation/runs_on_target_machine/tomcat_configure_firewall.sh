#!/bin/bash

# This is how the firewall is managed on CentOS 7. We can run this
# as many times as we want with no harm done.
firewall-cmd --zone=public --permanent --add-port=80/tcp
firewall-cmd --zone=public --permanent --add-port=443/tcp
firewall-cmd --zone=public --permanent --add-port=8443/tcp
firewall-cmd --zone=public --permanent --add-port=8080/tcp
firewall-cmd --reload
