import { Construct } from 'constructs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { CfnOutput } from 'aws-cdk-lib';

export interface ApiGatewayProps {
  textSearchLambda: IFunction;
  imageSearchLambda: IFunction;
}

export class ApiGatewayConstruct extends Construct {
  public productSearchApi: apigw.RestApi;
  constructor(scope: Construct, id: string, props: ApiGatewayProps) {
    super(scope, id);

    this.productSearchApi = new apigw.RestApi(this, 'productSearchApi', {
      description: 'API for product search',
      restApiName: 'product-search-api',
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,                
      },
    });

    const searchResource = this.productSearchApi.root.addResource('search');
    searchResource.addResource('image').addMethod('POST', new apigw.LambdaIntegration(props.imageSearchLambda));
    searchResource.addResource('text').addMethod('POST', new apigw.LambdaIntegration(props.textSearchLambda));
    this.productSearchApi.addUsagePlan('usage-plan', {
      name: 'dev-docs-plan',
      description: 'usage plan',
      apiStages: [{
        api: this.productSearchApi,
        stage: this.productSearchApi.deploymentStage,
      }],
      throttle: {
        rateLimit: 100,
        burstLimit: 200
      },
    });

    new CfnOutput(this, 'APIGatewayUrl', {
      value: this.productSearchApi.url, 
    });
  }
}