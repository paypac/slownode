/// <reference path="../knex/knex.d.ts" />
/// <reference path="../node/node.d.ts" />

declare module "slownode" {
	import Knex = require("knex");



	export interface SlowNodeStatic {
		configuration: Config;
		
		setTimeout(func: SlowFunction, delayMs: number): Promise<number>;
		setImmediate(func: SlowFunction): Promise<number>;
		setInterval(funct: SlowFunction, delayMs: number): Promise<number>;
		
		EventEmitter: SlowEventEmitter;
		EventLoop: SlowEventLoop;
		Promise: SlowPromise;
	}
	
	export class SlowPromise {
		
	}

	export class SlowEventEmitter {

	}

	export interface SlowEventLoop {
		pollIntervalMs: number;
		flushCallback: NodeJS.Timer;

		start(): void;
		stop(): void;

		addCall(operation: SlowFunction): any;
		getNextCall(): Promise<SlowFunction>;
		processCall(task?: SlowFunction): Promise<boolean>
		removeCall(task: SlowFunction): any;
	}

	export interface SlowFunction {
		id?: number;
		functionId: string;
		runAt?: number;
		arguments: any;
	}

	export interface Subscriber {
		id: string;
		callback: (args: any) => Promise<any>;
	}

	export interface EventLoopSchema {
		id?: number;
		functionId: string
		repeat: number;
		runAt: number;
		runAtReadable: string;
		arguments: string;
	}

	export interface Config {
		retryCount?: number;
		retryIntervalMs?: number;
		pollIntervalMs?: number;
		database: string;
	}
}