#!/bin/bash

. deployment_variables.sh

# Die takes a message and exits with an error
die()
{
	echo $1
	exit 1
}

# Ensure the caller is root
ensure_superuser()
{
	if [[ $(id -u) -ne 0 ]] ; then echo "Please run as root (sudo)" ; exit 1 ; fi
}