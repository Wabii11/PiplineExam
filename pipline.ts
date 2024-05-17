import * as cdk from '@aws-cdk/core';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipelineActions from '@aws-cdk/aws-codepipeline-actions';

export class SoftwareDeliveryPipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // here to Create CodeCommit repository
    const repo = new codecommit.Repository(this, 'MyAppRepo', {
      repositoryName: 'my-nodejs-app',
    });

    // this to Create CodeBuild project
    const project = new codebuild.PipelineProject(this, 'MyAppBuild', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: ['npm install'],
          },
          build: {
            commands: ['npm run build'],
          },
        },
        artifacts: {
          'base-directory': 'dist',
          files: ['**/*'],
        },
      }),
    });

    // Create CodePipeline
    const pipeline = new codepipeline.Pipeline(this, 'MyAppPipeline');

    // Add source stage to pipeline
    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipelineActions.CodeCommitSourceAction({
          actionName: 'CodeCommit_Source',
          repository: repo,
          output: new codepipeline.Artifact(),
        }),
      ],
    });

    // Add build stage to pipeline
    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipelineActions.CodeBuildAction({
          actionName: 'CodeBuild_Build',
          project,
          input: new codepipeline.Artifact(),
          outputs: [new codepipeline.Artifact('BuildOutput')],
        }),
      ],
    });

    // Add deploy stage to pipeline
    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new codepipelineActions.LambdaInvokeAction({
          actionName: 'Deploy_Lambda',
          lambda: new lambda.Function(this, 'MyLambdaFunction', {
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda'),
          }),
          inputs: [new codepipeline.Artifact('BuildOutput')],
        }),
      ],
    });
  }
}

const app = new cdk.App();
new SoftwareDeliveryPipelineStack(app, 'SoftwareDeliveryPipelineStack');
