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

### Frontend
- From the frontend folder, run `yarn install` to install the frontend dependencies.
- Run `yarn start` to launch the react application locally from the browser. 
- Open [http://localhost:3000](http://localhost:3000) to view it in your browser.
- Enter the API endpoint URL created through the backend cdk deployment

## Application Features
### Product Image Search
  * Enter the API endpoint URl, click on `Find Similar Products` to view results based on image search. Alternatively you could upload new image by clicking `Change Product` option and performing a search.

    <img src="project_assets/image-search.png" alt="drawing" style="width:300px;"/>


### Product Text Search
  * Click on `Text Search` tab, enter a brief description of the product and click enter.

    <img src="project_assets/text-search.png" alt="drawing" style="width:300px;"/>


## Cleanup
- In the terminal, from the backend folder, run the `cdk destroy` command to remove the aws resources.