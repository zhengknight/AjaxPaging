/*!
 * artTemplate - Template Engine
 * https://github.com/aui/artTemplate
 * Released under the MIT, BSD, and GPL Licenses
 * Email: 1987.tangbin@gmail.com
 */
 

/**
 * 模板引擎路由函数
 * 若第二个参数类型为 Object 则执行 render 方法, 否则 compile 方法
 * @name    template
 * @param   {String}            模板ID (可选)
 * @param   {Object, String}    数据或者模板字符串
 * @return  {String, Function}  渲染好的HTML字符串或者渲染方法
 */
var template = function (id, content) {
    return template[
        typeof content === 'object' ? 'render' : 'compile'
    ].apply(template, arguments);
};




(function (exports, global) {


"use strict";
exports.version = '1.1.0';
exports.openTag = '<%';
exports.closeTag = '%>';
exports.parser = null;



/**
 * 渲染模板
 * @name    template.render
 * @param   {String}    模板ID
 * @param   {Object}    数据
 * @return  {String}    渲染好的HTML字符串
 */
exports.render = function (id, data) {

    var cache = _getCache(id);
    
    if (cache === undefined) {

        return _debug({
            id: id,
            name: 'Render Error',
            message: 'Not Cache'
        });
        
    }
    
    return cache(data); 
};



/**
 * 编译模板
 * 2012-6-6:
 * define 方法名改为 compile,
 * 与 Node Express 保持一致,
 * 感谢 TooBug 提供帮助!
 * @name    template.compile
 * @param   {String}    模板ID (可选)
 * @param   {String}    模板字符串
 * @return  {Function}  渲染方法
 */
exports.compile = function (id, source) {
    
    var debug = arguments[2];
    
    
    if (typeof source !== 'string') {
        debug = source;
        source = id;
        id = null;
    }

    
    try {
        
        var Render = _compile(source, debug);
        
    } catch (e) {
    
        e.id = id || source;
        e.name = 'Syntax Error';
        return _debug(e);
        
    }
    
    
    function render (data) {
        
        try {
            
            return new Render(data).template;
            
        } catch (e) {
            
            if (!debug) {
                return exports.compile(id, source, true)(data);
            }
			
            e.id = id || source;
            e.name = 'Render Error';
            e.source = source;
            
            return _debug(e);
            
        };
        
    };
    
    render.prototype = Render.prototype;
    render.toString = function () {
        return Render.toString();
    };
    
    
    if (id) {
        _cache[id] = render;
    }

    
    return render;

};




/**
 * 扩展模板公用辅助方法
 * @name    template.helper
 * @param   {String}    名称
 * @param   {Function}  方法
 */
exports.helper = function (name, helper) {
    _helpers[name] = helper;
};




var _cache = {};
var _isNewEngine = ''.trim;
var _isServer = _isNewEngine && !global.document;
var _keyWordsMap = {};



var _forEach = function () {
    var forEach =  Array.prototype.forEach || function (block, thisObject) {
        var len = this.length >>> 0;
        
        for (var i = 0; i < len; i++) {
            if (i in this) {
                block.call(thisObject, this[i], i, this);
            }
        }
        
    };
    
    return function (array, callback) {
        forEach.call(array, callback);
    };
}();


var _create = Object.create || function (object) {
    function Fn () {};
    Fn.prototype = object;
    return new Fn;
};



var _helpers = exports.prototype = {
    $forEach: _forEach,
    $render: exports.render,
    $getValue: function (value) {
        return value === undefined ? '' : value;
    }
};



// javascript 关键字表
_forEach((

    // 关键字
    'break,case,catch,continue,debugger,default,delete,do,else,false,finally,for,function,if'
    + ',in,instanceof,new,null,return,switch,this,throw,true,try,typeof,var,void,while,with'
    
    // 保留字
    + ',abstract,boolean,byte,char,class,const,double,enum,export,extends,final,float,goto'
    + ',implements,import,int,interface,long,native,package,private,protected,public,short'
    + ',static,super,synchronized,throws,transient,volatile'
    
    // ECMA 5 - use strict
    + ',arguments,let,yield'
    
).split(','), function (key) {
    _keyWordsMap[key] = true;
});




// 模板编译器
var _compile = function (source, debug) {
    

    var openTag = exports.openTag;
    var closeTag = exports.closeTag;
    var parser = exports.parser;

    
    var code = source;
    var tempCode = '';
    var line = 1;
    var outKey = {};
    var uniq = {$out:true,$line:true};
    
    var variables = "var $helpers=this,"
    + (debug ? "$line=0," : "");
    
    var replaces = _isNewEngine
    ? ["$out='';", "$out+=", ";", "$out"]
    : ["$out=[];", "$out.push(", ");", "$out.join('')"];
    
    var include = "function(id,data){"
    +     "if(data===undefined){data=$data}"
    +     "return $helpers.$render(id,data)"
    + "}";
    
    
    
    // html与逻辑语法分离
    _forEach(code.split(openTag), function (code, i) {
        code = code.split(closeTag);
        
        var $0 = code[0];
        var $1 = code[1];
        
        // code: [html]
        if (code.length === 1) {
            
            tempCode += html($0);
         
        // code: [logic, html]
        } else {
            
            tempCode += logic($0);
            
            if ($1) {
                tempCode += html($1);
            }
        }
        

    });
    
    
    
    code = tempCode;
    
    
    // 调试语句
    if (debug) {
        code = 'try{' + code + '}catch(e){'
        +       'e.line=$line;'
        +       'throw e'
        + '}';
    }
    
    
    code = variables + replaces[0] + code + 'this.template=' + replaces[3];
    
    
    try {
        
        var render = new Function('$data', code);
        var proto = render.prototype = _create(_helpers);
        proto.toString = function () {
            return this.template;
        };
        
        return render;
        
    } catch (e) {
        e.temp = 'function anonymous($data) {' + code + '}';
        throw e;
    };
    
    
    
    // 处理 HTML 语句
    function html (code) {
        
        // 记录行号
        line += code.split(/\n/).length - 1;
        
        code = code
        // 单双引号与反斜杠转义
        .replace(/('|"|\\)/g, '\\$1')
        // 换行符转义(windows + linux)
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
        
        code = replaces[1] + "'" + code + "'" + replaces[2];
        
        return code + '\n';
    };
    
    
    // 处理逻辑语句
    function logic (code) {

        var thisLine = line;
       
        if (parser) {
        
             // 语法转换器
            code = parser(code);
            
        } else if (debug) {
        
            // 记录行号
            code = code.replace(/\n/g, function () {
                line ++;
                return '$line=' + line +  ';';
            });
            
        }
        
        
        // 输出语句
        if (code.indexOf('=') === 0) {
            
            // $getValue: undefined 转化为空字符串
            code = replaces[1]
            + (_isNewEngine ? '$getValue(' : '')
            + code.substring(1).replace(/[\s;]*$/, '')
            + (_isNewEngine ? ')' : '')
            + replaces[2];

        }
        
        if (debug) {
            code = '$line=' + thisLine + ';' + code;
        }
		
        getKey(code);
        
        return code + '\n';
    };
    
    
    // 提取模板中的变量名
    function getKey (code) {
        
        // 过滤注释、字符串、方法名
        code = code.replace(/\/\*.*?\*\/|'[^']*'|"[^"]*"|\.[\$\w]+/g, '');
		
        // 分词
        _forEach(code.split(/[^\$\w\d]+/), function (name) {
         
            // 沙箱强制语法规范：禁止通过套嵌函数的 this 关键字获取全局权限
            if (/^this$/.test(name)) {
                throw {
                    message: 'Prohibit the use of the "' + name + '"'
                };
            }
			
            // 过滤关键字与数字
            if (!name || _keyWordsMap.hasOwnProperty(name) || /^\d/.test(name)) {
                return;
            }
            
            // 除重
            if (!uniq.hasOwnProperty(name)) {
                setValue(name);
                uniq[name] = true;
            }
            
        });
        
    };
    
    
    // 声明模板变量
    // 赋值优先级: 内置特权方法(include) > 公用模板辅助方法 > 数据
    function setValue (name) {  
        var value;

        if (name === 'include') {
        
            value = include;
            
        } else if (_helpers.hasOwnProperty(name)) {
            
            value = '$helpers.' + name;
            
        } else {
        
            value = '$data.' + name;
			
        }
        
        variables += name + '=' + value + ',';
    };
    
	
};



// 获取模板缓存
var _getCache = function (id) {

    var cache = _cache[id];
    
    if (cache === undefined && !_isServer) {
        var elem = document.getElementById(id);
        
        if (elem) {
            exports.compile(id, elem.value || elem.innerHTML);
        }
        
        return _cache[id];
        
    } else if (_cache.hasOwnProperty(id)) {
    
        return cache;
    }
};



// 模板调试器
var _debug = function (e) {

    var content = '[template]:\n'
        + e.id
        + '\n\n[name]:\n'
        + e.name;
    
    if (e.message) {
        content += '\n\n[message]:\n'
        + e.message;
    }
    
    if (e.line) {
        content += '\n\n[line]:\n'
        + e.line;
        content += '\n\n[source]:\n'
        + e.source.split(/\n/)[e.line - 1].replace(/^[\s\t]+/, '');
    }
    
    if (e.temp) {
        content += '\n\n[temp]:\n'
        + e.temp;
    }
    
    if (global.console) {
        console.error(content);
    }
    
    function error () {
        return error + '';
    };
    
    error.toString = function () {
        return '{Template Error}';
    };
    
    return error;
};



})(template, this);


if (typeof module !== 'undefined' && module.exports) {
    module.exports = template;    
}


(function (a) { var r = a.fn.domManip, d = "_tmplitem", q = /^[^<]*(<[\w\W]+>)[^>]*$|\{\{\! /, b = {}, f = {}, e, p = { key: 0, data: {} }, h = 0, c = 0, l = []; function g(e, d, g, i) { var c = { data: i || (d ? d.data : {}), _wrap: d ? d._wrap : null, tmpl: null, parent: d || null, nodes: [], calls: u, nest: w, wrap: x, html: v, update: t }; e && a.extend(c, e, { nodes: [], parent: d }); if (g) { c.tmpl = g; c._ctnt = c._ctnt || c.tmpl(a, c); c.key = ++h; (l.length ? f : b)[h] = c } return c } a.each({ appendTo: "append", prependTo: "prepend", insertBefore: "before", insertAfter: "after", replaceAll: "replaceWith" }, function (f, d) { a.fn[f] = function (n) { var g = [], i = a(n), k, h, m, l, j = this.length === 1 && this[0].parentNode; e = b || {}; if (j && j.nodeType === 11 && j.childNodes.length === 1 && i.length === 1) { i[d](this[0]); g = this } else { for (h = 0, m = i.length; h < m; h++) { c = h; k = (h > 0 ? this.clone(true) : this).get(); a.fn[d].apply(a(i[h]), k); g = g.concat(k) } c = 0; g = this.pushStack(g, f, i.selector) } l = e; e = null; a.tmpl.complete(l); return g } }); a.fn.extend({ tmpl: function (d, c, b) { return a.tmpl(this[0], d, c, b) }, tmplItem: function () { return a.tmplItem(this[0]) }, template: function (b) { return a.template(b, this[0]) }, domManip: function (d, l, j) { if (d[0] && d[0].nodeType) { var f = a.makeArray(arguments), g = d.length, i = 0, h; while (i < g && !(h = a.data(d[i++], "tmplItem"))); if (g > 1) f[0] = [a.makeArray(d)]; if (h && c) f[2] = function (b) { a.tmpl.afterManip(this, b, j) }; r.apply(this, f) } else r.apply(this, arguments); c = 0; !e && a.tmpl.complete(b); return this } }); a.extend({ tmpl: function (d, h, e, c) { var j, k = !c; if (k) { c = p; d = a.template[d] || a.template(null, d); f = {} } else if (!d) { d = c.tmpl; b[c.key] = c; c.nodes = []; c.wrapped && n(c, c.wrapped); return a(i(c, null, c.tmpl(a, c))) } if (!d) return []; if (typeof h === "function") h = h.call(c || {}); e && e.wrapped && n(e, e.wrapped); j = a.isArray(h) ? a.map(h, function (a) { return a ? g(e, c, d, a) : null }) : [g(e, c, d, h)]; return k ? a(i(c, null, j)) : j }, tmplItem: function (b) { var c; if (b instanceof a) b = b[0]; while (b && b.nodeType === 1 && !(c = a.data(b, "tmplItem")) && (b = b.parentNode)); return c || p }, template: function (c, b) { if (b) { if (typeof b === "string") b = o(b); else if (b instanceof a) b = b[0] || {}; if (b.nodeType) b = a.data(b, "tmpl") || a.data(b, "tmpl", o(b.innerHTML)); return typeof c === "string" ? (a.template[c] = b) : b } return c ? typeof c !== "string" ? a.template(null, c) : a.template[c] || a.template(null, q.test(c) ? c : a(c)) : null }, encode: function (a) { return ("" + a).split("<").join("&lt;").split(">").join("&gt;").split('"').join("&#34;").split("'").join("&#39;") } }); a.extend(a.tmpl, { tag: { tmpl: { _default: { $2: "null" }, open: "if($notnull_1){_=_.concat($item.nest($1,$2));}" }, wrap: { _default: { $2: "null" }, open: "$item.calls(_,$1,$2);_=[];", close: "call=$item.calls();_=call._.concat($item.wrap(call,_));" }, each: { _default: { $2: "$index, $value" }, open: "if($notnull_1){$.each($1a,function($2){with(this){", close: "}});}" }, "if": { open: "if(($notnull_1) && $1a){", close: "}" }, "else": { _default: { $1: "true" }, open: "}else if(($notnull_1) && $1a){" }, html: { open: "if($notnull_1){_.push($1a);}" }, "=": { _default: { $1: "$data" }, open: "if($notnull_1){_.push($.encode($1a));}" }, "!": { open: ""} }, complete: function () { b = {} }, afterManip: function (f, b, d) { var e = b.nodeType === 11 ? a.makeArray(b.childNodes) : b.nodeType === 1 ? [b] : []; d.call(f, b); m(e); c++ } }); function i(e, g, f) { var b, c = f ? a.map(f, function (a) { return typeof a === "string" ? e.key ? a.replace(/(<\w+)(?=[\s>])(?![^>]*_tmplitem)([^>]*)/g, "$1 " + d + '="' + e.key + '" $2') : a : i(a, e, a._ctnt) }) : e; if (g) return c; c = c.join(""); c.replace(/^\s*([^<\s][^<]*)?(<[\w\W]+>)([^>]*[^>\s])?\s*$/, function (f, c, e, d) { b = a(e).get(); m(b); if (c) b = j(c).concat(b); if (d) b = b.concat(j(d)) }); return b ? b : j(c) } function j(c) { var b = document.createElement("div"); b.innerHTML = c; return a.makeArray(b.childNodes) } function o(b) { return new Function("jQuery", "$item", "var $=jQuery,call,_=[],$data=$item.data;with($data){_.push('" + a.trim(b).replace(/([\\'])/g, "\\$1").replace(/[\r\t\n]/g, " ").replace(/\$\{([^\}]*)\}/g, "{{= $1}}").replace(/\{\{(\/?)(\w+|.)(?:\(((?:[^\}]|\}(?!\}))*?)?\))?(?:\s+(.*?)?)?(\(((?:[^\}]|\}(?!\}))*?)\))?\s*\}\}/g, function (m, l, j, d, b, c, e) { var i = a.tmpl.tag[j], h, f, g; if (!i) throw "Template command not found: " + j; h = i._default || []; if (c && !/\w$/.test(b)) { b += c; c = "" } if (b) { b = k(b); e = e ? "," + k(e) + ")" : c ? ")" : ""; f = c ? b.indexOf(".") > -1 ? b + c : "(" + b + ").call($item" + e : b; g = c ? f : "(typeof(" + b + ")==='function'?(" + b + ").call($item):(" + b + "))" } else g = f = h.$1 || "null"; d = k(d); return "');" + i[l ? "close" : "open"].split("$notnull_1").join(b ? "typeof(" + b + ")!=='undefined' && (" + b + ")!=null" : "true").split("$1a").join(g).split("$1").join(f).split("$2").join(d ? d.replace(/\s*([^\(]+)\s*(\((.*?)\))?/g, function (d, c, b, a) { a = a ? "," + a + ")" : b ? ")" : ""; return a ? "(" + c + ").call($item" + a : d }) : h.$2 || "") + "_.push('" }) + "');}return _;") } function n(c, b) { c._wrap = i(c, true, a.isArray(b) ? b : [q.test(b) ? b : a(b).html()]).join("") } function k(a) { return a ? a.replace(/\\'/g, "'").replace(/\\\\/g, "\\") : null } function s(b) { var a = document.createElement("div"); a.appendChild(b.cloneNode(true)); return a.innerHTML } function m(o) { var n = "_" + c, k, j, l = {}, e, p, i; for (e = 0, p = o.length; e < p; e++) { if ((k = o[e]).nodeType !== 1) continue; j = k.getElementsByTagName("*"); for (i = j.length - 1; i >= 0; i--) m(j[i]); m(k) } function m(j) { var p, i = j, k, e, m; if (m = j.getAttribute(d)) { while (i.parentNode && (i = i.parentNode).nodeType === 1 && !(p = i.getAttribute(d))); if (p !== m) { i = i.parentNode ? i.nodeType === 11 ? 0 : i.getAttribute(d) || 0 : 0; if (!(e = b[m])) { e = f[m]; e = g(e, b[i] || f[i], null, true); e.key = ++h; b[h] = e } c && o(m) } j.removeAttribute(d) } else if (c && (e = a.data(j, "tmplItem"))) { o(e.key); b[e.key] = e; i = a.data(j.parentNode, "tmplItem"); i = i ? i.key : 0 } if (e) { k = e; while (k && k.key != i) { k.nodes.push(j); k = k.parent } delete e._ctnt; delete e._wrap; a.data(j, "tmplItem", e) } function o(a) { a = a + n; e = l[a] = l[a] || g(e, b[e.parent.key + n] || e.parent, null, true) } } } function u(a, d, c, b) { if (!a) return l.pop(); l.push({ _: a, tmpl: d, item: this, data: c, options: b }) } function w(d, c, b) { return a.tmpl(a.template(d), c, b, this) } function x(b, d) { var c = b.options || {}; c.wrapped = d; return a.tmpl(a.template(b.tmpl), b.data, c, b.item) } function v(d, c) { var b = this._wrap; return a.map(a(a.isArray(b) ? b.join("") : b).filter(d || "*"), function (a) { return c ? a.innerText || a.textContent : a.outerHTML || s(a) }) } function t() { var b = this.nodes; a.tmpl(null, null, null, this).insertBefore(b[0]); a(b).remove() } })(jQuery)