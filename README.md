# amazon-titan-multimodal-embeddings



## Deploy the application
### Prerequisite

- Install [Nodejs](https://nodejs.org/en/download/) Latest LTS Version. (Project uses Nodejs 20.11.0 and npm 10.2.4)
- Install [Yarn](https://yarnpkg.com/getting-started/install)
- Install [cdk](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html#getting_started_install)

### Backend

- Clone this repository to your local computer.
- In the terminal, from the backend folder execute `yarn install` to install all dependencies.
- Update the cdk.json - allowedip with the ip-address of your machine, this whitelists the source ip-address to allow traffic into API-Gateway.
- Run `cdk bootstrap`
- Run `cdk deploy`