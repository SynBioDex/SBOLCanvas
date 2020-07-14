#!/bin/bash

echo "----------- Deploying frontend... ------------"

# Build front end
cur_dir=$(pwd) # Save away our current directory to come back to.
cd SBOLCanvasFrontend
npm install
#ng build --prod --base-href=/canvas/
npm rebuild node-sass
node --max-old-space-size=8192
npm run prebuild.prod
ng build --prod --build-optimizer --vendor-chunk --progress --output-hashing=all --stats-json --source-map=true --base-href=/canvas/

