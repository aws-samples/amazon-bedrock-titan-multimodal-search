import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { S3Construct } from './constructs/s3';
import { VectorCollectionConstruct } from './constructs/vector-collection';
import { LambdaConstruct, LambdaProps } from './constructs/lambda';
import { ApiGatewayConstruct, ApiGatewayProps } from './constructs/api-gateway';
import { WafV2Construct, WafV2Props } from './constructs/wafv2';

export class BackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const s3construct = new S3Construct(this, 'S3Construct');

    const vectorCollectionConstruct = new VectorCollectionConstruct(this, 'VectorCollectionConstruct');

    const lambdaProps: LambdaProps = {
      embeddingsBucket: s3construct.embeddingsBucket,
      ingestBucket: s3construct.ingestBucket,
      productCollection: vectorCollectionConstruct.productCollection,
      indexName: vectorCollectionConstruct.indexName,
      collectionEndpoint: vectorCollectionConstruct.collectionEndpoint,
    };
    const lambdaConstruct = new LambdaConstruct(this, 'LambdaConstruct', lambdaProps);

    const apiGatewayProps: ApiGatewayProps = {
      textSearchLambda: lambdaConstruct.textSearchLambda,
      imageSearchLambda: lambdaConstruct.imageSearchLambda,
    };
    const apiConstruct = new ApiGatewayConstruct(this, 'ApiConstruct', apiGatewayProps);

    const wafV2Props:WafV2Props = {
      productSearchApi: apiConstruct.productSearchApi
    };
    new WafV2Construct(this, 'WafV2Construct', wafV2Props);
 }
}
