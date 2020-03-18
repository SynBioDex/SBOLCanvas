#!/bin/bash

# Make deployment functions available.
. deployment_functions.sh

# Ensure we are running as root
ensure_superuser

./deploy_backend.sh || die "Backend deployment failed"
./deploy_frontend.sh || die "Frontend deployment failed"

echo "SBOL Canvas successfully deployed!"
