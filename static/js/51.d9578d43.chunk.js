(this.webpackJsonpshady=this.webpackJsonpshady||[]).push([[51],{160:function(e,t,n){!function(e){"use strict";e.defineMIME("text/x-erlang","erlang"),e.defineMode("erlang",(function(t){var n=["-type","-spec","-export_type","-opaque"],r=["after","begin","catch","case","cond","end","fun","if","let","of","query","receive","try","when"],i=/[\->,;]/,o=["->",";",","],a=["and","andalso","band","bnot","bor","bsl","bsr","bxor","div","not","or","orelse","rem","xor"],c=/[\+\-\*\/<>=\|:!]/,u=["=","+","-","*","/",">",">=","<","=<","=:=","==","=/=","/=","||","<-","!"],s=/[<\(\[\{]/,l=["<<","(","[","{"],_=/[>\)\]\}]/,f=["}","]",")",">>"],p=["is_atom","is_binary","is_bitstring","is_boolean","is_float","is_function","is_integer","is_list","is_number","is_pid","is_port","is_record","is_reference","is_tuple","atom","binary","bitstring","boolean","function","integer","list","number","pid","port","record","reference","tuple"],m=["abs","adler32","adler32_combine","alive","apply","atom_to_binary","atom_to_list","binary_to_atom","binary_to_existing_atom","binary_to_list","binary_to_term","bit_size","bitstring_to_list","byte_size","check_process_code","contact_binary","crc32","crc32_combine","date","decode_packet","delete_module","disconnect_node","element","erase","exit","float","float_to_list","garbage_collect","get","get_keys","group_leader","halt","hd","integer_to_list","internal_bif","iolist_size","iolist_to_binary","is_alive","is_atom","is_binary","is_bitstring","is_boolean","is_float","is_function","is_integer","is_list","is_number","is_pid","is_port","is_process_alive","is_record","is_reference","is_tuple","length","link","list_to_atom","list_to_binary","list_to_bitstring","list_to_existing_atom","list_to_float","list_to_integer","list_to_pid","list_to_tuple","load_module","make_ref","module_loaded","monitor_node","node","node_link","node_unlink","nodes","notalive","now","open_port","pid_to_list","port_close","port_command","port_connect","port_control","pre_loaded","process_flag","process_info","processes","purge_module","put","register","registered","round","self","setelement","size","spawn","spawn_link","spawn_monitor","spawn_opt","split_binary","statistics","term_to_binary","time","throw","tl","trunc","tuple_size","tuple_to_list","unlink","unregister","whereis"],d=/[\w@\xd8-\xde\xc0-\xd6\xdf-\xf6\xf8-\xff]/,b=/[0-7]{1,3}|[bdefnrstv\\"']|\^[a-zA-Z]|x[0-9a-zA-Z]{2}|x{[0-9a-zA-Z]+}/;function k(e,t){if(t.in_string)return t.in_string=!y(e),z(t,e,"string");if(t.in_atom)return t.in_atom=!v(e),z(t,e,"atom");if(e.eatSpace())return z(t,e,"whitespace");if(!A(t)&&e.match(/-\s*[a-z\xdf-\xf6\xf8-\xff][\w\xd8-\xde\xc0-\xd6\xdf-\xf6\xf8-\xff]*/))return S(e.current(),n)?z(t,e,"type"):z(t,e,"attribute");var k=e.next();if("%"==k)return e.skipToEnd(),z(t,e,"comment");if(":"==k)return z(t,e,"colon");if("?"==k)return e.eatSpace(),e.eatWhile(d),z(t,e,"macro");if("#"==k)return e.eatSpace(),e.eatWhile(d),z(t,e,"record");if("$"==k)return"\\"!=e.next()||e.match(b)?z(t,e,"number"):z(t,e,"error");if("."==k)return z(t,e,"dot");if("'"==k){if(!(t.in_atom=!v(e))){if(e.match(/\s*\/\s*[0-9]/,!1))return e.match(/\s*\/\s*[0-9]/,!0),z(t,e,"fun");if(e.match(/\s*\(/,!1)||e.match(/\s*:/,!1))return z(t,e,"function")}return z(t,e,"atom")}if('"'==k)return t.in_string=!y(e),z(t,e,"string");if(/[A-Z_\xd8-\xde\xc0-\xd6]/.test(k))return e.eatWhile(d),z(t,e,"variable");if(/[a-z_\xdf-\xf6\xf8-\xff]/.test(k)){if(e.eatWhile(d),e.match(/\s*\/\s*[0-9]/,!1))return e.match(/\s*\/\s*[0-9]/,!0),z(t,e,"fun");var w=e.current();return S(w,r)?z(t,e,"keyword"):S(w,a)?z(t,e,"operator"):e.match(/\s*\(/,!1)?!S(w,m)||":"==A(t).token&&"erlang"!=A(t,2).token?S(w,p)?z(t,e,"guard"):z(t,e,"function"):z(t,e,"builtin"):":"==x(e)?z(t,e,"erlang"==w?"builtin":"function"):S(w,["true","false"])?z(t,e,"boolean"):z(t,e,"atom")}var W=/[0-9]/,U=/[0-9a-zA-Z]/;return W.test(k)?(e.eatWhile(W),e.eat("#")?e.eatWhile(U)||e.backUp(1):e.eat(".")&&(e.eatWhile(W)?e.eat(/[eE]/)&&(e.eat(/[-+]/)?e.eatWhile(W)||e.backUp(2):e.eatWhile(W)||e.backUp(1)):e.backUp(1)),z(t,e,"number")):g(e,s,l)?z(t,e,"open_paren"):g(e,_,f)?z(t,e,"close_paren"):h(e,i,o)?z(t,e,"separator"):h(e,c,u)?z(t,e,"operator"):z(t,e,null)}function g(e,t,n){if(1==e.current().length&&t.test(e.current())){for(e.backUp(1);t.test(e.peek());)if(e.next(),S(e.current(),n))return!0;e.backUp(e.current().length-1)}return!1}function h(e,t,n){if(1==e.current().length&&t.test(e.current())){for(;t.test(e.peek());)e.next();for(;0<e.current().length;){if(S(e.current(),n))return!0;e.backUp(1)}e.next()}return!1}function y(e){return w(e,'"',"\\")}function v(e){return w(e,"'","\\")}function w(e,t,n){for(;!e.eol();){var r=e.next();if(r==t)return!0;r==n&&e.next()}return!1}function x(e){var t=e.match(/^\s*([^\s%])/,!1);return t?t[1]:""}function S(e,t){return-1<t.indexOf(e)}function z(e,t,n){switch(Z(e,U(n,t)),n){case"atom":return"atom";case"attribute":return"attribute";case"boolean":return"atom";case"builtin":return"builtin";case"close_paren":case"colon":return null;case"comment":return"comment";case"dot":return null;case"error":return"error";case"fun":return"meta";case"function":return"tag";case"guard":return"property";case"keyword":return"keyword";case"macro":return"variable-2";case"number":return"number";case"open_paren":return null;case"operator":return"operator";case"record":return"bracket";case"separator":return null;case"string":return"string";case"type":return"def";case"variable":return"variable";default:return null}}function W(e,t,n,r){return{token:e,column:t,indent:n,type:r}}function U(e,t){return W(t.current(),t.column(),t.indentation(),e)}function E(e){return W(e,0,0,e)}function A(e,t){var n=e.tokenStack.length,r=t||1;return!(n<r)&&e.tokenStack[n-r]}function Z(e,t){"comment"!=t.type&&"whitespace"!=t.type&&(e.tokenStack=M(e.tokenStack,t),e.tokenStack=P(e.tokenStack))}function M(e,t){var n=e.length-1;return 0<n&&"record"===e[n].type&&"dot"===t.type?e.pop():0<n&&"group"===e[n].type?(e.pop(),e.push(t)):e.push(t),e}function P(e){if(!e.length)return e;var t=e.length-1;if("dot"===e[t].type)return[];if(t>1&&"fun"===e[t].type&&"fun"===e[t-1].token)return e.slice(0,t-1);switch(e[t].token){case"}":return q(e,{g:["{"]});case"]":return q(e,{i:["["]});case")":return q(e,{i:["("]});case">>":return q(e,{i:["<<"]});case"end":return q(e,{i:["begin","case","fun","if","receive","try"]});case",":return q(e,{e:["begin","try","when","->",",","(","[","{","<<"]});case"->":return q(e,{r:["when"],m:["try","if","case","receive"]});case";":return q(e,{E:["case","fun","if","receive","try","when"]});case"catch":return q(e,{e:["try"]});case"of":return q(e,{e:["case"]});case"after":return q(e,{e:["receive","try"]});default:return e}}function q(e,t){for(var n in t)for(var r=e.length-1,i=t[n],o=r-1;-1<o;o--)if(S(e[o].token,i)){var a=e.slice(0,o);switch(n){case"m":return a.concat(e[o]).concat(e[r]);case"r":return a.concat(e[r]);case"i":return a;case"g":return a.concat(E("group"));case"E":case"e":return a.concat(e[o])}}return"E"==n?[]:e}function J(n,r){var i,o=t.indentUnit,a=C(r),c=A(n,1),u=A(n,2);return n.in_string||n.in_atom?e.Pass:u?"when"==c.token?c.column+o:"when"===a&&"function"===u.type?u.indent+o:"("===a&&"fun"===c.token?c.column+3:"catch"===a&&(i=T(n,["try"]))?i.column:S(a,["end","after","of"])?(i=T(n,["begin","case","fun","if","receive","try"]))?i.column:e.Pass:S(a,f)?(i=T(n,l))?i.column:e.Pass:S(c.token,[",","|","||"])||S(a,[",","|","||"])?(i=I(n))?i.column+i.token.length:o:"->"==c.token?S(u.token,["receive","case","if","try"])?u.column+o+o:u.column+o:S(c.token,l)?c.column+c.token.length:j(i=O(n))?i.column+o:0:0}function C(e){var t=e.match(/,|[a-z]+|\}|\]|\)|>>|\|+|\(/);return j(t)&&0===t.index?t[0]:""}function I(e){var t=e.tokenStack.slice(0,-1),n=$(t,"type",["open_paren"]);return!!j(t[n])&&t[n]}function O(e){var t=e.tokenStack,n=$(t,"type",["open_paren","separator","keyword"]),r=$(t,"type",["operator"]);return j(n)&&j(r)&&n<r?t[n+1]:!!j(n)&&t[n]}function T(e,t){var n=e.tokenStack,r=$(n,"token",t);return!!j(n[r])&&n[r]}function $(e,t,n){for(var r=e.length-1;-1<r;r--)if(S(e[r][t],n))return r;return!1}function j(e){return!1!==e&&null!=e}return{startState:function(){return{tokenStack:[],in_string:!1,in_atom:!1}},token:function(e,t){return k(e,t)},indent:function(e,t){return J(e,t)},lineComment:"%"}}))}(n(12))}}]);
//# sourceMappingURL=51.d9578d43.chunk.js.map