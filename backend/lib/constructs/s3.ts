import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

export class S3Construct extends Construct {
  public ingestBucket: s3.Bucket;
  public embeddingsBucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const s3LogsBucket = new s3.Bucket(this, 's3LogsBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      serverAccessLogsPrefix: 'logs/',
      enforceSSL: true
    })
    
    this.ingestBucket = new s3.Bucket(
      this,
      'ingestbucket',
      {
        lifecycleRules: [
          {
            expiration: Duration.days(10),
          },
        ],
        blockPublicAccess: {
          blockPublicAcls: true,
          blockPublicPolicy: true,
          ignorePublicAcls: true,
          restrictPublicBuckets: true,
        },
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        serverAccessLogsBucket: s3LogsBucket,
        serverAccessLogsPrefix: 'ingestBucket/logs/',
      }
    );

    this.embeddingsBucket = new s3.Bucket(
      this,
      'embeddingsbucket',
      {
        lifecycleRules: [
          {
            expiration: Duration.days(100),
          },
        ],
        blockPublicAccess: {
          blockPublicAcls: true,
          blockPublicPolicy: true,
          ignorePublicAcls: true,
          restrictPublicBuckets: true,
        },
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        serverAccessLogsBucket: s3LogsBucket,
        serverAccessLogsPrefix: 'embeddingsbucket/logs/'
      }
    );
  }
}