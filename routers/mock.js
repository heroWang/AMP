/*
 * mock
 */

import Router from 'koa-router';

import { mixin } from '../utils/tools.js';

import commentRegex from 'comment-regex';

const Mock = Router({
	prefix: '/mock'
});

const formatRequestUrl = (url) => {
	let result = {};
	result.project_id = url.match(/^\/.*?\/(.*?)\//)[1];

	const regxUrl = url.match(/^\/.*?\/.*?\/(.*)/)[1];

	if(regxUrl.indexOf('http') === -1){
		result.api_url = '/' + regxUrl.replace(/\?.*/,'');
	}else{
		result.api_url = regxUrl.replace(/\?.*/,'');
	}
	return result;
}

const errMap = {
	0: '参数类型有误',
	1: '缺少必要参数',
	2: '没有符合要求的返回示例',
	3: '缺少action',
	4: '缺少data',
	5: '缺少sessionId'
}

const checkReqParams = (ctx, result) => {
	let allParams = {};
	mixin(allParams, ctx.query);
	mixin(allParams, ctx.body);

	if(result === undefined){
		return {
			err: true,
			map: 2
		}
	}

	if(!allParams['action']){
		return {
			err: true,
			map: 3
		}
	}

	if(!allParams['data']){
		return {
			err: true,
			map: 4
		}
	}

	if(!allParams['sessionId']){
		return {
			err: true,
			map: 5
		}
	}

	var dataFields = JSON.parse(allParams['data']);
	for(let i = 0; i < result.request_params.length; i++){
		const _curr = result.request_params[i];
		if(_curr.required === '1' && dataFields[_curr['key']] === undefined){
			return {
				err: true,
				map: 1
			}
		}
	}

	return {
		err: false,
		map: NaN
	}
}

Mock.all('*', async (ctx, next) => {
	const apiDeatil = formatRequestUrl(ctx.request.url);
	const Url = global.dbHandle.getModel('urls');

	let allParams = {};
	mixin(allParams, ctx.query);
	mixin(allParams, ctx.body);

	const result = await Url.find({
		parent_project: apiDeatil.project_id,
		url: apiDeatil.api_url,
		method: ctx.method.toLocaleLowerCase(),
		name:allParams.action,
	});

	const checkResult = checkReqParams(ctx, result[0]);
	if(checkResult.err){
		ctx.fail(404, errMap[checkResult.map]);
		return;
	}
	try{
		ctx.body = JSON.parse(result[0].response_example.exapmle_array[result[0].response_example.in_use].replace(commentRegex(), ''));
	}catch(e){
		ctx.fail(500, '出错啦');
	}
});

export default Mock;
