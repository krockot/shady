(this.webpackJsonpshady=this.webpackJsonpshady||[]).push([[32],{140:function(e,t,n){!function(e){"use strict";function t(e){for(var t={},n=e.split(" "),r=0;r<n.length;++r)t[n[r]]=!0;return t}e.defineMode("asn.1",(function(e,t){var n,r=e.indentUnit,i=t.keywords||{},s=t.cmipVerbs||{},a=t.compareTypes||{},E=t.status||{},o=t.tags||{},I=t.storage||{},T=t.modifier||{},u=t.accessTypes||{},S=t.multiLineStrings,l=!1!==t.indentStatements,c=/[\|\^]/;function A(e,t){var r=e.next();if('"'==r||"'"==r)return t.tokenize=p(r),t.tokenize(e,t);if(/[\[\]\(\){}:=,;]/.test(r))return n=r,"punctuation";if("-"==r&&e.eat("-"))return e.skipToEnd(),"comment";if(/\d/.test(r))return e.eatWhile(/[\w\.]/),"number";if(c.test(r))return e.eatWhile(c),"operator";e.eatWhile(/[\w\-]/);var S=e.current();return i.propertyIsEnumerable(S)?"keyword":s.propertyIsEnumerable(S)?"variable cmipVerbs":a.propertyIsEnumerable(S)?"atom compareTypes":E.propertyIsEnumerable(S)?"comment status":o.propertyIsEnumerable(S)?"variable-3 tags":I.propertyIsEnumerable(S)?"builtin storage":T.propertyIsEnumerable(S)?"string-2 modifier":u.propertyIsEnumerable(S)?"atom accessTypes":"variable"}function p(e){return function(t,n){for(var r,i=!1,s=!1;null!=(r=t.next());){if(r==e&&!i){var a=t.peek();a&&("b"!=(a=a.toLowerCase())&&"h"!=a&&"o"!=a||t.next()),s=!0;break}i=!i&&"\\"==r}return(s||!i&&!S)&&(n.tokenize=null),"string"}}function N(e,t,n,r,i){this.indented=e,this.column=t,this.type=n,this.align=r,this.prev=i}function O(e,t,n){var r=e.indented;return e.context&&"statement"==e.context.type&&(r=e.context.indented),e.context=new N(r,t,n,null,e.context)}function m(e){var t=e.context.type;return")"!=t&&"]"!=t&&"}"!=t||(e.indented=e.context.indented),e.context=e.context.prev}return{startState:function(e){return{tokenize:null,context:new N((e||0)-r,0,"top",!1),indented:0,startOfLine:!0}},token:function(e,t){var r=t.context;if(e.sol()&&(null==r.align&&(r.align=!1),t.indented=e.indentation(),t.startOfLine=!0),e.eatSpace())return null;n=null;var i=(t.tokenize||A)(e,t);if("comment"==i)return i;if(null==r.align&&(r.align=!0),";"!=n&&":"!=n&&","!=n||"statement"!=r.type)if("{"==n)O(t,e.column(),"}");else if("["==n)O(t,e.column(),"]");else if("("==n)O(t,e.column(),")");else if("}"==n){for(;"statement"==r.type;)r=m(t);for("}"==r.type&&(r=m(t));"statement"==r.type;)r=m(t)}else n==r.type?m(t):l&&(("}"==r.type||"top"==r.type)&&";"!=n||"statement"==r.type&&"newstatement"==n)&&O(t,e.column(),"statement");else m(t);return t.startOfLine=!1,i},electricChars:"{}",lineComment:"--",fold:"brace"}})),e.defineMIME("text/x-ttcn-asn",{name:"asn.1",keywords:t("DEFINITIONS OBJECTS IF DERIVED INFORMATION ACTION REPLY ANY NAMED CHARACTERIZED BEHAVIOUR REGISTERED WITH AS IDENTIFIED CONSTRAINED BY PRESENT BEGIN IMPORTS FROM UNITS SYNTAX MIN-ACCESS MAX-ACCESS MINACCESS MAXACCESS REVISION STATUS DESCRIPTION SEQUENCE SET COMPONENTS OF CHOICE DistinguishedName ENUMERATED SIZE MODULE END INDEX AUGMENTS EXTENSIBILITY IMPLIED EXPORTS"),cmipVerbs:t("ACTIONS ADD GET NOTIFICATIONS REPLACE REMOVE"),compareTypes:t("OPTIONAL DEFAULT MANAGED MODULE-TYPE MODULE_IDENTITY MODULE-COMPLIANCE OBJECT-TYPE OBJECT-IDENTITY OBJECT-COMPLIANCE MODE CONFIRMED CONDITIONAL SUBORDINATE SUPERIOR CLASS TRUE FALSE NULL TEXTUAL-CONVENTION"),status:t("current deprecated mandatory obsolete"),tags:t("APPLICATION AUTOMATIC EXPLICIT IMPLICIT PRIVATE TAGS UNIVERSAL"),storage:t("BOOLEAN INTEGER OBJECT IDENTIFIER BIT OCTET STRING UTCTime InterfaceIndex IANAifType CMIP-Attribute REAL PACKAGE PACKAGES IpAddress PhysAddress NetworkAddress BITS BMPString TimeStamp TimeTicks TruthValue RowStatus DisplayString GeneralString GraphicString IA5String NumericString PrintableString SnmpAdminString TeletexString UTF8String VideotexString VisibleString StringStore ISO646String T61String UniversalString Unsigned32 Integer32 Gauge Gauge32 Counter Counter32 Counter64"),modifier:t("ATTRIBUTE ATTRIBUTES MANDATORY-GROUP MANDATORY-GROUPS GROUP GROUPS ELEMENTS EQUALITY ORDERING SUBSTRINGS DEFINED"),accessTypes:t("not-accessible accessible-for-notify read-only read-create read-write"),multiLineStrings:!0})}(n(12))}}]);
//# sourceMappingURL=32.3e3415dd.chunk.js.map