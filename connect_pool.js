/*
	@ nodejs 连接池(非真正意义的数据库连接池)
*/
var mongodb = require('mongodb');
    global.cache = {};

module.exports = function(url,options){
	var fns = [], cache = global.cache, status = 0;
	return function(f){
		if(cache[url] && typeof cache[url] === 'object'){
			f.call(null,cache[url]);
			return;
		}
		fns.push(f);
		if(status == 0){
            status = 1;
			mongodb.MongoClient.connect(url,options,function(err,db){
				if(err) {throw err;}
				cache[url] = db;
				for(var i=0,len=fns.length; i<len; i++){
					fns.shift().call(null,db);
				}
			});
		}
	};
};