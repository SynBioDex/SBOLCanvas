#!/bin/bash

. deployment_variables.sh

# Die takes a message and exits with an error
die()
{
	echo $1
	exit 1
}