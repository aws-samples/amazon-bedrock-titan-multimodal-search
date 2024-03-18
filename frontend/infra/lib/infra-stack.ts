import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(
      this,
      "CloudFrontOriginAccessIdentity"
    );
    const loggingBucketName = cdk.Stack.of(this).node.tryGetContext('loggingBucketName');
    const s3LogsBucket = s3.Bucket.fromBucketName(this,'loggingBucket', loggingBucketName);

    const s3HostingBucket = new s3.Bucket(this, "s3HostingBucket", {
      websiteIndexDocument: "index.html",
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      accessControl: s3.BucketAccessControl.PRIVATE,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      serverAccessLogsBucket: s3LogsBucket,
      serverAccessLogsPrefix: "hostingBucket/logs/",
      versioned: true,
    });

    s3HostingBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [s3HostingBucket.arnForObjects("*")],
        principals: [
          new iam.CanonicalUserPrincipal(
            cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
    );

    const cloudFrontDistribution = new cloudfront.CloudFrontWebDistribution(this, 'cloudFrontDistribution', {
      defaultRootObject: 'index.html',
      originConfigs: [
        {
          s3OriginSource: { 
            originAccessIdentity: cloudfrontOAI,
            s3BucketSource: s3HostingBucket,
          },
          behaviors: [{isDefaultBehavior: true }]
        },
      ],
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      loggingConfig: {
        bucket: s3LogsBucket,
        includeCookies: false,
        prefix: 'cf_logs/'
      },
    });

    new BucketDeployment(this, "WebsiteDeployment", {
      sources: [Source.asset("../build")],
      destinationBucket: s3HostingBucket,
      distribution: cloudFrontDistribution,
      distributionPaths: ["/*"],
    });

    new cdk.CfnOutput(this, 'URL', {
      value: cloudFrontDistribution.distributionDomainName, 
    });
  }
}
