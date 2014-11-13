/*
* @ 自定义promise/defer异步组件
* @ 满足多个异步并行和串行执行需求
* */
var Promise = function(){
    this.queue = [];
    this.isPromise = true;
};

Promise.prototype.then = function(successHandler,errorHandler,progressHandler){
    var handler = {};
    if(typeof successHandler == 'function'){
        handler.successHandler = successHandler;
    }
    if(typeof errorHandler == 'function'){
        handler.errorHandler = errorHandler;
    }
    if(typeof progressHandler == 'function'){
        handler.progressHandler = progressHandler;
    }
    this.queue.push(handler);
    return this;
};

var Deferred = function(){
    this.promise = new Promise();
};

Deferred.prototype.all = function(promiseArr){
    var count = promiseArr.length,
        that = this, result = [];
    promiseArr.forEach(function(promise,i){
        promise.then(function(data){
            count--;
            result[i] = data;
            if(count == 0){
                that.resolve(result);
            }
        },function(err){
            that.reject(err);
        });
    });
    return this.promise;
};

Deferred.prototype.resolve = function(data){
    var promise = this.promise, handler;
    while(handler = promise.queue.shift()){
        if(handler && handler.successHandler){
            var ret = handler.successHandler(data);
            //作用于嵌套异步
            if(ret && ret.isPromise){
                ret.queue = promise.queue;
                this.promise = ret;
                return;
            }
        }
    }
};

Deferred.prototype.reject = function(err){
    var promise = this.promise, handler;
    while(handler = promise.queue.shift()){
        if(handler && handler.errorHandler){
            var ret = handler.errorHandler(err);
            if(ret && ret.isPromise){
                ret.queue = promise.queue;
                this.promise = ret;
                return;
            }
        }
    }
};

Deferred.prototype.callback = function(){
    var that = this;
    return function(err,data){
        if(err){
            return that.reject(err);
        }
        else{
            that.resolve(data);
        }
    };
};

module.exports = Deferred;