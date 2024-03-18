import { Duration, Stack } from 'aws-cdk-lib';
import { Runtime, LayerVersion, Tracing } from 'aws-cdk-lib/aws-lambda';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  NodejsFunction,
  NodejsFunctionProps,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { opensearchserverless } from '@cdklabs/generative-ai-cdk-constructs';

export interface LambdaProps {
  ingestBucket: Bucket;
  embeddingsBucket: Bucket;
  collectionEndpoint: string;
  indexName: string;
  productCollection: opensearchserverless.VectorCollection;
}

export class LambdaConstruct extends Construct {
  public batchInputLambda: NodejsFunction;
  public generateEmbeddingsLambda: NodejsFunction;
  public saveEmbeddingsLambda: NodejsFunction;
  public textSearchLambda: NodejsFunction;
  public imageSearchLambda: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaProps) {
    super(scope, id);

    const commonNodejsProps = this.getCommonNodejsProps();
    const region = Stack.of(this).region;

    this.batchInputLambda = new NodejsFunction(this, 'BatchInput', {
      ...commonNodejsProps,
      entry: 'lambda/batchInput/index.ts',
      functionName:'batch-input',
      timeout: Duration.minutes(15),
      deadLetterQueueEnabled: true,
      reservedConcurrentExecutions: 1,
      environment: {
        ...commonNodejsProps.environment,
        INGEST_BUCKET: props.ingestBucket.bucketName,
        BUCKET_KEY: 'batch',
        POWERTOOLS_SERVICE_NAME: 'batch-Input',
        BATCH_SIZE: '500'
      },
    });

    this.generateEmbeddingsLambda = new NodejsFunction(this, 'GenerateEmbeddings', {
      ...commonNodejsProps,
      entry: 'lambda/generateEmbeddings/index.ts',
      functionName:'generate-embeddings',
      reservedConcurrentExecutions: 35,
      deadLetterQueueEnabled: true,
      timeout: Duration.minutes(15),
      environment: {
        ...commonNodejsProps.environment,
        MODEL_ID: 'amazon.titan-embed-image-v1',
        INGEST_BUCKET: props.ingestBucket.bucketName,
        EMBEDDINGS_BUCKET: props.embeddingsBucket.bucketName,
        POWERTOOLS_SERVICE_NAME: 'generate-embeddings',
      },
    });

    this.saveEmbeddingsLambda = new NodejsFunction(this, 'SaveEmbeddings', {
      ...commonNodejsProps,
      entry: 'lambda/saveEmbeddings/index.ts',
      functionName:'save-embeddings',
      reservedConcurrentExecutions: 5,
      timeout: Duration.minutes(15),
      deadLetterQueueEnabled: true,
      environment: {
        ...commonNodejsProps.environment,
        COLLECTION_ENDPOINT: props.collectionEndpoint,
        INDEX_NAME: props.indexName,
        REGION: region,
        POWERTOOLS_SERVICE_NAME: 'save-embeddings'
      },
    });

    this.textSearchLambda = new NodejsFunction(this, 'TextSearch', {
      ...commonNodejsProps,
      entry: 'lambda/textSearch/index.ts',
      functionName:'product-text-search',
      reservedConcurrentExecutions: 5,
      timeout: Duration.seconds(29),
      environment: {
        ...commonNodejsProps.environment,
        REGION: region,
        INGEST_BUCKET: props.ingestBucket.bucketName,
        MODEL_ID: 'amazon.titan-embed-image-v1',
        COLLECTION_ENDPOINT: props.collectionEndpoint,
        INDEX_NAME: props.indexName,
        POWERTOOLS_SERVICE_NAME: 'product-text-search',
        QUERY_RESULT_SIZE: '5'
      },
    });

    this.imageSearchLambda = new NodejsFunction(this, 'ImageSearch', {
      ...commonNodejsProps,
      entry: 'lambda/imageSearch/index.ts',
      functionName:'product-image-search',
      reservedConcurrentExecutions: 5,
      timeout: Duration.seconds(29),
      environment: {
        ...commonNodejsProps.environment,
        REGION: region,
        INGEST_BUCKET: props.ingestBucket.bucketName,
        MODEL_ID: 'amazon.titan-embed-image-v1',
        COLLECTION_ENDPOINT: props.collectionEndpoint,
        INDEX_NAME: props.indexName,
        POWERTOOLS_SERVICE_NAME: 'product-image-search',
        QUERY_RESULT_SIZE: '5'
      },
    });

    const s3IngestPutEventSource: S3EventSource = new S3EventSource(props.ingestBucket, {
      events: [EventType.OBJECT_CREATED_PUT],
      filters: [{ prefix: 'ingest/', suffix: '.json' }],
    });
    this.batchInputLambda.addEventSource(s3IngestPutEventSource);
    
    const s3BatchPutEventSource: S3EventSource = new S3EventSource(props.ingestBucket, {
      events: [EventType.OBJECT_CREATED_PUT],
      filters: [{ prefix: 'batch/', suffix: '.json' }],
    });
    this.generateEmbeddingsLambda.addEventSource(s3BatchPutEventSource);

    const s3EmbeddingsPutEventSource: S3EventSource = new S3EventSource(props.embeddingsBucket, {
      events: [EventType.OBJECT_CREATED_PUT],
    });
    this.saveEmbeddingsLambda.addEventSource(s3EmbeddingsPutEventSource);
  
    props.embeddingsBucket.grantReadWrite(this.generateEmbeddingsLambda);
    props.ingestBucket.grantRead(this.generateEmbeddingsLambda, 'batch/*');
    props.ingestBucket.grantRead(this.generateEmbeddingsLambda, 'images/*');

    props.ingestBucket.grantRead(this.batchInputLambda, 'ingest/*');
    props.ingestBucket.grantWrite(this.batchInputLambda, 'batch/*');

    props.embeddingsBucket.grantReadWrite(this.saveEmbeddingsLambda);

    props.ingestBucket.grantRead(this.textSearchLambda, 'images/*');
    props.ingestBucket.grantRead(this.imageSearchLambda, 'images/*');

    const policyStatement: PolicyStatement = new PolicyStatement({
      actions: [
        'bedrock:InvokeModel',
      ],
      resources: ['arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-image-v1'],
    });

    this.generateEmbeddingsLambda.addToRolePolicy(policyStatement);
    this.imageSearchLambda.addToRolePolicy(policyStatement);
    this.textSearchLambda.addToRolePolicy(policyStatement);

    if(this.imageSearchLambda.role) {
      props.productCollection.grantDataAccess(this.imageSearchLambda.role);
    }
    if(this.textSearchLambda.role) {
      props.productCollection.grantDataAccess(this.textSearchLambda.role);
    }
    if(this.saveEmbeddingsLambda.role) {
      props.productCollection.grantDataAccess(this.saveEmbeddingsLambda.role);
    }
  }

  getCommonNodejsProps(): NodejsFunctionProps {
    return {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      memorySize: 1024,
      awsSdkConnectionReuse: true,
      layers: [
        LayerVersion.fromLayerVersionArn(
          this,
          'powertools-layer',
          `arn:aws:lambda:${
            Stack.of(this).region
          }:094274105915:layer:AWSLambdaPowertoolsTypeScriptV2:1`
        ),
      ],
      tracing: Tracing.ACTIVE,
      logRetention: RetentionDays.ONE_WEEK,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        POWERTOOLS_METRICS_NAMESPACE: 'ProductSearchMultimodal',
        POWERTOOLS_LOG_LEVEL: 'DEBUG',
      },
      bundling: {
        externalModules: [
          '@aws-lambda-powertools/commons',
          '@aws-lambda-powertools/logger',
          '@aws-lambda-powertools/tracer',
          '@aws-lambda-powertools/metrics',
        ],
      },
    };
  }
}
