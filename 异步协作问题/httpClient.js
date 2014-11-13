/*
* http客户端封装
* */

var http = require('http'),
    config = require('../config.js'),
    querystring = require('querystring'),
    deferred = require('./async.js'),
    logger = require('./log.js').logger;

function setHeader(req){
    var ret = {}, reqHeaders = req.headers;
    for(var i in reqHeaders){
        if(reqHeaders.hasOwnProperty(i) && !(/Host/i.test(i))){
            ret[i] = reqHeaders[i];
        }
    }
    return ret;
}


/*
* para example:
* reqData: {path : '', method : '', serverType(服务类型): '', data: {}}
* */
exports.generate = function(reqData,req){
    var deferredIns = new deferred(),
        chunks = [], size = 0;
    var _req = http.request({
            host: config.url[reqData.serverType].restApiHost,
            port: config.url[reqData.serverType].restApiPort,
            path: reqData.path,
            method: reqData.method || 'GET',
            headers: setHeader(req)
        });

    _req.on('response',function(_res){
        _res.on('data',function(chunk){
            chunks.push(chunk);
            size += chunk.length;
        });

        _res.on('end',function(){
            deferredIns.resolve(Buffer.concat(chunks,size).toString());
        });
        _res.on('error',function(err){
            logger.error('Error in' + __filename + err);
            deferredIns.reject(err);
        });
    });

    _req.on('error',function(e){
        logger.error('Error in' + __filename + e);
        deferredIns.reject(e.message);
    });

    if(reqData.method == 'POST'){
        _req.write(querystring.stringify(reqData.data));
    }
    _req.end();

    return deferredIns.promise;
};