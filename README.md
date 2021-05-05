SBOLCavas is a web application for creation and editing of genetic constructs using the SBOL data and visual standard. SBOLCanvas allows a user to create a genetic design from start to finish, with the option to incorporate existing SBOL data from a SynBioHub repository. SBOLCanvas is created as part of [SynBioKS](https://synbioks.github.io/).

### DOCKER:

-SBOLCanvas is a dockerized application and can be found at the repository synbiohub/sbolcanvas. A github action is configured so that upon a commit into the main branch 'final' a new image will be built and pushed to Docker Hub. A running instance of the application can be found at http://canvas.synbioks.org/canvas/

#### To build & run the docker image locally:<br/>
(from the top level directory of this repository)<br/>
-$docker build -t sbolcanvas/sbolcanvas .<br/>
-$docker run -p 8080:8080 sbolcanvas/sbolcanvas:latest

#### To run the latest version on the dockerhub repository locally:<br/>
-$docker run --rm -p 8080:8080 synbiohub/sbolcanvas

#### To run the current release on the dockerhub repository locally:<br/>
-$docker run --rm -p 8080:8080 synbiohub/sbolcanvas:1.2.0
