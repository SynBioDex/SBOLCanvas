#!/bin/bash

firewall-cmd --zone=public --permanent --add-port=8080/tcp
firewall-cmd --reload
