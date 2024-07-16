
# SBOLCanvas

SBOLCanvas is a web application for creation and editing of genetic constructs using the SBOL data and visual standard. SBOLCanvas allows a user to create a genetic design from start to finish, with the option to incorporate existing SBOL data from a SynBioHub repository. SBOLCanvas is created as part of SynBioKS.

## SynBioSuite Branch

This branch is specifically for SBOLCanvas as embedded in the [SynBioSuite app](https://github.com/MyersResearchGroup/SynBioSuite);
however, it can still function as a standalone application. 
## Repository Structure

This is a monorepo containing an Angular app as a frontend (in the frontend directory)
and a Dockerized Java API (in the backend directory) that handles things like 
conversion, communication with SynBioHub, etc.

This differs from the *final* branch, which Dockerizes the frontend and backend
together, and serves the Angular app from the backend.

The changes made were an optimization to allow the API to be deployed serverlessly
and the frontend to be deployed as a static web app served from CDNs. 
## Run Locally

Clone the project

```bash
git clone -b synbio-suite https://github.com/SynBioDex/SBOLCanvas
```

Go to the backend directory

```bash
cd SBOLCanvas/SBOLCanvasBackend
```

Ensure you have nodemon installed

```bash
npm install -g nodemon
```

Run nodemon to build and run the backend in a container

```bash
npx nodemon
```

Go to the frontend directory

```bash
cd ../SBOLCanvas/SBOLCanvasFrontend
```

Install dependencies

```bash
npm install
```

Start the Angular development server

```bash
npm run dev
```
Alternatively, you can build both the frontend and backend together on one Docker container, from the root directory, run

```bash
docker build -t sbolcanvas .
```
and then
```bash
docker run --rm --name canvas --publish 4040:8080 sbolcanvas
```
A local instance will be availaible on http://localhost:4040/

If you plan to contribute to this repository, this is recommended before you open a Pull Request. GitHub Actions will use a similar process to check the Docker build and deployment.



## Deployment

To build the frontend, from the frontend directory, run

```bash
npm run build
```

The built output will be available in frontend/dist and can be deployed anywhere
a static web app can be deployed. Genetic Logic Lab's weapon of choice is 
[Azure Static Web Apps](https://azure.microsoft.com/en-us/products/app-service/static/).

To build the backend, from the backend directory, run
```bash
docker build -t sbolcanvas .
```

The resulting Docker image can be deployed anywhere you can run Docker containers.
Genetic Logic Lab uses [Azure Container Apps](https://azure.microsoft.com/en-us/products/container-apps/).


