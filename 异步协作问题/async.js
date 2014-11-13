/*
* 异步测试案例
* 异步考虑问题1： 多个平行的异步调用都返回后执行callback，callback的参数往往是多个平行异步调用返回的结果集合
* 异步考虑问题2： 多个嵌套式异步调用后执行callback，每一级异步调用依赖上一级
* 异步考虑问题3： 上述两种调用方式的混合调用
* */

//偏函数
var isType = function(type){
    return function(obj){
        return Object.prototype.toString.call(obj) == '[object '+ type +']';
    };
};

/*
* 多异步协作解决方案（并行没有依赖要求,EventProxy模块类似）
* */
function after(times,func){
    var argList= {};
    if(times <= 0){return func();}
    return function(key,val){
        argList[key] = val;
        if(--times < 1){return func.call(null,argList);}
    };
}

var events = require('events'), doneSomething = after(3,callback),
    proxy = new events.EventEmitter();

proxy.on('success',doneSomething);

proxy.emit('success','name','derick');
proxy.emit('success','name','nana');
proxy.emit('success','name','star');


/*
 * 多异步协作解决方案（层级依赖）
 * promise/Deferred
 * defer用于异步业务内部以维护状态和事件监听触发（时机选择），属于不可变部分
 * promise用于外部以添加事件监听，属于可变部分
 * */
var Promise = function(){
    EventEmitter.call(this);
};
util.inherits(Promise,EventEmitter);
Promise.prototype.then = function(fulfillHandler,errorHandler,progressHandler){
    if(typeof fulfillHandler == 'function'){
        this.once('success',fulfillHandler);
    }
    if(typeof errorHandler == 'function'){
        this.once('error',errorHandler);
    }
    if(typeof progressHandler == 'function'){
        this.once('progress',progressHandler);
    }
    return this;
};

var Deferred = function(){
    this.state = 'unfulfilled';
    this.promise = new Promise();
};

Deferred.prototype.resolve = function(data){
    this.state = 'fulfilled';
    this.promise.emit('success',data);
};

Deferred.prototype.reject = function(err){
    this.state = 'failed';
    this.promise.emit('error',err);
};

Deferred.prototype.progress = function(data){
    this.promise.emit('progress',data);
};

//For example:(针对httpclient 返回clientResponse封装)
var promiseClientRes = function(res){
    var deferred = new Deferred(),
        promise = deferred.promise,
        size = 0;
    res.on('data',function(chunk){
        chunks.push(chunk);
        size += chunk.length;
        deferred.progress();
    });
    res.on('end',function(){
        deferred.resolve(iconv.decode(Buffer.concat(chunks,size),'utf8'));
    });
    res.on('error',function(err){
        deferred.reject(err);
    });
    return promise;
};

promiseClientRes(res).then(function(){
    //suceess 回调
},function(){
    //error 回调
},function(){
    //progress 回调
});



/*
* Q模块是promise规范的一个实现
* npm install q
* 它对nodejs中常见回调的promise实现如下
* */
defer.prototype.makeNodeResolver = function(){
    var self = this;
    return function(error,value){
        if(error){
            self.reject(error);
        }
        else if(arguments.length > 2){
            self.resolve(Array.prototype.slice(arguments,1));
        }
        else{
            self.resolve(value);
        }
    };
};

//For example
var readFile = function(file,encoding){
    var deferred = Q.defer();
    fs.readFile(file,encoding,deferred.makeNodeResolver());
    return deferred.promise;
};
readFile('test.txt','utf8').then(function(data){},function(err){});

//针对多个异步又该如何处理呢(其实是模拟了EventProxy模块的all方法)
defer.prototype.all = function(promiseArr){
    var count = promiseArr.length,
        result = {};
    promiseArr.forEach(function(promise,i){
        promise.then(function(data){
            count--;
            result[i] = data;
            if(count == 0){
                this.resolve(result);
            }
        },function(err){
            this.reject(err);
        });
    });
    return this.promise;
};

//for example
var promise1 = readFile();
var promise2 = readFile();
var deferred = new defer();
deferred.all([promise1,promise2]).then(function(){},function(){});

//但对于多异步嵌套串联执行的又该如何处理，理想结构promise().then(api1).then(api2).then(function(data){},function(err){})
//也即是前一个调用的结果作为下一个调用的开始（链式调用）
var Deferred = function(){
    this.promise = new Promise();
};
Deferred.prototype.resolve = function(value){
    var promise = this.promise;
    while(handler = promise.queue.shift()){
        if(handler && handler.fulfilled){
            var ret = handler.fulfilled(value);
            if(ret & ret.isPromise){
                ret.queue = promise.queue;
                this.promise = ret;
                return;
            }
        }
    }
};

Ddferred.prototype.callback = function(){
    var that = this;
    return function(err,value){
        if(err){
            return that.reject(er);
        }
        that.resolve(value);
    }
};

var Promise = function(){
    this.queue = [];
    this.isPromise = true;
};
Promise.prototype.then = function(fulfillHandler,errorHandler,progressHandler){
    var handler = {};
    if(typeof fulfillHandler == 'function'){
        handler.fulfilled = fulfillHandler;
    }
    if(typeof errorHandler == 'function'){
        handler.error = errorHandler;
    }
    this.queue.push(handler);
    return this;
};

var readFile = function(filename,encoding){
    var deferred = new Deferred();
    fs.readFile(filename,encoding,deferred.callback());
    return deferred.promise;
};



