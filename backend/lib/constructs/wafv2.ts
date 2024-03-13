import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';

export interface WafV2Props {
  productSearchApi: RestApi;
}

export class WafV2Construct extends Construct {

  constructor(scope: Construct, id: string, props: WafV2Props) {
    super(scope, id);

    const webACL = new wafv2.CfnWebACL(this, 'WebACL', {
      defaultAction: {
        block: {}
      },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'webACL',
        sampledRequestsEnabled: true
      },
      rules: [
        {
          name: 'IPAllowList',
          priority: 1,
          statement: {
            ipSetReferenceStatement: {
              arn: this.getIPSet().attrArn,
            }
          },
          action: {
              allow: {},
          },          
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'IPAllowList'
          }
        }
      ]
    });

    const webACLAssociation = new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
      webAclArn: webACL.attrArn,
      resourceArn: `arn:aws:apigateway:${Stack.of(this).region}::/restapis/${props.productSearchApi.restApiId}/stages/${props.productSearchApi.deploymentStage.stageName}`
    });

    webACLAssociation.node.addDependency(props.productSearchApi);

  }

  getIPSet(): wafv2.CfnIPSet {
    const whitelistedIps: string[] = Stack.of(this).node.tryGetContext('allowedip');
    const allowedIpSet: wafv2.CfnIPSet  = new wafv2.CfnIPSet(this, 'DevIpSet', {
      addresses: whitelistedIps, // whitelisted IPs in CIDR format
      ipAddressVersion: 'IPV4',
      scope: 'REGIONAL',
      description: 'List of allowed IP addresses',
    });
    allowedIpSet.applyRemovalPolicy(RemovalPolicy.DESTROY);

    return allowedIpSet;
  }
}