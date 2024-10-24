#!/bin/bash

git config --global --add safe.directory "$(pwd)"
git config --system --add safe.directory "$(pwd)"
git_hash=$(git rev-parse --short "$GITHUB_SHA")
git_branch=${GITHUB_REF#refs/heads/}

apt-get install jq
version=$(jq -r '.version' package.json)

file_contents=$(cat <<EOF
// this file is automatically generated by write-version-file.sh script
export const versions = {
    revision: '${revision}',
    branch: '${branch}',
    version: '${version}'
};
EOF
)

echo "$file_contents" > src/environments/versions.ts