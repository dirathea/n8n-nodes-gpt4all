import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { GPT4All as gpt } from "gpt4all";

export class GPT4All implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GPT4ALL',
		name: 'GPT4All',
		group: ['transform'],
		version: 1,
		description: 'Run query against local GPT4All instance',
		defaults: {
			name: 'GPT4ALL',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				default: '',
				placeholder: 'GPT4All Prompt',
				description: 'GPT4All Prompt',
			},
			{
				displayName: 'Thread Count',
				name: 'thread',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 4,
				description: 'Number of thread to run GPT4All',
			}
		],
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let item: INodeExecutionData;
		let prompt: string;
		let response: string;
		let threads: number;

		threads = this.getNodeParameter('thread', 0, 4) as number;

		// Init GPT4All instance
		const gpt4all = new gpt('gpt4all-lora-quantized', false, {
			threads,
		});

		console.info('Initialize gpt');
		await gpt4all.init();

		// Iterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				console.info('Open gpt model');
				await gpt4all.open();
				prompt = this.getNodeParameter('prompt', itemIndex, '') as string;
				item = items[itemIndex];

				console.info('Execute prompt', prompt);
				response = await gpt4all.prompt(prompt);
				item.json['output'] = response.replace(/\[\d+m/g, "");
			} catch (error) {
				// This node should never fail but we want to showcase how
				// to handle errors.
				if (this.continueOnFail()) {
					items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			} finally {
				gpt4all.close();
			}
		}

		return this.prepareOutputData(items);
	}
}
