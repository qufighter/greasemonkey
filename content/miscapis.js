function GM_ScriptStorage(script) {
  this.prefMan = new GM_PrefManager(script.prefroot);
}

GM_ScriptStorage.prototype.setValue = function(name, val) {
  if (2 !== arguments.length) {
    throw new Error("Second argument not specified: Value");
  }

  if (!GM_apiLeakCheck("GM_setValue")) {
    return;
  }

  this.prefMan.setValue(name, val);
};

GM_ScriptStorage.prototype.getValue = function(name, defVal) {
  if (!GM_apiLeakCheck("GM_getValue")) {
    return undefined;
  }

  return this.prefMan.getValue(name, defVal);
};

GM_ScriptStorage.prototype.deleteValue = function(name) {
  if (!GM_apiLeakCheck("GM_deleteValue")) {
    return undefined;
  }

  return this.prefMan.remove(name);
};

GM_ScriptStorage.prototype.listValues = function() {
  if (!GM_apiLeakCheck("GM_listValues")) {
    return undefined;
  }

  return this.prefMan.listValues();
};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_Resources(script){
  this.script = script;
}

GM_Resources.prototype.getResourceURL = function(name) {
  if (!GM_apiLeakCheck("GM_getResourceURL")) {
    return undefined;
  }

  return this.getDep_(name).dataContent;
};

GM_Resources.prototype.getResourceText = function(name) {
  if (!GM_apiLeakCheck("GM_getResourceText")) {
    return undefined;
  }

  return this.getDep_(name).textContent;
};

GM_Resources.prototype.getDep_ = function(name) {
  var resources = this.script.resources;
  for (var i = 0, resource; resource = resources[i]; i++) {
    if (resource.name == name) {
      return resource;
    }
  }

  throw new Error("No resource with name: " + name); // NOTE: Non localised string
};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_ScriptLogger(script) {
  var namespace = script.namespace;

  if (namespace.substring(namespace.length - 1) != "/") {
    namespace += "/";
  }

  this.prefix = [namespace, script.name, ": "].join("");
}

GM_ScriptLogger.prototype.log = function(message) {
  GM_log(this.prefix + message, true);
};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_addStyle(doc, css) {
  var head = doc.getElementsByTagName("head")[0];
  if (head) {
    if (doc.gm_css_uri) {
      GM_clearStyles(doc); // delets doc.gm_css_uri which prevents inf recursion
      GM_addStyle(doc, doc.gm_raw_css)
      delete doc.gm_raw_css;
    }
    var style = doc.createElement("style");
    style.textContent = css;
    style.type = "text/css";
    head.appendChild(style);
  } else {
    // during document-start early injection while <head> is unavailable
    // based on stylish components\stylishStyle.js
    var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"].getService(Components.interfaces.nsIStyleSheetService);
   
    if (!doc.gm_raw_css) doc.gm_raw_css = '';
    doc.gm_raw_css += css;
    css = "@-moz-document url(" + doc.location.href + ") {" + doc.gm_raw_css + "}";
    var cssURI = ios.newURI("data:text/css," + encodeURIComponent(css), null, null);
    sss.loadAndRegisterSheet(cssURI, sss.USER_SHEET);
   
    //unload previous now redundant registered stylesheeet
    if (doc.gm_css_uri && sss.sheetRegistered(doc.gm_css_uri, sss.USER_SHEET)) {
     sss.unregisterSheet(doc.gm_css_uri, sss.USER_SHEET)
    }
    doc.gm_css_uri = cssURI;
  }
  return style;
}

function GM_clearStyles(doc) {
  // this must be called when the document unloads to clean up, 
  // it is called by the first GM_addStyle call that detects <head> 
  var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"].getService(Components.interfaces.nsIStyleSheetService);
  if (doc.gm_css_uri && sss.sheetRegistered(doc.gm_css_uri, sss.USER_SHEET)) {
   sss.unregisterSheet(doc.gm_css_uri, sss.USER_SHEET)
  }
  delete doc.gm_css_uri;
}

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_console(script) {
  // based on http://www.getfirebug.com/firebug/firebugx.js
  var names = [
    "debug", "warn", "error", "info", "assert", "dir", "dirxml",
    "group", "groupEnd", "time", "timeEnd", "count", "trace", "profile",
    "profileEnd"
  ];

  for (var i=0, name; name=names[i]; i++) {
    this[name] = function() {};
  }

  // Important to use this private variable so that user scripts can't make
  // this call something else by redefining <this> or <logger>.
  var logger = new GM_ScriptLogger(script);
  this.log = function() {
    logger.log(
      Array.prototype.slice.apply(arguments).join("\n")
    );
  };
}

GM_console.prototype.log = function() {
};
