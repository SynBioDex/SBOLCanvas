#!/bin/bash

# Ensure we are running as root
if [[ $(id -u) -ne 0 ]] ; then echo "Please run as root (sudo)" ; exit 1 ; fi

# Set constant variables and get our function definitions
. deployment_variables.sh
. deployment_functions.sh

compile_dest_dir=${BACKEND_DIR}/WebContent/WEB-INF/classes
compile_source_dir=${BACKEND_DIR}/src
tomcat_dependencies=tomcat/apache-tomcat-9.0.26/lib
other_dependencies=${BACKEND_DIR}/WebContent/WEB-INF/lib
cur_dir=$(pwd)

# Compile java files into the SBOLCanvasBackend/WebContent/WEB-INF/classes directory
[[ -d ${compile_dest_dir} ]] && rm -rf ${compile_dest_dir} # Make sure we have a clean slate
mkdir ${compile_dest_dir}

javac -target 1.8 -sourcepath ${compile_source_dir} -d ${compile_dest_dir} -cp ".:${other_dependencies}/*:${tomcat_dependencies}/*" ${compile_source_dir}/**/*.java || die "Failed to compile backend"

# Build .war file and deploy
cd ${BACKEND_DIR}/WebContent
jar -cf test.war * || die "Failed to generate .war file for backend"
scp -P 666 test.war root@${SERVER_ADDRESS}:${TOMCAT_SERVER_DIR}/webapps || die "Failed to scp backend .war file to server"



# For every directory in SBOLCanvasBackend/src/
# for dir in $(find . -mindepth 1 -maxdepth 1 -type d); do
# 	echo $(basename ${dir})
# 	dest=${compile_dest_dir}/$(basename ${dir})

# 	mkdir ${dest}
# 	#echo ${dest}

# 	cd ${dir}
# 	# For every file in said directory.
# 	for file in $(find . -mindepth 1 -maxdepth 1 -type f -name "*.java"); do
# 		echo "compiling $(basename ${file})"
# 		javac -d ${compile_dest_dir} -cp ".:${BACKEND_DIR}/WebContent/WEB-INF/lib/*:/opt/apache-tomcat-9.0.26/lib/*" ${file}
# 		#javac -d ${compile_dest_dir} -cp ".:${BACKEND_DIR}/WebContent/WEB-INF/lib/*" ${file}
# 		#javac -d ${compile_dest_dir} -cp $(echo ${BACKEND_DIR}/WebContent/WEB-INF/lib/*.jar | tr ' ' ':') ${file}
# 	done
# 	cd ../
#done