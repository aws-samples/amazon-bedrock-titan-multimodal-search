import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as infra from '../lib/infra-stack';
import { Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';

test('App', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new infra.InfraStack(app, 'MyTestStack');
  // THEN
  Template.fromStack(stack);
  Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
});
