try {
  this["Module"] = Module;
} catch (e) {
  this["Module"] = Module = {};
}
var ENVIRONMENT_IS_NODE = typeof process === "object";
var ENVIRONMENT_IS_WEB = typeof window === "object";
var ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if (ENVIRONMENT_IS_NODE) {
  Module["print"] = (function(x) {
    process["stdout"].write(x + "\n");
  });
  Module["printErr"] = (function(x) {
    process["stderr"].write(x + "\n");
  });
  var nodeFS = require("fs");
  var nodePath = require("path");
  Module["read"] = (function(filename) {
    filename = nodePath["normalize"](filename);
    var ret = nodeFS["readFileSync"](filename).toString();
    if (!ret && filename != nodePath["resolve"](filename)) {
      filename = path.join(__dirname, "..", "src", filename);
      ret = nodeFS["readFileSync"](filename).toString();
    }
    return ret;
  });
  Module["load"] = (function(f) {
    globalEval(read(f));
  });
  if (!Module["arguments"]) {
    Module["arguments"] = process["argv"].slice(2);
  }
}
if (ENVIRONMENT_IS_SHELL) {
  Module["print"] = print;
  if (typeof printErr != "undefined") Module["printErr"] = printErr;
  if (typeof read != "undefined") {
    Module["read"] = read;
  } else {
    Module["read"] = (function(f) {
      snarf(f);
    });
  }
  if (!Module["arguments"]) {
    if (typeof scriptArgs != "undefined") {
      Module["arguments"] = scriptArgs;
    } else if (typeof arguments != "undefined") {
      Module["arguments"] = arguments;
    }
  }
}
if (ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER) {
  if (!Module["print"]) {
    Module["print"] = (function(x) {
      console.log(x);
    });
  }
  if (!Module["printErr"]) {
    Module["printErr"] = (function(x) {
      console.log(x);
    });
  }
}
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module["read"] = (function(url) {
    var xhr = new XMLHttpRequest;
    xhr.open("GET", url, false);
    xhr.send(null);
    return xhr.responseText;
  });
  if (!Module["arguments"]) {
    if (typeof arguments != "undefined") {
      Module["arguments"] = arguments;
    }
  }
}
if (ENVIRONMENT_IS_WORKER) {
  var TRY_USE_DUMP = false;
  if (!Module["print"]) {
    Module["print"] = TRY_USE_DUMP && typeof dump !== "undefined" ? (function(x) {
      dump(x);
    }) : (function(x) {});
  }
  Module["load"] = importScripts;
}
if (!ENVIRONMENT_IS_WORKER && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_SHELL) {
  throw "Unknown runtime environment. Where are we?";
}
function globalEval(x) {
  eval.call(null, x);
}
if (!Module["load"] == "undefined" && Module["read"]) {
  Module["load"] = (function(f) {
    globalEval(Module["read"](f));
  });
}
if (!Module["print"]) {
  Module["print"] = (function() {});
}
if (!Module["printErr"]) {
  Module["printErr"] = Module["print"];
}
if (!Module["arguments"]) {
  Module["arguments"] = [];
}
Module.print = Module["print"];
Module.printErr = Module["printErr"];
if (!Module["preRun"]) Module["preRun"] = [];
if (!Module["postRun"]) Module["postRun"] = [];
var Runtime = {
  stackSave: (function() {
    return STACKTOP;
  }),
  stackRestore: (function(stackTop) {
    STACKTOP = stackTop;
  }),
  forceAlign: (function(target, quantum) {
    quantum = quantum || 4;
    if (quantum == 1) return target;
    if (isNumber(target) && isNumber(quantum)) {
      return Math.ceil(target / quantum) * quantum;
    } else if (isNumber(quantum) && isPowerOfTwo(quantum)) {
      var logg = log2(quantum);
      return "((((" + target + ")+" + (quantum - 1) + ")>>" + logg + ")<<" + logg + ")";
    }
    return "Math.ceil((" + target + ")/" + quantum + ")*" + quantum;
  }),
  isNumberType: (function(type) {
    return type in Runtime.INT_TYPES || type in Runtime.FLOAT_TYPES;
  }),
  isPointerType: function isPointerType(type) {
    return type[type.length - 1] == "*";
  },
  isStructType: function isStructType(type) {
    if (isPointerType(type)) return false;
    if (/^\[\d+\ x\ (.*)\]/.test(type)) return true;
    if (/<?{ ?[^}]* ?}>?/.test(type)) return true;
    return type[0] == "%";
  },
  INT_TYPES: {
    "i1": 0,
    "i8": 0,
    "i16": 0,
    "i32": 0,
    "i64": 0
  },
  FLOAT_TYPES: {
    "float": 0,
    "double": 0
  },
  bitshift64: (function(low, high, op, bits) {
    var ander = Math.pow(2, bits) - 1;
    if (bits < 32) {
      switch (op) {
       case "shl":
        return [ low << bits, high << bits | (low & ander << 32 - bits) >>> 32 - bits ];
       case "ashr":
        return [ (low >>> bits | (high & ander) << 32 - bits) >> 0 >>> 0, high >> bits >>> 0 ];
       case "lshr":
        return [ (low >>> bits | (high & ander) << 32 - bits) >>> 0, high >>> bits ];
      }
    } else if (bits == 32) {
      switch (op) {
       case "shl":
        return [ 0, low ];
       case "ashr":
        return [ high, (high | 0) < 0 ? ander : 0 ];
       case "lshr":
        return [ high, 0 ];
      }
    } else {
      switch (op) {
       case "shl":
        return [ 0, low << bits - 32 ];
       case "ashr":
        return [ high >> bits - 32 >>> 0, (high | 0) < 0 ? ander : 0 ];
       case "lshr":
        return [ high >>> bits - 32, 0 ];
      }
    }
    abort("unknown bitshift64 op: " + [ value, op, bits ]);
  }),
  or64: (function(x, y) {
    var l = x | 0 | (y | 0);
    var h = (Math.round(x / 4294967296) | Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  }),
  and64: (function(x, y) {
    var l = (x | 0) & (y | 0);
    var h = (Math.round(x / 4294967296) & Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  }),
  xor64: (function(x, y) {
    var l = (x | 0) ^ (y | 0);
    var h = (Math.round(x / 4294967296) ^ Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  }),
  getNativeTypeSize: (function(type, quantumSize) {
    if (Runtime.QUANTUM_SIZE == 1) return 1;
    var size = {
      "%i1": 1,
      "%i8": 1,
      "%i16": 2,
      "%i32": 4,
      "%i64": 8,
      "%float": 4,
      "%double": 8
    }["%" + type];
    if (!size) {
      if (type.charAt(type.length - 1) == "*") {
        size = Runtime.QUANTUM_SIZE;
      } else if (type[0] == "i") {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 == 0);
        size = bits / 8;
      }
    }
    return size;
  }),
  getNativeFieldSize: (function(type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  }),
  dedup: function dedup(items, ident) {
    var seen = {};
    if (ident) {
      return items.filter((function(item) {
        if (seen[item[ident]]) return false;
        seen[item[ident]] = true;
        return true;
      }));
    } else {
      return items.filter((function(item) {
        if (seen[item]) return false;
        seen[item] = true;
        return true;
      }));
    }
  },
  set: function set() {
    var args = typeof arguments[0] === "object" ? arguments[0] : arguments;
    var ret = {};
    for (var i = 0; i < args.length; i++) {
      ret[args[i]] = 0;
    }
    return ret;
  },
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    type.flatIndexes = type.fields.map((function(field) {
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field);
        alignSize = size;
      } else if (Runtime.isStructType(field)) {
        size = Types.types[field].flatSize;
        alignSize = Types.types[field].alignSize;
      } else {
        throw "Unclear type in struct: " + field + ", in " + type.name_ + " :: " + dump(Types.types[type.name_]);
      }
      alignSize = type.packed ? 1 : Math.min(alignSize, Runtime.QUANTUM_SIZE);
      type.alignSize = Math.max(type.alignSize, alignSize);
      var curr = Runtime.alignMemory(type.flatSize, alignSize);
      type.flatSize = curr + size;
      if (prev >= 0) {
        diffs.push(curr - prev);
      }
      prev = curr;
      return curr;
    }));
    type.flatSize = Runtime.alignMemory(type.flatSize, type.alignSize);
    if (diffs.length == 0) {
      type.flatFactor = type.flatSize;
    } else if (Runtime.dedup(diffs).length == 1) {
      type.flatFactor = diffs[0];
    }
    type.needsFlattening = type.flatFactor != 1;
    return type.flatIndexes;
  },
  generateStructInfo: (function(struct, typeName, offset) {
    var type, alignment;
    if (typeName) {
      offset = offset || 0;
      type = (typeof Types === "undefined" ? Runtime.typeInfo : Types.types)[typeName];
      if (!type) return null;
      if (type.fields.length != struct.length) {
        printErr("Number of named fields must match the type for " + typeName + ": possibly duplicate struct names. Cannot return structInfo");
        return null;
      }
      alignment = type.flatIndexes;
    } else {
      var type = {
        fields: struct.map((function(item) {
          return item[0];
        }))
      };
      alignment = Runtime.calculateStructAlignment(type);
    }
    var ret = {
      __size__: type.flatSize
    };
    if (typeName) {
      struct.forEach((function(item, i) {
        if (typeof item === "string") {
          ret[item] = alignment[i] + offset;
        } else {
          var key;
          for (var k in item) key = k;
          ret[key] = Runtime.generateStructInfo(item[key], type.fields[i], alignment[i]);
        }
      }));
    } else {
      struct.forEach((function(item, i) {
        ret[item[1]] = alignment[i];
      }));
    }
    return ret;
  }),
  addFunction: (function(func) {
    var ret = FUNCTION_TABLE.length;
    FUNCTION_TABLE.push(func);
    FUNCTION_TABLE.push(0);
    return ret;
  }),
  warnOnce: (function(text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  }),
  funcWrappers: {},
  getFuncWrapper: (function(func) {
    if (!Runtime.funcWrappers[func]) {
      Runtime.funcWrappers[func] = (function() {
        FUNCTION_TABLE[func].apply(null, arguments);
      });
    }
    return Runtime.funcWrappers[func];
  }),
  UTF8Processor: (function() {
    var buffer = [];
    var needed = 0;
    this.processCChar = (function(code) {
      code = code & 255;
      if (needed) {
        buffer.push(code);
        needed--;
      }
      if (buffer.length == 0) {
        if (code < 128) return String.fromCharCode(code);
        buffer.push(code);
        if (code > 191 && code < 224) {
          needed = 1;
        } else {
          needed = 2;
        }
        return "";
      }
      if (needed > 0) return "";
      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var ret;
      if (c1 > 191 && c1 < 224) {
        ret = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
      } else {
        ret = String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
      }
      buffer.length = 0;
      return ret;
    });
    this.processJSString = (function(string) {
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    });
  }),
  stackAlloc: function stackAlloc(size) {
    var ret = STACKTOP;
    STACKTOP += size;
    STACKTOP = STACKTOP + 3 >> 2 << 2;
    return ret;
  },
  staticAlloc: function staticAlloc(size) {
    var ret = STATICTOP;
    STATICTOP += size;
    STATICTOP = STATICTOP + 3 >> 2 << 2;
    if (STATICTOP >= TOTAL_MEMORY) enlargeMemory();
    return ret;
  },
  alignMemory: function alignMemory(size, quantum) {
    var ret = size = Math.ceil(size / (quantum ? quantum : 4)) * (quantum ? quantum : 4);
    return ret;
  },
  makeBigInt: function makeBigInt(low, high, unsigned) {
    var ret = unsigned ? (low >>> 0) + (high >>> 0) * 4294967296 : (low >>> 0) + (high | 0) * 4294967296;
    return ret;
  },
  QUANTUM_SIZE: 4,
  __dummy__: 0
};
var CorrectionsMonitor = {
  MAX_ALLOWED: 0,
  corrections: 0,
  sigs: {},
  note: (function(type, succeed, sig) {
    if (!succeed) {
      this.corrections++;
      if (this.corrections >= this.MAX_ALLOWED) abort("\n\nToo many corrections!");
    }
  }),
  print: (function() {})
};
var __THREW__ = false;
var ABORT = false;
var undef = 0;
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD;
var tempI64, tempI64b;
function abort(text) {
  Module.print(text + ":\n" + (new Error).stack);
  ABORT = true;
  throw "Assertion: " + text;
}
function assert(condition, text) {
  if (!condition) {
    abort("Assertion failed: " + text);
  }
}
var globalScope = this;
function ccall(ident, returnType, argTypes, args) {
  var stack = 0;
  function toC(value, type) {
    if (type == "string") {
      if (value === null || value === undefined || value === 0) return 0;
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length + 1);
      writeStringToMemory(value, ret);
      return ret;
    } else if (type == "array") {
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length);
      writeArrayToMemory(value, ret);
      return ret;
    }
    return value;
  }
  function fromC(value, type) {
    if (type == "string") {
      return Pointer_stringify(value);
    }
    assert(type != "array");
    return value;
  }
  try {
    var func = eval("_" + ident);
  } catch (e) {
    try {
      func = globalScope["Module"]["_" + ident];
    } catch (e) {}
  }
  assert(func, "Cannot call unknown function " + ident + " (perhaps LLVM optimizations or closure removed it?)");
  var i = 0;
  var cArgs = args ? args.map((function(arg) {
    return toC(arg, argTypes[i++]);
  })) : [];
  var ret = fromC(func.apply(null, cArgs), returnType);
  if (stack) Runtime.stackRestore(stack);
  return ret;
}
Module["ccall"] = ccall;
function cwrap(ident, returnType, argTypes) {
  return (function() {
    return ccall(ident, returnType, argTypes, Array.prototype.slice.call(arguments));
  });
}
Module["cwrap"] = cwrap;
function setValue(ptr, value, type, noSafe) {
  type = type || "i8";
  if (type.charAt(type.length - 1) === "*") type = "i32";
  switch (type) {
   case "i1":
    HEAP8[ptr] = value;
    break;
   case "i8":
    HEAP8[ptr] = value;
    break;
   case "i16":
    HEAP16[ptr >> 1] = value;
    break;
   case "i32":
    HEAP32[ptr >> 2] = value;
    break;
   case "i64":
    HEAP32[ptr >> 2] = value;
    break;
   case "float":
    HEAPF32[ptr >> 2] = value;
    break;
   case "double":
    tempDoubleF64[0] = value, HEAP32[ptr >> 2] = tempDoubleI32[0], HEAP32[ptr + 4 >> 2] = tempDoubleI32[1];
    break;
   default:
    abort("invalid type for setValue: " + type);
  }
}
Module["setValue"] = setValue;
function getValue(ptr, type, noSafe) {
  type = type || "i8";
  if (type.charAt(type.length - 1) === "*") type = "i32";
  switch (type) {
   case "i1":
    return HEAP8[ptr];
   case "i8":
    return HEAP8[ptr];
   case "i16":
    return HEAP16[ptr >> 1];
   case "i32":
    return HEAP32[ptr >> 2];
   case "i64":
    return HEAP32[ptr >> 2];
   case "float":
    return HEAPF32[ptr >> 2];
   case "double":
    return tempDoubleI32[0] = HEAP32[ptr >> 2], tempDoubleI32[1] = HEAP32[ptr + 4 >> 2], tempDoubleF64[0];
   default:
    abort("invalid type for setValue: " + type);
  }
  return null;
}
Module["getValue"] = getValue;
var ALLOC_NORMAL = 0;
var ALLOC_STACK = 1;
var ALLOC_STATIC = 2;
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
function allocate(slab, types, allocator) {
  var zeroinit, size;
  if (typeof slab === "number") {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }
  var singleType = typeof types === "string" ? types : null;
  var ret = [ _malloc, Runtime.stackAlloc, Runtime.staticAlloc ][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  if (zeroinit) {
    _memset(ret, 0, size);
    return ret;
  }
  var i = 0, type;
  while (i < size) {
    var curr = slab[i];
    if (typeof curr === "function") {
      curr = Runtime.getFunctionIndex(curr);
    }
    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    if (type == "i64") type = "i32";
    setValue(ret + i, curr, type);
    i += Runtime.getNativeTypeSize(type);
  }
  return ret;
}
Module["allocate"] = allocate;
function Pointer_stringify(ptr, length) {
  var utf8 = new Runtime.UTF8Processor;
  var nullTerminated = typeof length == "undefined";
  var ret = "";
  var i = 0;
  var t;
  while (1) {
    t = HEAPU8[ptr + i];
    if (nullTerminated && t == 0) break;
    ret += utf8.processCChar(t);
    i += 1;
    if (!nullTerminated && i == length) break;
  }
  return ret;
}
Module["Pointer_stringify"] = Pointer_stringify;
function Array_stringify(array) {
  var ret = "";
  for (var i = 0; i < array.length; i++) {
    ret += String.fromCharCode(array[i]);
  }
  return ret;
}
Module["Array_stringify"] = Array_stringify;
var FUNCTION_TABLE;
var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return x + 4095 >> 12 << 12;
}
var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
var STACK_ROOT, STACKTOP, STACK_MAX;
var STATICTOP;
function enlargeMemory() {
  abort("Cannot enlarge memory arrays. Adjust TOTAL_MEMORY (currently " + TOTAL_MEMORY + ") or compile with ALLOW_MEMORY_GROWTH");
}
var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 10485760;
var FAST_MEMORY = Module["FAST_MEMORY"] || 2097152;
assert(!!Int32Array && !!Float64Array && !!(new Int32Array(1))["subarray"] && !!(new Int32Array(1))["set"], "Cannot fallback to non-typed array case: Code is too specialized");
var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, "Typed arrays 2 must be run on a little-endian system");
Module["HEAP"] = HEAP;
Module["HEAP8"] = HEAP8;
Module["HEAP16"] = HEAP16;
Module["HEAP32"] = HEAP32;
Module["HEAPU8"] = HEAPU8;
Module["HEAPU16"] = HEAPU16;
Module["HEAPU32"] = HEAPU32;
Module["HEAPF32"] = HEAPF32;
Module["HEAPF64"] = HEAPF64;
STACK_ROOT = STACKTOP = Runtime.alignMemory(1);
STACK_MAX = STACK_ROOT + TOTAL_STACK;
var tempDoublePtr = Runtime.alignMemory(STACK_MAX, 8);
var tempDoubleI8 = HEAP8.subarray(tempDoublePtr);
var tempDoubleI32 = HEAP32.subarray(tempDoublePtr >> 2);
var tempDoubleF32 = HEAPF32.subarray(tempDoublePtr >> 2);
var tempDoubleF64 = HEAPF64.subarray(tempDoublePtr >> 3);
function copyTempFloat(ptr) {
  tempDoubleI8[0] = HEAP8[ptr];
  tempDoubleI8[1] = HEAP8[ptr + 1];
  tempDoubleI8[2] = HEAP8[ptr + 2];
  tempDoubleI8[3] = HEAP8[ptr + 3];
}
function copyTempDouble(ptr) {
  tempDoubleI8[0] = HEAP8[ptr];
  tempDoubleI8[1] = HEAP8[ptr + 1];
  tempDoubleI8[2] = HEAP8[ptr + 2];
  tempDoubleI8[3] = HEAP8[ptr + 3];
  tempDoubleI8[4] = HEAP8[ptr + 4];
  tempDoubleI8[5] = HEAP8[ptr + 5];
  tempDoubleI8[6] = HEAP8[ptr + 6];
  tempDoubleI8[7] = HEAP8[ptr + 7];
}
STACK_MAX = tempDoublePtr + 8;
STATICTOP = alignMemoryPage(STACK_MAX);
assert(STATICTOP < TOTAL_MEMORY);
var nullString = allocate(intArrayFromString("(null)"), "i8", ALLOC_STATIC);
function callRuntimeCallbacks(callbacks) {
  while (callbacks.length > 0) {
    var callback = callbacks.shift();
    var func = callback.func;
    if (typeof func === "number") {
      func = FUNCTION_TABLE[func];
    }
    func(callback.arg === undefined ? null : callback.arg);
  }
}
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
function initRuntime() {
  callRuntimeCallbacks(__ATINIT__);
}
function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}
function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  CorrectionsMonitor.print();
}
function String_len(ptr) {
  var i = ptr;
  while (HEAP8[i++]) {}
  return i - ptr - 1;
}
Module["String_len"] = String_len;
function intArrayFromString(stringy, dontAddNull, length) {
  var ret = (new Runtime.UTF8Processor).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module["intArrayFromString"] = intArrayFromString;
function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 255) {
      chr &= 255;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join("");
}
Module["intArrayToString"] = intArrayToString;
function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[buffer + i] = chr;
    i = i + 1;
  }
}
Module["writeStringToMemory"] = writeStringToMemory;
function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[buffer + i] = array[i];
  }
}
Module["writeArrayToMemory"] = writeArrayToMemory;
var STRING_TABLE = [];
function unSign(value, bits, ignore, sig) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2 * Math.abs(1 << bits - 1) + value : Math.pow(2, bits) + value;
}
function reSign(value, bits, ignore, sig) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << bits - 1) : Math.pow(2, bits - 1);
  if (value >= half && (bits <= 32 || value > half)) {
    value = -2 * half + value;
  }
  return value;
}
var runDependencies = 0;
var runDependencyTracking = {};
var calledRun = false;
var runDependencyWatcher = null;
function addRunDependency(id) {
  runDependencies++;
  if (Module["monitorRunDependencies"]) {
    Module["monitorRunDependencies"](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== "undefined") {
      runDependencyWatcher = setInterval((function() {
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr("still waiting on run dependencies:");
          }
          Module.printErr("dependency: " + dep);
        }
        if (shown) {
          Module.printErr("(end of list)");
        }
      }), 6e3);
    }
  } else {
    Module.printErr("warning: run dependency added without ID");
  }
}
Module["addRunDependency"] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module["monitorRunDependencies"]) {
    Module["monitorRunDependencies"](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr("warning: run dependency removed without ID");
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (!calledRun) run();
  }
}
Module["removeRunDependency"] = removeRunDependency;
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
function _collides($x, $y, $r, $b, $x2, $y2, $r2, $b2) {
  return ($x | 0) <= ($r2 | 0) & ($r | 0) > ($x2 | 0) & ($b | 0) > ($y2 | 0) & ($y | 0) <= ($b2 | 0) & 1;
  return null;
}
function _updateSprite($sprite, $dt) {
  var $_index = $sprite + 28 | 0;
  HEAPF32[$_index >> 2] = HEAPF32[$_index >> 2] + HEAPF32[$sprite + 16 >> 2] * $dt;
  return;
  return;
}
function _cellsClear($cells) {
  var $_length = $cells + 16 | 0;
  var $cmp1 = (HEAP32[$_length >> 2] | 0) > 0;
  $_$35 : do {
    if ($cmp1) {
      var $cache = $cells + 20 | 0;
      var $i_02 = 0;
      while (1) {
        var $i_02;
        HEAP32[HEAP32[HEAP32[$cache >> 2] + ($i_02 << 2) >> 2] + 4 >> 2] = 0;
        HEAP32[HEAP32[HEAP32[$cache >> 2] + ($i_02 << 2) >> 2] + 8 >> 2] = 0;
        var $inc = $i_02 + 1 | 0;
        if (($inc | 0) >= (HEAP32[$_length >> 2] | 0)) {
          break $_$35;
        }
        var $i_02 = $inc;
      }
    }
  } while (0);
  return;
  return;
}
function _cellsAdd($cells, $entity, $x, $y) {
  var $cells$s2 = $cells >> 2;
  var $conv = HEAP32[$cells$s2] | 0;
  var $1 = HEAP32[$cells$s2 + 2];
  var $conv6 = HEAP32[$cells$s2 + 1] | 0;
  if ($x > 0 & $y > 0 & $conv > $x & $conv6 > $y) {
    var $5 = HEAP32[HEAP32[$cells$s2 + 5] + (($y / ($conv6 / (HEAP32[$cells$s2 + 3] | 0)) & -1) * $1 + ($x / ($conv / ($1 | 0)) & -1) << 2) >> 2];
    var $index = $5 + 4 | 0;
    var $6 = HEAP32[$index >> 2];
    if (($6 | 0) < 100) {
      HEAP32[$index >> 2] = $6 + 1 | 0;
      HEAP32[HEAP32[$5 >> 2] + ($6 << 2) >> 2] = $entity;
    } else {
      HEAP32[$5 + 8 >> 2] = 1;
    }
  }
  return;
  return;
}
function _cellsGet($cells, $x, $y) {
  var $cells$s2 = $cells >> 2;
  var $conv = HEAP32[$cells$s2] | 0;
  var $1 = HEAP32[$cells$s2 + 2];
  var $conv6 = HEAP32[$cells$s2 + 1] | 0;
  if ($x > 0 & $y > 0 & $conv > $x & $conv6 > $y) {
    var $retval_0 = HEAP32[HEAP32[$cells$s2 + 5] + (($y / ($conv6 / (HEAP32[$cells$s2 + 3] | 0)) & -1) * $1 + ($x / ($conv / ($1 | 0)) & -1) << 2) >> 2];
  } else {
    var $retval_0 = 0;
  }
  var $retval_0;
  return $retval_0;
  return null;
}
function _renderSpriteClipped($sprite, $x, $y, $clipX, $clipY) {
  var $call = _getImage(HEAP32[$sprite + 20 >> 2]);
  var $_index = $sprite + 28 | 0;
  var $1 = HEAPF32[$_index >> 2];
  if ($1 > (HEAP32[$sprite + 24 >> 2] | 0)) {
    HEAPF32[$_index >> 2] = 0;
    var $3 = 0;
  } else {
    var $3 = $1;
  }
  var $3;
  _cvsSave();
  _cvsTranslate($x | 0, $y | 0);
  var $x11 = $sprite + 8 | 0;
  var $5 = HEAP32[$x11 >> 2];
  var $add = $5 * ($3 & -1) + HEAP32[$sprite >> 2] | 0;
  var $6 = HEAP32[$sprite + 4 >> 2];
  var $conv15 = $clipX | 0;
  var $conv17 = _fminf($5 | 0, $conv15) & -1;
  var $y18 = $sprite + 12 | 0;
  var $conv20 = $clipY | 0;
  var $conv22 = _fminf(HEAP32[$y18 >> 2] | 0, $conv20) & -1;
  _cvsDrawImage3($call, $add, $6, $conv17, $conv22, 0, 0, _fminf(HEAP32[$x11 >> 2] | 0, $conv15) & -1, _fminf(HEAP32[$y18 >> 2] | 0, $conv20) & -1);
  _cvsRestore();
  return;
  return;
}
function _renderSprite($sprite, $x, $y) {
  _renderSpriteClipped($sprite, $x, $y, HEAP32[$sprite + 8 >> 2], HEAP32[$sprite + 12 >> 2]);
  return;
  return;
}
function _renderEntity($entity) {
  var $0 = HEAP32[$entity + 20 >> 2];
  if (($0 | 0) != 0) {
    _renderSprite($0, HEAPF32[$entity + 4 >> 2] & -1, HEAPF32[$entity + 8 >> 2] & -1);
  }
  return;
  return;
}
function _updateEntity($entity, $dt) {
  do {
    if ((HEAP32[$entity >> 2] | 0) == 1) {
      if ((_isDown(STRING_TABLE.__str | 0) | 0) != 0) {
        var $y = $entity + 8 | 0;
        HEAPF32[$y >> 2] = HEAPF32[$y >> 2] - $dt * 200;
      }
      if ((_isDown(STRING_TABLE.__str1 | 0) | 0) != 0) {
        var $y8 = $entity + 8 | 0;
        HEAPF32[$y8 >> 2] = HEAPF32[$y8 >> 2] + $dt * 200;
      }
      if ((_isDown(STRING_TABLE.__str2 | 0) | 0) != 0) {
        var $x = $entity + 4 | 0;
        HEAPF32[$x >> 2] = HEAPF32[$x >> 2] - $dt * 200;
      }
      if ((_isDown(STRING_TABLE.__str3 | 0) | 0) == 0) {
        break;
      }
      var $x26 = $entity + 4 | 0;
      HEAPF32[$x26 >> 2] = HEAPF32[$x26 >> 2] + $dt * 200;
    }
  } while (0);
  var $5 = HEAP32[$entity + 20 >> 2];
  if (($5 | 0) != 0) {
    _updateSprite($5, $dt);
  }
  return;
  return;
}
function _makeEntity($type, $sprite) {
  var $call$s2;
  var $call = _malloc(24), $call$s2 = $call >> 2;
  HEAP32[$call$s2] = $type;
  HEAPF32[$call$s2 + 1] = _random() * (_getWidth() | 0);
  HEAPF32[$call$s2 + 2] = _random() * (_getHeight() | 0);
  HEAP32[$call$s2 + 3] = HEAP32[$sprite + 8 >> 2];
  HEAP32[$call$s2 + 4] = HEAP32[$sprite + 12 >> 2];
  HEAP32[$call$s2 + 5] = $sprite;
  return $call;
  return null;
}
function _makeCells($w, $h) {
  var $call9$s2;
  var $3$s2;
  var $call$s2;
  var $call = _malloc(24), $call$s2 = $call >> 2;
  var $0 = $call;
  HEAP32[$call$s2] = $w;
  HEAP32[$call$s2 + 1] = $h;
  HEAP32[$call$s2 + 2] = 6;
  HEAP32[$call$s2 + 3] = 6;
  var $3$s2 = ($call + 16 | 0) >> 2;
  HEAP32[$3$s2] = 36;
  var $5 = $call + 20 | 0;
  HEAP32[$5 >> 2] = _malloc(144);
  var $cmp1 = (HEAP32[$3$s2] | 0) > 0;
  $_$30 : do {
    if ($cmp1) {
      var $i_02 = 0;
      while (1) {
        var $i_02;
        var $call9 = _malloc(12), $call9$s2 = $call9 >> 2;
        HEAP32[$call9$s2] = _malloc(400);
        HEAP32[$call9$s2 + 1] = 0;
        HEAP32[$call9$s2 + 2] = 0;
        HEAP32[HEAP32[$5 >> 2] + ($i_02 << 2) >> 2] = $call9;
        var $inc = $i_02 + 1 | 0;
        if (($inc | 0) >= (HEAP32[$3$s2] | 0)) {
          break $_$30;
        }
        var $i_02 = $inc;
      }
    }
  } while (0);
  _cellsClear($0);
  return $0;
  return null;
}
function _makeEnemySprite() {
  var $call$s2;
  var $call = _malloc(32), $call$s2 = $call >> 2;
  HEAP32[$call$s2] = 0;
  HEAP32[$call$s2 + 1] = 111;
  HEAP32[$call$s2 + 2] = 40;
  HEAP32[$call$s2 + 3] = 40;
  HEAPF32[$call$s2 + 4] = 5;
  HEAP32[$call$s2 + 5] = STRING_TABLE.__str4 | 0;
  HEAP32[$call$s2 + 6] = 6;
  HEAPF32[$call$s2 + 7] = 0;
  return $call;
  return null;
}
function _removeObject($entity) {
  var $i_03 = 0;
  var $0 = HEAP32[_objects >> 2];
  while (1) {
    var $0;
    var $i_03;
    if ((HEAP32[$0 + ($i_03 << 2) >> 2] | 0) == ($entity | 0)) {
      var $call2 = _makeEntity(2, _makeEnemySprite());
      var $2 = HEAP32[_objects >> 2];
      HEAP32[$2 + ($i_03 << 2) >> 2] = $call2;
      var $3 = $2;
    } else {
      var $3 = $0;
    }
    var $3;
    var $inc = $i_03 + 1 | 0;
    if (($inc | 0) >= 3e3) {
      break;
    }
    var $i_03 = $inc;
    var $0 = $3;
  }
  return;
  return;
}
function __checkCollisions($entity, $list) {
  var $7$s2;
  var $tobool = ($list | 0) == 0;
  $_$61 : do {
    if (!$tobool) {
      var $0 = HEAPF32[$entity + 4 >> 2];
      var $1 = HEAPF32[$entity + 8 >> 2];
      var $2 = HEAP32[$list >> 2];
      var $index = $list + 4 | 0;
      var $3 = HEAP32[$index >> 2];
      if (($3 | 0) <= 0) {
        break;
      }
      var $conv = $0 & -1;
      var $conv11 = $1 & -1;
      var $conv13 = $0 + HEAP32[$entity + 12 >> 2] & -1;
      var $conv16 = $1 + HEAP32[$entity + 16 >> 2] & -1;
      var $i_02 = 0;
      var $6 = $3;
      while (1) {
        var $6;
        var $i_02;
        var $7 = HEAP32[$2 + ($i_02 << 2) >> 2], $7$s2 = $7 >> 2;
        do {
          if (($7 | 0) == ($entity | 0)) {
            var $13 = $6;
          } else {
            var $8 = HEAPF32[$7$s2 + 1];
            var $9 = HEAPF32[$7$s2 + 2];
            if (!((_collides($conv, $conv11, $conv13, $conv16, $8 & -1, $9 & -1, $8 + HEAP32[$7$s2 + 3] & -1, $9 + HEAP32[$7$s2 + 4] & -1) | 0) != 0 & (HEAP32[_playerEntity >> 2] | 0) == ($entity | 0))) {
              var $13 = $6;
              break;
            }
            _removeObject($7);
            var $13 = HEAP32[$index >> 2];
          }
        } while (0);
        var $13;
        var $inc = $i_02 + 1 | 0;
        if (($inc | 0) >= ($13 | 0)) {
          break $_$61;
        }
        var $i_02 = $inc;
        var $6 = $13;
      }
    }
  } while (0);
  return;
  return;
}
__checkCollisions["X"] = 1;
function _checkCollisions() {
  var $y$s2;
  var $x$s2;
  var $i_02 = 0;
  while (1) {
    var $i_02;
    var $1 = HEAP32[HEAP32[_objects >> 2] + ($i_02 << 2) >> 2];
    if (($1 | 0) != 0) {
      var $x$s2 = ($1 + 4 | 0) >> 2;
      var $y$s2 = ($1 + 8 | 0) >> 2;
      __checkCollisions($1, _cellsGet(HEAP32[_cells >> 2], HEAPF32[$x$s2], HEAPF32[$y$s2]));
      var $y6 = $1 + 16 | 0;
      __checkCollisions($1, _cellsGet(HEAP32[_cells >> 2], HEAPF32[$x$s2], HEAPF32[$y$s2] + (HEAP32[$y6 >> 2] | 0)));
      var $x11 = $1 + 12 | 0;
      __checkCollisions($1, _cellsGet(HEAP32[_cells >> 2], HEAPF32[$x$s2] + (HEAP32[$x11 >> 2] | 0), HEAPF32[$y$s2]));
      __checkCollisions($1, _cellsGet(HEAP32[_cells >> 2], HEAPF32[$x$s2] + (HEAP32[$x11 >> 2] | 0), HEAPF32[$y$s2] + (HEAP32[$y6 >> 2] | 0)));
    }
    var $inc = $i_02 + 1 | 0;
    if (($inc | 0) >= 3e3) {
      break;
    }
    var $i_02 = $inc;
  }
  return;
  return;
}
function _heartbeat() {
  var $y$s2;
  var $x$s2;
  var $div = (_getCurrentTime() | 0) / 1e3;
  _startTimer();
  _checkCollisions();
  _cellsClear(HEAP32[_cells >> 2]);
  _cvsFillStyle(STRING_TABLE.__str7 | 0);
  _cvsFillRect(0, 0, _getWidth(), _getHeight());
  var $i_02 = 0;
  while (1) {
    var $i_02;
    var $2 = HEAP32[HEAP32[_objects >> 2] + ($i_02 << 2) >> 2];
    if (($2 | 0) != 0) {
      _updateEntity($2, $div - HEAPF32[_last >> 2]);
      _renderEntity($2);
      var $4 = HEAP32[_cells >> 2];
      var $x$s2 = ($2 + 4 | 0) >> 2;
      var $y$s2 = ($2 + 8 | 0) >> 2;
      _cellsAdd($4, $2, HEAPF32[$x$s2], HEAPF32[$y$s2]);
      var $x7 = $2 + 12 | 0;
      _cellsAdd($4, $2, HEAPF32[$x$s2] + (HEAP32[$x7 >> 2] | 0), HEAPF32[$y$s2]);
      var $y16 = $2 + 16 | 0;
      _cellsAdd($4, $2, HEAPF32[$x$s2], HEAPF32[$y$s2] + (HEAP32[$y16 >> 2] | 0));
      _cellsAdd($4, $2, HEAPF32[$x$s2] + (HEAP32[$x7 >> 2] | 0), HEAPF32[$y$s2] + (HEAP32[$y16 >> 2] | 0));
    }
    var $inc = $i_02 + 1 | 0;
    if (($inc | 0) >= 3e3) {
      break;
    }
    var $i_02 = $inc;
  }
  _endTimer();
  HEAPF32[_last >> 2] = $div;
  return;
  return;
}
Module["_heartbeat"] = _heartbeat;
_heartbeat["X"] = 1;
function _gameRun() {
  var $call1$s2;
  var $0 = _malloc(12e3);
  HEAP32[_objects >> 2] = $0;
  var $call1 = _malloc(32), $call1$s2 = $call1 >> 2;
  var $1 = $call1;
  HEAP32[_playerSprite >> 2] = $1;
  HEAP32[$call1$s2] = 0;
  HEAP32[$call1$s2 + 1] = 395;
  HEAP32[$call1$s2 + 2] = 80;
  HEAP32[$call1$s2 + 3] = 35;
  HEAPF32[$call1$s2 + 4] = 5;
  HEAP32[$call1$s2 + 5] = STRING_TABLE.__str4 | 0;
  HEAP32[$call1$s2 + 6] = 3;
  HEAPF32[$call1$s2 + 7] = 0;
  var $call6 = _makeEntity(1, $1);
  HEAP32[_playerEntity >> 2] = $call6;
  HEAP32[HEAP32[_objects >> 2] + 11996 >> 2] = $call6;
  var $i_03 = 0;
  while (1) {
    var $i_03;
    var $call9 = _makeEntity(2, _makeEnemySprite());
    HEAP32[HEAP32[_objects >> 2] + ($i_03 << 2) >> 2] = $call9;
    var $inc = $i_03 + 1 | 0;
    if (($inc | 0) >= 2999) {
      break;
    }
    var $i_03 = $inc;
  }
  var $call13 = _makeCells(_getWidth(), _getHeight());
  HEAP32[_cells >> 2] = $call13;
  var $div = (_getCurrentTime() | 0) / 1e3;
  HEAPF32[_last >> 2] = $div;
  _emscripten_set_main_loop(2, 0, 0);
  return;
  return;
}
Module["_gameRun"] = _gameRun;
_gameRun["X"] = 1;
function _main() {
  _loadResource(STRING_TABLE.__str4 | 0);
  _onReady(STRING_TABLE.__str8 | 0);
  return 0;
  return null;
}
Module["_main"] = _main;
function _malloc($bytes) {
  var __label__;
  do {
    if ($bytes >>> 0 < 245) {
      if ($bytes >>> 0 < 11) {
        var $cond = 16;
      } else {
        var $cond = $bytes + 11 & -8;
      }
      var $cond;
      var $shr = $cond >>> 3;
      var $0 = HEAP32[__gm_ >> 2];
      var $shr3 = $0 >>> ($shr >>> 0);
      if (($shr3 & 3 | 0) != 0) {
        var $add8 = ($shr3 & 1 ^ 1) + $shr | 0;
        var $shl = $add8 << 1;
        var $1 = ($shl << 2) + __gm_ + 40 | 0;
        var $2 = ($shl + 2 << 2) + __gm_ + 40 | 0;
        var $3 = HEAP32[$2 >> 2];
        var $fd9 = $3 + 8 | 0;
        var $4 = HEAP32[$fd9 >> 2];
        if (($1 | 0) == ($4 | 0)) {
          HEAP32[__gm_ >> 2] = $0 & (1 << $add8 ^ -1);
        } else {
          if ($4 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
            _abort();
          } else {
            HEAP32[$2 >> 2] = $4;
            HEAP32[$4 + 12 >> 2] = $1;
          }
        }
        var $shl20 = $add8 << 3;
        HEAP32[$3 + 4 >> 2] = $shl20 | 3;
        var $8 = $3 + ($shl20 | 4) | 0;
        HEAP32[$8 >> 2] = HEAP32[$8 >> 2] | 1;
        var $mem_0 = $fd9;
        __label__ = 39;
        break;
      }
      if ($cond >>> 0 <= HEAP32[__gm_ + 8 >> 2] >>> 0) {
        var $nb_0 = $cond;
        __label__ = 31;
        break;
      }
      if (($shr3 | 0) != 0) {
        var $shl37 = 2 << $shr;
        var $and41 = $shr3 << $shr & ($shl37 | -$shl37);
        var $sub44 = ($and41 & -$and41) - 1 | 0;
        var $and46 = $sub44 >>> 12 & 16;
        var $shr47 = $sub44 >>> ($and46 >>> 0);
        var $and49 = $shr47 >>> 5 & 8;
        var $shr51 = $shr47 >>> ($and49 >>> 0);
        var $and53 = $shr51 >>> 2 & 4;
        var $shr55 = $shr51 >>> ($and53 >>> 0);
        var $and57 = $shr55 >>> 1 & 2;
        var $shr59 = $shr55 >>> ($and57 >>> 0);
        var $and61 = $shr59 >>> 1 & 1;
        var $add64 = ($and49 | $and46 | $and53 | $and57 | $and61) + ($shr59 >>> ($and61 >>> 0)) | 0;
        var $shl65 = $add64 << 1;
        var $12 = ($shl65 << 2) + __gm_ + 40 | 0;
        var $13 = ($shl65 + 2 << 2) + __gm_ + 40 | 0;
        var $14 = HEAP32[$13 >> 2];
        var $fd69 = $14 + 8 | 0;
        var $15 = HEAP32[$fd69 >> 2];
        if (($12 | 0) == ($15 | 0)) {
          HEAP32[__gm_ >> 2] = $0 & (1 << $add64 ^ -1);
        } else {
          if ($15 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
            _abort();
          } else {
            HEAP32[$13 >> 2] = $15;
            HEAP32[$15 + 12 >> 2] = $12;
          }
        }
        var $shl87 = $add64 << 3;
        var $sub88 = $shl87 - $cond | 0;
        HEAP32[$14 + 4 >> 2] = $cond | 3;
        var $18 = $14;
        var $19 = $18 + $cond | 0;
        HEAP32[$18 + ($cond | 4) >> 2] = $sub88 | 1;
        HEAP32[$18 + $shl87 >> 2] = $sub88;
        var $21 = HEAP32[__gm_ + 8 >> 2];
        if (($21 | 0) != 0) {
          var $22 = HEAP32[__gm_ + 20 >> 2];
          var $shl100 = $21 >>> 2 & 1073741822;
          var $24 = ($shl100 << 2) + __gm_ + 40 | 0;
          var $25 = HEAP32[__gm_ >> 2];
          var $shl103 = 1 << ($21 >>> 3);
          do {
            if (($25 & $shl103 | 0) == 0) {
              HEAP32[__gm_ >> 2] = $25 | $shl103;
              var $F102_0 = $24;
              var $_pre_phi = ($shl100 + 2 << 2) + __gm_ + 40 | 0;
            } else {
              var $26 = ($shl100 + 2 << 2) + __gm_ + 40 | 0;
              var $27 = HEAP32[$26 >> 2];
              if ($27 >>> 0 >= HEAP32[__gm_ + 16 >> 2] >>> 0) {
                var $F102_0 = $27;
                var $_pre_phi = $26;
                break;
              }
              _abort();
            }
          } while (0);
          var $_pre_phi;
          var $F102_0;
          HEAP32[$_pre_phi >> 2] = $22;
          HEAP32[$F102_0 + 12 >> 2] = $22;
          HEAP32[$22 + 8 >> 2] = $F102_0;
          HEAP32[$22 + 12 >> 2] = $24;
        }
        HEAP32[__gm_ + 8 >> 2] = $sub88;
        HEAP32[__gm_ + 20 >> 2] = $19;
        var $mem_0 = $fd69;
        __label__ = 39;
        break;
      }
      if ((HEAP32[__gm_ + 4 >> 2] | 0) == 0) {
        var $nb_0 = $cond;
        __label__ = 31;
        break;
      }
      var $call = _tmalloc_small($cond);
      if (($call | 0) == 0) {
        var $nb_0 = $cond;
        __label__ = 31;
        break;
      }
      var $mem_0 = $call;
      __label__ = 39;
      break;
    } else {
      if ($bytes >>> 0 > 4294967231) {
        var $nb_0 = -1;
        __label__ = 31;
        break;
      }
      var $and143 = $bytes + 11 & -8;
      if ((HEAP32[__gm_ + 4 >> 2] | 0) == 0) {
        var $nb_0 = $and143;
        __label__ = 31;
        break;
      }
      var $call147 = _tmalloc_large($and143);
      if (($call147 | 0) == 0) {
        var $nb_0 = $and143;
        __label__ = 31;
        break;
      }
      var $mem_0 = $call147;
      __label__ = 39;
      break;
    }
  } while (0);
  if (__label__ == 31) {
    var $nb_0;
    var $33 = HEAP32[__gm_ + 8 >> 2];
    if ($nb_0 >>> 0 > $33 >>> 0) {
      var $42 = HEAP32[__gm_ + 12 >> 2];
      if ($nb_0 >>> 0 < $42 >>> 0) {
        var $sub186 = $42 - $nb_0 | 0;
        HEAP32[__gm_ + 12 >> 2] = $sub186;
        var $43 = HEAP32[__gm_ + 24 >> 2];
        var $44 = $43;
        HEAP32[__gm_ + 24 >> 2] = $44 + $nb_0 | 0;
        HEAP32[$nb_0 + ($44 + 4) >> 2] = $sub186 | 1;
        HEAP32[$43 + 4 >> 2] = $nb_0 | 3;
        var $mem_0 = $43 + 8 | 0;
      } else {
        var $mem_0 = _sys_alloc($nb_0);
      }
    } else {
      var $sub158 = $33 - $nb_0 | 0;
      var $34 = HEAP32[__gm_ + 20 >> 2];
      if ($sub158 >>> 0 > 15) {
        var $35 = $34;
        HEAP32[__gm_ + 20 >> 2] = $35 + $nb_0 | 0;
        HEAP32[__gm_ + 8 >> 2] = $sub158;
        HEAP32[$nb_0 + ($35 + 4) >> 2] = $sub158 | 1;
        HEAP32[$35 + $33 >> 2] = $sub158;
        HEAP32[$34 + 4 >> 2] = $nb_0 | 3;
      } else {
        HEAP32[__gm_ + 8 >> 2] = 0;
        HEAP32[__gm_ + 20 >> 2] = 0;
        HEAP32[$34 + 4 >> 2] = $33 | 3;
        var $39 = $33 + ($34 + 4) | 0;
        HEAP32[$39 >> 2] = HEAP32[$39 >> 2] | 1;
      }
      var $mem_0 = $34 + 8 | 0;
    }
  }
  var $mem_0;
  return $mem_0;
  return null;
}
_malloc["X"] = 1;
function _tmalloc_small($nb) {
  var $R_1$s2;
  var $v_0$s2;
  var $0 = HEAP32[__gm_ + 4 >> 2];
  var $sub2 = ($0 & -$0) - 1 | 0;
  var $and3 = $sub2 >>> 12 & 16;
  var $shr4 = $sub2 >>> ($and3 >>> 0);
  var $and6 = $shr4 >>> 5 & 8;
  var $shr7 = $shr4 >>> ($and6 >>> 0);
  var $and9 = $shr7 >>> 2 & 4;
  var $shr11 = $shr7 >>> ($and9 >>> 0);
  var $and13 = $shr11 >>> 1 & 2;
  var $shr15 = $shr11 >>> ($and13 >>> 0);
  var $and17 = $shr15 >>> 1 & 1;
  var $1 = HEAP32[__gm_ + (($and6 | $and3 | $and9 | $and13 | $and17) + ($shr15 >>> ($and17 >>> 0)) << 2) + 304 >> 2];
  var $t_0 = $1;
  var $v_0 = $1, $v_0$s2 = $v_0 >> 2;
  var $rsize_0 = (HEAP32[$1 + 4 >> 2] & -8) - $nb | 0;
  while (1) {
    var $rsize_0;
    var $v_0;
    var $t_0;
    var $3 = HEAP32[$t_0 + 16 >> 2];
    if (($3 | 0) == 0) {
      var $4 = HEAP32[$t_0 + 20 >> 2];
      if (($4 | 0) == 0) {
        break;
      }
      var $cond5 = $4;
    } else {
      var $cond5 = $3;
    }
    var $cond5;
    var $sub31 = (HEAP32[$cond5 + 4 >> 2] & -8) - $nb | 0;
    var $cmp32 = $sub31 >>> 0 < $rsize_0 >>> 0;
    var $t_0 = $cond5;
    var $v_0 = $cmp32 ? $cond5 : $v_0, $v_0$s2 = $v_0 >> 2;
    var $rsize_0 = $cmp32 ? $sub31 : $rsize_0;
  }
  var $6 = $v_0;
  var $7 = HEAP32[__gm_ + 16 >> 2];
  do {
    if ($6 >>> 0 >= $7 >>> 0) {
      var $add_ptr = $6 + $nb | 0;
      var $8 = $add_ptr;
      if ($6 >>> 0 >= $add_ptr >>> 0) {
        break;
      }
      var $9 = HEAP32[$v_0$s2 + 6];
      var $10 = HEAP32[$v_0$s2 + 3];
      do {
        if (($10 | 0) == ($v_0 | 0)) {
          var $arrayidx55 = $v_0 + 20 | 0;
          var $13 = HEAP32[$arrayidx55 >> 2];
          if (($13 | 0) == 0) {
            var $arrayidx59 = $v_0 + 16 | 0;
            var $14 = HEAP32[$arrayidx59 >> 2];
            if (($14 | 0) == 0) {
              var $R_1 = 0, $R_1$s2 = $R_1 >> 2;
              break;
            }
            var $RP_0 = $arrayidx59;
            var $R_0 = $14;
          } else {
            var $RP_0 = $arrayidx55;
            var $R_0 = $13;
            __label__ = 14;
          }
          while (1) {
            var $R_0;
            var $RP_0;
            var $arrayidx65 = $R_0 + 20 | 0;
            var $15 = HEAP32[$arrayidx65 >> 2];
            if (($15 | 0) != 0) {
              var $RP_0 = $arrayidx65;
              var $R_0 = $15;
              continue;
            }
            var $arrayidx69 = $R_0 + 16 | 0;
            var $16 = HEAP32[$arrayidx69 >> 2];
            if (($16 | 0) == 0) {
              break;
            }
            var $RP_0 = $arrayidx69;
            var $R_0 = $16;
          }
          if ($RP_0 >>> 0 < $7 >>> 0) {
            _abort();
          } else {
            HEAP32[$RP_0 >> 2] = 0;
            var $R_1 = $R_0, $R_1$s2 = $R_1 >> 2;
          }
        } else {
          var $11 = HEAP32[$v_0$s2 + 2];
          if ($11 >>> 0 < $7 >>> 0) {
            _abort();
          } else {
            HEAP32[$11 + 12 >> 2] = $10;
            HEAP32[$10 + 8 >> 2] = $11;
            var $R_1 = $10, $R_1$s2 = $R_1 >> 2;
          }
        }
      } while (0);
      var $R_1;
      var $cmp84 = ($9 | 0) == 0;
      $_$79 : do {
        if (!$cmp84) {
          var $index = $v_0 + 28 | 0;
          var $arrayidx88 = (HEAP32[$index >> 2] << 2) + __gm_ + 304 | 0;
          do {
            if (($v_0 | 0) == (HEAP32[$arrayidx88 >> 2] | 0)) {
              HEAP32[$arrayidx88 >> 2] = $R_1;
              if (($R_1 | 0) != 0) {
                break;
              }
              HEAP32[__gm_ + 4 >> 2] = HEAP32[__gm_ + 4 >> 2] & (1 << HEAP32[$index >> 2] ^ -1);
              break $_$79;
            }
            if ($9 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
              _abort();
            } else {
              var $arrayidx107 = $9 + 16 | 0;
              if ((HEAP32[$arrayidx107 >> 2] | 0) == ($v_0 | 0)) {
                HEAP32[$arrayidx107 >> 2] = $R_1;
              } else {
                HEAP32[$9 + 20 >> 2] = $R_1;
              }
              if (($R_1 | 0) == 0) {
                break $_$79;
              }
            }
          } while (0);
          if ($R_1 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
            _abort();
          } else {
            HEAP32[$R_1$s2 + 6] = $9;
            var $27 = HEAP32[$v_0$s2 + 4];
            if (($27 | 0) != 0) {
              if ($27 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
                _abort();
              } else {
                HEAP32[$R_1$s2 + 4] = $27;
                HEAP32[$27 + 24 >> 2] = $R_1;
              }
            }
            var $30 = HEAP32[$v_0$s2 + 5];
            if (($30 | 0) == 0) {
              break;
            }
            if ($30 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
              _abort();
            } else {
              HEAP32[$R_1$s2 + 5] = $30;
              HEAP32[$30 + 24 >> 2] = $R_1;
            }
          }
        }
      } while (0);
      if ($rsize_0 >>> 0 < 16) {
        var $add171 = $rsize_0 + $nb | 0;
        HEAP32[$v_0$s2 + 1] = $add171 | 3;
        var $33 = $add171 + ($6 + 4) | 0;
        HEAP32[$33 >> 2] = HEAP32[$33 >> 2] | 1;
      } else {
        HEAP32[$v_0$s2 + 1] = $nb | 3;
        HEAP32[$nb + ($6 + 4) >> 2] = $rsize_0 | 1;
        HEAP32[$6 + $rsize_0 + $nb >> 2] = $rsize_0;
        var $36 = HEAP32[__gm_ + 8 >> 2];
        if (($36 | 0) != 0) {
          var $37 = HEAP32[__gm_ + 20 >> 2];
          var $shl189 = $36 >>> 2 & 1073741822;
          var $39 = ($shl189 << 2) + __gm_ + 40 | 0;
          var $40 = HEAP32[__gm_ >> 2];
          var $shl192 = 1 << ($36 >>> 3);
          do {
            if (($40 & $shl192 | 0) == 0) {
              HEAP32[__gm_ >> 2] = $40 | $shl192;
              var $F191_0 = $39;
              var $_pre_phi = ($shl189 + 2 << 2) + __gm_ + 40 | 0;
            } else {
              var $41 = ($shl189 + 2 << 2) + __gm_ + 40 | 0;
              var $42 = HEAP32[$41 >> 2];
              if ($42 >>> 0 >= HEAP32[__gm_ + 16 >> 2] >>> 0) {
                var $F191_0 = $42;
                var $_pre_phi = $41;
                break;
              }
              _abort();
            }
          } while (0);
          var $_pre_phi;
          var $F191_0;
          HEAP32[$_pre_phi >> 2] = $37;
          HEAP32[$F191_0 + 12 >> 2] = $37;
          HEAP32[$37 + 8 >> 2] = $F191_0;
          HEAP32[$37 + 12 >> 2] = $39;
        }
        HEAP32[__gm_ + 8 >> 2] = $rsize_0;
        HEAP32[__gm_ + 20 >> 2] = $8;
      }
      return $v_0 + 8 | 0;
    }
  } while (0);
  _abort();
  return null;
}
_tmalloc_small["X"] = 1;
function _sys_alloc($nb) {
  var $sp_0$s2;
  var __label__;
  if ((HEAP32[_mparams >> 2] | 0) == 0) {
    _init_mparams();
  }
  var $tobool11 = (HEAP32[__gm_ + 440 >> 2] & 4 | 0) == 0;
  $_$117 : do {
    if ($tobool11) {
      var $2 = HEAP32[__gm_ + 24 >> 2];
      do {
        if (($2 | 0) != 0) {
          var $call15 = _segment_holding($2);
          if (($call15 | 0) == 0) {
            __label__ = 7;
            break;
          }
          var $8 = HEAP32[_mparams + 8 >> 2];
          var $and50 = $nb + 47 - HEAP32[__gm_ + 12 >> 2] + $8 & -$8;
          if ($and50 >>> 0 >= 2147483647) {
            var $tsize_091517_ph = 0;
            __label__ = 22;
            break;
          }
          var $call53 = _sbrk($and50);
          var $cmp55 = ($call53 | 0) == (HEAP32[$call15 >> 2] + HEAP32[$call15 + 4 >> 2] | 0);
          var $tbase_0 = $cmp55 ? $call53 : -1;
          var $tsize_0 = $cmp55 ? $and50 : 0;
          var $asize_1 = $and50;
          var $br_0 = $call53;
          __label__ = 14;
          break;
        }
        __label__ = 7;
      } while (0);
      do {
        if (__label__ == 7) {
          var $call18 = _sbrk(0);
          if (($call18 | 0) == -1) {
            var $tsize_091517_ph = 0;
            __label__ = 22;
            break;
          }
          var $4 = HEAP32[_mparams + 8 >> 2];
          var $and23 = $4 + ($nb + 47) & -$4;
          var $5 = $call18;
          var $6 = HEAP32[_mparams + 4 >> 2];
          var $sub24 = $6 - 1 | 0;
          if (($sub24 & $5 | 0) == 0) {
            var $asize_0 = $and23;
          } else {
            var $asize_0 = $and23 - $5 + ($sub24 + $5 & -$6) | 0;
          }
          var $asize_0;
          if ($asize_0 >>> 0 >= 2147483647) {
            var $tsize_091517_ph = 0;
            __label__ = 22;
            break;
          }
          var $call38 = _sbrk($asize_0);
          var $cmp39 = ($call38 | 0) == ($call18 | 0);
          var $tbase_0 = $cmp39 ? $call18 : -1;
          var $tsize_0 = $cmp39 ? $asize_0 : 0;
          var $asize_1 = $asize_0;
          var $br_0 = $call38;
          __label__ = 14;
          break;
        }
      } while (0);
      $_$130 : do {
        if (__label__ == 14) {
          var $br_0;
          var $asize_1;
          var $tsize_0;
          var $tbase_0;
          var $sub82 = -$asize_1 | 0;
          if (($tbase_0 | 0) != -1) {
            var $tsize_227 = $tsize_0;
            var $tbase_228 = $tbase_0;
            __label__ = 27;
            break $_$117;
          }
          do {
            if (($br_0 | 0) != -1 & $asize_1 >>> 0 < 2147483647) {
              if ($asize_1 >>> 0 >= ($nb + 48 | 0) >>> 0) {
                var $asize_2 = $asize_1;
                break;
              }
              var $11 = HEAP32[_mparams + 8 >> 2];
              var $and74 = $nb + 47 - $asize_1 + $11 & -$11;
              if ($and74 >>> 0 >= 2147483647) {
                var $asize_2 = $asize_1;
                break;
              }
              if ((_sbrk($and74) | 0) == -1) {
                var $call83 = _sbrk($sub82);
                var $tsize_091517_ph = $tsize_0;
                break $_$130;
              }
              var $asize_2 = $and74 + $asize_1 | 0;
            } else {
              var $asize_2 = $asize_1;
            }
          } while (0);
          var $asize_2;
          if (($br_0 | 0) != -1) {
            var $tsize_227 = $asize_2;
            var $tbase_228 = $br_0;
            __label__ = 27;
            break $_$117;
          }
          HEAP32[__gm_ + 440 >> 2] = HEAP32[__gm_ + 440 >> 2] | 4;
          var $tsize_122 = $tsize_0;
          __label__ = 24;
          break $_$117;
        }
      } while (0);
      var $tsize_091517_ph;
      HEAP32[__gm_ + 440 >> 2] = HEAP32[__gm_ + 440 >> 2] | 4;
      var $tsize_122 = $tsize_091517_ph;
      __label__ = 24;
      break;
    }
    var $tsize_122 = 0;
    __label__ = 24;
  } while (0);
  do {
    if (__label__ == 24) {
      var $tsize_122;
      var $14 = HEAP32[_mparams + 8 >> 2];
      var $and103 = $14 + ($nb + 47) & -$14;
      if ($and103 >>> 0 >= 2147483647) {
        __label__ = 50;
        break;
      }
      var $call108 = _sbrk($and103);
      var $call109 = _sbrk(0);
      if (!(($call109 | 0) != -1 & ($call108 | 0) != -1 & $call108 >>> 0 < $call109 >>> 0)) {
        __label__ = 50;
        break;
      }
      var $sub_ptr_sub = $call109 - $call108 | 0;
      var $cmp117 = $sub_ptr_sub >>> 0 > ($nb + 40 | 0) >>> 0;
      var $call108_tbase_1 = $cmp117 ? $call108 : -1;
      if (($call108_tbase_1 | 0) == -1) {
        __label__ = 50;
        break;
      }
      var $tsize_227 = $cmp117 ? $sub_ptr_sub : $tsize_122;
      var $tbase_228 = $call108_tbase_1;
      __label__ = 27;
      break;
    }
  } while (0);
  $_$147 : do {
    if (__label__ == 27) {
      var $tbase_228;
      var $tsize_227;
      var $add125 = HEAP32[__gm_ + 432 >> 2] + $tsize_227 | 0;
      HEAP32[__gm_ + 432 >> 2] = $add125;
      if ($add125 >>> 0 > HEAP32[__gm_ + 436 >> 2] >>> 0) {
        HEAP32[__gm_ + 436 >> 2] = $add125;
      }
      var $17 = HEAP32[__gm_ + 24 >> 2];
      var $cmp132 = ($17 | 0) == 0;
      $_$152 : do {
        if ($cmp132) {
          var $18 = HEAP32[__gm_ + 16 >> 2];
          if (($18 | 0) == 0 | $tbase_228 >>> 0 < $18 >>> 0) {
            HEAP32[__gm_ + 16 >> 2] = $tbase_228;
          }
          HEAP32[__gm_ + 444 >> 2] = $tbase_228;
          HEAP32[__gm_ + 448 >> 2] = $tsize_227;
          HEAP32[__gm_ + 456 >> 2] = 0;
          HEAP32[__gm_ + 36 >> 2] = HEAP32[_mparams >> 2];
          HEAP32[__gm_ + 32 >> 2] = -1;
          _init_bins();
          _init_top($tbase_228, $tsize_227 - 40 | 0);
        } else {
          var $sp_0 = __gm_ + 444 | 0, $sp_0$s2 = $sp_0 >> 2;
          while (1) {
            var $sp_0;
            if (($sp_0 | 0) == 0) {
              break;
            }
            var $21 = HEAP32[$sp_0$s2];
            var $size162 = $sp_0 + 4 | 0;
            var $22 = HEAP32[$size162 >> 2];
            if (($tbase_228 | 0) == ($21 + $22 | 0)) {
              if ((HEAP32[$sp_0$s2 + 3] & 8 | 0) != 0) {
                break;
              }
              var $25 = $17;
              if (!($25 >>> 0 >= $21 >>> 0 & $25 >>> 0 < $tbase_228 >>> 0)) {
                break;
              }
              HEAP32[$size162 >> 2] = $22 + $tsize_227 | 0;
              _init_top(HEAP32[__gm_ + 24 >> 2], HEAP32[__gm_ + 12 >> 2] + $tsize_227 | 0);
              break $_$152;
            }
            var $sp_0 = HEAP32[$sp_0$s2 + 2], $sp_0$s2 = $sp_0 >> 2;
          }
          if ($tbase_228 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
            HEAP32[__gm_ + 16 >> 2] = $tbase_228;
          }
          var $add_ptr201 = $tbase_228 + $tsize_227 | 0;
          var $sp_1 = __gm_ + 444 | 0;
          while (1) {
            var $sp_1;
            if (($sp_1 | 0) == 0) {
              break;
            }
            var $base200 = $sp_1 | 0;
            if ((HEAP32[$base200 >> 2] | 0) == ($add_ptr201 | 0)) {
              if ((HEAP32[$sp_1 + 12 >> 2] & 8 | 0) != 0) {
                break;
              }
              HEAP32[$base200 >> 2] = $tbase_228;
              var $size219 = $sp_1 + 4 | 0;
              HEAP32[$size219 >> 2] = HEAP32[$size219 >> 2] + $tsize_227 | 0;
              var $retval_0 = _prepend_alloc($tbase_228, $add_ptr201, $nb);
              __label__ = 51;
              break $_$147;
            }
            var $sp_1 = HEAP32[$sp_1 + 8 >> 2];
          }
          _add_segment($tbase_228, $tsize_227);
        }
      } while (0);
      var $33 = HEAP32[__gm_ + 12 >> 2];
      if ($33 >>> 0 <= $nb >>> 0) {
        __label__ = 50;
        break;
      }
      var $sub230 = $33 - $nb | 0;
      HEAP32[__gm_ + 12 >> 2] = $sub230;
      var $34 = HEAP32[__gm_ + 24 >> 2];
      var $35 = $34;
      HEAP32[__gm_ + 24 >> 2] = $35 + $nb | 0;
      HEAP32[$nb + ($35 + 4) >> 2] = $sub230 | 1;
      HEAP32[$34 + 4 >> 2] = $nb | 3;
      var $retval_0 = $34 + 8 | 0;
      __label__ = 51;
      break;
    }
  } while (0);
  if (__label__ == 50) {
    HEAP32[___errno() >> 2] = 12;
    var $retval_0 = 0;
  }
  var $retval_0;
  return $retval_0;
  return null;
}
_sys_alloc["X"] = 1;
function _tmalloc_large($nb) {
  var $R_1$s2;
  var $10$s2;
  var $t_221$s2;
  var $v_3_lcssa$s2;
  var $t_0$s2;
  var $nb$s2 = $nb >> 2;
  var __label__;
  var $sub = -$nb | 0;
  var $shr = $nb >>> 8;
  do {
    if (($shr | 0) == 0) {
      var $idx_0 = 0;
    } else {
      if ($nb >>> 0 > 16777215) {
        var $idx_0 = 31;
        break;
      }
      var $and = ($shr + 1048320 | 0) >>> 16 & 8;
      var $shl = $shr << $and;
      var $and8 = ($shl + 520192 | 0) >>> 16 & 4;
      var $shl9 = $shl << $and8;
      var $and12 = ($shl9 + 245760 | 0) >>> 16 & 2;
      var $add17 = 14 - ($and8 | $and | $and12) + ($shl9 << $and12 >>> 15) | 0;
      var $idx_0 = $nb >>> (($add17 + 7 | 0) >>> 0) & 1 | $add17 << 1;
    }
  } while (0);
  var $idx_0;
  var $0 = HEAP32[__gm_ + ($idx_0 << 2) + 304 >> 2];
  var $cmp24 = ($0 | 0) == 0;
  $_$6 : do {
    if ($cmp24) {
      var $v_2 = 0;
      var $rsize_2 = $sub;
      var $t_1 = 0;
    } else {
      if (($idx_0 | 0) == 31) {
        var $cond = 0;
      } else {
        var $cond = 25 - ($idx_0 >>> 1) | 0;
      }
      var $cond;
      var $v_0 = 0;
      var $rsize_0 = $sub;
      var $t_0 = $0, $t_0$s2 = $t_0 >> 2;
      var $sizebits_0 = $nb << $cond;
      var $rst_0 = 0;
      while (1) {
        var $rst_0;
        var $sizebits_0;
        var $t_0;
        var $rsize_0;
        var $v_0;
        var $and32 = HEAP32[$t_0$s2 + 1] & -8;
        var $sub33 = $and32 - $nb | 0;
        if ($sub33 >>> 0 < $rsize_0 >>> 0) {
          if (($and32 | 0) == ($nb | 0)) {
            var $v_2 = $t_0;
            var $rsize_2 = $sub33;
            var $t_1 = $t_0;
            break $_$6;
          }
          var $v_1 = $t_0;
          var $rsize_1 = $sub33;
        } else {
          var $v_1 = $v_0;
          var $rsize_1 = $rsize_0;
        }
        var $rsize_1;
        var $v_1;
        var $2 = HEAP32[$t_0$s2 + 5];
        var $3 = HEAP32[(($sizebits_0 >>> 31 << 2) + 16 >> 2) + $t_0$s2];
        var $rst_1 = ($2 | 0) == 0 | ($2 | 0) == ($3 | 0) ? $rst_0 : $2;
        if (($3 | 0) == 0) {
          var $v_2 = $v_1;
          var $rsize_2 = $rsize_1;
          var $t_1 = $rst_1;
          break $_$6;
        }
        var $v_0 = $v_1;
        var $rsize_0 = $rsize_1;
        var $t_0 = $3, $t_0$s2 = $t_0 >> 2;
        var $sizebits_0 = $sizebits_0 << 1;
        var $rst_0 = $rst_1;
      }
    }
  } while (0);
  var $t_1;
  var $rsize_2;
  var $v_2;
  do {
    if (($t_1 | 0) == 0 & ($v_2 | 0) == 0) {
      var $shl59 = 2 << $idx_0;
      var $and63 = HEAP32[__gm_ + 4 >> 2] & ($shl59 | -$shl59);
      if (($and63 | 0) == 0) {
        var $retval_0 = 0;
        __label__ = 80;
        break;
      }
      var $sub69 = ($and63 & -$and63) - 1 | 0;
      var $and72 = $sub69 >>> 12 & 16;
      var $shr74 = $sub69 >>> ($and72 >>> 0);
      var $and76 = $shr74 >>> 5 & 8;
      var $shr78 = $shr74 >>> ($and76 >>> 0);
      var $and80 = $shr78 >>> 2 & 4;
      var $shr82 = $shr78 >>> ($and80 >>> 0);
      var $and84 = $shr82 >>> 1 & 2;
      var $shr86 = $shr82 >>> ($and84 >>> 0);
      var $and88 = $shr86 >>> 1 & 1;
      var $t_2_ph = HEAP32[__gm_ + (($and76 | $and72 | $and80 | $and84 | $and88) + ($shr86 >>> ($and88 >>> 0)) << 2) + 304 >> 2];
      __label__ = 15;
      break;
    }
    var $t_2_ph = $t_1;
    __label__ = 15;
  } while (0);
  $_$20 : do {
    if (__label__ == 15) {
      var $t_2_ph;
      var $cmp9620 = ($t_2_ph | 0) == 0;
      $_$22 : do {
        if ($cmp9620) {
          var $rsize_3_lcssa = $rsize_2;
          var $v_3_lcssa = $v_2, $v_3_lcssa$s2 = $v_3_lcssa >> 2;
        } else {
          var $t_221 = $t_2_ph, $t_221$s2 = $t_221 >> 2;
          var $rsize_322 = $rsize_2;
          var $v_323 = $v_2;
          while (1) {
            var $v_323;
            var $rsize_322;
            var $t_221;
            var $sub100 = (HEAP32[$t_221$s2 + 1] & -8) - $nb | 0;
            var $cmp101 = $sub100 >>> 0 < $rsize_322 >>> 0;
            var $sub100_rsize_3 = $cmp101 ? $sub100 : $rsize_322;
            var $t_2_v_3 = $cmp101 ? $t_221 : $v_323;
            var $7 = HEAP32[$t_221$s2 + 4];
            if (($7 | 0) != 0) {
              var $t_221 = $7, $t_221$s2 = $t_221 >> 2;
              var $rsize_322 = $sub100_rsize_3;
              var $v_323 = $t_2_v_3;
              continue;
            }
            var $8 = HEAP32[$t_221$s2 + 5];
            if (($8 | 0) == 0) {
              var $rsize_3_lcssa = $sub100_rsize_3;
              var $v_3_lcssa = $t_2_v_3, $v_3_lcssa$s2 = $v_3_lcssa >> 2;
              break $_$22;
            }
            var $t_221 = $8, $t_221$s2 = $t_221 >> 2;
            var $rsize_322 = $sub100_rsize_3;
            var $v_323 = $t_2_v_3;
          }
        }
      } while (0);
      var $v_3_lcssa;
      var $rsize_3_lcssa;
      if (($v_3_lcssa | 0) == 0) {
        var $retval_0 = 0;
        break;
      }
      if ($rsize_3_lcssa >>> 0 >= (HEAP32[__gm_ + 8 >> 2] - $nb | 0) >>> 0) {
        var $retval_0 = 0;
        break;
      }
      var $10 = $v_3_lcssa, $10$s2 = $10 >> 2;
      var $11 = HEAP32[__gm_ + 16 >> 2];
      do {
        if ($10 >>> 0 >= $11 >>> 0) {
          var $add_ptr = $10 + $nb | 0;
          var $12 = $add_ptr;
          if ($10 >>> 0 >= $add_ptr >>> 0) {
            break;
          }
          var $13 = HEAP32[$v_3_lcssa$s2 + 6];
          var $14 = HEAP32[$v_3_lcssa$s2 + 3];
          do {
            if (($14 | 0) == ($v_3_lcssa | 0)) {
              var $arrayidx143 = $v_3_lcssa + 20 | 0;
              var $17 = HEAP32[$arrayidx143 >> 2];
              if (($17 | 0) == 0) {
                var $arrayidx147 = $v_3_lcssa + 16 | 0;
                var $18 = HEAP32[$arrayidx147 >> 2];
                if (($18 | 0) == 0) {
                  var $R_1 = 0, $R_1$s2 = $R_1 >> 2;
                  break;
                }
                var $RP_0 = $arrayidx147;
                var $R_0 = $18;
              } else {
                var $RP_0 = $arrayidx143;
                var $R_0 = $17;
                __label__ = 28;
              }
              while (1) {
                var $R_0;
                var $RP_0;
                var $arrayidx153 = $R_0 + 20 | 0;
                var $19 = HEAP32[$arrayidx153 >> 2];
                if (($19 | 0) != 0) {
                  var $RP_0 = $arrayidx153;
                  var $R_0 = $19;
                  continue;
                }
                var $arrayidx157 = $R_0 + 16 | 0;
                var $20 = HEAP32[$arrayidx157 >> 2];
                if (($20 | 0) == 0) {
                  break;
                }
                var $RP_0 = $arrayidx157;
                var $R_0 = $20;
              }
              if ($RP_0 >>> 0 < $11 >>> 0) {
                _abort();
              } else {
                HEAP32[$RP_0 >> 2] = 0;
                var $R_1 = $R_0, $R_1$s2 = $R_1 >> 2;
              }
            } else {
              var $15 = HEAP32[$v_3_lcssa$s2 + 2];
              if ($15 >>> 0 < $11 >>> 0) {
                _abort();
              } else {
                HEAP32[$15 + 12 >> 2] = $14;
                HEAP32[$14 + 8 >> 2] = $15;
                var $R_1 = $14, $R_1$s2 = $R_1 >> 2;
              }
            }
          } while (0);
          var $R_1;
          var $cmp172 = ($13 | 0) == 0;
          $_$48 : do {
            if ($cmp172) {
              var $v_3_lcssa2 = $v_3_lcssa;
            } else {
              var $index = $v_3_lcssa + 28 | 0;
              var $arrayidx176 = (HEAP32[$index >> 2] << 2) + __gm_ + 304 | 0;
              do {
                if (($v_3_lcssa | 0) == (HEAP32[$arrayidx176 >> 2] | 0)) {
                  HEAP32[$arrayidx176 >> 2] = $R_1;
                  if (($R_1 | 0) != 0) {
                    break;
                  }
                  HEAP32[__gm_ + 4 >> 2] = HEAP32[__gm_ + 4 >> 2] & (1 << HEAP32[$index >> 2] ^ -1);
                  var $v_3_lcssa2 = $v_3_lcssa;
                  break $_$48;
                }
                if ($13 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
                  _abort();
                } else {
                  var $arrayidx196 = $13 + 16 | 0;
                  if ((HEAP32[$arrayidx196 >> 2] | 0) == ($v_3_lcssa | 0)) {
                    HEAP32[$arrayidx196 >> 2] = $R_1;
                  } else {
                    HEAP32[$13 + 20 >> 2] = $R_1;
                  }
                  if (($R_1 | 0) == 0) {
                    var $v_3_lcssa2 = $v_3_lcssa;
                    break $_$48;
                  }
                }
              } while (0);
              if ($R_1 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
                _abort();
              } else {
                HEAP32[$R_1$s2 + 6] = $13;
                var $31 = HEAP32[$v_3_lcssa$s2 + 4];
                if (($31 | 0) != 0) {
                  if ($31 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
                    _abort();
                  } else {
                    HEAP32[$R_1$s2 + 4] = $31;
                    HEAP32[$31 + 24 >> 2] = $R_1;
                  }
                }
                var $34 = HEAP32[$v_3_lcssa$s2 + 5];
                if (($34 | 0) == 0) {
                  var $v_3_lcssa2 = $v_3_lcssa;
                  break;
                }
                if ($34 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
                  _abort();
                } else {
                  HEAP32[$R_1$s2 + 5] = $34;
                  HEAP32[$34 + 24 >> 2] = $R_1;
                  var $v_3_lcssa2 = $v_3_lcssa;
                }
              }
            }
          } while (0);
          var $v_3_lcssa2;
          var $cmp257 = $rsize_3_lcssa >>> 0 < 16;
          $_$76 : do {
            if ($cmp257) {
              var $add260 = $rsize_3_lcssa + $nb | 0;
              HEAP32[$v_3_lcssa2 + 4 >> 2] = $add260 | 3;
              var $37 = $add260 + ($10 + 4) | 0;
              HEAP32[$37 >> 2] = HEAP32[$37 >> 2] | 1;
            } else {
              HEAP32[$v_3_lcssa2 + 4 >> 2] = $nb | 3;
              HEAP32[$nb$s2 + ($10$s2 + 1)] = $rsize_3_lcssa | 1;
              HEAP32[($rsize_3_lcssa >> 2) + $10$s2 + $nb$s2] = $rsize_3_lcssa;
              if ($rsize_3_lcssa >>> 0 < 256) {
                var $shl280 = $rsize_3_lcssa >>> 2 & 1073741822;
                var $41 = ($shl280 << 2) + __gm_ + 40 | 0;
                var $42 = HEAP32[__gm_ >> 2];
                var $shl283 = 1 << ($rsize_3_lcssa >>> 3);
                do {
                  if (($42 & $shl283 | 0) == 0) {
                    HEAP32[__gm_ >> 2] = $42 | $shl283;
                    var $F282_0 = $41;
                    var $_pre_phi = ($shl280 + 2 << 2) + __gm_ + 40 | 0;
                  } else {
                    var $43 = ($shl280 + 2 << 2) + __gm_ + 40 | 0;
                    var $44 = HEAP32[$43 >> 2];
                    if ($44 >>> 0 >= HEAP32[__gm_ + 16 >> 2] >>> 0) {
                      var $F282_0 = $44;
                      var $_pre_phi = $43;
                      break;
                    }
                    _abort();
                  }
                } while (0);
                var $_pre_phi;
                var $F282_0;
                HEAP32[$_pre_phi >> 2] = $12;
                HEAP32[$F282_0 + 12 >> 2] = $12;
                HEAP32[$nb$s2 + ($10$s2 + 2)] = $F282_0;
                HEAP32[$nb$s2 + ($10$s2 + 3)] = $41;
              } else {
                var $49 = $add_ptr;
                var $shr310 = $rsize_3_lcssa >>> 8;
                do {
                  if (($shr310 | 0) == 0) {
                    var $I308_0 = 0;
                  } else {
                    if ($rsize_3_lcssa >>> 0 > 16777215) {
                      var $I308_0 = 31;
                      break;
                    }
                    var $and323 = ($shr310 + 1048320 | 0) >>> 16 & 8;
                    var $shl325 = $shr310 << $and323;
                    var $and328 = ($shl325 + 520192 | 0) >>> 16 & 4;
                    var $shl330 = $shl325 << $and328;
                    var $and333 = ($shl330 + 245760 | 0) >>> 16 & 2;
                    var $add338 = 14 - ($and328 | $and323 | $and333) + ($shl330 << $and333 >>> 15) | 0;
                    var $I308_0 = $rsize_3_lcssa >>> (($add338 + 7 | 0) >>> 0) & 1 | $add338 << 1;
                  }
                } while (0);
                var $I308_0;
                var $arrayidx347 = ($I308_0 << 2) + __gm_ + 304 | 0;
                HEAP32[$nb$s2 + ($10$s2 + 7)] = $I308_0;
                HEAP32[$nb$s2 + ($10$s2 + 5)] = 0;
                HEAP32[$nb$s2 + ($10$s2 + 4)] = 0;
                var $52 = HEAP32[__gm_ + 4 >> 2];
                var $shl354 = 1 << $I308_0;
                if (($52 & $shl354 | 0) == 0) {
                  HEAP32[__gm_ + 4 >> 2] = $52 | $shl354;
                  HEAP32[$arrayidx347 >> 2] = $49;
                  HEAP32[$nb$s2 + ($10$s2 + 6)] = $arrayidx347;
                  HEAP32[$nb$s2 + ($10$s2 + 3)] = $49;
                  HEAP32[$nb$s2 + ($10$s2 + 2)] = $49;
                } else {
                  if (($I308_0 | 0) == 31) {
                    var $cond375 = 0;
                  } else {
                    var $cond375 = 25 - ($I308_0 >>> 1) | 0;
                  }
                  var $cond375;
                  var $K365_0 = $rsize_3_lcssa << $cond375;
                  var $T_0 = HEAP32[$arrayidx347 >> 2];
                  while (1) {
                    var $T_0;
                    var $K365_0;
                    if ((HEAP32[$T_0 + 4 >> 2] & -8 | 0) == ($rsize_3_lcssa | 0)) {
                      var $fd405 = $T_0 + 8 | 0;
                      var $65 = HEAP32[$fd405 >> 2];
                      var $67 = HEAP32[__gm_ + 16 >> 2];
                      do {
                        if ($T_0 >>> 0 >= $67 >>> 0) {
                          if ($65 >>> 0 < $67 >>> 0) {
                            break;
                          }
                          HEAP32[$65 + 12 >> 2] = $49;
                          HEAP32[$fd405 >> 2] = $49;
                          HEAP32[$nb$s2 + ($10$s2 + 2)] = $65;
                          HEAP32[$nb$s2 + ($10$s2 + 3)] = $T_0;
                          HEAP32[$nb$s2 + ($10$s2 + 6)] = 0;
                          break $_$76;
                        }
                      } while (0);
                      _abort();
                    } else {
                      var $arrayidx386 = ($K365_0 >>> 31 << 2) + $T_0 + 16 | 0;
                      var $59 = HEAP32[$arrayidx386 >> 2];
                      if (($59 | 0) != 0) {
                        var $K365_0 = $K365_0 << 1;
                        var $T_0 = $59;
                        continue;
                      }
                      if ($arrayidx386 >>> 0 >= HEAP32[__gm_ + 16 >> 2] >>> 0) {
                        HEAP32[$arrayidx386 >> 2] = $49;
                        HEAP32[$nb$s2 + ($10$s2 + 6)] = $T_0;
                        HEAP32[$nb$s2 + ($10$s2 + 3)] = $49;
                        HEAP32[$nb$s2 + ($10$s2 + 2)] = $49;
                        break $_$76;
                      }
                      _abort();
                    }
                  }
                }
              }
            }
          } while (0);
          var $retval_0 = $v_3_lcssa2 + 8 | 0;
          break $_$20;
        }
      } while (0);
      _abort();
    }
  } while (0);
  var $retval_0;
  return $retval_0;
  return null;
}
_tmalloc_large["X"] = 1;
function _segment_holding($addr) {
  var $sp_0$s2;
  var $sp_0 = __gm_ + 444 | 0, $sp_0$s2 = $sp_0 >> 2;
  while (1) {
    var $sp_0;
    var $0 = HEAP32[$sp_0$s2];
    if ($0 >>> 0 <= $addr >>> 0) {
      if (($0 + HEAP32[$sp_0$s2 + 1] | 0) >>> 0 > $addr >>> 0) {
        var $retval_0 = $sp_0;
        break;
      }
    }
    var $2 = HEAP32[$sp_0$s2 + 2];
    if (($2 | 0) == 0) {
      var $retval_0 = 0;
      break;
    }
    var $sp_0 = $2, $sp_0$s2 = $sp_0 >> 2;
  }
  var $retval_0;
  return $retval_0;
  return null;
}
function _init_top($p, $psize) {
  var $0 = $p;
  var $1 = $p + 8 | 0;
  if (($1 & 7 | 0) == 0) {
    var $cond = 0;
  } else {
    var $cond = -$1 & 7;
  }
  var $cond;
  var $sub5 = $psize - $cond | 0;
  HEAP32[__gm_ + 24 >> 2] = $0 + $cond | 0;
  HEAP32[__gm_ + 12 >> 2] = $sub5;
  HEAP32[$cond + ($0 + 4) >> 2] = $sub5 | 1;
  HEAP32[$psize + ($0 + 4) >> 2] = 40;
  HEAP32[__gm_ + 28 >> 2] = HEAP32[_mparams + 16 >> 2];
  return;
  return;
}
function _init_bins() {
  var $i_02 = 0;
  while (1) {
    var $i_02;
    var $shl = $i_02 << 1;
    var $0 = ($shl << 2) + __gm_ + 40 | 0;
    HEAP32[__gm_ + ($shl + 3 << 2) + 40 >> 2] = $0;
    HEAP32[__gm_ + ($shl + 2 << 2) + 40 >> 2] = $0;
    var $inc = $i_02 + 1 | 0;
    if (($inc | 0) == 32) {
      break;
    }
    var $i_02 = $inc;
  }
  return;
  return;
}
function _init_mparams() {
  if ((HEAP32[_mparams >> 2] | 0) == 0) {
    var $call = _sysconf(8);
    if (($call - 1 & $call | 0) == 0) {
      HEAP32[_mparams + 8 >> 2] = $call;
      HEAP32[_mparams + 4 >> 2] = $call;
      HEAP32[_mparams + 12 >> 2] = -1;
      HEAP32[_mparams + 16 >> 2] = 2097152;
      HEAP32[_mparams + 20 >> 2] = 0;
      HEAP32[__gm_ + 440 >> 2] = 0;
      var $and7 = _time(0) & -16 ^ 1431655768;
      HEAP32[_mparams >> 2] = $and7;
    } else {
      _abort();
    }
  }
  return;
  return;
}
function _prepend_alloc($newbase, $oldbase, $nb) {
  var $R_1$s2;
  var $add_ptr4_sum$s2;
  var $cond15$s2;
  var $oldbase$s2 = $oldbase >> 2;
  var $newbase$s2 = $newbase >> 2;
  var __label__;
  var $0 = $newbase + 8 | 0;
  if (($0 & 7 | 0) == 0) {
    var $cond = 0;
  } else {
    var $cond = -$0 & 7;
  }
  var $cond;
  var $2 = $oldbase + 8 | 0;
  if (($2 & 7 | 0) == 0) {
    var $cond15 = 0, $cond15$s2 = $cond15 >> 2;
  } else {
    var $cond15 = -$2 & 7, $cond15$s2 = $cond15 >> 2;
  }
  var $cond15;
  var $add_ptr16 = $oldbase + $cond15 | 0;
  var $4 = $add_ptr16;
  var $add_ptr4_sum = $cond + $nb | 0, $add_ptr4_sum$s2 = $add_ptr4_sum >> 2;
  var $add_ptr17 = $newbase + $add_ptr4_sum | 0;
  var $5 = $add_ptr17;
  var $sub18 = $add_ptr16 - ($newbase + $cond) - $nb | 0;
  HEAP32[($cond + 4 >> 2) + $newbase$s2] = $nb | 3;
  var $cmp20 = ($4 | 0) == (HEAP32[__gm_ + 24 >> 2] | 0);
  $_$30 : do {
    if ($cmp20) {
      var $add = HEAP32[__gm_ + 12 >> 2] + $sub18 | 0;
      HEAP32[__gm_ + 12 >> 2] = $add;
      HEAP32[__gm_ + 24 >> 2] = $5;
      HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 1)] = $add | 1;
    } else {
      if (($4 | 0) == (HEAP32[__gm_ + 20 >> 2] | 0)) {
        var $add26 = HEAP32[__gm_ + 8 >> 2] + $sub18 | 0;
        HEAP32[__gm_ + 8 >> 2] = $add26;
        HEAP32[__gm_ + 20 >> 2] = $5;
        HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 1)] = $add26 | 1;
        HEAP32[($add26 >> 2) + $newbase$s2 + $add_ptr4_sum$s2] = $add26;
      } else {
        var $14 = HEAP32[$cond15$s2 + ($oldbase$s2 + 1)];
        if (($14 & 3 | 0) == 1) {
          var $and37 = $14 & -8;
          var $shr = $14 >>> 3;
          var $cmp38 = $14 >>> 0 < 256;
          $_$38 : do {
            if ($cmp38) {
              var $16 = HEAP32[(($cond15 | 8) >> 2) + $oldbase$s2];
              var $18 = HEAP32[$cond15$s2 + ($oldbase$s2 + 3)];
              if (($16 | 0) == ($18 | 0)) {
                HEAP32[__gm_ >> 2] = HEAP32[__gm_ >> 2] & (1 << $shr ^ -1);
              } else {
                var $21 = (($14 >>> 2 & 1073741822) << 2) + __gm_ + 40 | 0;
                do {
                  if (($16 | 0) == ($21 | 0)) {
                    __label__ = 16;
                  } else {
                    if ($16 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
                      __label__ = 19;
                      break;
                    }
                    __label__ = 16;
                    break;
                  }
                } while (0);
                do {
                  if (__label__ == 16) {
                    if (($18 | 0) != ($21 | 0)) {
                      if ($18 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
                        break;
                      }
                    }
                    HEAP32[$16 + 12 >> 2] = $18;
                    HEAP32[$18 + 8 >> 2] = $16;
                    break $_$38;
                  }
                } while (0);
                _abort();
              }
            } else {
              var $26 = $add_ptr16;
              var $28 = HEAP32[(($cond15 | 24) >> 2) + $oldbase$s2];
              var $30 = HEAP32[$cond15$s2 + ($oldbase$s2 + 3)];
              do {
                if (($30 | 0) == ($26 | 0)) {
                  var $add_ptr16_sum56 = $cond15 | 16;
                  var $35 = $add_ptr16_sum56 + ($oldbase + 4) | 0;
                  var $36 = HEAP32[$35 >> 2];
                  if (($36 | 0) == 0) {
                    var $arrayidx81 = $oldbase + $add_ptr16_sum56 | 0;
                    var $37 = HEAP32[$arrayidx81 >> 2];
                    if (($37 | 0) == 0) {
                      var $R_1 = 0, $R_1$s2 = $R_1 >> 2;
                      break;
                    }
                    var $RP_0 = $arrayidx81;
                    var $R_0 = $37;
                  } else {
                    var $RP_0 = $35;
                    var $R_0 = $36;
                    __label__ = 26;
                  }
                  while (1) {
                    var $R_0;
                    var $RP_0;
                    var $arrayidx86 = $R_0 + 20 | 0;
                    var $38 = HEAP32[$arrayidx86 >> 2];
                    if (($38 | 0) != 0) {
                      var $RP_0 = $arrayidx86;
                      var $R_0 = $38;
                      continue;
                    }
                    var $arrayidx91 = $R_0 + 16 | 0;
                    var $39 = HEAP32[$arrayidx91 >> 2];
                    if (($39 | 0) == 0) {
                      break;
                    }
                    var $RP_0 = $arrayidx91;
                    var $R_0 = $39;
                  }
                  if ($RP_0 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
                    _abort();
                  } else {
                    HEAP32[$RP_0 >> 2] = 0;
                    var $R_1 = $R_0, $R_1$s2 = $R_1 >> 2;
                  }
                } else {
                  var $32 = HEAP32[(($cond15 | 8) >> 2) + $oldbase$s2];
                  if ($32 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
                    _abort();
                  } else {
                    HEAP32[$32 + 12 >> 2] = $30;
                    HEAP32[$30 + 8 >> 2] = $32;
                    var $R_1 = $30, $R_1$s2 = $R_1 >> 2;
                  }
                }
              } while (0);
              var $R_1;
              if (($28 | 0) == 0) {
                break;
              }
              var $42 = $cond15 + ($oldbase + 28) | 0;
              var $arrayidx108 = (HEAP32[$42 >> 2] << 2) + __gm_ + 304 | 0;
              do {
                if (($26 | 0) == (HEAP32[$arrayidx108 >> 2] | 0)) {
                  HEAP32[$arrayidx108 >> 2] = $R_1;
                  if (($R_1 | 0) != 0) {
                    break;
                  }
                  HEAP32[__gm_ + 4 >> 2] = HEAP32[__gm_ + 4 >> 2] & (1 << HEAP32[$42 >> 2] ^ -1);
                  break $_$38;
                }
                if ($28 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
                  _abort();
                } else {
                  var $arrayidx128 = $28 + 16 | 0;
                  if ((HEAP32[$arrayidx128 >> 2] | 0) == ($26 | 0)) {
                    HEAP32[$arrayidx128 >> 2] = $R_1;
                  } else {
                    HEAP32[$28 + 20 >> 2] = $R_1;
                  }
                  if (($R_1 | 0) == 0) {
                    break $_$38;
                  }
                }
              } while (0);
              if ($R_1 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
                _abort();
              } else {
                HEAP32[$R_1$s2 + 6] = $28;
                var $add_ptr16_sum2627 = $cond15 | 16;
                var $52 = HEAP32[($add_ptr16_sum2627 >> 2) + $oldbase$s2];
                if (($52 | 0) != 0) {
                  if ($52 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
                    _abort();
                  } else {
                    HEAP32[$R_1$s2 + 4] = $52;
                    HEAP32[$52 + 24 >> 2] = $R_1;
                  }
                }
                var $56 = HEAP32[($add_ptr16_sum2627 + 4 >> 2) + $oldbase$s2];
                if (($56 | 0) == 0) {
                  break;
                }
                if ($56 >>> 0 < HEAP32[__gm_ + 16 >> 2] >>> 0) {
                  _abort();
                } else {
                  HEAP32[$R_1$s2 + 5] = $56;
                  HEAP32[$56 + 24 >> 2] = $R_1;
                }
              }
            }
          } while (0);
          var $oldfirst_0 = $oldbase + ($and37 | $cond15) | 0;
          var $qsize_0 = $and37 + $sub18 | 0;
        } else {
          var $oldfirst_0 = $4;
          var $qsize_0 = $sub18;
        }
        var $qsize_0;
        var $oldfirst_0;
        var $head193 = $oldfirst_0 + 4 | 0;
        HEAP32[$head193 >> 2] = HEAP32[$head193 >> 2] & -2;
        HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 1)] = $qsize_0 | 1;
        HEAP32[($qsize_0 >> 2) + $newbase$s2 + $add_ptr4_sum$s2] = $qsize_0;
        if ($qsize_0 >>> 0 < 256) {
          var $shl206 = $qsize_0 >>> 2 & 1073741822;
          var $63 = ($shl206 << 2) + __gm_ + 40 | 0;
          var $64 = HEAP32[__gm_ >> 2];
          var $shl211 = 1 << ($qsize_0 >>> 3);
          do {
            if (($64 & $shl211 | 0) == 0) {
              HEAP32[__gm_ >> 2] = $64 | $shl211;
              var $F209_0 = $63;
              var $_pre_phi = ($shl206 + 2 << 2) + __gm_ + 40 | 0;
            } else {
              var $65 = ($shl206 + 2 << 2) + __gm_ + 40 | 0;
              var $66 = HEAP32[$65 >> 2];
              if ($66 >>> 0 >= HEAP32[__gm_ + 16 >> 2] >>> 0) {
                var $F209_0 = $66;
                var $_pre_phi = $65;
                break;
              }
              _abort();
            }
          } while (0);
          var $_pre_phi;
          var $F209_0;
          HEAP32[$_pre_phi >> 2] = $5;
          HEAP32[$F209_0 + 12 >> 2] = $5;
          HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 2)] = $F209_0;
          HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 3)] = $63;
        } else {
          var $71 = $add_ptr17;
          var $shr238 = $qsize_0 >>> 8;
          do {
            if (($shr238 | 0) == 0) {
              var $I237_0 = 0;
            } else {
              if ($qsize_0 >>> 0 > 16777215) {
                var $I237_0 = 31;
                break;
              }
              var $and249 = ($shr238 + 1048320 | 0) >>> 16 & 8;
              var $shl250 = $shr238 << $and249;
              var $and253 = ($shl250 + 520192 | 0) >>> 16 & 4;
              var $shl255 = $shl250 << $and253;
              var $and258 = ($shl255 + 245760 | 0) >>> 16 & 2;
              var $add263 = 14 - ($and253 | $and249 | $and258) + ($shl255 << $and258 >>> 15) | 0;
              var $I237_0 = $qsize_0 >>> (($add263 + 7 | 0) >>> 0) & 1 | $add263 << 1;
            }
          } while (0);
          var $I237_0;
          var $arrayidx272 = ($I237_0 << 2) + __gm_ + 304 | 0;
          HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 7)] = $I237_0;
          HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 5)] = 0;
          HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 4)] = 0;
          var $74 = HEAP32[__gm_ + 4 >> 2];
          var $shl279 = 1 << $I237_0;
          if (($74 & $shl279 | 0) == 0) {
            HEAP32[__gm_ + 4 >> 2] = $74 | $shl279;
            HEAP32[$arrayidx272 >> 2] = $71;
            HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 6)] = $arrayidx272;
            HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 3)] = $71;
            HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 2)] = $71;
          } else {
            if (($I237_0 | 0) == 31) {
              var $cond300 = 0;
            } else {
              var $cond300 = 25 - ($I237_0 >>> 1) | 0;
            }
            var $cond300;
            var $K290_0 = $qsize_0 << $cond300;
            var $T_0 = HEAP32[$arrayidx272 >> 2];
            while (1) {
              var $T_0;
              var $K290_0;
              if ((HEAP32[$T_0 + 4 >> 2] & -8 | 0) == ($qsize_0 | 0)) {
                var $fd329 = $T_0 + 8 | 0;
                var $87 = HEAP32[$fd329 >> 2];
                var $89 = HEAP32[__gm_ + 16 >> 2];
                do {
                  if ($T_0 >>> 0 >= $89 >>> 0) {
                    if ($87 >>> 0 < $89 >>> 0) {
                      break;
                    }
                    HEAP32[$87 + 12 >> 2] = $71;
                    HEAP32[$fd329 >> 2] = $71;
                    HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 2)] = $87;
                    HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 3)] = $T_0;
                    HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 6)] = 0;
                    break $_$30;
                  }
                } while (0);
                _abort();
              } else {
                var $arrayidx310 = ($K290_0 >>> 31 << 2) + $T_0 + 16 | 0;
                var $81 = HEAP32[$arrayidx310 >> 2];
                if (($81 | 0) != 0) {
                  var $K290_0 = $K290_0 << 1;
                  var $T_0 = $81;
                  continue;
                }
                if ($arrayidx310 >>> 0 >= HEAP32[__gm_ + 16 >> 2] >>> 0) {
                  HEAP32[$arrayidx310 >> 2] = $71;
                  HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 6)] = $T_0;
                  HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 3)] = $71;
                  HEAP32[$add_ptr4_sum$s2 + ($newbase$s2 + 2)] = $71;
                  break $_$30;
                }
                _abort();
              }
            }
          }
        }
      }
    }
  } while (0);
  return $newbase + ($cond | 8) | 0;
  return null;
}
_prepend_alloc["X"] = 1;
function _add_segment($tbase, $tsize) {
  var $add_ptr14$s2;
  var $0$s2;
  var $0 = HEAP32[__gm_ + 24 >> 2], $0$s2 = $0 >> 2;
  var $1 = $0;
  var $call = _segment_holding($1);
  var $2 = HEAP32[$call >> 2];
  var $3 = HEAP32[$call + 4 >> 2];
  var $add_ptr = $2 + $3 | 0;
  var $4 = $2 + ($3 - 39) | 0;
  if (($4 & 7 | 0) == 0) {
    var $cond = 0;
  } else {
    var $cond = -$4 & 7;
  }
  var $cond;
  var $add_ptr7 = $2 + ($3 - 47) + $cond | 0;
  var $cond13 = $add_ptr7 >>> 0 < ($0 + 16 | 0) >>> 0 ? $1 : $add_ptr7;
  var $add_ptr14 = $cond13 + 8 | 0, $add_ptr14$s2 = $add_ptr14 >> 2;
  _init_top($tbase, $tsize - 40 | 0);
  HEAP32[$cond13 + 4 >> 2] = 27;
  HEAP32[$add_ptr14$s2] = HEAP32[__gm_ + 444 >> 2];
  HEAP32[$add_ptr14$s2 + 1] = HEAP32[__gm_ + 448 >> 2];
  HEAP32[$add_ptr14$s2 + 2] = HEAP32[__gm_ + 452 >> 2];
  HEAP32[$add_ptr14$s2 + 3] = HEAP32[__gm_ + 456 >> 2];
  HEAP32[__gm_ + 444 >> 2] = $tbase;
  HEAP32[__gm_ + 448 >> 2] = $tsize;
  HEAP32[__gm_ + 456 >> 2] = 0;
  HEAP32[__gm_ + 452 >> 2] = $add_ptr14;
  var $10 = $cond13 + 28 | 0;
  HEAP32[$10 >> 2] = 7;
  var $cmp2711 = ($cond13 + 32 | 0) >>> 0 < $add_ptr >>> 0;
  $_$132 : do {
    if ($cmp2711) {
      var $add_ptr2412 = $10;
      while (1) {
        var $add_ptr2412;
        var $12 = $add_ptr2412 + 4 | 0;
        HEAP32[$12 >> 2] = 7;
        if (($add_ptr2412 + 8 | 0) >>> 0 >= $add_ptr >>> 0) {
          break $_$132;
        }
        var $add_ptr2412 = $12;
      }
    }
  } while (0);
  var $cmp28 = ($cond13 | 0) == ($1 | 0);
  $_$136 : do {
    if (!$cmp28) {
      var $sub_ptr_sub = $cond13 - $0 | 0;
      var $15 = $sub_ptr_sub + ($1 + 4) | 0;
      HEAP32[$15 >> 2] = HEAP32[$15 >> 2] & -2;
      HEAP32[$0$s2 + 1] = $sub_ptr_sub | 1;
      HEAP32[$1 + $sub_ptr_sub >> 2] = $sub_ptr_sub;
      if ($sub_ptr_sub >>> 0 < 256) {
        var $shl = $sub_ptr_sub >>> 2 & 1073741822;
        var $18 = ($shl << 2) + __gm_ + 40 | 0;
        var $19 = HEAP32[__gm_ >> 2];
        var $shl39 = 1 << ($sub_ptr_sub >>> 3);
        do {
          if (($19 & $shl39 | 0) == 0) {
            HEAP32[__gm_ >> 2] = $19 | $shl39;
            var $F_0 = $18;
            var $_pre_phi = ($shl + 2 << 2) + __gm_ + 40 | 0;
          } else {
            var $20 = ($shl + 2 << 2) + __gm_ + 40 | 0;
            var $21 = HEAP32[$20 >> 2];
            if ($21 >>> 0 >= HEAP32[__gm_ + 16 >> 2] >>> 0) {
              var $F_0 = $21;
              var $_pre_phi = $20;
              break;
            }
            _abort();
          }
        } while (0);
        var $_pre_phi;
        var $F_0;
        HEAP32[$_pre_phi >> 2] = $0;
        HEAP32[$F_0 + 12 >> 2] = $0;
        HEAP32[$0$s2 + 2] = $F_0;
        HEAP32[$0$s2 + 3] = $18;
      } else {
        var $24 = $0;
        var $shr58 = $sub_ptr_sub >>> 8;
        do {
          if (($shr58 | 0) == 0) {
            var $I57_0 = 0;
          } else {
            if ($sub_ptr_sub >>> 0 > 16777215) {
              var $I57_0 = 31;
              break;
            }
            var $and69 = ($shr58 + 1048320 | 0) >>> 16 & 8;
            var $shl70 = $shr58 << $and69;
            var $and73 = ($shl70 + 520192 | 0) >>> 16 & 4;
            var $shl75 = $shl70 << $and73;
            var $and78 = ($shl75 + 245760 | 0) >>> 16 & 2;
            var $add83 = 14 - ($and73 | $and69 | $and78) + ($shl75 << $and78 >>> 15) | 0;
            var $I57_0 = $sub_ptr_sub >>> (($add83 + 7 | 0) >>> 0) & 1 | $add83 << 1;
          }
        } while (0);
        var $I57_0;
        var $arrayidx91 = ($I57_0 << 2) + __gm_ + 304 | 0;
        HEAP32[$0$s2 + 7] = $I57_0;
        HEAP32[$0$s2 + 5] = 0;
        HEAP32[$0$s2 + 4] = 0;
        var $26 = HEAP32[__gm_ + 4 >> 2];
        var $shl95 = 1 << $I57_0;
        if (($26 & $shl95 | 0) == 0) {
          HEAP32[__gm_ + 4 >> 2] = $26 | $shl95;
          HEAP32[$arrayidx91 >> 2] = $24;
          HEAP32[$0$s2 + 6] = $arrayidx91;
          HEAP32[$0$s2 + 3] = $0;
          HEAP32[$0$s2 + 2] = $0;
        } else {
          if (($I57_0 | 0) == 31) {
            var $cond115 = 0;
          } else {
            var $cond115 = 25 - ($I57_0 >>> 1) | 0;
          }
          var $cond115;
          var $K105_0 = $sub_ptr_sub << $cond115;
          var $T_0 = HEAP32[$arrayidx91 >> 2];
          while (1) {
            var $T_0;
            var $K105_0;
            if ((HEAP32[$T_0 + 4 >> 2] & -8 | 0) == ($sub_ptr_sub | 0)) {
              var $fd145 = $T_0 + 8 | 0;
              var $32 = HEAP32[$fd145 >> 2];
              var $34 = HEAP32[__gm_ + 16 >> 2];
              do {
                if ($T_0 >>> 0 >= $34 >>> 0) {
                  if ($32 >>> 0 < $34 >>> 0) {
                    break;
                  }
                  HEAP32[$32 + 12 >> 2] = $24;
                  HEAP32[$fd145 >> 2] = $24;
                  HEAP32[$0$s2 + 2] = $32;
                  HEAP32[$0$s2 + 3] = $T_0;
                  HEAP32[$0$s2 + 6] = 0;
                  break $_$136;
                }
              } while (0);
              _abort();
            } else {
              var $arrayidx126 = ($K105_0 >>> 31 << 2) + $T_0 + 16 | 0;
              var $29 = HEAP32[$arrayidx126 >> 2];
              if (($29 | 0) != 0) {
                var $K105_0 = $K105_0 << 1;
                var $T_0 = $29;
                continue;
              }
              if ($arrayidx126 >>> 0 >= HEAP32[__gm_ + 16 >> 2] >>> 0) {
                HEAP32[$arrayidx126 >> 2] = $24;
                HEAP32[$0$s2 + 6] = $T_0;
                HEAP32[$0$s2 + 3] = $0;
                HEAP32[$0$s2 + 2] = $0;
                break $_$136;
              }
              _abort();
            }
          }
        }
      }
    }
  } while (0);
  return;
  return;
}
_add_segment["X"] = 1;
var i64Math = null;
var _getImage;
var _cvsSave;
var _cvsTranslate;
var _cvsDrawImage3;
function _fmin(x, y) {
  return isNaN(x) ? y : isNaN(y) ? x : Math.max(x, y);
}
var _fminf = _fmin;
var _cvsRestore;
var _isDown;
var _random;
var _getWidth;
var _getHeight;
var _cvsFillStyle;
var _cvsFillRect;
var _getCurrentTime;
var _startTimer;
var _endTimer;
function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop) {
  Module["noExitRuntime"] = true;
  var jsFunc = FUNCTION_TABLE[func];
  Browser.mainLoop.runner = (function() {
    if (Browser.mainLoop.queue.length > 0) {
      var start = Date.now();
      var blocker = Browser.mainLoop.queue.shift();
      blocker.func(blocker.arg);
      if (Browser.mainLoop.remainingBlockers) {
        var remaining = Browser.mainLoop.remainingBlockers;
        var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
        if (blocker.counted) {
          Browser.mainLoop.remainingBlockers = next;
        } else {
          next = next + .5;
          Browser.mainLoop.remainingBlockers = (8 * remaining + next) / 9;
        }
      }
      console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + " ms");
      Browser.mainLoop.updateStatus();
      setTimeout(Browser.mainLoop.runner, 0);
      return;
    }
    if (Browser.mainLoop.shouldPause) {
      Browser.mainLoop.paused = true;
      Browser.mainLoop.shouldPause = false;
      return;
    }
    if (Module["preMainLoop"]) {
      Module["preMainLoop"]();
    }
    jsFunc();
    if (Module["postMainLoop"]) {
      Module["postMainLoop"]();
    }
    if (Browser.mainLoop.shouldPause) {
      Browser.mainLoop.paused = true;
      Browser.mainLoop.shouldPause = false;
      return;
    }
    Browser.mainLoop.scheduler();
  });
  if (fps && fps > 0) {
    Browser.mainLoop.scheduler = (function() {
      setTimeout(Browser.mainLoop.runner, 1e3 / fps);
    });
  } else {
    Browser.mainLoop.scheduler = (function() {
      Browser.requestAnimationFrame(Browser.mainLoop.runner);
    });
  }
  Browser.mainLoop.scheduler();
  if (simulateInfiniteLoop) {
    throw "emscripten_set_main_loop simulating infinite loop by throwing so we get right into the JS event loop";
  }
}
var _loadResource;
var _onReady;
function _abort() {
  ABORT = true;
  throw "abort() at " + (new Error).stack;
}
function _memcpy(dest, src, num, align) {
  if (num >= 20 && src % 2 == dest % 2) {
    if (src % 4 == dest % 4) {
      var stop = src + num;
      while (src % 4) {
        HEAP8[dest++] = HEAP8[src++];
      }
      var src4 = src >> 2, dest4 = dest >> 2, stop4 = stop >> 2;
      while (src4 < stop4) {
        HEAP32[dest4++] = HEAP32[src4++];
      }
      src = src4 << 2;
      dest = dest4 << 2;
      while (src < stop) {
        HEAP8[dest++] = HEAP8[src++];
      }
    } else {
      var stop = src + num;
      if (src % 2) {
        HEAP8[dest++] = HEAP8[src++];
      }
      var src2 = src >> 1, dest2 = dest >> 1, stop2 = stop >> 1;
      while (src2 < stop2) {
        HEAP16[dest2++] = HEAP16[src2++];
      }
      src = src2 << 1;
      dest = dest2 << 1;
      if (src < stop) {
        HEAP8[dest++] = HEAP8[src++];
      }
    }
  } else {
    while (num--) {
      HEAP8[dest++] = HEAP8[src++];
    }
  }
}
var _llvm_memcpy_p0i8_p0i8_i32 = _memcpy;
function ___setErrNo(value) {
  if (!___setErrNo.ret) ___setErrNo.ret = allocate([ 0 ], "i32", ALLOC_STATIC);
  HEAP32[___setErrNo.ret >> 2] = value;
  return value;
}
var ERRNO_CODES = {
  E2BIG: 7,
  EACCES: 13,
  EADDRINUSE: 98,
  EADDRNOTAVAIL: 99,
  EAFNOSUPPORT: 97,
  EAGAIN: 11,
  EALREADY: 114,
  EBADF: 9,
  EBADMSG: 74,
  EBUSY: 16,
  ECANCELED: 125,
  ECHILD: 10,
  ECONNABORTED: 103,
  ECONNREFUSED: 111,
  ECONNRESET: 104,
  EDEADLK: 35,
  EDESTADDRREQ: 89,
  EDOM: 33,
  EDQUOT: 122,
  EEXIST: 17,
  EFAULT: 14,
  EFBIG: 27,
  EHOSTUNREACH: 113,
  EIDRM: 43,
  EILSEQ: 84,
  EINPROGRESS: 115,
  EINTR: 4,
  EINVAL: 22,
  EIO: 5,
  EISCONN: 106,
  EISDIR: 21,
  ELOOP: 40,
  EMFILE: 24,
  EMLINK: 31,
  EMSGSIZE: 90,
  EMULTIHOP: 72,
  ENAMETOOLONG: 36,
  ENETDOWN: 100,
  ENETRESET: 102,
  ENETUNREACH: 101,
  ENFILE: 23,
  ENOBUFS: 105,
  ENODATA: 61,
  ENODEV: 19,
  ENOENT: 2,
  ENOEXEC: 8,
  ENOLCK: 37,
  ENOLINK: 67,
  ENOMEM: 12,
  ENOMSG: 42,
  ENOPROTOOPT: 92,
  ENOSPC: 28,
  ENOSR: 63,
  ENOSTR: 60,
  ENOSYS: 38,
  ENOTCONN: 107,
  ENOTDIR: 20,
  ENOTEMPTY: 39,
  ENOTRECOVERABLE: 131,
  ENOTSOCK: 88,
  ENOTSUP: 95,
  ENOTTY: 25,
  ENXIO: 6,
  EOVERFLOW: 75,
  EOWNERDEAD: 130,
  EPERM: 1,
  EPIPE: 32,
  EPROTO: 71,
  EPROTONOSUPPORT: 93,
  EPROTOTYPE: 91,
  ERANGE: 34,
  EROFS: 30,
  ESPIPE: 29,
  ESRCH: 3,
  ESTALE: 116,
  ETIME: 62,
  ETIMEDOUT: 110,
  ETXTBSY: 26,
  EWOULDBLOCK: 11,
  EXDEV: 18
};
function _sysconf(name) {
  switch (name) {
   case 8:
    return PAGE_SIZE;
   case 54:
   case 56:
   case 21:
   case 61:
   case 63:
   case 22:
   case 67:
   case 23:
   case 24:
   case 25:
   case 26:
   case 27:
   case 69:
   case 28:
   case 101:
   case 70:
   case 71:
   case 29:
   case 30:
   case 199:
   case 75:
   case 76:
   case 32:
   case 43:
   case 44:
   case 80:
   case 46:
   case 47:
   case 45:
   case 48:
   case 49:
   case 42:
   case 82:
   case 33:
   case 7:
   case 108:
   case 109:
   case 107:
   case 112:
   case 119:
   case 121:
    return 200809;
   case 13:
   case 104:
   case 94:
   case 95:
   case 34:
   case 35:
   case 77:
   case 81:
   case 83:
   case 84:
   case 85:
   case 86:
   case 87:
   case 88:
   case 89:
   case 90:
   case 91:
   case 94:
   case 95:
   case 110:
   case 111:
   case 113:
   case 114:
   case 115:
   case 116:
   case 117:
   case 118:
   case 120:
   case 40:
   case 16:
   case 79:
   case 19:
    return -1;
   case 92:
   case 93:
   case 5:
   case 72:
   case 6:
   case 74:
   case 92:
   case 93:
   case 96:
   case 97:
   case 98:
   case 99:
   case 102:
   case 103:
   case 105:
    return 1;
   case 38:
   case 66:
   case 50:
   case 51:
   case 4:
    return 1024;
   case 15:
   case 64:
   case 41:
    return 32;
   case 55:
   case 37:
   case 17:
    return 2147483647;
   case 18:
   case 1:
    return 47839;
   case 59:
   case 57:
    return 99;
   case 68:
   case 58:
    return 2048;
   case 0:
    return 2097152;
   case 3:
    return 65536;
   case 14:
    return 32768;
   case 73:
    return 32767;
   case 39:
    return 16384;
   case 60:
    return 1e3;
   case 106:
    return 700;
   case 52:
    return 256;
   case 62:
    return 255;
   case 2:
    return 100;
   case 65:
    return 64;
   case 36:
    return 20;
   case 100:
    return 16;
   case 20:
    return 6;
   case 53:
    return 4;
  }
  ___setErrNo(ERRNO_CODES.EINVAL);
  return -1;
}
function _time(ptr) {
  var ret = Math.floor(Date.now() / 1e3);
  if (ptr) {
    HEAP32[ptr >> 2] = ret;
  }
  return ret;
}
function ___errno_location() {
  return ___setErrNo.ret;
}
var ___errno = ___errno_location;
function _sbrk(bytes) {
  var self = _sbrk;
  if (!self.called) {
    STATICTOP = alignMemoryPage(STATICTOP);
    self.called = true;
    _sbrk.DYNAMIC_START = STATICTOP;
  }
  var ret = STATICTOP;
  if (bytes != 0) Runtime.staticAlloc(bytes);
  return ret;
}
function _memset(ptr, value, num, align) {
  if (num >= 20) {
    var stop = ptr + num;
    while (ptr % 4) {
      HEAP8[ptr++] = value;
    }
    if (value < 0) value += 256;
    var ptr4 = ptr >> 2, stop4 = stop >> 2, value4 = value | value << 8 | value << 16 | value << 24;
    while (ptr4 < stop4) {
      HEAP32[ptr4++] = value4;
    }
    ptr = ptr4 << 2;
    while (ptr < stop) {
      HEAP8[ptr++] = value;
    }
  } else {
    while (num--) {
      HEAP8[ptr++] = value;
    }
  }
}
function _free() {}
var Browser = {
  mainLoop: {
    scheduler: null,
    shouldPause: false,
    paused: false,
    queue: [],
    pause: (function() {
      Browser.mainLoop.shouldPause = true;
    }),
    resume: (function() {
      if (Browser.mainLoop.paused) {
        Browser.mainLoop.paused = false;
        Browser.mainLoop.scheduler();
      }
      Browser.mainLoop.shouldPause = false;
    }),
    updateStatus: (function() {
      if (Module["setStatus"]) {
        var message = Module["statusMessage"] || "Please wait...";
        var remaining = Browser.mainLoop.remainingBlockers;
        var expected = Browser.mainLoop.expectedBlockers;
        if (remaining) {
          if (remaining < expected) {
            Module["setStatus"](message + " (" + (expected - remaining) + "/" + expected + ")");
          } else {
            Module["setStatus"](message);
          }
        } else {
          Module["setStatus"]("");
        }
      }
    })
  },
  pointerLock: false,
  moduleContextCreatedCallbacks: [],
  workers: [],
  ensureObjects: (function() {
    if (Browser.ensured) return;
    Browser.ensured = true;
    try {
      new Blob;
      Browser.hasBlobConstructor = true;
    } catch (e) {
      Browser.hasBlobConstructor = false;
      console.log("warning: no blob constructor, cannot create blobs with mimetypes");
    }
    Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : !Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null;
    Browser.URLObject = typeof window != "undefined" ? window.URL ? window.URL : window.webkitURL : console.log("warning: cannot create object URLs");
    function getMimetype(name) {
      return {
        "jpg": "image/jpeg",
        "png": "image/png",
        "bmp": "image/bmp",
        "ogg": "audio/ogg",
        "wav": "audio/wav",
        "mp3": "audio/mpeg"
      }[name.substr(-3)];
      return ret;
    }
    if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
    var imagePlugin = {};
    imagePlugin["canHandle"] = (function(name) {
      return name.substr(-4) in {
        ".jpg": 1,
        ".png": 1,
        ".bmp": 1
      };
    });
    imagePlugin["handle"] = (function(byteArray, name, onload, onerror) {
      var b = null;
      if (Browser.hasBlobConstructor) {
        try {
          b = new Blob([ byteArray ], {
            type: getMimetype(name)
          });
        } catch (e) {
          Runtime.warnOnce("Blob constructor present but fails: " + e + "; falling back to blob builder");
        }
      }
      if (!b) {
        var bb = new Browser.BlobBuilder;
        bb.append((new Uint8Array(byteArray)).buffer);
        b = bb.getBlob();
      }
      var url = Browser.URLObject.createObjectURL(b);
      var img = new Image;
      img.onload = (function() {
        assert(img.complete, "Image " + name + " could not be decoded");
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        Module["preloadedImages"][name] = canvas;
        Browser.URLObject.revokeObjectURL(url);
        if (onload) onload(byteArray);
      });
      img.onerror = (function(event) {
        console.log("Image " + url + " could not be decoded");
        if (onerror) onerror();
      });
      img.src = url;
    });
    Module["preloadPlugins"].push(imagePlugin);
    var audioPlugin = {};
    audioPlugin["canHandle"] = (function(name) {
      return name.substr(-4) in {
        ".ogg": 1,
        ".wav": 1,
        ".mp3": 1
      };
    });
    audioPlugin["handle"] = (function(byteArray, name, onload, onerror) {
      var done = false;
      function finish(audio) {
        if (done) return;
        done = true;
        Module["preloadedAudios"][name] = audio;
        if (onload) onload(byteArray);
      }
      function fail() {
        if (done) return;
        done = true;
        Module["preloadedAudios"][name] = new Audio;
        if (onerror) onerror();
      }
      if (Browser.hasBlobConstructor) {
        try {
          var b = new Blob([ byteArray ], {
            type: getMimetype(name)
          });
        } catch (e) {
          return fail();
        }
        var url = Browser.URLObject.createObjectURL(b);
        var audio = new Audio;
        audio.addEventListener("canplaythrough", (function() {
          finish(audio);
        }), false);
        audio.onerror = (function(event) {
          if (done) return;
          console.log("warning: browser could not fully decode audio " + name + ", trying slower base64 approach");
          function encode64(data) {
            var BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            var PAD = "=";
            var ret = "";
            var leftchar = 0;
            var leftbits = 0;
            for (var i = 0; i < data.length; i++) {
              leftchar = leftchar << 8 | data[i];
              leftbits += 8;
              while (leftbits >= 6) {
                var curr = leftchar >> leftbits - 6 & 63;
                leftbits -= 6;
                ret += BASE[curr];
              }
            }
            if (leftbits == 2) {
              ret += BASE[(leftchar & 3) << 4];
              ret += PAD + PAD;
            } else if (leftbits == 4) {
              ret += BASE[(leftchar & 15) << 2];
              ret += PAD;
            }
            return ret;
          }
          audio.src = "data:audio/x-" + name.substr(-3) + ";base64," + encode64(byteArray);
          finish(audio);
        });
        audio.src = url;
        setTimeout((function() {
          finish(audio);
        }), 1e4);
      } else {
        return fail();
      }
    });
    Module["preloadPlugins"].push(audioPlugin);
  }),
  createContext: (function(canvas, useWebGL, setInModule) {
    try {
      var ctx = canvas.getContext(useWebGL ? "experimental-webgl" : "2d");
      if (!ctx) throw ":(";
    } catch (e) {
      Module.print("Could not create canvas - " + e);
      return null;
    }
    if (useWebGL) {
      canvas.style.backgroundColor = "black";
      canvas.addEventListener("webglcontextlost", (function(event) {
        alert("WebGL context lost. You will need to reload the page.");
      }), false);
    }
    if (setInModule) {
      Module.ctx = ctx;
      Module.useWebGL = useWebGL;
      Browser.moduleContextCreatedCallbacks.forEach((function(callback) {
        callback();
      }));
    }
    return ctx;
  }),
  requestFullScreen: (function() {
    var canvas = Module["canvas"];
    function fullScreenChange() {
      var isFullScreen = false;
      if ((document["webkitFullScreenElement"] || document["webkitFullscreenElement"] || document["mozFullScreenElement"] || document["mozFullscreenElement"] || document["fullScreenElement"] || document["fullscreenElement"]) === canvas) {
        canvas.requestPointerLock = canvas["requestPointerLock"] || canvas["mozRequestPointerLock"] || canvas["webkitRequestPointerLock"];
        canvas.requestPointerLock();
        isFullScreen = true;
      }
      if (Module["onFullScreen"]) Module["onFullScreen"](isFullScreen);
    }
    document.addEventListener("fullscreenchange", fullScreenChange, false);
    document.addEventListener("mozfullscreenchange", fullScreenChange, false);
    document.addEventListener("webkitfullscreenchange", fullScreenChange, false);
    function pointerLockChange() {
      Browser.pointerLock = document["pointerLockElement"] === canvas || document["mozPointerLockElement"] === canvas || document["webkitPointerLockElement"] === canvas;
    }
    document.addEventListener("pointerlockchange", pointerLockChange, false);
    document.addEventListener("mozpointerlockchange", pointerLockChange, false);
    document.addEventListener("webkitpointerlockchange", pointerLockChange, false);
    canvas.requestFullScreen = canvas["requestFullScreen"] || canvas["mozRequestFullScreen"] || (canvas["webkitRequestFullScreen"] ? (function() {
      canvas["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"]);
    }) : null);
    canvas.requestFullScreen();
  }),
  requestAnimationFrame: (function(func) {
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = window["requestAnimationFrame"] || window["mozRequestAnimationFrame"] || window["webkitRequestAnimationFrame"] || window["msRequestAnimationFrame"] || window["oRequestAnimationFrame"] || window["setTimeout"];
    }
    window.requestAnimationFrame(func);
  }),
  getMovementX: (function(event) {
    return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0;
  }),
  getMovementY: (function(event) {
    return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0;
  }),
  xhrLoad: (function(url, onload, onerror) {
    var xhr = new XMLHttpRequest;
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = (function() {
      if (xhr.status == 200) {
        onload(xhr.response);
      } else {
        onerror();
      }
    });
    xhr.onerror = onerror;
    xhr.send(null);
  }),
  asyncLoad: (function(url, onload, onerror) {
    Browser.xhrLoad(url, (function(arrayBuffer) {
      assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
      onload(new Uint8Array(arrayBuffer));
      removeRunDependency("al " + url);
    }), (function(event) {
      if (onerror) {
        onerror();
      } else {
        throw 'Loading data file "' + url + '" failed.';
      }
    }));
    addRunDependency("al " + url);
  }),
  resizeListeners: [],
  updateResizeListeners: (function() {
    var canvas = Module["canvas"];
    Browser.resizeListeners.forEach((function(listener) {
      listener(canvas.width, canvas.height);
    }));
  }),
  setCanvasSize: (function(width, height, noUpdates) {
    var canvas = Module["canvas"];
    canvas.width = width;
    canvas.height = height;
    if (!noUpdates) Browser.updateResizeListeners();
  })
};
___setErrNo(0);
Module["requestFullScreen"] = (function() {
  Browser.requestFullScreen();
});
Module["requestAnimationFrame"] = (function(func) {
  Browser.requestAnimationFrame(func);
});
Module["pauseMainLoop"] = (function() {
  Browser.mainLoop.pause();
});
Module["resumeMainLoop"] = (function() {
  Browser.mainLoop.resume();
});
Module.callMain = function callMain(args) {
  var argc = args.length + 1;
  function pad() {
    for (var i = 0; i < 4 - 1; i++) {
      argv.push(0);
    }
  }
  var argv = [ allocate(intArrayFromString("/bin/this.program"), "i8", ALLOC_STATIC) ];
  pad();
  for (var i = 0; i < argc - 1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), "i8", ALLOC_STATIC));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, "i32", ALLOC_STATIC);
  return _main(argc, argv, 0);
};
var _objects;
var _playerEntity;
var _cells;
var _last;
var _playerSprite;
var _llvm_used;
var __gm_;
var _mparams;
STRING_TABLE.__str = allocate([ 117, 112, 0 ], "i8", ALLOC_STATIC);
STRING_TABLE.__str1 = allocate([ 100, 111, 119, 110, 0 ], "i8", ALLOC_STATIC);
STRING_TABLE.__str2 = allocate([ 108, 101, 102, 116, 0 ], "i8", ALLOC_STATIC);
STRING_TABLE.__str3 = allocate([ 114, 105, 103, 104, 116, 0 ], "i8", ALLOC_STATIC);
STRING_TABLE.__str4 = allocate([ 46, 46, 47, 114, 101, 115, 111, 117, 114, 99, 101, 115, 47, 98, 111, 115, 115, 101, 115, 46, 112, 110, 103, 0 ], "i8", ALLOC_STATIC);
_objects = allocate(4, "i8", ALLOC_STATIC);
_playerEntity = allocate(4, "i8", ALLOC_STATIC);
_cells = allocate(4, "i8", ALLOC_STATIC);
_last = allocate(4, "i8", ALLOC_STATIC);
STRING_TABLE.__str7 = allocate([ 98, 108, 97, 99, 107, 0 ], "i8", ALLOC_STATIC);
_playerSprite = allocate(4, "i8", ALLOC_STATIC);
STRING_TABLE.__str8 = allocate([ 103, 97, 109, 101, 82, 117, 110, 0 ], "i8", ALLOC_STATIC);
_llvm_used = allocate([ 4, 0, 0, 0 ], [ "*", 0, 0, 0 ], ALLOC_STATIC);
__gm_ = allocate(468, "i8", ALLOC_STATIC);
_mparams = allocate(24, "i8", ALLOC_STATIC);
FUNCTION_TABLE = [ 0, 0, _heartbeat, 0, _gameRun, 0 ];
Module["FUNCTION_TABLE"] = FUNCTION_TABLE;
function run(args) {
  args = args || Module["arguments"];
  if (runDependencies > 0) {
    Module.printErr("run() called, but dependencies remain, so not running");
    return 0;
  }
  if (Module["preRun"]) {
    if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
    var toRun = Module["preRun"];
    Module["preRun"] = [];
    for (var i = toRun.length - 1; i >= 0; i--) {
      toRun[i]();
    }
    if (runDependencies > 0) {
      return 0;
    }
  }
  function doRun() {
    var ret = 0;
    calledRun = true;
    if (Module["_main"]) {
      preMain();
      ret = Module.callMain(args);
      if (!Module["noExitRuntime"]) {
        exitRuntime();
      }
    }
    if (Module["postRun"]) {
      if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
      while (Module["postRun"].length > 0) {
        Module["postRun"].pop()();
      }
    }
    return ret;
  }
  if (Module["setStatus"]) {
    Module["setStatus"]("Running...");
    setTimeout((function() {
      setTimeout((function() {
        Module["setStatus"]("");
      }), 1);
      doRun();
    }), 1);
    return 0;
  } else {
    return doRun();
  }
}
Module["run"] = run;
if (Module["preInit"]) {
  if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
  while (Module["preInit"].length > 0) {
    Module["preInit"].pop()();
  }
}
initRuntime();
var shouldRunNow = true;
if (Module["noInitialRun"]) {
  shouldRunNow = false;
}
if (shouldRunNow) {
  var ret = run();
}
// EMSCRIPTEN_GENERATED_FUNCTIONS: ["_collides","_updateSprite","_cellsClear","_cellsAdd","_cellsGet","_renderSpriteClipped","_renderSprite","_renderEntity","_updateEntity","_makeEntity","_makeCells","_makeEnemySprite","_removeObject","__checkCollisions","_checkCollisions","_heartbeat","_gameRun","_main","_malloc","_tmalloc_small","_sys_alloc","_tmalloc_large","_segment_holding","_init_top","_init_bins","_init_mparams","_prepend_alloc","_add_segment"]


