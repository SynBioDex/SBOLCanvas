SBOLCavas is a web application for creation and editing of genetic constructs using the SBOL data and visual standard. SBOLCanvas allows a user to create a genetic design from start to finish, with the option to incorporate existing SBOL data from a SynBioHub repository. SBOLCanvas is created as part of [SynBioKS](https://synbioks.github.io/).

### DOCKER:

-SBOLCanvas is a dockerized application and can be found at the repository samuelfbridge/sbolcanvas_1.0. It is configured so that upon a merge into the master branch 'final' a new image will be built on Docker Hub. A running instance of the application can be found at http://canvas.synbioks.org/canvas/

-The mechanism which automatically builds a new docker image is what is called an 'Automated Build' which is something that is configured on the dockerhub repository. In the builds tab of the repo https://hub.docker.com/repository/docker/randoom97/sbolcanvas/builds you may scroll down and find the automated build configuration that is linked to the 'final' branch in this github repository. This automated build is triggered upon every merge into 'final' in this github repository. Scrolling up and down in the builds tab you may find other information related to the automated build such as recent builds, build history etc.

#### To build & run the docker image locally:<br/>
(from the top level directory of this repository)<br/>
-$docker build -t sbolcanvas/sbolcanvas .<br/>
-$docker run -p 8080:8080 sbolcanvas/sbolcanvas:latest

#### To run the latest version on the dockerhub repository locally:<br/>
-$docker run --rm -p 8080:8080 randoom97/sbolcanvas

#### To run the current release on the dockerhub repository locally:<br/>
-$docker run --rm -p 8080:8080 randoom97/sbolcanvas:1.0.0
